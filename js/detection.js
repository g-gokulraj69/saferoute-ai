// ============================================================
//  detection.js — Vehicle Detection + Drowsiness / Eye-Close Alert
//
//  Two independent systems:
//  1. Vehicle Detection  — Roboflow API, detects vehicles in frame
//  2. Drowsiness Monitor — MediaPipe Face Mesh, detects eye closure
//     → If eyes closed ≥ 10 seconds → auto SOS + alarm
// ============================================================

// ── State ─────────────────────────────────────────────────
let videoStream       = null;
let detectionTimer    = null;
let isDetecting       = false;

// Drowsiness state
let faceMesh          = null;
let drowsyTimer       = null;
let eyesClosedSince   = null;
let drowsyAlertSent   = false;
let isDrowsyMonitoring= false;
const EYE_CLOSE_THRESHOLD_SEC = 10;   // seconds before SOS fires
const EAR_THRESHOLD           = 0.22; // Eye Aspect Ratio below this = eyes closed

// ── Start Camera ──────────────────────────────────────────
async function startCamera() {
  if (isDetecting) return;

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',           // front camera for drowsiness
        width:  { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    const video = document.getElementById('videoFeed');
    video.srcObject = videoStream;
    video.style.display = 'block';
    document.getElementById('camPlaceholder').style.display = 'none';

    video.addEventListener('loadedmetadata', async () => {
      isDetecting    = true;

      // Start vehicle detection only if Roboflow key set
      if (CONFIG.ROBOFLOW_API_KEY) {
        detectionTimer = setInterval(detectVehicles, CONFIG.DETECTION_INTERVAL_MS);
      }

      // Always start drowsiness monitoring
      await initFaceMesh();
      setDetectStatus('ACTIVE — MONITORING', '');
    }, { once: true });

    showToast('Camera started — monitoring for drowsiness', 'success');
  } catch(e) {
    const msg = e.name === 'NotAllowedError'
      ? 'Camera access denied. Allow camera in browser settings.'
      : e.name === 'NotFoundError'
      ? 'No camera found on this device.'
      : 'Camera error: ' + e.message;
    showToast(msg, 'error');
  }
}

// ── Stop Camera ───────────────────────────────────────────
function stopCamera() {
  isDetecting       = false;
  isDrowsyMonitoring= false;

  if (detectionTimer) { clearInterval(detectionTimer); detectionTimer = null; }
  if (drowsyTimer)    { clearInterval(drowsyTimer);    drowsyTimer    = null; }
  if (videoStream)    { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }

  const video  = document.getElementById('videoFeed');
  const canvas = document.getElementById('camCanvas');
  video.srcObject = null;
  video.style.display = 'none';
  document.getElementById('camPlaceholder').style.display = 'flex';
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  resetDrowsyState();
  setDetectStatus('IDLE', 'idle');
  showToast('Camera stopped', 'info');
}

// ══════════════════════════════════════════════════════════
//  DROWSINESS DETECTION (MediaPipe Face Mesh via CDN)
// ══════════════════════════════════════════════════════════

// MediaPipe Face Mesh landmark indices for eyes
// Left eye: 362,385,387,263,373,380
// Right eye: 33,160,158,133,153,144
const LEFT_EYE  = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33,  160, 158, 133, 153, 144];

async function initFaceMesh() {
  try {
    // Load MediaPipe from CDN if not already loaded
    if (!window.FaceMesh) {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    }

    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces:     1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    });

    faceMesh.onResults(onFaceMeshResults);

    // Run face mesh on every video frame
    const video = document.getElementById('videoFeed');
    isDrowsyMonitoring = true;

    drowsyTimer = setInterval(async () => {
      if (!isDrowsyMonitoring || !video.videoWidth) return;
      try {
        await faceMesh.send({ image: video });
      } catch(e) {
        // Ignore individual frame errors
      }
    }, 100); // 10fps for face analysis

    updateDrowsyBar(0, false);
    console.log('Face mesh initialised');
  } catch(e) {
    console.warn('MediaPipe load failed — drowsiness detection unavailable:', e.message);
    setDrowsyStatus('UNAVAILABLE', 'idle');
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Process Face Mesh results ─────────────────────────────
function onFaceMeshResults(results) {
  if (!isDrowsyMonitoring) return;

  const canvas = document.getElementById('camCanvas');
  const video  = document.getElementById('videoFeed');
  if (!video.videoWidth) return;

  if (canvas.width !== video.videoWidth) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx = canvas.getContext('2d');

  // Draw video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    // No face detected
    resetDrowsyState();
    setDrowsyStatus('NO FACE', 'idle');
    return;
  }

  const landmarks = results.multiFaceLandmarks[0];
  const W = canvas.width, H = canvas.height;

  // Calculate EAR (Eye Aspect Ratio) for both eyes
  const leftEAR  = calcEAR(landmarks, LEFT_EYE,  W, H);
  const rightEAR = calcEAR(landmarks, RIGHT_EYE, W, H);
  const ear      = (leftEAR + rightEAR) / 2;

  const eyesClosed = ear < EAR_THRESHOLD;

  // Draw eye landmarks
  drawEyeLandmarks(ctx, landmarks, W, H, eyesClosed);

  if (eyesClosed) {
    if (!eyesClosedSince) eyesClosedSince = Date.now();
    const closedSec = (Date.now() - eyesClosedSince) / 1000;

    updateDrowsyBar(closedSec, true);

    if (closedSec >= 3 && closedSec < EYE_CLOSE_THRESHOLD_SEC) {
      setDrowsyStatus(`EYES CLOSED ${closedSec.toFixed(0)}s`, 'warn');
      // Play warning beep from 3s
      playBeep(closedSec >= 6 ? 880 : 660);
    }

    if (closedSec >= EYE_CLOSE_THRESHOLD_SEC && !drowsyAlertSent) {
      drowsyAlertSent = true;
      setDrowsyStatus('🚨 DROWSY ALERT!', 'danger');
      playAlarm();
      triggerAutoSOS(); // call sos.js
    }
  } else {
    // Eyes open — reset
    if (eyesClosedSince) {
      eyesClosedSince = null;
      drowsyAlertSent = false;
    }
    updateDrowsyBar(0, false);
    setDrowsyStatus('EYES OPEN ✓', '');
  }
}

// ── Eye Aspect Ratio ──────────────────────────────────────
// EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
// Uses 6 landmarks per eye: [p1..p6]
function calcEAR(landmarks, indices, W, H) {
  const pts = indices.map(i => ({
    x: landmarks[i].x * W,
    y: landmarks[i].y * H,
  }));

  const A = dist2D(pts[1], pts[5]);
  const B = dist2D(pts[2], pts[4]);
  const C = dist2D(pts[0], pts[3]);

  return (A + B) / (2.0 * C);
}

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Draw Eye Landmarks ────────────────────────────────────
function drawEyeLandmarks(ctx, landmarks, W, H, closed) {
  const color = closed ? '#ff3c5f' : '#00ff88';

  [LEFT_EYE, RIGHT_EYE].forEach(indices => {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const x = landmarks[idx].x * W;
      const y = landmarks[idx].y * H;
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Fill when closed
    if (closed) {
      ctx.fillStyle = 'rgba(255,60,95,0.2)';
      ctx.fill();
    }
  });
}

// ── Drowsy Progress Bar update ────────────────────────────
function updateDrowsyBar(sec, active) {
  const bar   = document.getElementById('drowsy-bar-fill');
  const label = document.getElementById('drowsy-timer');
  if (!bar) return;

  const pct = Math.min((sec / EYE_CLOSE_THRESHOLD_SEC) * 100, 100);
  bar.style.width = pct + '%';
  bar.style.background = sec >= 6 ? '#ff3c5f' : sec >= 3 ? '#ffaa00' : '#00ff88';

  if (active && sec > 0) {
    label.textContent = `${sec.toFixed(1)}s / ${EYE_CLOSE_THRESHOLD_SEC}s`;
  } else {
    label.textContent = `0s / ${EYE_CLOSE_THRESHOLD_SEC}s`;
  }
}

function setDrowsyStatus(text, cls) {
  const el = document.getElementById('drowsy-status');
  if (!el) return;
  el.textContent = text;
  el.className   = 'detect-val ' + (cls || '');
}

function resetDrowsyState() {
  eyesClosedSince  = null;
  drowsyAlertSent  = false;
  updateDrowsyBar(0, false);
}

// ── Audio alerts ──────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep(freq = 660) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function playAlarm() {
  // Loud repeating alarm
  let i = 0;
  const alarm = setInterval(() => {
    playBeep(i % 2 === 0 ? 880 : 1100);
    if (++i >= 6) clearInterval(alarm);
  }, 300);
}

// ══════════════════════════════════════════════════════════
//  VEHICLE DETECTION (Roboflow)
// ══════════════════════════════════════════════════════════

async function detectVehicles() {
  if (!isDetecting) return;

  const video  = document.getElementById('videoFeed');
  const canvas = document.getElementById('camCanvas');
  if (!video.videoWidth || !video.videoHeight) return;

  if (canvas.width !== video.videoWidth) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx    = canvas.getContext('2d');
  const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

  try {
    const res = await fetch(
      `https://detect.roboflow.com/${CONFIG.ROBOFLOW_MODEL}?api_key=${CONFIG.ROBOFLOW_API_KEY}&confidence=40&overlap=30`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    base64,
      }
    );

    if (res.status === 401 || res.status === 403) {
      showToast('Roboflow key invalid. Update in ⚙ CONFIG.', 'error');
      clearInterval(detectionTimer);
      return;
    }

    if (!res.ok) throw new Error(`Roboflow HTTP ${res.status}`);

    const data = await res.json();

    if (data.predictions && data.predictions.length > 0) {
      drawVehicleBoxes(ctx, data.predictions, canvas.width, canvas.height);
      setDetectStatus(
        `${data.predictions.length} VEHICLE${data.predictions.length > 1 ? 'S' : ''}`,
        'danger'
      );
    } else {
      setDetectStatus('SCANNING...', '');
    }
  } catch(e) {
    console.warn('Vehicle detection error:', e.message);
  }
}

function drawVehicleBoxes(ctx, predictions, W, H) {
  ctx.drawImage(document.getElementById('videoFeed'), 0, 0, W, H);
  predictions.forEach(pred => {
    const x = pred.x - pred.width  / 2;
    const y = pred.y - pred.height / 2;
    const conf = (pred.confidence * 100).toFixed(0);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 6;
    ctx.strokeRect(x, y, pred.width, pred.height);
    ctx.shadowBlur  = 0;

    const label = `${pred.class} ${conf}%`;
    ctx.font     = 'bold 11px monospace';
    const tw     = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,255,136,0.85)';
    ctx.fillRect(x, y - 18, tw + 8, 18);
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 4, y - 4);
  });
}

// ── Status Helpers ────────────────────────────────────────
function setDetectStatus(text, cls) {
  const el = document.getElementById('detection-status');
  if (el) { el.textContent = text; el.className = 'detect-val ' + (cls || ''); }
}
