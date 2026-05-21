// ============================================================
//  SafeRoute AI — API Configuration
//  ⚠ NEVER commit real API keys to git or share this file
//  Fill in your keys below, or use the ⚙ CONFIG button in the app
// ============================================================

const CONFIG = {
  // 🗺 OpenRouteService (HeiGit) — Map & Routing
  // Get key: https://account.heigit.org
  ORS_API_KEY: "",

  // 📍 OpenCage — GPS to Address (Reverse Geocoding)
  // Get key: https://opencagedata.com
  OPENCAGE_API_KEY: "",

  // 🚗 Roboflow — Vehicle Detection
  // Get key: https://app.roboflow.com
  ROBOFLOW_API_KEY: "",
  ROBOFLOW_MODEL:   "vehicle-detection-at-road/1",

  // 🤖 Gemini AI — Smart Chat Assistant
  // Get key: https://aistudio.google.com
  GEMINI_API_KEY: "",

  // 📱 Fast2SMS — SOS SMS Alerts (India only)
  // Get key: https://fast2sms.com
  FAST2SMS_API_KEY: "",

  // ⚙ App Settings
  DETECTION_INTERVAL_MS: 3000,
  NEARBY_RADIUS_M:       1500,
  MAP_DEFAULT_ZOOM:      15,
  MAP_INDIA_LAT:         20.5937,
  MAP_INDIA_LNG:         78.9629,
};
