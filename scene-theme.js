/* =========================================================================
   scene-theme.js — Durjoy TV channel-OSD ambient art (IMAGE-BASED VERSION)
   -------------------------------------------------------------------------
   This version replaces the old procedural SVG-drawing code with real
   image files. Every scene (time-of-day + festival) now just points to
   an image asset instead of a JS function that builds SVG markup.

   HOW TO SET IT UP:
   1. Put your artwork files somewhere the OSD page can load them from
      (a folder next to the HTML, a CDN, whatever). Update IMAGE_BASE
      below, or give each scene a full absolute URL directly.
   2. Each scene entry has:
        src       - path/URL to the image (PNG/WEBP with transparency
                    recommended so the box's own dark background still
                    shows through the middle, same as the old SVG rule)
        position  - CSS object-position, so art can still "hug" an edge
                    or corner (e.g. 'left bottom', 'top center') instead
                    of sitting dead-center
        fit       - CSS object-fit ('contain' keeps the picture from
                    stretching / filling the whole box; use 'cover' only
                    if an image is meant to fill the frame)
   3. Recommended image size: match the old viewBox aspect ratio,
      480 x 150 (or any multiple of it), transparent PNG/WEBP.
   -------------------------------------------------------------------------
   Everything else — the day/night clock logic and the festival date
   windows — is unchanged from the original file.
   ========================================================================= */

(function () {
  'use strict';

  // Change this to wherever your scene images live (folder or CDN URL).
  var IMAGE_BASE = 'https://raw.githubusercontent.com/durjoyrozario/hls/refs/heads/tv/banner/';

  /* =========================================================================
     SCENE IMAGE CONFIG
     Replace the "src" values with your real filenames/URLs.
  ========================================================================= */
  var IMAGES = {
    // ---- time of day ----
    sunrise:        { src: IMAGE_BASE + 'sunrise.png',        position: 'left bottom',  fit: 'contain' },
    day:            { src: IMAGE_BASE + 'day.png',            position: 'left bottom',  fit: 'contain' },
    sunset:         { src: IMAGE_BASE + 'sunset.png',         position: 'left bottom',  fit: 'contain' },
    night:          { src: IMAGE_BASE + 'night.png',          position: 'left bottom',  fit: 'contain' },

    // ---- festivals ----
    christmas:      { src: IMAGE_BASE + 'christmas.png',      position: 'left bottom',  fit: 'contain' },
    eid:            { src: IMAGE_BASE + 'eid.png',            position: 'left bottom',  fit: 'contain' },
    durgapuja:      { src: IMAGE_BASE + 'durgapuja.png',      position: 'left bottom',  fit: 'contain' },
    easter:         { src: IMAGE_BASE + 'easter.png',         position: 'left bottom',  fit: 'contain' },
    buddhapurnima:  { src: IMAGE_BASE + 'buddhapurnima.png',  position: 'left bottom',  fit: 'contain' }
  };

  /* =========================================================================
     FESTIVAL DATE WINDOWS
     -------------------------------------------------------------------------
     Christmas is fixed on the calendar, so it's computed automatically every
     year. Eid, Durga Puja, Easter and Buddha Purnima follow the lunar /
     ecclesiastical calendars and shift every year — set this year's actual
     dates below (inclusive) and remember to update them annually.
  ========================================================================= */
  var FESTIVAL_WINDOWS = [
    // key            start (YYYY-MM-DD)   end (YYYY-MM-DD, inclusive)
    { key: 'christmas',     start: null,          end: null, recurringMD: ['09-05', '12-26'] },
    { key: 'eid',           start: '2026-03-19',  end: '2026-03-20' },  // Eid-ul-Fitr (approx — confirm via moon sighting)
    { key: 'durgapuja',     start: '2026-10-16',  end: '2026-10-22' },  // Shashthi–Dashami (approx)
    { key: 'easter',        start: '2026-04-05',  end: '2026-04-05' },
    { key: 'buddhapurnima', start: '2026-05-01',  end: '2026-05-01' }
  ];

  function toDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function activeFestival(now) {
    var today = toDateOnly(now);
    for (var i = 0; i < FESTIVAL_WINDOWS.length; i++) {
      var w = FESTIVAL_WINDOWS[i];
      if (w.recurringMD) {
        var mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        if (mmdd >= w.recurringMD[0] && mmdd <= w.recurringMD[1]) return w.key;
        continue;
      }
      var s = toDateOnly(new Date(w.start + 'T00:00:00'));
      var e = toDateOnly(new Date(w.end + 'T00:00:00'));
      if (today >= s && today <= e) return w.key;
    }
    return null;
  }

  function timeOfDayKey(now) {
    var h = now.getHours() + now.getMinutes() / 60;
    if (h >= 5 && h < 7.5) return 'sunrise';
    if (h >= 7.5 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'sunset';
    return 'night';
  }

  function currentSceneKey(now) {
    return activeFestival(now) || timeOfDayKey(now);
  }

  /* =========================================================================
     IMAGE RENDERING (with a soft crossfade between scene changes)
     -------------------------------------------------------------------------
     Instead of writing SVG markup into #osdSceneBg, we keep two <img>
     layers stacked inside it and crossfade between them whenever the
     scene key changes. This avoids a hard "pop" when e.g. day -> sunset
     switches over, similar in spirit to how the old SVG swap worked but
     smoother.
  ========================================================================= */
  var lastKey = null;
  var tickTimer = null;
  var layers = null; // { a: imgEl, b: imgEl, activeIsA: bool }

  function ensureLayers(container) {
    if (layers && layers.a.parentNode === container) return layers;

    container.innerHTML = '';
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    var a = document.createElement('img');
    var b = document.createElement('img');
    [a, b].forEach(function (img) {
      img.alt = '';
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.transition = 'opacity 600ms ease';
      img.style.pointerEvents = 'none';
      container.appendChild(img);
    });
    a.style.opacity = '1';
    b.style.opacity = '0';

    layers = { a: a, b: b, activeIsA: true };
    return layers;
  }

  function applyImage(img, cfg) {
    img.src = cfg.src;
    img.style.objectFit = cfg.fit || 'contain';
    img.style.objectPosition = cfg.position || 'center';
  }

  function render(force, overrideKey) {
    var now = new Date();
    var key = overrideKey || currentSceneKey(now);
    var container = document.getElementById('osdSceneBg');
    if (!container) return;
    if (!force && key === lastKey) return;

    var cfg = IMAGES[key];
    if (!cfg) return;

    var L = ensureLayers(container);
    var incoming = L.activeIsA ? L.b : L.a;
    var outgoing = L.activeIsA ? L.a : L.b;

    applyImage(incoming, cfg);
    incoming.style.opacity = '1';
    outgoing.style.opacity = '0';

    L.activeIsA = !L.activeIsA;
    lastKey = key;
  }

  function init() {
    render(true);
    clearInterval(tickTimer);
    tickTimer = setInterval(function () { render(false); }, 30000); // re-check twice a minute: catches hour/date rollovers
  }

  // preview() lets a test page force a specific scene regardless of the
  // real clock/calendar — not used by the production player.
  function preview(key) { render(true, key); }

  window.SceneTheme = { init: init, render: render, preview: preview, IMAGES: IMAGES, currentSceneKey: currentSceneKey };
})();
