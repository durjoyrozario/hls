/* =========================================================================
   scene-theme.js — Durjoy TV channel-OSD ambient art
   -------------------------------------------------------------------------
   Design rules this file follows (per request):
   - The SVG art never fills the whole box. There is NO full-canvas
     background rect anywhere. Every element hugs the edges / corners of
     the box (the "lining"), so the middle of the box stays transparent
     and shows the box's own dark CSS background — that's what keeps the
     channel name / logo readable without a heavy overlay.
   - Left side + bottom edge carry the main illustration cluster.
     Top edge carries sky elements (sun/moon/stars). The right side is
     kept mostly clear because that's where the channel name/logo sit.
   - One function per "scene" (time-of-day or festival). A small set of
     shared helper-builders (star fields, sun, moon, trees, ground line)
     keeps the individual scenes short and consistent.
   ========================================================================= */

(function () {
  'use strict';

  var VBW = 480, VBH = 150; // must match the SVG viewBox used everywhere below

  var HEAD = '<svg viewBox="0 0 ' + VBW + ' ' + VBH + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">';
  var TAIL = '</svg>';

  /* ---------------------------------------------------------------------
     Small re-usable builders. Every one of these only ever draws in a
     margin band near an edge/corner — never a full-canvas shape.
  --------------------------------------------------------------------- */

  // Scattered stars confined to the top band + a thin strip down the
  // left edge, so they read as "hugging the frame" rather than a sky-box.
  function stars(pts, color, opacity) {
    color = color || '#ffffff';
    opacity = opacity == null ? 0.85 : opacity;
    var s = '<g fill="' + color + '" opacity="' + opacity + '">';
    for (var i = 0; i < pts.length; i++) {
      s += '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="' + pts[i][2] + '"/>';
    }
    return s + '</g>';
  }

  function sparkleStar(cx, cy, r, color) {
    color = color || '#fff8dd';
    return '<path d="M' + cx + ',' + (cy - r) + ' L' + (cx + r * 0.28) + ',' + (cy - r * 0.28) +
      ' L' + (cx + r) + ',' + cy + ' L' + (cx + r * 0.28) + ',' + (cy + r * 0.28) +
      ' L' + cx + ',' + (cy + r) + ' L' + (cx - r * 0.28) + ',' + (cy + r * 0.28) +
      ' L' + (cx - r) + ',' + cy + ' L' + (cx - r * 0.28) + ',' + (cy - r * 0.28) + ' Z" fill="' + color + '"/>';
  }

  // Sun / moon disc + soft radial glow. id must be unique per <defs> use.
  function glowDisc(id, cx, cy, r, glowR, glowColor, diskColor) {
    return '<defs><radialGradient id="' + id + '" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + glowColor + '" stop-opacity="0.8"/>' +
      '<stop offset="100%" stop-color="' + glowColor + '" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + glowR + '" fill="url(#' + id + ')"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + diskColor + '"/>';
  }

  // True crescent via mask (a plain arc-subtraction path renders as a full
  // disc in some SVG rasterizers, so we cut the shape with a mask instead).
  function crescentMoon(id, cx, cy, r, color) {
    color = color || '#fdf1c6';
    var ox = cx + r * 0.55, oy = cy - r * 0.3;
    return '<mask id="' + id + '"><rect x="0" y="0" width="' + VBW + '" height="' + VBH + '" fill="#fff"/>' +
      '<circle cx="' + ox + '" cy="' + oy + '" r="' + (r * 0.92) + '" fill="#000"/></mask>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" mask="url(#' + id + ')"/>';
  }

  // A gentle, low, PARTIAL-width ground silhouette (never spans the full
  // box) that reads as "hills hugging the bottom-left corner".
  function groundContour(color, opacity) {
    opacity = opacity == null ? 1 : opacity;
    return '<path d="M0,150 L0,128 Q40,110 90,120 Q140,130 175,116 L175,150 Z" fill="' + color + '" opacity="' + opacity + '"/>';
  }

  // A thin stroked line tracing the very bottom edge — the "lining" touch
  // requested: it doesn't fill anything, it just decorates the border.
  function baseline(color, opacity) {
    opacity = opacity == null ? 0.35 : opacity;
    return '<path d="M0,149 Q120,144 240,148 T480,146" stroke="' + color + '" stroke-width="1.4" fill="none" opacity="' + opacity + '"/>';
  }

  function tree(x, y, scale, trunk, leaf) {
    scale = scale || 1;
    trunk = trunk || '#3a2a1c';
    leaf = leaf || '#2e5c2b';
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      '<rect x="-3" y="18" width="6" height="16" fill="' + trunk + '"/>' +
      '<ellipse cx="0" cy="6" rx="15" ry="19" fill="' + leaf + '"/>' +
      '<ellipse cx="-10" cy="16" rx="10" ry="12" fill="' + leaf + '"/>' +
      '<ellipse cx="10" cy="16" rx="10" ry="12" fill="' + leaf + '"/></g>';
  }

  function pineTree(x, y, scale, trunk, leaf) {
    scale = scale || 1;
    trunk = trunk || '#3a2a1c';
    leaf = leaf || '#245c33';
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      '<rect x="-2.5" y="34" width="5" height="8" fill="' + trunk + '"/>' +
      '<path d="M0,-4 L14,20 L8,20 L18,34 L-18,34 L-8,20 L-14,20 Z" fill="' + leaf + '"/></g>';
  }

  function bird(x, y, scale, color) {
    scale = scale || 1; color = color || '#241531';
    return '<path transform="translate(' + x + ',' + y + ') scale(' + scale + ')" d="M-6,0 Q-3,-4 0,0 Q3,-4 6,0" stroke="' + color + '" stroke-width="1.4" fill="none" opacity="0.7"/>';
  }

  function cloud(x, y, scale, color, opacity) {
    scale = scale || 1; color = color || '#ffffff'; opacity = opacity == null ? 0.85 : opacity;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')" fill="' + color + '" opacity="' + opacity + '">' +
      '<ellipse cx="0" cy="0" rx="16" ry="6"/><ellipse cx="12" cy="-3" rx="10" ry="5"/><ellipse cx="-11" cy="2" rx="9" ry="4"/></g>';
  }

  // Full-width rolling hills (two depth layers) — used only by the
  // time-of-day scenes, which are allowed to cover the whole box.
  function hillsFar(color, opacity) {
    opacity = opacity == null ? 1 : opacity;
    return '<path d="M0,150 L0,100 Q60,80 120,92 Q180,104 240,88 Q300,72 360,90 Q420,108 480,96 L480,150 Z" fill="' + color + '" opacity="' + opacity + '"/>';
  }
  function hillsNear(color, opacity) {
    opacity = opacity == null ? 1 : opacity;
    return '<path d="M0,150 L0,120 Q60,105 130,116 Q200,128 260,112 Q330,96 400,114 Q440,124 480,118 L480,150 Z" fill="' + color + '" opacity="' + opacity + '"/>';
  }

  function hut(x, y, scale, wall, roof) {
    scale = scale || 1; wall = wall || '#2e2038'; roof = roof || '#1c1428';
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      '<rect x="-9" y="0" width="18" height="14" fill="' + wall + '"/>' +
      '<path d="M-12,0 L0,-11 L12,0 Z" fill="' + roof + '"/>' +
      '<rect x="-2.5" y="6" width="5" height="8" fill="' + roof + '"/></g>';
  }

  function starField(count, w, h, seed) {
    var s = '<g fill="#ffffff">';
    var r = seed || 1;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var i = 0; i < count; i++) {
      var x = (rnd() * w).toFixed(1);
      var y = (rnd() * h).toFixed(1);
      var rad = (0.6 + rnd() * 0.9).toFixed(1);
      var op = (0.35 + rnd() * 0.55).toFixed(2);
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" opacity="' + op + '"/>';
    }
    return s + '</g>';
  }

  /* =========================================================================
     TIME OF DAY SCENES
  ========================================================================= */

  function sunrise() {
    return HEAD +
      glowDisc('sunR', 100, 118, 20, 68, '#ffcf7a', '#ffe6a3') +
      '<g stroke="#ffcf7a" stroke-width="1.6" opacity="0.55"><line x1="100" y1="88" x2="100" y2="78"/>' +
      '<line x1="124" y1="102" x2="132" y2="95"/><line x1="76" y1="102" x2="68" y2="95"/></g>' +
      cloud(60, 20, 0.8, '#ffe3c2', 0.65) + cloud(180, 14, 0.7, '#ffe3c2', 0.55) +
      cloud(300, 26, 0.9, '#ffd9b0', 0.6) + cloud(410, 16, 0.7, '#ffe3c2', 0.5) +
      bird(230, 32, 1, '#5a3a4a') + bird(244, 26, 0.8, '#5a3a4a') +
      bird(350, 44, 0.8, '#5a3a4a') +
      hillsFar('#3d2650', 0.85) +
      hillsNear('#2f1f3a', 1) +
      tree(38, 108, 0.85, '#33231c', '#3c6a3a') +
      tree(150, 118, 0.7, '#33231c', '#4a7a44') +
      tree(320, 116, 0.75, '#33231c', '#3c6a3a') +
      tree(430, 122, 0.6, '#33231c', '#4a7a44') +
      baseline('#ffb15e', 0.4) +
      starField(6, VBW, 26, 7) +
      TAIL;
  }

  function day() {
    return HEAD +
      glowDisc('sunD', 60, 32, 17, 50, '#fffde0', '#fff4b0') +
      '<g stroke="#fff2b0" stroke-width="1.6" opacity="0.6"><line x1="60" y1="8" x2="60" y2="0"/>' +
      '<line x1="80" y1="18" x2="86" y2="12"/><line x1="40" y1="18" x2="34" y2="12"/>' +
      '<line x1="36" y1="32" x2="28" y2="32"/></g>' +
      cloud(150, 20, 1, '#ffffff', 0.9) + cloud(260, 32, 0.7, '#ffffff', 0.75) +
      cloud(360, 16, 0.85, '#ffffff', 0.85) + cloud(440, 26, 0.6, '#ffffff', 0.65) +
      bird(200, 16, 1, '#2e5c2b') + bird(214, 22, 0.8, '#2e5c2b') +
      bird(390, 40, 0.9, '#2e5c2b') +
      hillsFar('#4a8a42', 1) +
      hillsNear('#3f7d3a', 1) +
      '<path d="M0,150 L0,138 Q60,128 130,134 Q200,140 260,130 Q330,120 400,132 Q440,138 480,134 L480,150 Z" fill="#5a9e4a"/>' +
      tree(42, 104, 1, '#3a2a1c', '#2e5c2b') + tree(110, 122, 0.65, '#3a2a1c', '#376b34') +
      tree(300, 118, 0.9, '#3a2a1c', '#2e5c2b') + tree(400, 128, 0.6, '#3a2a1c', '#376b34') +
      '<g fill="#e7f07a" opacity="0.8"><circle cx="20" cy="140" r="2"/><circle cx="70" cy="146" r="1.6"/><circle cx="150" cy="144" r="1.8"/>' +
      '<circle cx="240" cy="142" r="1.6"/><circle cx="340" cy="146" r="1.8"/><circle cx="420" cy="142" r="1.6"/></g>' +
      baseline('#2e5c2b', 0.35) +
      TAIL;
  }

  function sunset() {
    return HEAD +
      glowDisc('sunS', 90, 116, 22, 74, '#ffb562', '#ffcf8a') +
      cloud(60, 16, 0.7, '#c96a4a', 0.6) + cloud(200, 24, 1, '#f2a06a', 0.75) +
      cloud(320, 14, 0.8, '#e2673f', 0.6) + cloud(430, 26, 0.7, '#c96a4a', 0.55) +
      bird(150, 30, 1, '#2a1730') + bird(166, 24, 0.8, '#2a1730') +
      bird(360, 40, 0.9, '#2a1730') + bird(374, 34, 0.7, '#2a1730') +
      hillsFar('#3a1f42', 0.85) +
      hillsNear('#1c0f24', 1) +
      tree(36, 106, 0.8, '#20131a', '#241531') +
      tree(130, 120, 0.65, '#20131a', '#2e1a38') +
      tree(310, 114, 0.85, '#20131a', '#241531') +
      tree(420, 124, 0.6, '#20131a', '#2e1a38') +
      '<g stroke="#5c2c56" stroke-width="1.4" fill="none" opacity="0.5"><path d="M250,26 q5,-5 10,0 q5,-5 10,0"/></g>' +
      baseline('#ffb15e', 0.4) +
      starField(4, VBW, 22, 11) +
      TAIL;
  }

  function night() {
    return HEAD +
      glowDisc('moonN', 66, 32, 19, 58, '#eaf2ff', '#f4f1e6') +
      '<circle cx="72" cy="25" r="3" fill="#d9d6c6" opacity="0.5"/><circle cx="60" cy="38" r="2.2" fill="#d9d6c6" opacity="0.45"/>' +
      starField(28, VBW, 90, 3) +
      sparkleStar(230, 40, 4, '#fff') + sparkleStar(380, 22, 3.4, '#fff') +
      hillsFar('#101a30', 1) +
      hillsNear('#0a1120', 1) +
      tree(48, 100, 0.9, '#0a1120', '#16233f') +
      tree(140, 118, 0.6, '#0a1120', '#16233f') +
      tree(320, 112, 0.8, '#0a1120', '#16233f') +
      hut(190, 122, 0.9, '#141a2c', '#0a1120') +
      hut(400, 116, 0.75, '#141a2c', '#0a1120') +
      bird(250, 46, 0.7, '#1a2a45') +
      '<g fill="#ffe98a" opacity="0.7"><circle cx="120" cy="128" r="1.5"/><circle cx="220" cy="138" r="1.3"/>' +
      '<circle cx="300" cy="132" r="1.4"/><circle cx="430" cy="136" r="1.3"/></g>' +
      baseline('#3a5a8a', 0.35) +
      TAIL;
  }

  /* =========================================================================
     FESTIVAL SCENES
  ========================================================================= */

  function christmas() {
    return HEAD +
      glowDisc('xmasMoon', 440, 22, 12, 34, '#ffe9a8', '#fff3c6') +
      stars([[80, 14, 0.9], [140, 24, 0.7], [30, 40, 0.8], [400, 14, 0.7]], '#fff', 0.8) +
      sparkleStar(245, 12, 5, '#fff3c6') +
      groundContour('#0d2247', 0.9) +
      // little stable / manger
      '<g transform="translate(96,96)">' +
      '<path d="M-30,54 L-30,20 L0,4 L30,20 L30,54 Z" fill="#1c1230"/>' +
      '<path d="M-34,20 L0,0 L34,20 L28,22 L0,7 L-28,22 Z" fill="#2a1a12"/>' +
      '<rect x="-8" y="30" width="16" height="24" fill="#12080c"/>' +
      '<circle cx="0" cy="8" r="3" fill="#ffe9a8"/></g>' +
      // pine tree with ornaments + star
      pineTree(30, 92, 1.05, '#3a2a10', '#1f5c33') +
      sparkleStar(30, 92, 4.5, '#ffe066') +
      '<g><circle cx="22" cy="112" r="2.4" fill="#e0483c"/><circle cx="38" cy="118" r="2.4" fill="#ffd23f"/>' +
      '<circle cx="26" cy="124" r="2.4" fill="#4aa8e0"/><circle cx="34" cy="106" r="2.2" fill="#e0483c"/></g>' +
      // Santa, simplified: red coat, white trim, hat
      '<g transform="translate(150,118)">' +
      '<ellipse cx="0" cy="16" rx="13" ry="16" fill="#c22f2f"/>' +
      '<rect x="-13" y="24" width="26" height="6" fill="#fff" opacity="0.9"/>' +
      '<circle cx="0" cy="-4" r="9" fill="#f2c9a0"/>' +
      '<path d="M-9,-6 Q0,-22 12,-8 Q4,-13 -4,-11 Q2,-6 -9,-6 Z" fill="#c22f2f"/>' +
      '<circle cx="12" cy="-8" r="2.4" fill="#fff"/>' +
      '<rect x="-9" y="-8" width="18" height="4" fill="#fff" opacity="0.9"/>' +
      '<rect x="-3" y="6" width="6" height="10" fill="#111"/></g>' +
      // gift boxes
      '<g transform="translate(178,132)"><rect x="0" y="0" width="14" height="14" fill="#8a3b8f"/>' +
      '<rect x="5.5" y="0" width="3" height="14" fill="#ffe066"/><rect x="0" y="5.5" width="14" height="3" fill="#ffe066"/></g>' +
      // string-light "lining" garland along the very bottom edge
      '<g opacity="0.85"><circle cx="10" cy="147" r="1.6" fill="#ff5a5a"/><circle cx="34" cy="147" r="1.6" fill="#5ad1ff"/>' +
      '<circle cx="58" cy="147" r="1.6" fill="#ffe066"/><circle cx="82" cy="147" r="1.6" fill="#5aff8a"/>' +
      '<circle cx="106" cy="147" r="1.6" fill="#ff5a5a"/><circle cx="420" cy="147" r="1.6" fill="#5ad1ff"/>' +
      '<circle cx="444" cy="147" r="1.6" fill="#ffe066"/><circle cx="468" cy="147" r="1.6" fill="#ff5a5a"/></g>' +
      // snowflakes
      '<g fill="#fff" opacity="0.6"><circle cx="200" cy="30" r="1.4"/><circle cx="230" cy="50" r="1.2"/><circle cx="60" cy="60" r="1.2"/></g>' +
      baseline('#ffe9a8', 0.3) +
      TAIL;
  }

  function eid() {
    return HEAD +
      // large, prominent crescent — "ordhek chad"
      glowDisc('eidGlow', 70, 34, 0, 58, '#fff3cf', 'none') +
      crescentMoon('eidMoonMask', 70, 34, 26, '#fdf1c6') +
      sparkleStar(112, 46, 5, '#fdf1c6') +
      stars([[150, 16, 0.8], [180, 28, 0.6], [30, 60, 0.7], [400, 16, 0.7], [430, 30, 0.6]], '#fff', 0.75) +
      groundContour('#1c1230', 0.9) +
      // mosque: dome + minaret
      '<g transform="translate(70,150)">' +
      '<rect x="-40" y="-46" width="80" height="46" fill="#1c1230"/>' +
      '<path d="M-40,-46 a40,26 0 0,1 80,0 Z" fill="#2a1a3a"/>' +
      '<circle cx="0" cy="-72" r="9" fill="#2a1a3a"/><path d="M-6,-78 Q0,-92 6,-78 Z" fill="#2a1a3a"/>' +
      '<circle cx="0" cy="-90" r="2" fill="#fdf1c6"/>' +
      '<rect x="-56" y="-70" width="8" height="70" fill="#1c1230"/>' +
      '<path d="M-56,-70 Q-52,-82 -48,-70 Z" fill="#2a1a3a"/>' +
      '<rect x="48" y="-60" width="8" height="60" fill="#1c1230"/>' +
      '<path d="M48,-60 Q52,-72 56,-60 Z" fill="#2a1a3a"/>' +
      '<circle cx="-10" cy="-20" r="4" fill="#3a2540"/><circle cx="10" cy="-20" r="4" fill="#3a2540"/></g>' +
      // hanging lantern (fanous)
      '<g transform="translate(150,60)" opacity="0.95"><line x1="0" y1="-16" x2="0" y2="-4" stroke="#8a6a2f" stroke-width="1.4"/>' +
      '<path d="M-7,-4 L7,-4 L9,4 L5,16 L-5,16 L-9,4 Z" fill="#ffce6b"/>' +
      '<rect x="-7" y="-4" width="14" height="3" fill="#8a6a2f"/><circle cx="0" cy="19" r="2" fill="#8a6a2f"/></g>' +
      baseline('#ffce6b', 0.35) +
      TAIL;
  }

  function durgapuja() {
    return HEAD +
      glowDisc('pujaGlow', 60, 60, 40, 70, '#ffcf7a', 'transparent') +
      stars([[400, 16, 0.8], [430, 30, 0.6], [20, 20, 0.6]], '#ffe6a8', 0.6) +
      groundContour('#2a0f2e', 0.85) +
      // pandal arch
      '<path d="M6,150 L6,64 Q60,26 114,64 L114,150" stroke="#b5741f" stroke-width="5" fill="none"/>' +
      '<path d="M6,64 Q60,26 114,64" stroke="#ffce6b" stroke-width="2" fill="none" opacity="0.7"/>' +
      // Durga idol: crown, face, multiple simplified arms, trishul
      '<g transform="translate(60,132)">' +
      '<path d="M-14,18 Q0,30 14,18 L14,4 Q0,-4 -14,4 Z" fill="#7a2e18"/>' + // saree body
      '<circle cx="0" cy="-16" r="9" fill="#f4c98a"/>' + // face
      '<path d="M-9,-24 Q0,-38 9,-24 Q4,-30 0,-29 Q-4,-30 -9,-24 Z" fill="#ffce6b"/>' + // crown
      '<circle cx="0" cy="-30" r="2.4" fill="#ff5a5a"/>' +
      '<g stroke="#7a2e18" stroke-width="3" stroke-linecap="round">' +
      '<line x1="-9" y1="-8" x2="-26" y2="-16"/><line x1="-9" y1="-2" x2="-30" y2="-2"/><line x1="-9" y1="4" x2="-26" y2="10"/>' +
      '<line x1="9" y1="-8" x2="26" y2="-16"/><line x1="9" y1="-2" x2="30" y2="-2"/><line x1="9" y1="4" x2="26" y2="10"/></g>' +
      '<line x1="-26" y1="-16" x2="-34" y2="-30" stroke="#8a8a9a" stroke-width="1.6"/>' + // trishul hint
      '<path d="M-38,-34 l-3,-4 M-34,-30 l0,-6 M-30,-34 l3,-4" stroke="#c9c9d6" stroke-width="1.4" fill="none"/></g>' +
      // diya garland along the lining
      '<g>' +
      '<g transform="translate(150,142)"><rect x="-4" y="0" width="8" height="4" fill="#b5741f"/><path d="M0,-1 q-2,-5 0,-7 q2,2 0,7" fill="#ffce6b"/></g>' +
      '<g transform="translate(180,144)"><rect x="-4" y="0" width="8" height="4" fill="#b5741f"/><path d="M0,-1 q-2,-5 0,-7 q2,2 0,7" fill="#ffce6b"/></g>' +
      '<g transform="translate(410,144)"><rect x="-4" y="0" width="8" height="4" fill="#b5741f"/><path d="M0,-1 q-2,-5 0,-7 q2,2 0,7" fill="#ffce6b"/></g>' +
      '<g transform="translate(440,142)"><rect x="-4" y="0" width="8" height="4" fill="#b5741f"/><path d="M0,-1 q-2,-5 0,-7 q2,2 0,7" fill="#ffce6b"/></g></g>' +
      // marigolds
      '<g fill="#ff9d2f" opacity="0.85"><circle cx="130" cy="120" r="2"/><circle cx="20" cy="100" r="1.8"/><circle cx="140" cy="136" r="1.6"/></g>' +
      baseline('#ffce6b', 0.3) +
      TAIL;
  }

  function easter() {
    return HEAD +
      glowDisc('easterGlow', 46, 40, 34, 72, '#fff3d0', 'transparent') +
      stars([[150, 14, 0.6]], '#ffe6b0', 0.4) +
      groundContour('#1c1420', 0.85) +
      // cross with a very simplified, iconographic figure — line-art style
      glowDisc('crossGlow', 44, 88, 0, 34, '#ffd9a0', 'none') +
      '<g transform="translate(44,150)" stroke="#2a1720" stroke-width="6" stroke-linecap="round">' +
      '<line x1="0" y1="0" x2="0" y2="-64"/><line x1="-16" y1="-42" x2="16" y2="-42"/></g>' +
      '<g transform="translate(44,84)">' +
      '<circle cx="0" cy="0" r="4.2" fill="#3a2030"/>' +
      '<path d="M-7,4 Q0,10 7,4" stroke="#3a2030" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>' +
      // empty tomb + radiant risen figure — symbol of resurrection
      '<g transform="translate(140,150)">' +
      '<path d="M-26,0 L-26,-26 Q0,-46 26,-26 L26,0 Z" fill="#6a5876" opacity="0.9"/>' +
      '<path d="M-20,0 L-20,-22 Q0,-38 20,-22 L20,0 Z" fill="#241522"/>' + // dark doorway opening
      '<circle cx="22" cy="-2" r="9" fill="#8a7896"/>' + // stone rolled aside
      '<path d="M-26,-26 Q0,-46 26,-26" stroke="#c9b8d0" stroke-width="1.4" fill="none" opacity="0.6"/></g>' +
      glowDisc('risenGlow', 140, 96, 10, 46, '#fff3d0', '#fff9e6') +
      '<g stroke="#fff3d0" stroke-width="1.4" opacity="0.65"><line x1="140" y1="60" x2="140" y2="48"/>' +
      '<line x1="120" y1="70" x2="112" y2="64"/><line x1="160" y1="70" x2="168" y2="64"/>' +
      '<line x1="120" y1="96" x2="108" y2="96"/><line x1="160" y1="96" x2="172" y2="96"/></g>' +
      baseline('#f4c07a', 0.35) +
      TAIL;
  }

  function buddhapurnima() {
    return HEAD +
      glowDisc('bpMoon', 400, 26, 20, 56, '#fdf6e3', '#fdf6e3') +
      stars([[60, 16, 0.8], [90, 28, 0.6], [340, 14, 0.6], [440, 40, 0.5]], '#fff', 0.6) +
      groundContour('#1a2e1f', 0.85) +
      // Bodhi tree (broad canopy) behind the statue
      '<g transform="translate(60,64)">' +
      '<rect x="-3" y="30" width="6" height="24" fill="#3a2a1c"/>' +
      '<ellipse cx="0" cy="6" rx="34" ry="22" fill="#1f4a2c"/>' +
      '<ellipse cx="-20" cy="16" rx="16" ry="14" fill="#245c33"/>' +
      '<ellipse cx="20" cy="16" rx="16" ry="14" fill="#245c33"/></g>' +
      // simplified seated Buddha silhouette
      '<g transform="translate(60,150)" fill="#caa24a">' +
      '<path d="M-16,0 Q-18,-10 -8,-12 L8,-12 Q18,-10 16,0 Z"/>' + // base/lap
      '<circle cx="0" cy="-22" r="9"/>' + // head
      '<path d="M0,-33 a3,3 0 1,1 0.1,0" fill="#caa24a"/>' + // ushnisha bump
      '<path d="M-9,-14 Q0,-6 9,-14" stroke="#caa24a" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      // small stupa
      '<g transform="translate(126,150)" fill="#e8dcc0">' +
      '<rect x="-14" y="-14" width="28" height="14"/>' +
      '<path d="M-14,-14 a14,14 0 0,1 28,0 Z"/>' +
      '<rect x="-2.5" y="-30" width="5" height="16"/><circle cx="0" cy="-32" r="2.6"/></g>' +
      // lotus dots + prayer-flag garland along the lining
      '<g fill="#f2b6c6" opacity="0.85"><circle cx="20" cy="140" r="2"/><circle cx="150" cy="140" r="1.8"/><circle cx="170" cy="134" r="1.6"/></g>' +
      '<g opacity="0.8"><path d="M0,138 L470,132" stroke="#8a6a2f" stroke-width="1" fill="none"/>' +
      '<rect x="20" y="132" width="7" height="7" fill="#4aa8e0"/><rect x="40" y="130" width="7" height="7" fill="#ffe066"/>' +
      '<rect x="420" y="126" width="7" height="7" fill="#e0483c"/><rect x="444" y="124" width="7" height="7" fill="#5aff8a"/></g>' +
      baseline('#caa24a', 0.3) +
      TAIL;
  }

  var SCENES = {
    sunrise: sunrise,
    day: day,
    sunset: sunset,
    night: night,
    christmas: christmas,
    eid: eid,
    durgapuja: durgapuja,
    easter: easter,
    buddhapurnima: buddhapurnima
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
     Public API
  ========================================================================= */
  var lastKey = null;
  var tickTimer = null;

  function render(force, overrideKey) {
    var now = new Date();
    var key = overrideKey || currentSceneKey(now);
    var bg = document.getElementById('osdSceneBg');
    if (bg && (force || key !== lastKey)) {
      bg.innerHTML = SCENES[key] ? SCENES[key]() : '';
      lastKey = key;
    }
  }

  function init() {
    render(true);
    clearInterval(tickTimer);
    tickTimer = setInterval(function () { render(false); }, 30000); // re-check twice a minute: catches hour/date rollovers
  }

  // preview() lets a test page force a specific scene regardless of the
  // real clock/calendar — not used by the production player.
  function preview(key) { render(true, key); }

  window.SceneTheme = { init: init, render: render, preview: preview, SCENES: SCENES, currentSceneKey: currentSceneKey };
})();
