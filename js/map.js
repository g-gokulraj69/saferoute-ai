// ============================================================
//  map.js — Leaflet Map + OpenRouteService Routing
// ============================================================

let map, userMarker, destMarker, routeLayer;
let userLat = null, userLng = null;

// ── Custom Marker Icons ───────────────────────────────────
const userIcon = () => L.divIcon({
  html: `<div style="width:14px;height:14px;background:#00d4ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 14px #00d4ff;"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

const destIcon = () => L.divIcon({
  html: `<div style="width:14px;height:14px;background:#ff3c5f;border:3px solid #fff;border-radius:50%;box-shadow:0 0 14px #ff3c5f;"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

const nearbyIcon = (emoji) => L.divIcon({
  html: `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))">${emoji}</div>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12],
});

// ── Init Map ──────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true })
    .setView([CONFIG.MAP_INDIA_LAT, CONFIG.MAP_INDIA_LNG], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  document.getElementById('gps-status').textContent = 'MAP READY';
}

// ── Locate User ───────────────────────────────────────────
function locateMe() {
  showToast('Detecting your location...', 'info');
  document.getElementById('gps-status').textContent = 'LOCATING...';

  if (!navigator.geolocation) {
    showToast('Geolocation not supported in this browser', 'error');
    document.getElementById('gps-status').textContent = 'NO GPS';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      map.setView([userLat, userLng], CONFIG.MAP_DEFAULT_ZOOM);

      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([userLat, userLng], { icon: userIcon() })
        .addTo(map)
        .bindPopup('<b>📍 You are here</b>')
        .openPopup();

      document.getElementById('origin').value = `${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;
      document.getElementById('gps-status').textContent = 'GPS LOCKED';

      reverseGeocode(userLat, userLng);
      loadNearbyPlaces(userLat, userLng);
      showToast('Location found!', 'success');
    },
    err => {
      const msgs = {
        1: 'GPS access denied — please allow location in browser settings.',
        2: 'GPS position unavailable.',
        3: 'GPS timed out. Try again.',
      };
      showToast(msgs[err.code] || 'GPS error', 'error');
      document.getElementById('gps-status').textContent = 'GPS DENIED';
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

// ── Get Route ─────────────────────────────────────────────
async function getRoute() {
  const originVal = document.getElementById('origin').value.trim();
  const destVal   = document.getElementById('destination').value.trim();

  if (!originVal || !destVal) {
    showToast('Enter both origin and destination', 'error');
    return;
  }

  if (!CONFIG.ORS_API_KEY) {
    showToast('ORS API key missing. Add it in ⚙ CONFIG.', 'error');
    return;
  }

  showToast('Calculating route...', 'info');

  // ── Resolve coordinates ──────────────────────────────
  const parseCoord = val => {
    const parts = val.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return null;
  };

  let oLat, oLng, dLat, dLng;

  const oCoord = parseCoord(originVal);
  if (oCoord) { oLat = oCoord.lat; oLng = oCoord.lng; }
  else {
    const geo = await forwardGeocode(originVal);
    if (!geo) { showToast('Could not find origin address', 'error'); return; }
    oLat = geo.lat; oLng = geo.lng;
  }

  const dCoord = parseCoord(destVal);
  if (dCoord) { dLat = dCoord.lat; dLng = dCoord.lng; }
  else {
    const geo = await forwardGeocode(destVal);
    if (!geo) { showToast('Could not find destination address', 'error'); return; }
    dLat = geo.lat; dLng = geo.lng;
  }

  try {
    const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': CONFIG.ORS_API_KEY,
        'Content-Type':  'application/json',
        'Accept':        'application/json, application/geo+json',
      },
      body: JSON.stringify({
        coordinates:  [[oLng, oLat], [dLng, dLat]],
        instructions: true,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      showToast('ORS API key is invalid or expired. Update in ⚙ CONFIG.', 'error');
      return;
    }
    if (res.status === 429) {
      showToast('ORS rate limit hit. Wait a moment and try again.', 'error');
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `ORS error ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const summary = feature.properties.summary;
      const km      = (summary.distance / 1000).toFixed(1);
      const mins    = Math.round(summary.duration / 60);

      document.getElementById('dist-val').textContent = km;
      document.getElementById('eta-val').textContent  = mins;

      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(feature, {
        style: { color: '#00d4ff', weight: 4, opacity: 0.85 },
      }).addTo(map);

      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });

      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker([dLat, dLng], { icon: destIcon() })
        .addTo(map)
        .bindPopup(`<b>🎯 ${escapeHtml(destVal)}</b><br>${km} km · ~${mins} min`)
        .openPopup();

      showToast(`Route ready — ${km} km, ~${mins} min`, 'success');
    } else {
      showToast('No route found between these locations', 'error');
    }
  } catch(e) {
    showToast('Routing error: ' + e.message, 'error');
    console.error('Route error:', e);
  }
}

// ── Clear Route ───────────────────────────────────────────
function clearRoute() {
  let cleared = false;
  if (routeLayer)  { map.removeLayer(routeLayer);  routeLayer  = null; cleared = true; }
  if (destMarker)  { map.removeLayer(destMarker);  destMarker  = null; cleared = true; }
  document.getElementById('dist-val').textContent = '--';
  document.getElementById('eta-val').textContent  = '--';
  document.getElementById('destination').value    = '';
  if (cleared) showToast('Route cleared', 'info');
  else showToast('No active route to clear', 'info');
}

// ── Center on User ────────────────────────────────────────
function centerMap() {
  if (userLat) map.setView([userLat, userLng], CONFIG.MAP_DEFAULT_ZOOM);
  else showToast('Location not found yet', 'error');
}

// ── Navigate to Nearby Place ──────────────────────────────
function goToPlace(lat, lng, name) {
  map.setView([lat, lng], 17);
  L.popup()
    .setLatLng([lat, lng])
    .setContent(`<b>📍 ${escapeHtml(name)}</b>`)
    .openOn(map);
}

// ── Nearby Places — Gemini-powered with Overpass fallback ─
// Gemini returns named, real places with coordinates.
// If Gemini key is missing, falls back to raw Overpass data.

let nearbyMarkers = []; // track markers to clear on refresh

async function loadNearbyPlaces(lat, lng) {
  if (!lat || !lng) {
    showToast('Get your location first', 'error');
    return;
  }

  const list = document.getElementById('nearby-list');
  list.innerHTML = '<p style="font-size:12px;color:var(--text-dim);padding:10px 0;">🔍 Finding nearby places...</p>';

  // Clear old nearby markers
  nearbyMarkers.forEach(m => map.removeLayer(m));
  nearbyMarkers = [];

  if (CONFIG.GEMINI_API_KEY) {
    await loadNearbyViaGemini(lat, lng);
  } else {
    await loadNearbyViaOverpass(lat, lng);
  }
}

// ── Method 1: Gemini (rich names + coordinates) ───────────
async function loadNearbyViaGemini(lat, lng) {
  const list    = document.getElementById('nearby-list');
  const address = window.currentAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const prompt =
    `You are a location assistant. The user is at: ${address} (coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}).
List the 12 nearest real places in these categories: hospital, police station, petrol/fuel pump, pharmacy, fire station.
For each place return ONLY a JSON array (no markdown, no explanation) like:
[
  {"name":"Apollo Hospital","type":"hospital","lat":12.9716,"lng":77.5946,"dist_km":0.8},
  {"name":"HP Petrol Pump","type":"fuel","lat":12.9720,"lng":77.5950,"dist_km":1.1}
]
Rules:
- Return ONLY the JSON array, nothing else
- Use actual real place names from the area
- "type" must be one of: hospital, police, fuel, pharmacy, fire_station
- dist_km is approximate walking/driving distance in km
- Return up to 12 places total, sorted by dist_km ascending
- Only include places that actually exist near this location`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data  = await res.json();
    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences if present
    const clean = raw.replace(/```json|```/gi, '').trim();
    const places = JSON.parse(clean);

    if (!Array.isArray(places) || places.length === 0) throw new Error('Empty result');

    renderNearbyGemini(places);
    showToast(`Found ${places.length} nearby places`, 'success');
  } catch(e) {
    console.warn('Gemini nearby failed, trying Overpass:', e.message);
    // Fallback to Overpass
    await loadNearbyViaOverpass(lat, lng);
  }
}

function renderNearbyGemini(places) {
  const icons = { hospital: '🏥', police: '🚔', fuel: '⛽', pharmacy: '💊', fire_station: '🚒' };
  const list  = document.getElementById('nearby-list');
  const labels = { hospital: 'Hospital', police: 'Police Station', fuel: 'Petrol Pump', pharmacy: 'Pharmacy', fire_station: 'Fire Station' };

  list.innerHTML = places.map(p => {
    const icon  = icons[p.type]  || '📍';
    const label = labels[p.type] || p.type;
    const name  = escapeHtml(p.name);
    const dist  = parseFloat(p.dist_km).toFixed(1);
    return `
      <div class="nearby-item" onclick="goToPlace(${p.lat},${p.lng},'${name.replace(/'/g,"\\'")}')">
        <span class="ni-icon">${icon}</span>
        <div>
          <div class="ni-name">${name}</div>
          <div class="ni-sub">${label}</div>
        </div>
        <span class="ni-dist">${dist} km</span>
      </div>`;
  }).join('');

  // Add map markers
  places.forEach(p => {
    if (!p.lat || !p.lng) return;
    const icon = icons[p.type] || '📍';
    const m = L.marker([p.lat, p.lng], { icon: nearbyIcon(icon) })
      .addTo(map)
      .bindPopup(`<b>${icon} ${escapeHtml(p.name)}</b>`);
    nearbyMarkers.push(m);
  });
}

// ── Method 2: Overpass fallback (raw OSM data) ────────────
async function loadNearbyViaOverpass(lat, lng) {
  const list = document.getElementById('nearby-list');
  const r    = CONFIG.NEARBY_RADIUS_M;

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${r},${lat},${lng});
      way["amenity"="hospital"](around:${r},${lat},${lng});
      node["amenity"="police"](around:${r},${lat},${lng});
      node["amenity"="fuel"](around:${r},${lat},${lng});
      way["amenity"="fuel"](around:${r},${lat},${lng});
      node["amenity"="pharmacy"](around:${r},${lat},${lng});
      node["amenity"="fire_station"](around:${r},${lat},${lng});
    );
    out center 20;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      body:    `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) throw new Error(`Overpass error ${res.status}`);

    const data = await res.json();

    if (!data.elements || data.elements.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--text-dim);padding:10px 0;">No places found nearby. Try refreshing or add Gemini key for better results.</p>';
      return;
    }

    // Normalise: ways return center coords
    const normalised = data.elements.map(el => ({
      lat:  el.lat  || el.center?.lat,
      lon:  el.lon  || el.center?.lon,
      tags: el.tags || {},
    })).filter(el => el.lat && el.lon);

    renderNearbyOverpass(normalised, lat, lng);
    showToast(`Found ${normalised.length} nearby places (OSM)`, 'success');
  } catch(e) {
    list.innerHTML = '<p style="font-size:12px;color:var(--text-dim);padding:10px 0;">Could not load nearby places. Check internet connection.</p>';
    console.warn('Overpass error:', e.message);
  }
}

function renderNearbyOverpass(places, uLat, uLng) {
  const icons  = { hospital: '🏥', police: '🚔', fuel: '⛽', pharmacy: '💊', fire_station: '🚒' };
  const labels = { hospital: 'Hospital', police: 'Police Station', fuel: 'Petrol Pump', pharmacy: 'Pharmacy', fire_station: 'Fire Station' };
  const list   = document.getElementById('nearby-list');

  const withDist = places
    .map(p => ({ ...p, dist: distKm(uLat, uLng, p.lat, p.lon) }))
    .sort((a, b) => a.dist - b.dist);

  list.innerHTML = withDist.slice(0, 12).map(p => {
    const name  = escapeHtml(p.tags.name || labels[p.tags.amenity] || 'Unnamed');
    const type  = p.tags.amenity;
    const icon  = icons[type]  || '📍';
    const label = labels[type] || type.replace(/_/g, ' ');
    return `
      <div class="nearby-item" onclick="goToPlace(${p.lat},${p.lon},'${name.replace(/'/g,"\\'")}')">
        <span class="ni-icon">${icon}</span>
        <div>
          <div class="ni-name">${name}</div>
          <div class="ni-sub">${label}</div>
        </div>
        <span class="ni-dist">${p.dist} km</span>
      </div>`;
  }).join('');

  withDist.slice(0, 12).forEach(p => {
    const icon = icons[p.tags.amenity] || '📍';
    const m = L.marker([p.lat, p.lon], { icon: nearbyIcon(icon) })
      .addTo(map)
      .bindPopup(`<b>${icon} ${escapeHtml(p.tags.name || p.tags.amenity)}</b>`);
    nearbyMarkers.push(m);
  });
}

// ── Haversine Distance ────────────────────────────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}
