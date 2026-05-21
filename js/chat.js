// ============================================================
//  chat.js — Gemini AI Navigation Assistant
// ============================================================

const chatHistory = [];

// ── Send Message ──────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';
  addChatMsg(escapeHtml(text), 'user');

  if (!CONFIG.GEMINI_API_KEY) {
    addChatMsg('Gemini API key not set. Add it in ⚙ CONFIG to enable AI chat.', 'ai');
    return;
  }

  const typingEl = addChatMsg('⏳ Thinking...', 'ai');

  try {
    const locationCtx = userLat
      ? `User's current location: ${window.currentAddress || `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`} (India).`
      : 'User location unknown.';

    const distEl = document.getElementById('dist-val').textContent;
    const etaEl  = document.getElementById('eta-val').textContent;
    const routeCtx = distEl !== '--'
      ? `Active route: ${distEl} km, ETA ${etaEl} minutes.`
      : 'No active route.';

    const systemPrompt =
      `You are SafeRoute AI, an intelligent navigation and road safety assistant for Indian roads. ` +
      `${locationCtx} ${routeCtx} ` +
      `Answer concisely and helpfully. For safety-related questions, be thorough. ` +
      `Use Indian context (cities, rules, conditions) where relevant. ` +
      `Keep responses under 200 words unless asked for detail.`;

    // Last 6 messages for context
    const messages = [
      ...chatHistory.slice(-6).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: text }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
          generationConfig: { maxOutputTokens: 400 },
        }),
      }
    );

    if (res.status === 400) {
      typingEl.textContent = 'Invalid request. Try rephrasing your question.';
      return;
    }
    if (res.status === 401 || res.status === 403) {
      typingEl.textContent = 'Gemini API key is invalid. Update it in ⚙ CONFIG.';
      return;
    }
    if (res.status === 429) {
      typingEl.textContent = 'Gemini rate limit hit. Wait a moment and try again.';
      return;
    }

    const data  = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (reply) {
      // Sanitize and format the reply — no raw innerHTML from AI
      typingEl.innerHTML = `<div class="label">SAFEROUTE AI</div>${formatReply(escapeHtml(reply))}`;
      chatHistory.push({ role: 'user',  text: text  });
      chatHistory.push({ role: 'model', text: reply });
    } else {
      typingEl.textContent = "Sorry, I couldn't get a response. Please try again.";
    }
  } catch(e) {
    typingEl.textContent = 'Connection error. Check your internet and try again.';
    console.error('Gemini error:', e);
  }

  scrollChat();
}

// ── Format Reply (safe markdown → HTML, applied after escaping) ─
function formatReply(safeText) {
  return safeText
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g,     '<i>$1</i>')
    .replace(/\n/g,            '<br>');
}

// ── Add Message Bubble ────────────────────────────────────
function addChatMsg(text, role, isHtml = false) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;

  const label = role === 'ai' ? 'SAFEROUTE AI' : 'YOU';

  if (isHtml) {
    // Only used for our own trusted welcome message
    div.innerHTML = `<div class="label">${label}</div>${text}`;
  } else {
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = label;
    div.appendChild(labelEl);

    const textEl = document.createElement('span');
    textEl.textContent = text;
    div.appendChild(textEl);
  }

  container.appendChild(div);
  scrollChat();
  return div;
}

function scrollChat() {
  const c = document.getElementById('chat-messages');
  c.scrollTop = c.scrollHeight;
}

// ── Quick Suggestion Chips ────────────────────────────────
function askQuick(question) {
  document.getElementById('chat-input').value = question;
  sendChat();
}
