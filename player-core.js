/* ============================================================
   DURJOY TV — player-core.js
   Shared playback engine used by index.html
   Handles: JSON source loading, HLS playback, multi-server
   fallback, favorites, last-channel memory, remote+touch nav
   ============================================================ */

const DEFAULT_SOURCE_URL = "https://raw.githubusercontent.com/durjoyrozario/hls/refs/heads/tv/channels.json";

const DurjoyCore = (function () {
  let channels = [];
  let currentIndex = 0;
  let currentSource = 0;
  let hls = null;
  let favorites = [];
  let previousIndex = -1;
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 6;
  let retryTimer = null;
  let isOffline = false;
  let offlineNoSignalTimer = null;
  let autoFallbackActive = false;

  // ---- storage helpers ----
  function getSourceUrl() {
    try { return localStorage.getItem('durjoy_source_url') || DEFAULT_SOURCE_URL; }
    catch (e) { return DEFAULT_SOURCE_URL; }
  }
  function setSourceUrl(url) {
    try { localStorage.setItem('durjoy_source_url', url); } catch (e) {}
  }
  function loadLastChannel() {
    try {
      const s = localStorage.getItem('lastChannelIndex');
      const i = s !== null ? parseInt(s, 10) : 0;
      return (!isNaN(i) && i >= 0 && i < channels.length) ? i : 0;
    } catch (e) { return 0; }
  }
  function saveLastChannel(idx) {
    try { localStorage.setItem('lastChannelIndex', idx.toString()); } catch (e) {}
  }
  function loadLastSource(chIdx) {
    try {
      const s = localStorage.getItem('lastSource_' + chIdx);
      const i = s !== null ? parseInt(s, 10) : 0;
      const max = channels[chIdx].sources.length;
      return (!isNaN(i) && i >= 0 && i < max) ? i : 0;
    } catch (e) { return 0; }
  }
  function saveLastSource(chIdx, srcIdx) {
    try { localStorage.setItem('lastSource_' + chIdx, srcIdx.toString()); } catch (e) {}
  }
  function loadFavorites() {
    try { favorites = JSON.parse(localStorage.getItem('myFavs')) || []; }
    catch (e) { favorites = []; }
  }
  function saveFavorites() {
    try { localStorage.setItem('myFavs', JSON.stringify(favorites)); } catch (e) {}
  }

  // ---- category auto-detect fallback ----
  function detectCategory(name) {
    const n = name.toLowerCase();
    if (/sport|cricket|football|fifa|espn|ten\s?\d|star sports|sony ten|t sports|bein|eurosport|ptv sports/.test(n)) return 'Sports';
    if (/news|24|jamuna|somoy|ntv|independent|jazeera|cnn|bbc|dw news|ekattor|dbc/.test(n)) return 'News';
    if (/cinema|movie|max|gold|hbo|pix|action|flix/.test(n)) return 'Movies';
    if (/kids|cartoon|nick|pogo|disney|discovery kids|sony yay|motu|gopal/.test(n)) return 'Kids';
    return 'GEC';
  }

  function normalizeChannels(raw) {
    const list = Array.isArray(raw) ? raw : (raw.channels || []);
    return list.map(ch => ({
      name: ch.name || 'Unknown',
      category: ch.category || detectCategory(ch.name || ''),
      logo: ch.logo || '',
      sources: ch.sources || []
    }));
  }

  // ---- JSON fetch ----
  async function fetchChannels() {
    const url = getSourceUrl();
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      channels = normalizeChannels(data);
      try { localStorage.setItem('durjoy_channels_cache', JSON.stringify(channels)); } catch (e) {}
      return { ok: true, channels };
    } catch (err) {
      // fallback to cache
      try {
        const cached = localStorage.getItem('durjoy_channels_cache');
        if (cached) {
          channels = JSON.parse(cached);
          return { ok: false, channels, error: err.message, usedCache: true };
        }
      } catch (e) {}
      channels = [];
      return { ok: false, channels: [], error: err.message };
    }
  }

  function getChannels() { return channels; }
  function getCategories() {
    const set = new Set();
    channels.forEach(c => set.add(c.category));
    return Array.from(set);
  }
  function getChannelsByCategory(cat) {
    return channels
      .map((c, i) => ({ ...c, index: i }))
      .filter(c => c.category === cat);
  }
  function getFavorites() { return favorites; }
  function isFavorite(idx) { return favorites.includes(idx); }
  function toggleFavoriteIndex(idx) {
    if (favorites.includes(idx)) favorites = favorites.filter(i => i !== idx);
    else favorites.push(idx);
    saveFavorites();
    return favorites.includes(idx);
  }

  function getCurrentIndex() { return currentIndex; }
  function getPreviousIndex() { return previousIndex; }
  function getCurrentSourceIndex() { return currentSource; }

  return {
    DEFAULT_SOURCE_URL,
    getSourceUrl, setSourceUrl,
    loadLastChannel, saveLastChannel,
    loadLastSource, saveLastSource,
    loadFavorites, saveFavorites,
    fetchChannels, getChannels,
    getCategories, getChannelsByCategory,
    getFavorites, isFavorite, toggleFavoriteIndex,
    getCurrentIndex, getPreviousIndex, getCurrentSourceIndex,
    setCurrentIndex: (i) => currentIndex = i,
    setPreviousIndex: (i) => previousIndex = i,
    setCurrentSourceIndex: (i) => currentSource = i,
    detectCategory
  };
})();
