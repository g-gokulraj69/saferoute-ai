// ============================================================
//  sos.js — SOS Alert System
//
//  SMS Strategy (in order of attempt):
//  1. Fast2SMS via api.allorigins.win CORS proxy (free, works in browser)
//  2. Fast2SMS direct (works if opened via Live Server / localhost)
//  3. WhatsApp fallback (always works)
//
//  Eye-close SOS: triggered from detection.js when eyes closed 10s
// ============================================================

let sosActive = false;

// ── Build SOS Message ─────────────────────────────────────
function buildSOSMessage(name) {
  let locationStr = 'Location unknown';
  if (window.currentAddress) {
    locationStr = window.currentAddress;
  } else if (userLat) {
    locationStr = `GPS: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;
  }

  const googleMapsLink = userLat
    ? `https://maps.google.com/?q=${userLat},${userLng}`
    : 'N/A';

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return {
    text: `SOS EMERGENCY ALERT! Person: ${name} Location: ${locationStr} Maps: ${googleMapsLink} Time: ${now} IST Please send help immediately!`,
    locationStr,
  };
}

// ── Manual SOS Button ─────────────────────────────────────
async function triggerSOS(skipConfirm = false) {
  if (sosActive) return;

  const contact  = document.getElementById('emergency-contact').value.trim();
  const name     = document.getElementById('victim-name').value.trim() || 'Unknown Person';
  const contact2 = document.getElementById('emergency-contact2').value.trim();

  if (!contact) {
    showToast('Enter emergency contact number first', 'error');
    return;
  }
  if (!isValidPhone(contact)) {
    showToast('Invalid phone. Use: 91XXXXXXXXXX or 10 digits', 'error');
    return;
  }

  if (!skipConfirm) {
    const confirmed = confirm('⚠️ SEND SOS ALERT?\n\nThis will send SMS to your emergency contacts.\nAre you sure?');
    if (!confirmed) return;
  }

  await executeSOS(name, contact, contact2, false);
}

// ── Auto SOS (called from eye-close detection) ────────────
async function triggerAutoSOS() {
  const contact = document.getElementById('emergency-contact').value.trim();
  const name    = document.getElementById('victim-name').value.trim() || 'Driver';
  const contact2= document.getElementById('emergency-contact2').value.trim();

  if (!contact || !isValidPhone(contact)) {
    showToast('⚠ Set emergency contact for auto-SOS to work', 'error');
    return;
  }

  showToast('🚨 DROWSINESS DETECTED! Sending auto SOS...', 'error', 8000);
  await executeSOS(name, contact, contact2, true);
}

// ── Core SOS executor ─────────────────────────────────────
async function executeSOS(name, contact, contact2, isAuto) {
  if (sosActive) return;
  sosActive = true;

  const btn = document.getElementById('sosBtn');
  btn.classList.add('sending');
  btn.textContent = '📡 SENDING...';

  const { text: message, locationStr } = buildSOSMessage(name);
  const autoNote = isAuto ? ' [AUTO - Drowsiness/Eyes closed]' : '';
  const fullMessage = message + autoNote;

  const numbers = [contact];
  if (contact2 && isValidPhone(contact2)) numbers.push(contact2);

  // ── Attempt SMS ───────────────────────────────────────
  let smsSent   = false;
  let smsMethod = '';

  if (CONFIG.FAST2SMS_API_KEY) {
    // Try 1: CORS proxy (works from any browser)
    const result1 = await sendViaCorsProxy(numbers, fullMessage);
    if (result1) { smsSent = true; smsMethod = 'SMS (via proxy)'; }

    // Try 2: Direct (works on localhost/Live Server)
    if (!smsSent) {
      const result2 = await sendFast2SMSDirect(numbers, fullMessage);
      if (result2) { smsSent = true; smsMethod = 'SMS (direct)'; }
    }
  }

  // ── Always open WhatsApp too for auto-SOS ────────────
  if (isAuto || !smsSent) {
    const waNumber = contact.replace(/\D/g, '');
    const waText   = encodeURIComponent(
      `🚨 SOS EMERGENCY ALERT!\n${isAuto ? '⚠ DRIVER MAY BE DROWSY / UNCONSCIOUS\n' : ''}` +
      `Person: ${name}\nLocation: ${locationStr}\n` +
      `Maps: ${userLat ? `https://maps.google.com/?q=${userLat},${userLng}` : 'N/A'}`
    );
    window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
    if (!smsSent) smsMethod = 'WhatsApp';
  }

  // ── Result ────────────────────────────────────────────
  if (smsSent) {
    showToast(`✅ SOS sent via ${smsMethod}!`, 'success', 6000);
  } else {
    showToast('SMS blocked by browser — WhatsApp opened instead', 'warn', 7000);
  }

  logSOSEvent(name, locationStr, contact, smsMethod, isAuto);

  btn.classList.remove('sending');
  btn.textContent = '🚨 SOS';
  setTimeout(() => { sosActive = false; }, 5000);
}

// ── SMS Method 1: allorigins CORS proxy ───────────────────
// allorigins.win wraps any API call, bypassing browser CORS block
async function sendViaCorsProxy(numbers, message) {
  try {
    const targetUrl = 'https://www.fast2sms.com/dev/bulkV2';
    const body = JSON.stringify({
      route:   'q',
      message: message,
      numbers: numbers.join(','),
    });

    // Encode the actual request as a GET through the proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      targetUrl + '?route=q&message=' + encodeURIComponent(message) +
      '&numbers=' + numbers.join(',')
    )}`;

    // allorigins only supports GET — use Fast2SMS GET API format
    const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${CONFIG.FAST2SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${numbers.join(',')}`;
    const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(getUrl)}`;

    const res  = await fetch(proxied);
    const data = await res.json();
    const inner = JSON.parse(data.contents || '{}');
    console.log('Fast2SMS proxy response:', inner);
    return inner.return === true;
  } catch(e) {
    console.warn('CORS proxy SMS failed:', e.message);
    return false;
  }
}

// ── SMS Method 2: Direct Fast2SMS POST ───────────────────
async function sendFast2SMSDirect(numbers, message) {
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': CONFIG.FAST2SMS_API_KEY,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        route:   'q',
        message: message,
        numbers: numbers.join(','),
      }),
    });
    const data = await res.json();
    console.log('Fast2SMS direct response:', data);
    return data.return === true;
  } catch(e) {
    console.warn('Direct SMS failed (expected if not on localhost):', e.message);
    return false;
  }
}

// ── Phone Validation ──────────────────────────────────────
function isValidPhone(number) {
  const cleaned = number.replace(/[\s\-]/g, '');
  return /^\d{10}$/.test(cleaned) || /^91\d{10}$/.test(cleaned);
}

// ── Log SOS in Chat ───────────────────────────────────────
function logSOSEvent(name, location, contact, method, isAuto) {
  const time   = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const masked = contact.slice(0, -4).replace(/\d/g, '*') + contact.slice(-4);

  addChatMsg(
    `🚨 <b>SOS ${isAuto ? 'AUTO-ALERT' : 'ALERT'} SENT</b><br>` +
    (isAuto ? `<span style="color:#ffaa00">⚠ Triggered by drowsiness detection</span><br>` : '') +
    `Person: ${escapeHtml(name)}<br>` +
    `Location: ${escapeHtml(location)}<br>` +
    `Contact: ${masked}<br>` +
    `Method: ${method}<br>` +
    `Time: ${time}`,
    'ai', true
  );
}
