# 🛡️ SafeRoute AI — Smart Safety Navigation App

![SafeRoute AI](https://img.shields.io/badge/SafeRoute-AI-red?style=for-the-badge&logo=shield)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-blue?style=for-the-badge&logo=google)

> A real-time AI-powered safety navigation web app built for India 🇮🇳 — with smart routing, SOS alerts, vehicle detection, and an AI chat assistant.

---

## ✨ Features

- 🗺️ **Smart Route Planning** — Get the safest route from your location to any destination using OpenRouteService
- 📍 **Live GPS Tracking** — Real-time location detection with reverse geocoding
- 🤖 **AI Chat Assistant** — Powered by Google Gemini AI for safety tips and guidance
- 🚗 **Vehicle Detection** — Real-time vehicle detection using your camera via Roboflow
- 🆘 **SOS Emergency Alert** — Send emergency SMS to contacts via Fast2SMS (India)
- 🏥 **Nearby Places** — Find hospitals, police stations, and safe zones near you
- 🌙 **Dark/Light Mode** — Eye-friendly UI for day and night use
- 📱 **Responsive Design** — Works on mobile and desktop

---

## 🖥️ Demo

> Open `index.html` in your browser to run the app locally.

---

## 🚀 How to Run

### Option 1 — VS Code Live Server (Recommended)
1. Open this folder in **VS Code**
2. Install the **Live Server** extension
3. Right-click `index.html` → **"Open with Live Server"**
4. App opens at `http://localhost:5500`

### Option 2 — Python Server
```bash
python -m http.server 5500
```
Then open **http://localhost:5500** in your browser.

### Option 3 — Direct Open
Double-click `index.html` — works for basic features.
> ⚠️ Camera and GPS features require localhost or HTTPS.

---

## ⚙️ API Keys Setup

When you open the app, click the **⚙ CONFIG** button and enter your API keys:

| Service | Get Key From | Used For |
|---------|-------------|----------|
| 🗺️ OpenRouteService | https://account.heigit.org | Route planning & maps |
| 📍 OpenCage | https://opencagedata.com | GPS to address conversion |
| 🤖 Google Gemini | https://aistudio.google.com | AI chat assistant |
| 🚗 Roboflow | https://app.roboflow.com | Vehicle detection |
| 📱 Fast2SMS | https://fast2sms.com | SOS SMS alerts (India) |

> 🔒 Keys are saved only in your **browser's localStorage** — never stored in the code or sent to any server other than the respective API providers.

---

## 📁 Project Structure

```
saferoute-ai/
├── index.html              # Main HTML file
├── css/
│   └── style.css           # App styling
├── js/
│   ├── config.js           # API config (empty keys — safe to push)
│   ├── config.example.js   # Example config for reference
│   ├── app.js              # Main app logic & UI
│   ├── map.js              # Map & routing logic
│   ├── geocode.js          # GPS & address search
│   ├── detection.js        # Vehicle detection (Roboflow)
│   ├── sos.js              # SOS & emergency alerts
│   └── chat.js             # Gemini AI chat
├── .gitignore              # Git ignore rules
├── SECURITY.md             # Security guidelines
└── README.md               # This file
```

---

## 🔒 Security

- ✅ No API keys hardcoded in source code
- ✅ `.gitignore` protects local config files
- ✅ All keys stored in browser localStorage only
- ✅ AI chat responses sanitized to prevent XSS

See [SECURITY.md](SECURITY.md) for full details.

---

## ⚠️ Known Limitation

**Fast2SMS** cannot be called directly from a browser due to CORS policy. The app automatically falls back to **WhatsApp** with a pre-filled emergency message. To enable real SMS, deploy a small backend proxy server.

---

## 🛠️ Built With

- **HTML5 / CSS3 / Vanilla JavaScript** — Frontend
- **OpenRouteService** — Routing & maps
- **OpenCage Geocoding** — Reverse geocoding
- **Google Gemini AI** — AI assistant
- **Roboflow** — Computer vision / vehicle detection
- **Fast2SMS** — SMS gateway (India)
- **Overpass API** — Nearby places (OpenStreetMap)

---

## 👨‍💻 Author

**Gokul Raj G**
- GitHub: [@g-gokulraj69](https://github.com/g-gokulraj69)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

⭐ **If you found this project helpful, please give it a star!**
