# 🔒 Security Guide — SafeRoute AI

## API Keys — Important Rules

| Rule | Detail |
|------|--------|
| ✅ Safe to commit | `config.js` (already has **empty** keys) |
| ✅ Safe to commit | `config.example.js` (has placeholder text, not real keys) |
| ❌ Never commit | Any file with your **real** API keys inside |

## How API Keys Work in This Project

This project uses **two layers** for API keys:

1. **`js/config.js`** — Default empty config (safe to push to GitHub).  
2. **Browser localStorage** — When you click ⚙ CONFIG in the app and save keys,  
   they are stored only in your browser and never leave your device.

## Where to Get Your Keys

| Service | URL |
|---------|-----|
| HeiGit / OpenRouteService | https://account.heigit.org |
| OpenCage Geocoding | https://opencagedata.com |
| Roboflow | https://app.roboflow.com |
| Google Gemini | https://aistudio.google.com |
| Fast2SMS | https://fast2sms.com |

## If You Accidentally Committed a Key

1. **Immediately regenerate** the key on the provider's dashboard.
2. Remove it from git history:  
   ```bash
   git filter-branch or use: git-filter-repo
   ```
3. Force-push the cleaned history.
