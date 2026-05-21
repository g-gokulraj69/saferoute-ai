// ============================================================
//  geocode.js — OpenCage Geocoding (Reverse + Forward)
// ============================================================

// ── Reverse Geocode (coords → address) ───────────────────
async function reverseGeocode(lat, lng) {
  const el = document.getElementById('current-addr');
  el.textContent = 'Resolving address...';

  if (!CONFIG.OPENCAGE_API_KEY) {
    el.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    window.currentAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return;
  }

  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${CONFIG.OPENCAGE_API_KEY}&language=en&limit=1&no_annotations=1`;
    const res  = await fetch(url);

    if (!res.ok) throw new Error(`OpenCage HTTP ${res.status}`);

    const data = await res.json();

    if (data.status && data.status.code !== 200) {
      throw new Error(data.status.message || 'OpenCage error');
    }

    if (data.results && data.results.length > 0) {
      const r    = data.results[0];
      const comp = r.components;

      const parts = [
        comp.road || comp.neighbourhood || comp.suburb,
        comp.city || comp.town || comp.village || comp.county,
        comp.state,
        comp.country,
      ].filter(Boolean);

      const shortAddr = parts.slice(0, 3).join(', ');
      el.textContent = shortAddr || r.formatted;
      window.currentAddress = r.formatted;
    } else {
      el.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      window.currentAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  } catch(e) {
    el.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    window.currentAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    console.warn('Reverse geocode failed:', e.message);
  }
}

// ── Forward Geocode (address → coords) ───────────────────
async function forwardGeocode(address) {
  if (!CONFIG.OPENCAGE_API_KEY) {
    showToast('OpenCage API key missing. Add it in ⚙ CONFIG.', 'error');
    return null;
  }

  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${CONFIG.OPENCAGE_API_KEY}&limit=1&no_annotations=1&countrycode=in`;
    const res  = await fetch(url);

    if (!res.ok) throw new Error(`OpenCage HTTP ${res.status}`);

    const data = await res.json();

    if (data.status && data.status.code === 402) {
      showToast('OpenCage quota exceeded. Check your plan.', 'error');
      return null;
    }

    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      return { lat, lng };
    }

    return null;
  } catch(e) {
    console.error('Forward geocode error:', e.message);
    return null;
  }
}
