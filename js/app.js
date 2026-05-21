// ============================================================
//  app.js — Main Initialization & UI Utilities
// ============================================================

// ── Toast Notification ───────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info', duration = 3500) {
  const toast   = document.getElementById('toast');
  const icons   = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  document.getElementById('toast-icon').textContent = icons[type] || 'ℹ️';
  document.getElementById('toast-msg').textContent  = msg;
  toast.className = `show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ''; }, duration);
}

// ── Clock ─────────────────────────────────────────────────
function startClock() {
  const update = () => {
    const el = document.getElementById('time-display');
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };
  update();
  setInterval(update, 1000);
}

// ── Config Modal ─────────────────────────────────────────
function openConfig() {
  document.getElementById('configModal').classList.remove('hidden');
  document.getElementById('cfg-gemini').value    = CONFIG.GEMINI_API_KEY;
  document.getElementById('cfg-ors').value       = CONFIG.ORS_API_KEY;
  document.getElementById('cfg-roboflow').value  = CONFIG.ROBOFLOW_API_KEY;
  document.getElementById('cfg-opencage').value  = CONFIG.OPENCAGE_API_KEY;
  document.getElementById('cfg-fast2sms').value  = CONFIG.FAST2SMS_API_KEY;
  document.getElementById('cfg-model').value     = CONFIG.ROBOFLOW_MODEL;
}

function closeConfig() {
  document.getElementById('configModal').classList.add('hidden');
}

function saveConfig() {
  CONFIG.GEMINI_API_KEY   = document.getElementById('cfg-gemini').value.trim();
  CONFIG.ORS_API_KEY      = document.getElementById('cfg-ors').value.trim();
  CONFIG.ROBOFLOW_API_KEY = document.getElementById('cfg-roboflow').value.trim();
  CONFIG.OPENCAGE_API_KEY = document.getElementById('cfg-opencage').value.trim();
  CONFIG.FAST2SMS_API_KEY = document.getElementById('cfg-fast2sms').value.trim();
  CONFIG.ROBOFLOW_MODEL   = document.getElementById('cfg-model').value.trim();

  // Persist keys in localStorage so they survive page refresh
  try {
    localStorage.setItem('saferoute_config', JSON.stringify({
      GEMINI_API_KEY:   CONFIG.GEMINI_API_KEY,
      ORS_API_KEY:      CONFIG.ORS_API_KEY,
      ROBOFLOW_API_KEY: CONFIG.ROBOFLOW_API_KEY,
      ROBOFLOW_MODEL:   CONFIG.ROBOFLOW_MODEL,
      OPENCAGE_API_KEY: CONFIG.OPENCAGE_API_KEY,
      FAST2SMS_API_KEY: CONFIG.FAST2SMS_API_KEY,
    }));
  } catch(e) { /* storage unavailable */ }

  closeConfig();
  showToast('Configuration saved!', 'success');
}

// ── Load saved config from localStorage ──────────────────
function loadSavedConfig() {
  try {
    const saved = localStorage.getItem('saferoute_config');
    if (saved) {
      const obj = JSON.parse(saved);
      Object.assign(CONFIG, obj);
    }
  } catch(e) { /* ignore */ }
}

// ── Save / Load emergency contacts ───────────────────────
function saveContacts() {
  try {
    localStorage.setItem('saferoute_contacts', JSON.stringify({
      name:     document.getElementById('victim-name').value.trim(),
      contact1: document.getElementById('emergency-contact').value.trim(),
      contact2: document.getElementById('emergency-contact2').value.trim(),
    }));
  } catch(e) {}
}

function loadContacts() {
  try {
    const saved = localStorage.getItem('saferoute_contacts');
    if (saved) {
      const obj = JSON.parse(saved);
      document.getElementById('victim-name').value         = obj.name     || '';
      document.getElementById('emergency-contact').value   = obj.contact1 || '';
      document.getElementById('emergency-contact2').value  = obj.contact2 || '';
    }
  } catch(e) {}
}

// ── Sanitize text for safe HTML insertion ─────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Keyboard Shortcuts ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.activeElement.id === 'chat-input')  sendChat();
    if (document.activeElement.id === 'destination') getRoute();
  }
  if (e.key === 'Escape') closeConfig();
});

// ── App Init ──────────────────────────────────────────────
window.addEventListener('load', () => {
  loadSavedConfig();
  startClock();
  initMap();
  locateMe();
  loadContacts();

  // Auto-save contacts on change
  ['victim-name', 'emergency-contact', 'emergency-contact2'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveContacts);
  });

  // Check if any API keys are missing
  if (!CONFIG.ORS_API_KEY || !CONFIG.OPENCAGE_API_KEY || !CONFIG.GEMINI_API_KEY) {
    setTimeout(() => {
      showToast('⚙ Open CONFIG to add your API keys', 'warn', 6000);
    }, 1500);
  }

  addChatMsg(
    '👋 Welcome to <b>SafeRoute AI</b>!<br>' +
    'I can help with navigation, traffic info, road safety, and more.<br><br>' +
    'Try asking:<br>' +
    '• "Best route from Chennai to Bangalore?"<br>' +
    '• "What to do in case of a road accident?"<br>' +
    '• "Nearest hospital from my location?"',
    'ai',
    true
  );
});
