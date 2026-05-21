// ============================================================
//  SafeRoute AI — API Configuration EXAMPLE
//  
//  HOW TO USE:
//  1. Copy this file and rename it to: config.js
//  2. Fill in your real API keys below
//  3. NEVER commit config.js with real keys to git
//
//  OR simply use the ⚙ CONFIG button inside the app —
//  keys are saved in your browser's localStorage only.
// ============================================================

const CONFIG = {
  // 🗺 OpenRouteService (HeiGit) — Map & Routing
  // Get key: https://account.heigit.org
  ORS_API_KEY: "YOUR_HEIGIT_API_KEY_HERE",

  // 📍 OpenCage — GPS to Address (Reverse Geocoding)
  // Get key: https://opencagedata.com
  OPENCAGE_API_KEY: "YOUR_OPENCAGE_API_KEY_HERE",

  // 🚗 Roboflow — Vehicle Detection
  // Get key: https://app.roboflow.com
  ROBOFLOW_API_KEY: "YOUR_ROBOFLOW_API_KEY_HERE",
  ROBOFLOW_MODEL:   "vehicle-detection-at-road/1",

  // 🤖 Gemini AI — Smart Chat Assistant
  // Get key: https://aistudio.google.com
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE",

  // 📱 Fast2SMS — SOS SMS Alerts (India only)
  // Get key: https://fast2sms.com
  // ⚠ Fast2SMS blocks browser requests due to CORS.
  //   SMS is simulated in the browser; deploy a backend proxy to send real SMS.
  FAST2SMS_API_KEY: "YOUR_FAST2SMS_API_KEY_HERE",

  // ⚙ App Settings
  DETECTION_INTERVAL_MS: 3000,
  NEARBY_RADIUS_M:       1500,
  MAP_DEFAULT_ZOOM:      15,
  MAP_INDIA_LAT:         20.5937,
  MAP_INDIA_LNG:         78.9629,
};
