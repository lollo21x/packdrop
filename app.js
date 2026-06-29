// ============================================================
// PackDrop WC26 — Main Application Logic
// Vanilla JS, Firebase Compat SDK
// ============================================================

(function() {
'use strict';

// ── Firebase Initialization ──
let auth = null;
let db = null;
let googleProvider = null;
let firebaseReady = false;

try {
  firebaseReady = typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined';
  if (firebaseReady) {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    // Always show the account picker. This makes the first-login flow
    // predictable: tap → pick account → in. Avoids silent single-account
    // sign-in that can surprise the user.
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      console.warn('Firestore persistence unavailable:', err.code);
    });
  }
} catch (err) {
  console.warn('Firebase unavailable at boot:', err);
  firebaseReady = false;
}

// ── Global State ──
let currentUser = null;
let userData = null;
let userCollection = {};     // { cardId: { count, unlockedAt } }
let selectedPack = 'nations';
let isAnimating = false;
let timerInterval = null;
let deferredInstallPrompt = null;
let appMode = 'booting';
let navigationReady = false;
let packCarouselReady = false;
let profileHandlersReady = false;
let collectionSearchReady = false;
let userListenerUnsubscribe = null;
let collectionListenerUnsubscribe = null;
let pendingPackSyncInProgress = false;
// Connectivity probes: a cached session is only used as a TRUE fallback
// (genuine offline / unreachable backend), never as a "Firebase is a bit
// slow" shortcut. These flags drive that behaviour.
let authRestoreInFlight = false;
let onlineHeartbeatOk = true; // optimistic until a probe fails
let cachedFallbackActive = false;

const LOCAL_SESSION_KEY = 'packdrop:last-session:v2';
const LAST_SECTION_KEY = 'packdrop:last-section';
const PENDING_PACK_SYNC_KEY = 'packdrop:pending-pack-sync:v1';
const PLAYER_PHOTO_CACHE_KEY = 'packdrop:player-photo-cache:v1';
const UPDATE_CURRENT_SHA_KEY = 'packdrop:update-current-sha';
const UPDATE_PENDING_SHA_KEY = 'packdrop:update-pending-sha';
const UPDATE_IGNORED_UNTIL_KEY = 'packdrop:update-ignored-until';
// How long we wait for Firebase Auth to restore a session before falling
// back to the cached copy. Firebase normally restores in 1–3s; 7s gives
// plenty of headroom even on slow first hops, while still being short
// enough that a genuinely offline user gets the cached UI quickly.
const AUTH_RESTORE_TIMEOUT = 7000;
const GITHUB_LATEST_COMMIT_URL = 'https://api.github.com/repos/lollo21x/packdrop/commits/main';
const FOOTBALL_API_HOST = 'v3.football.api-sports.io';
const FOOTBALL_API_KEY = '048d7f300beea42f42d12638b7a942ea';
const FOOTBALL_API_DEFAULT_SEASON = 2025;
// Admin console for Pronostici: list of Firebase Auth UIDs that can set
// match results. Replace/add your own uid(s) here.
const PD_ADMIN_UIDS = [
  'ZTCTToeJKUSo7AAtARvMRi2TLQ83'
];
const PREDICTION_REWARD = 10;        // bonus packs for a correct score
const PREDICTION_LOCK_SECONDS = 60;  // lock predictions this many seconds before kickoff
const PD_PRED_CLAIMED_KEY = 'packdrop:pd-pred-claimed-v1';
let pendingPackSync = loadPendingPackSync();
let playerPhotoCache = loadPlayerPhotoCache();
const playerPhotoInFlight = new Set();

// ── DOM References (cached) ──
const $ = id => document.getElementById(id);
const loginScreen     = $('login-screen');
const onboardingModal = $('onboarding-modal');
const appEl           = $('app');
const bottomNav       = $('bottom-nav');
const packOverlay     = $('pack-overlay');
const cardModal       = $('card-modal');

function svgIcon(name, className = 'icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

const NATION_CODES = {
  'Argentina': 'ar',
  'Brasile': 'br',
  'Francia': 'fr',
  'Germania': 'de',
  'Spagna': 'es',
  'Inghilterra': 'gb-eng',
  'Portogallo': 'pt',
  'Paesi Bassi': 'nl',
  'Belgio': 'be',
  'Croazia': 'hr',
  'Uruguay': 'uy',
  'Colombia': 'co',
  'Marocco': 'ma',
  'USA': 'us',
  'Giappone': 'jp',
  'Messico': 'mx',
  'Norvegia': 'no',
  'Senegal': 'sn',
  'Turchia': 'tr',
  'Scozia': 'gb-sct',
  'Australia': 'au',
  'Iran': 'ir',
  'Corea del Sud': 'kr',
  'Arabia Saudita': 'sa',
  'Uzbekistan': 'uz',
  'Iraq': 'iq',
  'Giordania': 'jo',
  'Qatar': 'qa',
  'Algeria': 'dz',
  'Cabo Verde': 'cv',
  'Congo DR': 'cd',
  "Costa d'Avorio": 'ci',
  'Egitto': 'eg',
  'Ghana': 'gh',
  'Sud Africa': 'za',
  'Tunisia': 'tn',
  'Curaçao': 'cw',
  'Haiti': 'ht',
  'Panama': 'pa',
  'Ecuador': 'ec',
  'Paraguay': 'py',
  'Nuova Zelanda': 'nz',
  'Austria': 'at',
  'Bosnia ed Erzegovina': 'ba',
  'Repubblica Ceca': 'cz',
  'Svezia': 'se',
  'Svizzera': 'ch',
  'Canada': 'ca',
  'Liberia': 'lr',
  'Nigeria': 'ng',
  'Romania': 'ro',
  'Corea del Nord': 'kp',
  'Cile': 'cl'
};

const PLAYER_API_LOOKUP = {
  star_messi: { search: 'Messi', team: 9568, season: 2025 },
  star_mbappe: { search: 'Mbappe', team: 541, season: 2025 },
  star_vinicius: { search: 'Vinicius', team: 541, season: 2025 },
  star_haaland: { search: 'Haaland', team: 50, season: 2025 },
  star_bellingham: { search: 'Bellingham', team: 541, season: 2025 },
  star_yamal: { search: 'Yamal', team: 529, season: 2025 },
  star_ronaldo: { search: 'Ronaldo', team: 2939, season: 2025 },
  star_salah: { search: 'Salah', team: 40, season: 2025 },
  star_kane: { search: 'Kane', team: 157, season: 2025 },
  star_rodri: { search: 'Rodri', team: 50, season: 2025 },
  star_pedri: { search: 'Pedri', team: 529, season: 2025 },
  star_son: { search: 'Son', team: 47, season: 2025 },
  star_de_bruyne: { search: 'De Bruyne', team: 50, season: 2023 },
  star_modric: { search: 'Modric', team: 541, season: 2023 },
  star_musiala: { search: 'Musiala', team: 157, season: 2025 },
  star_pulisic: { search: 'Pulisic', team: 489, season: 2025 },
  star_james: { search: 'James Rodriguez', team: 529, season: 2022 },
  star_nunez: { search: 'Nunez', team: 40, season: 2025 },
  star_ziyech: { search: 'Ziyech', team: 2938, season: 2024 },
  star_saka: { search: 'Saka', team: 42, season: 2025 },
  star_reijnders: { search: 'Reijnders', team: 489, season: 2024 },
  star_gvardiol: { search: 'Gvardiol', team: 50, season: 2025 },
  star_felix: { search: 'Felix', team: 529, season: 2024 },
  star_diaz: { search: 'Luis Diaz', team: 40, season: 2025 },
  star_mitoma: { search: 'Mitoma', team: 51, season: 2025 },
  star_isak: { search: 'Isak', team: 34, season: 2025 },
  star_dembele: { search: 'Dembele', team: 85, season: 2025 },
  star_neuer: { search: 'Neuer', team: 157, season: 2025 },
  star_david: { search: 'Jonathan David', team: 79, season: 2024 },
  star_lookman: { search: 'Lookman', team: 499, season: 2025 },
  star_raul: { search: 'Raul Jimenez', team: 55, season: 2025 },
  star_schick: { search: 'Schick', team: 168, season: 2025 },
  star_shaqiri: { search: 'Shaqiri', team: 1616, season: 2023 },
  star_tierney: { search: 'Tierney', team: 42, season: 2023 },
  star_calhanoglu: { search: 'Calhanoglu', team: 505, season: 2025 },
  star_leckie: { search: 'Leckie', team: 80, season: 2024 },
  star_al_dawsari: { search: 'Al-Dawsari', team: 7011, season: 2024 },
  star_akram: { search: 'Afif', team: 3153, season: 2023 },
  star_posch: { search: 'Posch', team: 500, season: 2024 },
  star_dzeko: { search: 'Dzeko', team: 611, season: 2023 },
  star_wood: { search: 'Chris Wood', team: 65, season: 2025 },
  star_mahrez: { search: 'Mahrez', team: 2929, season: 2024 },
  star_kakuta: { search: 'Kakuta', team: 96, season: 2023 },
  star_shomurodov: { search: 'Shomurodov', team: 497, season: 2024 },
  star_nazon: { search: 'Nazon', team: 85, season: 2022 },
  star_estupinan: { search: 'Estupinan', team: 51, season: 2025 },
  star_almiron: { search: 'Almiron', team: 34, season: 2023 },
  star_sarr: { search: 'Ismaila Sarr', team: 66, season: 2025 },
  // Icon players: use direct photoId where available to avoid API search failures
  // photoId = direct API-Sports player ID → URL: https://media.api-sports.io/football/players/{id}.png
  icon_pele:          { search: 'Pele', photoId: 164082 },
  icon_maradona:      { search: 'Maradona', photoId: 7930 },
  icon_zidane:        { search: 'Zidane', team: 541, season: 2006 },
  icon_ronaldo9:      { search: 'Ronaldo Nazario', photoId: 3334 },
  icon_cruyff:        { search: 'Cruyff', photoId: 164200 },
  icon_beckenbauer:   { search: 'Beckenbauer', photoId: 164201 },
  icon_ronaldinho:    { search: 'Ronaldinho', photoId: 2364 },
  icon_henry:         { search: 'Henry', photoId: 1454 },
  icon_figo:          { search: 'Figo', photoId: 1489 },
  icon_eusebio:       { search: 'Eusebio', photoId: 164202 },
  icon_shearer:       { search: 'Shearer', photoId: 164203 },
  icon_gerrard:       { search: 'Gerrard', photoId: 2315 },
  icon_charlton:      { search: 'Bobby Charlton', photoId: 164204 },
  icon_roberto_carlos: { search: 'Roberto Carlos', photoId: 2366 },
  icon_cafu:          { search: 'Cafu', photoId: 2361 },
  icon_ballack:       { search: 'Ballack', photoId: 2398 },
  icon_klose:         { search: 'Klose', team: 157, season: 2014 },
  icon_platini:       { search: 'Platini', photoId: 164205 },
  icon_cantona:       { search: 'Cantona', photoId: 164206 },
  icon_vieira:        { search: 'Vieira', photoId: 2319 },
  icon_seedorf:       { search: 'Seedorf', photoId: 2363 },
  icon_bergkamp:      { search: 'Bergkamp', photoId: 164207 },
  icon_davids:        { search: 'Davids', photoId: 164208 },
  icon_sammer:        { search: 'Sammer', photoId: 164209 },
  icon_matthaus:      { search: 'Matthaus', photoId: 164210 },
  icon_suker:         { search: 'Suker', photoId: 164211 },
  icon_boban:         { search: 'Boban', photoId: 164212 },
  icon_modric_icon:   { search: 'Modric', team: 541, season: 2018 },
  icon_valderrama:    { search: 'Valderrama', photoId: 164213 },
  icon_asprilla:      { search: 'Asprilla', photoId: 164214 },
  icon_larsson:       { search: 'Larsson', photoId: 164215 },
  icon_ibrahimovic:   { search: 'Ibrahimovic', team: 489, season: 2021 },
  icon_weah:          { search: 'Weah', photoId: 164216 },
  icon_drogba:        { search: 'Drogba', team: 49, season: 2014 },
  icon_essien:        { search: 'Essien', photoId: 164217 },
  icon_okocha:        { search: 'Okocha', photoId: 164218 },
  icon_el_hadary:     { search: 'El-Hadary', team: 7024, season: 2018 },
  icon_mane_icon:     { search: 'Mane', team: 40, season: 2021 },
  icon_diop:          { search: 'Papa Diop', photoId: 164219 },
  icon_hagi:          { search: 'Hagi', photoId: 164220 },
  icon_nedved:        { search: 'Nedved', photoId: 164221 },
  icon_scholes:       { search: 'Scholes', photoId: 2320 },
  icon_kahn:          { search: 'Kahn', photoId: 164222 },
  icon_nakata:        { search: 'Nakata', photoId: 164223 },
  icon_ahn:           { search: 'Ahn Jung-hwan', photoId: 164224 },
  icon_pak_doik:      { search: 'Pak Doo-ik', photoId: 164225 },
  icon_sanchez:       { search: 'Hugo Sanchez', photoId: 164226 },
  icon_zamorano:      { search: 'Zamorano', photoId: 164227 }
};


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function scheduleIdle(callback, timeout = 1500) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
    return;
  }
  setTimeout(callback, 0);
}

// ── IndexedDB photo blob storage ──
const PHOTO_IDB_NAME = 'packdrop-photos-v1';
const PHOTO_STORE_NAME = 'playerPhotos';

function openPhotoDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IDB not supported')); return; }
    const req = indexedDB.open(PHOTO_IDB_NAME, 1);
    req.onupgradeneeded = e => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        idb.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPhotoFromIDB(cardId) {
  try {
    const idb = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(PHOTO_STORE_NAME, 'readonly');
      const store = tx.objectStore(PHOTO_STORE_NAME);
      const req = store.get(cardId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => idb.close();
    });
  } catch (_) {
    return null;
  }
}

async function savePhotoToIDB(cardId, blob) {
  try {
    const idb = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(PHOTO_STORE_NAME, 'readwrite');
      const store = tx.objectStore(PHOTO_STORE_NAME);
      const req = store.put(blob, cardId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => idb.close();
    });
  } catch (_) {
    return false;
  }
}

// ── Firestore photo URL cache (cross-device sharing) ──
const FIRESTORE_PHOTOS_COLL = 'pd_player_photos';

async function getPhotoUrlFromFirestore(cardId) {
  if (!firebaseReady || !db) return null;
  try {
    const doc = await db.collection(FIRESTORE_PHOTOS_COLL).doc(cardId).get();
    if (doc.exists && doc.data()?.url) return doc.data().url;
    return null;
  } catch (_) {
    return null;
  }
}

async function savePhotoUrlToFirestore(cardId, url) {
  if (!firebaseReady || !db || !url) return;
  try {
    await db.collection(FIRESTORE_PHOTOS_COLL).doc(cardId).set({
      url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) {}
}

function escapeCssIdent(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function getCardInitials(card) {
  const source = card.type === 'team' ? card.nation : (card.subjectName || card.name || card.nation);
  const cleaned = source
    .replace(/\([^)]*\)/g, '')
    .replace(/[^A-Za-zÀ-ž0-9\s]/g, ' ')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (card.type === 'team' && parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.slice(0, 2).map(part => part[0]).join('').slice(0, 3).toUpperCase();
}

function loadPlayerPhotoCache() {
  try {
    const raw = localStorage.getItem(PLAYER_PHOTO_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    const cleaned = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (!v) return;
      // Discard old-format blob: URLs – they're invalid after page reload
      const url = v.remoteUrl || v.photo || null;
      const isValid = url && url.startsWith('http');
      if (isValid) {
        cleaned[k] = {
          photo: url,      // use remote URL immediately for display
          remoteUrl: url,
          failedAt: null,
          updatedAt: v.updatedAt || null
        };
      } else if (v.failedAt) {
        cleaned[k] = { failedAt: v.failedAt };
      }
    });
    return cleaned;
  } catch (err) {
    return {};
  }
}

// Initialize memory cache
playerPhotoCache = loadPlayerPhotoCache();

function savePlayerPhotoCache() {
  try {
    const toSave = {};
    Object.entries(playerPhotoCache).forEach(([k, v]) => {
      if (!v) return;
      // Only persist remote http URLs – blob: URLs are session-only
      const remoteUrl = v.remoteUrl || (v.photo && v.photo.startsWith('http') ? v.photo : null);
      if (remoteUrl) {
        toSave[k] = { remoteUrl, updatedAt: v.updatedAt || Date.now() };
      } else if (v.failedAt) {
        toSave[k] = { failedAt: v.failedAt };
      }
    });
    localStorage.setItem(PLAYER_PHOTO_CACHE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Player photo cache save failed:', err);
  }
}

function getPlayerApiMeta(card) {
  if (!card || card.type === 'team') return null;
  const configured = PLAYER_API_LOOKUP[card.id] || {};
  const search = configured.search || (card.subjectName || card.name || '').replace(/\([^)]*\)/g, '').trim();
  if (!search) return null;
  return {
    search,
    team: configured.team,
    league: configured.league,
    season: configured.season || FOOTBALL_API_DEFAULT_SEASON,
    photoId: configured.photoId || null  // direct player ID for photo URL
  };
}

function getDirectPhotoUrl(photoId) {
  return photoId ? `https://media.api-sports.io/football/players/${photoId}.png` : '';
}

function getCachedPlayerPhoto(card) {
  const cached = playerPhotoCache[card.id];
  return cached?.photo || '';
}

function buildPlayerPhotoUrl(card) {
  const meta = getPlayerApiMeta(card);
  if (!meta) return '';
  // If we have a direct photoId, we can skip the API call
  if (meta.photoId) return getDirectPhotoUrl(meta.photoId);
  if (!meta.team && !meta.league) return '';
  const params = new URLSearchParams({
    search: meta.search,
    season: String(meta.season || FOOTBALL_API_DEFAULT_SEASON)
  });
  if (meta.team) params.set('team', String(meta.team));
  else params.set('league', String(meta.league));
  return `https://${FOOTBALL_API_HOST}/players?${params.toString()}`;
}

async function fetchPlayerPhoto(card) {
  const meta = getPlayerApiMeta(card);
  if (!meta) return '';

  // Fast path: if we have a direct photoId, use it directly without API call
  if (meta.photoId) {
    const directUrl = getDirectPhotoUrl(meta.photoId);
    // Verify the image is reachable with a lightweight HEAD request
    try {
      if (!navigator.onLine) return directUrl; // trust the URL even offline
      const check = await fetch(directUrl, { method: 'HEAD' });
      if (check.ok) return directUrl;
    } catch (_) {
      return directUrl; // return anyway; browser will show broken image or fallback will catch
    }
    return directUrl;
  }

  if (!meta.team && !meta.league) return '';

  const tryFetch = async (season) => {
    const params = new URLSearchParams({ search: meta.search, season: String(season) });
    if (meta.team) params.set('team', String(meta.team));
    else params.set('league', String(meta.league));
    const url = `https://${FOOTBALL_API_HOST}/players?${params.toString()}`;
    if (!navigator.onLine) return '';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': FOOTBALL_API_HOST,
        'x-rapidapi-key': FOOTBALL_API_KEY
      }
    });
    if (!response.ok) throw new Error(`photo-api-${response.status}`);
    const data = await response.json();
    if (!data?.response?.length) return '';
    const player = data.response[0]?.player;
    if (!player?.photo) return '';
    // Validate: at least one meaningful search word must appear in the player name
    const searchWords = meta.search.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const playerNameLower = [player.name, player.firstname, player.lastname]
      .filter(Boolean).join(' ').toLowerCase();
    const nameMatch = searchWords.some(w => playerNameLower.includes(w));
    if (!nameMatch) {
      console.warn(`Photo name mismatch: wanted "${meta.search}", got "${player.name}"`);
      return '';
    }
    return player.photo;
  };

  // Try configured season first
  const photo = await tryFetch(meta.season || FOOTBALL_API_DEFAULT_SEASON);
  if (photo) return photo;

  // If no photo found and we used an old season, try FOOTBALL_API_DEFAULT_SEASON as fallback
  if (meta.season && meta.season !== FOOTBALL_API_DEFAULT_SEASON) {
    try {
      const fallback = await tryFetch(FOOTBALL_API_DEFAULT_SEASON);
      if (fallback) return fallback;
    } catch (_) {}
  }

  return '';
}

function refreshPlayerPhotoMarks(cardId) {
  const card = getCardById(cardId);
  const photo = card ? getCachedPlayerPhoto(card) : '';
  if (!card || !photo) return;
  document.querySelectorAll(`[data-player-card-id="${escapeCssIdent(cardId)}"]`).forEach(mark => {
    mark.classList.add('card-mark-player-photo');
    mark.classList.remove('card-mark-player-pending');
    mark.innerHTML = `
      <img src="${escapeAttr(photo)}" alt="${escapeAttr(card.name)}" class="player-photo-img" loading="lazy" decoding="async"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='grid'; this.parentElement.classList.remove('card-mark-player-photo');">
      <span class="player-photo-fallback">${getCardInitials(card)}</span>
    `;
  });
}

function queuePlayerPhoto(card) {
  if (!card || card.type === 'team' || playerPhotoInFlight.has(card.id)) return;

  const cached = playerPhotoCache[card.id];

  // Memory hit: have a valid blob URL from this session (best)
  if (cached?.blobUrl) return;

  // Already failed recently → skip
  if (cached?.failedAt && Date.now() - cached.failedAt < 12 * 60 * 60 * 1000) return;

  // Need API meta to do anything
  const meta = getPlayerApiMeta(card);
  if (!meta) return;

  playerPhotoInFlight.add(card.id);

  scheduleIdle(async () => {
    try {
      // ── Tier 1: IDB blob (offline-capable, instant) ──
      const blob = await getPhotoFromIDB(card.id);
      if (blob && blob.size > 200) {
        const objUrl = URL.createObjectURL(blob);
        playerPhotoCache[card.id] = {
          photo: objUrl,
          blobUrl: objUrl,
          remoteUrl: cached?.remoteUrl || null,
          updatedAt: Date.now()
        };
        refreshPlayerPhotoMarks(card.id);
        playerPhotoInFlight.delete(card.id);
        return;
      }

      // ── If we already have a remote URL (from localStorage) → download blob ──
      if (cached?.remoteUrl) {
        try {
          const res = await fetch(cached.remoteUrl, { mode: 'cors' });
          if (res.ok) {
            const newBlob = await res.blob();
            if (newBlob.size > 200) {
              await savePhotoToIDB(card.id, newBlob);
              const objUrl = URL.createObjectURL(newBlob);
              playerPhotoCache[card.id] = {
                photo: objUrl,
                blobUrl: objUrl,
                remoteUrl: cached.remoteUrl,
                updatedAt: Date.now()
              };
              refreshPlayerPhotoMarks(card.id);
            }
          }
        } catch (_) { /* Keep using remote URL already shown */ }
        playerPhotoInFlight.delete(card.id);
        return;
      }

      // ── Tier 2: Firestore URL cache (other users already resolved this) ──
      let photoUrl = null;
      if (isOnlineApp()) {
        photoUrl = await getPhotoUrlFromFirestore(card.id);
      }

      // ── Tier 3: API call (last resort) ──
      if (!photoUrl) {
        if (!navigator.onLine) {
          playerPhotoCache[card.id] = { failedAt: Date.now() };
          playerPhotoInFlight.delete(card.id);
          return;
        }
        photoUrl = await fetchPlayerPhoto(card);
        // Share resolved URL with all other users via Firestore
        if (photoUrl && isOnlineApp()) {
          savePhotoUrlToFirestore(card.id, photoUrl).catch(() => {});
        }
      }

      if (photoUrl) {
        // Show remote URL immediately
        playerPhotoCache[card.id] = {
          photo: photoUrl,
          remoteUrl: photoUrl,
          updatedAt: Date.now()
        };
        savePlayerPhotoCache();
        refreshPlayerPhotoMarks(card.id);

        // Download blob in background for future offline use
        try {
          const res = await fetch(photoUrl, { mode: 'cors' });
          if (res.ok) {
            const newBlob = await res.blob();
            if (newBlob.size > 200) {
              await savePhotoToIDB(card.id, newBlob);
              const objUrl = URL.createObjectURL(newBlob);
              playerPhotoCache[card.id] = {
                photo: objUrl,
                blobUrl: objUrl,
                remoteUrl: photoUrl,
                updatedAt: Date.now()
              };
              // No need to call refreshPlayerPhotoMarks again: remote URL already rendering fine
            }
          }
        } catch (_) {}
      } else {
        playerPhotoCache[card.id] = { failedAt: Date.now() };
        savePlayerPhotoCache();
      }
    } catch (err) {
      console.warn('Player photo queue failed:', card.id, err);
      if (!playerPhotoCache[card.id]?.photo) {
        playerPhotoCache[card.id] = { failedAt: Date.now() };
        savePlayerPhotoCache();
      }
    } finally {
      playerPhotoInFlight.delete(card.id);
    }
  }, 800);
}

function cardMark(card, className = '') {
  if (card.type === 'team') {
    const code = NATION_CODES[card.nation];
    if (code) {
      const flagUrl = `https://flagcdn.com/w160/${code}.png`;
      return `<span class="card-mark rarity-${card.rarity} ${className} card-mark-flag" aria-hidden="true">
        <img src="${flagUrl}" alt="${escapeAttr(card.nation)}" class="flag-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
        <span class="flag-fallback-initials" style="display:none; width:100%; height:100%; place-items:center;">${getCardInitials(card)}</span>
      </span>`;
    }
  }
  if (card.type === 'player' || card.type === 'icon') {
    const photo = getCachedPlayerPhoto(card);
    if (!photo) queuePlayerPhoto(card);
    return `<span class="card-mark rarity-${card.rarity} ${className} card-mark-player ${photo ? 'card-mark-player-photo' : 'card-mark-player-pending'}" data-player-card-id="${escapeAttr(card.id)}" aria-hidden="true">
      ${photo
        ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(card.name)}" class="player-photo-img" loading="lazy" decoding="async"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='grid'; this.parentElement.classList.remove('card-mark-player-photo');">`
        : ''}
      <span class="player-photo-fallback">${getCardInitials(card)}</span>
    </span>`;
  }
  return `<span class="card-mark rarity-${card.rarity} ${className}" aria-hidden="true">${getCardInitials(card)}</span>`;
}

function lockedCardMark(className = '') {
  return `<span class="card-mark card-mark-locked ${className}" aria-hidden="true">${svgIcon('lock', 'card-mark-icon')}</span>`;
}

// ════════════════════════════════════════════════════════════
// 1. AUTH MODULE
// ════════════════════════════════════════════════════════════

$('btn-google-login').addEventListener('click', async () => {
  const btn = $('btn-google-login');
  if (!firebaseReady || !auth || !googleProvider) {
    showToast('Connessione ancora in avvio. Riprova tra un istante.');
    return;
  }
  if (!navigator.onLine) { showToast('Sei offline. Connettiti per accedere.'); return; }
  if (btn.classList.contains('loading')) return;
  btn.classList.add('loading');

  try {
    // Single popup flow. The user picks the account once and is in.
    // No artificial timeout, no eager redirect — those were causing the
    // app to bounce the user back to Google while they were still
    // choosing an account in the popup.
    await auth.signInWithPopup(googleProvider);
    // onAuthStateChanged takes over from here.
  } catch (err) {
    const code = err?.code || '';
    // The ONLY case where a redirect fallback makes sense: the browser
    // physically blocked the popup (common in WebView/standalone mode).
    if (code === 'auth/popup-blocked') {
      btn._redirecting = true;
      try {
        await auth.signInWithRedirect(googleProvider);
      } catch (redirectErr) {
        console.error('Redirect login error:', redirectErr);
        showToast('Errore di accesso. Riprova.');
      }
      return;
    }
    // User-initiated cancellation is not an error — stay quiet.
    if (code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request') {
      return;
    }
    console.error('Login error:', err);
    const msg = err?.message || 'Errore di accesso. Riprova.';
    showToast(msg);
  } finally {
    if (!btn._redirecting) btn.classList.remove('loading');
  }
});

if (firebaseReady && auth) {
  // Handle redirect result (only used if popup was actually blocked)
  auth.getRedirectResult().then(result => {
    if (result?.user) {
      const btn = $('btn-google-login');
      if (btn) btn.classList.remove('loading');
    }
  }).catch(err => {
    if (err?.code !== 'auth/redirect-cancelled-by-user') {
      console.error('Redirect error:', err);
    }
  });

  // Deferred cached-fallback. We do NOT eagerly enter cached mode on a
  // short timer the way the old code did — that produced a spurious
  // "Connessione lenta" toast on every perfectly-good WiFi login. We only
  // fall back if, after a generous window, Auth has genuinely not restored
  // AND Firestore is confirmed unreachable.
  authRestoreInFlight = true;
  setTimeout(async () => {
    authRestoreInFlight = false;
    if (currentUser || !appEl.classList.contains('hidden')) return; // already online
    if (!hasCachedSession()) return; // nothing to fall back to
    const offline = await isGenuinelyOffline();
    if (offline) {
      showCachedApp('Sei offline: copia salvata attiva.');
    }
    // If we are reachable, leave the login screen up — Auth is simply
    // taking its time and will fire onAuthStateChanged momentarily.
  }, AUTH_RESTORE_TIMEOUT);

  // Auth state observer
  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUser = user;
      cachedFallbackActive = false;
      appMode = 'online';
      loginScreen.classList.add('hidden');
      await initApp();
    } else {
      if (userListenerUnsubscribe) { userListenerUnsubscribe(); userListenerUnsubscribe = null; }
      if (collectionListenerUnsubscribe) { collectionListenerUnsubscribe(); collectionListenerUnsubscribe = null; }
      stopIncomingRequestsListener();
      incomingRequests = [];
      currentUser = null;
      userData = null;
      userCollection = {};
      // Signed out (or never signed in). Only use cached copy if truly offline.
      if (hasCachedSession() && navigator.onLine === false) {
        showCachedApp('Sei offline: copia salvata attiva.');
        return;
      }
      loginScreen.classList.remove('hidden');
      appEl.classList.add('hidden');
      bottomNav.classList.add('hidden');
      closeProfilePanel();
    }
  });

  // React to connectivity changes while the app is running. If the user
  // dropped to cached mode (e.g. on a train) and connectivity returns,
  // transparently promote back to online.
  window.addEventListener('online', () => {
    onlineHeartbeatOk = true;
    if (cachedFallbackActive) {
      recoverFromCachedFallback().catch(() => {});
    }
  });
  window.addEventListener('offline', () => {
    onlineHeartbeatOk = false;
  });
} else {
  setTimeout(() => showCachedApp('Firebase non è ancora disponibile: copia salvata attiva.'), 0);
}

// ════════════════════════════════════════════════════════════
// 2. USER MODULE
// ════════════════════════════════════════════════════════════

async function initApp() {
  if (!firebaseReady || !db || !currentUser) {
    showCachedApp('Connessione non pronta: copia salvata attiva.');
    return;
  }

  const userRef = db.collection('pd_users').doc(currentUser.uid);
  const cachedSession = loadLocalSession();
  const hasMatchingCache = cachedSession?.currentUser?.uid === currentUser.uid && cachedSession?.userData;
  const appAlreadyVisible = !appEl.classList.contains('hidden');

  if (hasMatchingCache && !appAlreadyVisible) {
    userData = cachedSession.userData || {};
    userCollection = cachedSession.userCollection || {};
    appMode = 'online';
    loginScreen.classList.add('hidden');
    onboardingModal.classList.remove('active');
    showMainApp();
  }

  let userDoc;
  try {
    // Generous window: we already optimistically rendered from cache, so
    // there is no UX cost in waiting for the real doc. Only fall back to
    // cached if the network genuinely can't reach Firestore.
    userDoc = await withTimeout(userRef.get(), hasMatchingCache ? 12000 : 10000);
  } catch (err) {
    console.warn('User load slow/unavailable:', err);
    // Distinguish "genuinely offline" from "just slow". Only the former
    // justifies the cached copy; the latter should keep the login screen.
    const offline = await isGenuinelyOffline();
    if (offline && (hasMatchingCache || showCachedApp('Sei offline: copia salvata attiva.'))) return;
    if (hasMatchingCache) return; // optimistic UI already shown, keep it
    showToast('Connessione lenta. Riprova tra qualche secondo.');
    loginScreen.classList.remove('hidden');
    return;
  }

  if (!userDoc.exists || !userDoc.data().username) {
    // Show onboarding
    showOnboarding();
    return;
  }

  userData = userDoc.data();
  await checkDailyReset();
  updateLoginStreak().catch(err => console.warn('Login streak sync skipped:', err));

  const collectionLoad = loadUserCollection()
    .then(() => {
      saveLocalSession();
      updateHeaderUI();
      updatePackButtons();
      renderChallenges();
      if ($('section-collection')?.classList.contains('active')) renderCollection(getActiveCollectionTab());
    })
    .catch(err => console.warn('Collection load skipped:', err));

  if (!hasMatchingCache && !appAlreadyVisible) {
    await collectionLoad;
  }

  saveLocalSession();
  ensureCollectionCodes().then(() => {
    saveLocalSession();
    if ($('section-collection')?.classList.contains('active')) renderCollection(getActiveCollectionTab());
  }).catch(err => console.warn('Code sync skipped:', err));
  handleReferral();

  // Unsubscribe old listeners if any
  if (userListenerUnsubscribe) { userListenerUnsubscribe(); userListenerUnsubscribe = null; }
  if (collectionListenerUnsubscribe) { collectionListenerUnsubscribe(); collectionListenerUnsubscribe = null; }

  // Set up real-time listener for user profile (packs, streak, friend requests, etc.)
  userListenerUnsubscribe = userRef.onSnapshot(doc => {
    if (doc.exists) {
      const incoming = doc.data();
      // While a challenge check is in flight, preserve the local
      // completedChallenges / challengeCompletions / bonusPacks so the
      // snapshot doesn't reset them to the pre-award server state.
      if (challengeCheckInFlight) {
        const keep = {};
        if (userData && userData.completedChallenges) keep.completedChallenges = userData.completedChallenges;
        if (userData && userData.challengeCompletions) keep.challengeCompletions = userData.challengeCompletions;
        if (userData && userData.bonusPacks !== undefined) keep.bonusPacks = userData.bonusPacks;
        userData = Object.assign({}, incoming, keep);
      } else {
        userData = incoming;
      }
      saveLocalSession();
      updateHeaderUI();
      updatePackButtons();
      startTimerIfNeeded();
      renderChallenges();
      // If profile panel is open, re-render requests so they appear in real time
      const panel = $('profile-panel');
      if (panel && panel.classList.contains('active')) {
        renderFriendRequests();
        renderFriendsList();
      }
    }
  }, err => {
    console.warn('User profile listener error:', err);
  });

  // Set up real-time listener for card collection subcollection
  collectionListenerUnsubscribe = userRef.collection('collection').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const cardId = change.doc.id;
      const data = change.doc.data();
      if (change.type === 'removed') {
        delete userCollection[cardId];
      } else {
        userCollection[cardId] = data;
      }
    });
    saveLocalSession();
    if ($('section-collection')?.classList.contains('active')) {
      renderCollection(getActiveCollectionTab());
    }
  }, err => {
    console.warn('Collection listener error:', err);
  });

  showMainApp();
  syncPendingPackOperations().catch(err => console.warn('Pending pack sync skipped:', err));

  // Friend system: listen for incoming requests + reconcile accepted friendships.
  startIncomingRequestsListener();
  syncAcceptedFriendships().catch(err => console.warn('Friendship sync skipped:', err));

  // Challenges: reset repeatable daily challenges if the day rolled over,
  // then reconcile pending invitations (referrals).
  checkDailyChallengeReset().then(() => {
    processPendingReferrals().catch(err => console.warn('Referral sync skipped:', err));
  });
  scheduleMidnightReset();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('__timeout__')), ms))
  ]);
}

function hasCachedSession() {
  try {
    return Boolean(localStorage.getItem(LOCAL_SESSION_KEY));
  } catch (err) {
    return false;
  }
}

// ── Connectivity probing ──
// `navigator.onLine` is unreliable (it only flips on link-down events), so
// we additionally probe Firestore itself. This is what tells us whether
// writes (predictions, friend requests, match results) can actually land.
async function probeFirestoreConnection(timeoutMs = 4500) {
  if (!firebaseReady || !db) return false;
  if (!navigator.onLine) return false;
  try {
    // pd_cards is readable by any authed user and always exists. A tiny
    // .get() round-trip is the cheapest real reachability check.
    await withTimeout(
      db.collection('pd_cards').limit(1).get(),
      timeoutMs
    );
    onlineHeartbeatOk = true;
    return true;
  } catch (err) {
    onlineHeartbeatOk = false;
    return false;
  }
}

// Promote the app from cached-fallback back to online once connectivity
// returns (called from the window 'online' event and after Auth restores).
async function recoverFromCachedFallback() {
  if (!cachedFallbackActive) return;
  if (!firebaseReady || !auth) return;
  const online = await probeFirestoreConnection();
  if (!online) return;
  const user = auth.currentUser;
  if (!user) return;
  // Re-run the normal online init; it will flip appMode to 'online'.
  currentUser = user;
  cachedFallbackActive = false;
  await initApp();
}

// Returns true ONLY when there is a genuine reason to use the cached copy
// (browser offline OR Firestore confirmed unreachable). Replaces the old
// "anything slower than 250ms → cached" shortcut.
async function isGenuinelyOffline() {
  if (navigator.onLine === false) return true;
  const reachable = await probeFirestoreConnection();
  return !reachable;
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hydrateTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function saveLocalSession() {
  if (!userData) return;
  try {
    const collection = {};
    Object.entries(userCollection).forEach(([cardId, data]) => {
      collection[cardId] = {
        ...data,
        unlockedAt: serializeTimestamp(data.unlockedAt)
      };
    });
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      currentUser: currentUser ? {
        uid: currentUser.uid,
        displayName: currentUser.displayName || userData.displayName || '',
        photoURL: currentUser.photoURL || userData.photoURL || ''
      } : {
        uid: userData.uid || '',
        displayName: userData.displayName || '',
        photoURL: userData.photoURL || ''
      },
      userData,
      userCollection: collection
    }));
  } catch (err) {
    console.warn('Local session save failed:', err);
  }
}

function loadLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    Object.keys(session.userCollection || {}).forEach(cardId => {
      session.userCollection[cardId].unlockedAt = hydrateTimestamp(session.userCollection[cardId].unlockedAt);
    });
    return session;
  } catch (err) {
    console.warn('Local session load failed:', err);
    return null;
  }
}

function loadPendingPackSync() {
  try {
    const raw = localStorage.getItem(PENDING_PACK_SYNC_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function savePendingPackSync() {
  try {
    localStorage.setItem(PENDING_PACK_SYNC_KEY, JSON.stringify(pendingPackSync));
  } catch (err) {
    console.warn('Pending sync save failed:', err);
  }
}

function queuePendingPackSync(operation) {
  if (!operation?.id || pendingPackSync.some(op => op.id === operation.id)) return;
  pendingPackSync.push(operation);
  savePendingPackSync();
}

async function syncPendingPackOperation(operation) {
  const card = getCardById(operation.cardId);
  if (!card || !isOnlineApp()) return false;

  const userRef = db.collection('pd_users').doc(currentUser.uid);
  const collRef = userRef.collection('collection').doc(card.id);
  const codeRef = db.collection('pd_card_codes').doc(operation.code);
  const unlockedAt = operation.unlockedAt ? new Date(operation.unlockedAt) : new Date();

  await db.runTransaction(async transaction => {
    const collSnap = await transaction.get(collRef);
    const existing = collSnap.exists ? collSnap.data() : null;
    const alreadySynced = existing && getOwnedCodes(existing).includes(normalizeCardCode(operation.code));
    if (alreadySynced) return;

    if (existing) {
      transaction.update(collRef, {
        count: firebase.firestore.FieldValue.increment(1),
        primaryCode: getPrimaryCode(existing) || operation.code,
        latestCode: operation.code,
        codes: firebase.firestore.FieldValue.arrayUnion(operation.code)
      });
    } else {
      transaction.set(collRef, {
        cardId: card.id,
        type: card.type,
        count: 1,
        primaryCode: operation.code,
        latestCode: operation.code,
        codes: [operation.code],
        unlockedAt
      });
    }

    transaction.set(codeRef, buildPublicCardCodeData(card, operation.code, unlockedAt), { merge: true });

    if (!operation.isWelcome) {
      const userUpdate = {
        totalPacksOpened: firebase.firestore.FieldValue.increment(1)
      };
      if (operation.balanceSource === 'daily') {
        userUpdate.dailyPacks = firebase.firestore.FieldValue.increment(-1);
      } else if (operation.balanceSource === 'bonus') {
        userUpdate.bonusPacks = firebase.firestore.FieldValue.increment(-1);
      }
      transaction.update(userRef, userUpdate);
    }
  });

  return true;
}

async function syncPendingPackOperations() {
  if (pendingPackSyncInProgress || !pendingPackSync.length || !isOnlineApp()) return;
  pendingPackSyncInProgress = true;
  try {
    const remaining = [];
    for (const operation of pendingPackSync) {
      try {
        await syncPendingPackOperation(operation);
      } catch (err) {
        console.warn('Pending pack operation failed:', err);
        remaining.push(operation);
      }
    }
    pendingPackSync = remaining;
    savePendingPackSync();
  } finally {
    pendingPackSyncInProgress = false;
  }
}

function showCachedApp(message) {
  const session = loadLocalSession();
  if (!session) return false;
  appMode = 'cached';
  cachedFallbackActive = true;
  currentUser = session.currentUser || null;
  userData = session.userData || {};
  userCollection = session.userCollection || {};
  loginScreen.classList.add('hidden');
  onboardingModal.classList.remove('active');
  showMainApp();
  if (message) showToast(message);
  return true;
}

function showOnboarding() {
  onboardingModal.classList.add('active');
  $('onboarding-username').classList.remove('hidden');
  $('onboarding-tutorial').classList.add('hidden');
  setupOnboardingHandlers();
}

function setupOnboardingHandlers() {
  const input = $('username-input');
  const btn = $('btn-set-username');
  const errorEl = $('username-error');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    const valid = /^[a-zA-Z0-9_]{3,20}$/.test(val);
    input.classList.toggle('valid', valid && val.length >= 3);
    input.classList.toggle('error', val.length > 0 && !valid);
    btn.disabled = !valid;
    errorEl.textContent = val.length > 0 && !valid ? 'Username: 3-20 caratteri, lettere, numeri e _' : '';
  });

  btn.addEventListener('click', async () => {
    const username = input.value.trim().toLowerCase();
    if (!username) return;
    btn.disabled = true;
    errorEl.textContent = '';

    try {
      // Check uniqueness
      const usernameDoc = await db.collection('pd_usernames').doc(username).get();
      if (usernameDoc.exists) {
        errorEl.textContent = 'Username già in uso. Scegline un altro.';
        btn.disabled = false;
        return;
      }

      // Create user document
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('pd_users').doc(currentUser.uid).set({
        uid: currentUser.uid,
        displayName: currentUser.displayName || '',
        username: username,
        photoURL: currentUser.photoURL || '',
        dailyPacks: 5,
        lastReset: now,
        bonusPacks: 0,
        friends: [],
        friendRequests: [],
        sentRequests: [],
        completedChallenges: [],
        challengeCompletions: {},
        inviteCount: 0,
        invitedToday: 0,
        sharedToday: 0,
        sentRequestToday: 0,
        totalPacksOpened: 0,
        loginStreak: 1,
        lastLoginDate: new Date().toDateString(),
        createdAt: now
      });

      // Reserve username
      await db.collection('pd_usernames').doc(username).set({ uid: currentUser.uid });

      // Show tutorial
      $('onboarding-username').classList.add('hidden');
      $('onboarding-tutorial').classList.remove('hidden');
      setupTutorialSlides();

      // Reload user data
      const userDoc = await db.collection('pd_users').doc(currentUser.uid).get();
      userData = userDoc.data();

    } catch (err) {
      console.error('Create user error:', err);
      errorEl.textContent = 'Errore. Riprova.';
      btn.disabled = false;
    }
  });
}

function setupTutorialSlides() {
  const slides = $('tutorial-slides');
  const dots = $('tutorial-dots').children;

  slides.addEventListener('scroll', () => {
    const scrollLeft = slides.scrollLeft;
    const slideWidth = slides.offsetWidth;
    const idx = Math.round(scrollLeft / slideWidth);
    Array.from(dots).forEach((d, i) => d.classList.toggle('active', i === idx));
  });

  $('btn-start-playing').addEventListener('click', async () => {
    onboardingModal.classList.remove('active');
    // Welcome bonus: guaranteed rare first pack
    await openWelcomePack();
    await loadUserCollection();
    showMainApp();
  });
}

async function checkDailyReset() {
  if (!userData || !userData.lastReset) return;
  const now = new Date();
  const lastReset = userData.lastReset.toDate ? userData.lastReset.toDate() : new Date(userData.lastReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    userData.dailyPacks = 5;
    userData.lastReset = now;
    saveLocalSession();

    if (firebaseReady && db && currentUser && appMode === 'online') {
      try {
        await db.collection('pd_users').doc(currentUser.uid).update({
          dailyPacks: 5,
          lastReset: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.warn('Daily reset Firestore sync failed:', err);
      }
    }
  }
}

async function updateLoginStreak() {
  if (!firebaseReady || !db || !currentUser || !userData) return;
  const today = new Date().toDateString();
  const lastLogin = userData.lastLoginDate || '';
  if (lastLogin === today) return; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastLogin === yesterday.toDateString();

  const newStreak = isConsecutive ? (userData.loginStreak || 0) + 1 : 1;
  await db.collection('pd_users').doc(currentUser.uid).update({
    loginStreak: newStreak,
    lastLoginDate: today
  });
  userData.loginStreak = newStreak;
  userData.lastLoginDate = today;
}

async function loadUserCollection() {
  if (!firebaseReady || !db || !currentUser) return;
  const snapshot = await withTimeout(
    db.collection('pd_users').doc(currentUser.uid).collection('collection').get(),
    6500
  );
  userCollection = {};
  snapshot.forEach(doc => {
    userCollection[doc.id] = doc.data();
  });
}

function getTotalPacks() {
  return (userData?.dailyPacks || 0) + (userData?.bonusPacks || 0);
}

function isOnlineApp() {
  return firebaseReady && Boolean(db) && Boolean(currentUser?.uid) && appMode === 'online';
}

function normalizeCardCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
}

function generateCardCode(card, uid = '') {
  const cardPart = card.id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase().padEnd(5, 'X');
  const userPart = uid.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, 'U');
  const timePart = Date.now().toString(36).toUpperCase().slice(-6);
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PD-${cardPart}-${userPart}-${timePart}-${randomPart}`;
}

function getOwnedCodes(owned) {
  const codes = Array.isArray(owned?.codes) ? owned.codes : [];
  const all = [owned?.primaryCode, owned?.latestCode, owned?.code, ...codes]
    .filter(Boolean)
    .map(normalizeCardCode);
  return [...new Set(all)];
}

function getPrimaryCode(owned) {
  return normalizeCardCode(owned?.primaryCode || owned?.latestCode || owned?.code || getOwnedCodes(owned)[0] || '');
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Data non disponibile';
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildPublicCardCodeData(card, code, unlockedAt = new Date()) {
  return {
    code,
    cardId: card.id,
    cardName: card.name,
    cardType: card.type,
    cardNation: card.nation,
    rarity: card.rarity,
    packType: card.packType,
    ownerUid: currentUser.uid,
    ownerUsername: userData?.username || '',
    ownerDisplayName: userData?.displayName || currentUser?.displayName || '',
    ownerPhotoURL: userData?.photoURL || currentUser?.photoURL || '',
    unlockedAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function ensureCollectionCodes() {
  if (!isOnlineApp()) return;
  const updates = [];
  Object.entries(userCollection).forEach(([cardId, owned]) => {
    const card = getCardById(cardId);
    if (!card || getPrimaryCode(owned)) return;
    updates.push({ cardId, card, owned });
  });

  for (const item of updates) {
    const code = generateCardCode(item.card, currentUser.uid);
    const unlockedAt = item.owned.unlockedAt?.toDate ? item.owned.unlockedAt : (item.owned.unlockedAt || new Date());
    const collRef = db.collection('pd_users').doc(currentUser.uid).collection('collection').doc(item.cardId);
    const codeRef = db.collection('pd_card_codes').doc(code);
    await collRef.update({
      primaryCode: code,
      latestCode: code,
      codes: firebase.firestore.FieldValue.arrayUnion(code)
    });
    await codeRef.set(buildPublicCardCodeData(item.card, code, unlockedAt));
    userCollection[item.cardId] = {
      ...item.owned,
      primaryCode: code,
      latestCode: code,
      codes: getOwnedCodes({ ...item.owned, primaryCode: code, latestCode: code, codes: [code] })
    };
  }
}

function showMainApp() {
  appEl.classList.remove('hidden');
  bottomNav.classList.remove('hidden');
  updateHeaderUI();
  updatePackButtons();
  renderChallenges();
  startTimerIfNeeded();
  setupNavigation();
  setupPackCarousel();
  setupCollectionSearch();
  setupInstallHandlers();

  const savedSection = localStorage.getItem(LAST_SECTION_KEY);
  switchSection(['play', 'collection', 'predictions'].includes(savedSection) ? savedSection : 'play');

  // PWA install prompt after 30s
  setTimeout(showInstallPrompt, 30000);
}

// ════════════════════════════════════════════════════════════
// 3. NAVIGATION MODULE
// ════════════════════════════════════════════════════════════

function setupNavigation() {
  if (navigationReady) return;
  navigationReady = true;
  const tabs = bottomNav.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      switchSection(section);
    });
  });

  // Header avatar → profile
  // Bind on the button directly AND via document-level delegation. On iOS/Android
  // standalone PWA the direct click on a wrapper button around an <img> can be
  // dropped by the WebView; delegation guarantees the handler still fires.
  bindProfileOpener($('header-profile-btn'), openProfilePanel);
  bindProfileOpener($('profile-close'), closeProfilePanel);
  const profileOverlay = $('profile-panel-overlay');
  if (profileOverlay) bindProfileOpener(profileOverlay, closeProfilePanel);
}

// Unified binding for tap targets that open/close the profile panel.
// Uses click (works everywhere) plus touchend-without-scroll as a fallback for
// iOS WKWebView standalone where bare-wrapper button clicks are sometimes lost.
function bindProfileOpener(el, handler) {
  if (!el || el._profileBound) return;
  el._profileBound = true;
  el.style.cursor = el.style.cursor || 'pointer';
  el.addEventListener('click', handler);
  let touchMoved = false;
  el.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
  el.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (touchMoved) return;
    e.preventDefault();
    handler(e);
  }, { passive: false });
}

function switchSection(name) {
  if (!['play', 'collection', 'predictions'].includes(name)) name = 'play';
  localStorage.setItem(LAST_SECTION_KEY, name);
  // Update tabs
  bottomNav.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.section === name);
  });
  // Update sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = $(`section-${name}`);
  target.classList.add('active');

  // Lazy load
  if (name === 'collection' && target.dataset.loaded === 'false') {
    target.dataset.loaded = 'true';
    renderCollection('nations');
  }
  if (name === 'predictions' && target.dataset.loaded === 'false') {
    target.dataset.loaded = 'true';
    initPredictionsSection();
  } else if (name === 'predictions') {
    refreshPredictionsView();
  }
}

function openProfilePanel() {
  const panel = $('profile-panel');
  if (!panel) return;
  panel.classList.add('active');
  panel.setAttribute('aria-hidden', 'false');
  // Force a reflow so the compositing layer picks up the transform change on
  // iOS standalone WKWebView, where fixed+transformed elements sometimes stay
  // at their previous frame until something triggers a paint.
  void panel.offsetHeight;
  // Render after panel is visible so a crash here doesn't block the slide-in
  try { renderProfile(); } catch (err) { console.warn('renderProfile error:', err); }
}

function closeProfilePanel() {
  const panel = $('profile-panel');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('aria-hidden', 'true');
  void panel.offsetHeight;
}

function updateHeaderUI() {
  const avatar = $('header-avatar');
  avatar.src = getUserAvatarUrl({ ...userData, photoURL: currentUser?.photoURL || userData?.photoURL });
  // Badge for friend requests
  updateRequestBadge();
}

function updateRequestBadge() {
  const count = incomingRequests.length || userData?.friendRequests?.length || 0;
  const tab = $('header-profile-btn');
  let badge = tab.querySelector('.nav-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      tab.appendChild(badge);
    }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}

// ════════════════════════════════════════════════════════════
// 4. PACK CAROUSEL MODULE
// ════════════════════════════════════════════════════════════

function setupPackCarousel() {
  if (packCarouselReady) return;
  packCarouselReady = true;
  const carousel = $('pack-carousel');
  const cards = carousel.querySelectorAll('.pack-card');
  const dots = $('pack-dots').children;

  // Click to select
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPack = card.dataset.pack;
      const idx = Array.from(cards).indexOf(card);
      Array.from(dots).forEach((d, i) => d.classList.toggle('active', i === idx));
    });
  });

  // Scroll snap observer
  let scrollTimeout;
  carousel.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = carousel.scrollLeft;
      const cardWidth = (cards[0]?.getBoundingClientRect().width || 260) + 16; // card width + gap
      const idx = Math.round(scrollLeft / cardWidth);
      cards.forEach((c, i) => c.classList.toggle('selected', i === idx));
      Array.from(dots).forEach((d, i) => d.classList.toggle('active', i === idx));
      selectedPack = cards[idx]?.dataset.pack || 'nations';
    }, 100);
  });
}

// ════════════════════════════════════════════════════════════
// 5. PACK OPENING MODULE
// ════════════════════════════════════════════════════════════

function updatePackButtons() {
  const total = getTotalPacks();
  const btnOpen = $('btn-open-pack');
  const btnX3 = $('btn-open-x3');
  const balance = $('pack-balance');
  if (balance) {
    const noun = total === 1 ? 'apertura rimasta' : 'aperture rimaste';
    balance.textContent = appMode === 'cached'
      ? `${total} ${noun} (offline)`
      : `${total} ${noun}`;
  }

  const sessionExists = Boolean(currentUser) || appMode === 'cached';
  if (!sessionExists) {
    btnOpen.disabled = true;
    btnOpen.classList.add('disabled');
    btnOpen.classList.remove('pulse');
    btnOpen.textContent = 'Accedi per aprire';
    btnX3.classList.add('hidden');
    return;
  }

  if (total > 0) {
    btnOpen.disabled = false;
    btnOpen.classList.remove('disabled');
    btnOpen.classList.add('pulse');
    btnOpen.textContent = 'APRI PACCHETTO';
  } else {
    btnOpen.disabled = true;
    btnOpen.classList.add('disabled');
    btnOpen.classList.remove('pulse');
    btnOpen.textContent = 'Nessuna apertura disponibile';
  }

  if (total >= 3) {
    btnX3.classList.remove('hidden');
    btnX3.disabled = false;
  } else {
    btnX3.classList.add('hidden');
  }
}

function startTimerIfNeeded() {
  if (timerInterval) clearInterval(timerInterval);
  const sessionExists = Boolean(currentUser) || appMode === 'cached';
  if (!sessionExists) {
    $('reset-timer').classList.add('hidden');
    return;
  }
  if (getTotalPacks() > 0) {
    $('reset-timer').classList.add('hidden');
    return;
  }

  $('reset-timer').classList.remove('hidden');
  function updateTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    $('timer-value').textContent = `${h}:${m}:${s}`;
  }
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function rollRarity(packType) {
  const rand = Math.random() * 100;
  // Unified odds for all packs: 1% legendary, 4% epic, 20% rare, 75% common.
  // Legends Pack has no commons → the 75% common bucket becomes rare instead (95% rare total).
  if (packType === 'legends') {
    if (rand < 1) return 'legendary';
    if (rand < 5) return 'epic';
    return 'rare'; // 95% rare (absorbs the common slot)
  }
  // nations & stars
  if (rand < 1) return 'legendary';
  if (rand < 5) return 'epic';
  if (rand < 25) return 'rare';
  return 'common';
}

async function openPack(packType, isWelcome = false) {
  let rarity;
  if (isWelcome) {
    rarity = 'rare'; // Welcome bonus guaranteed rare
  } else {
    rarity = rollRarity(packType);
  }

  const eligible = getCardsByPackAndRarity(packType, rarity);
  let card;
  if (eligible.length === 0) {
    // Fallback: get any card from this pack
    const all = getCardsByPack(packType);
    card = all[Math.floor(Math.random() * all.length)];
  } else {
    card = eligible[Math.floor(Math.random() * eligible.length)];
  }
  queuePlayerPhoto(card);
  const uid = currentUser?.uid || 'offline-uid';
  const code = generateCardCode(card, uid);
  const unlockedAt = new Date();
  let balanceSource = null;

  // Deduct pack balance locally
  if (!isWelcome && userData) {
    if (userData.dailyPacks > 0) {
      userData.dailyPacks--;
      balanceSource = 'daily';
    } else if (userData.bonusPacks > 0) {
      userData.bonusPacks--;
      balanceSource = 'bonus';
    }
    userData.totalPacksOpened = (userData.totalPacksOpened || 0) + 1;
  }

  // Update local memory collection
  const existingData = userCollection[card.id];
  const firstCode = existingData ? (getPrimaryCode(existingData) || code) : code;
  if (existingData) {
    userCollection[card.id] = {
      ...existingData,
      count: (existingData.count || 1) + 1,
      primaryCode: firstCode,
      latestCode: code,
      codes: getOwnedCodes({ ...existingData, primaryCode: firstCode, latestCode: code, codes: [...getOwnedCodes(existingData), code] })
    };
  } else {
    userCollection[card.id] = {
      cardId: card.id,
      type: card.type,
      count: 1,
      primaryCode: code,
      latestCode: code,
      codes: [code],
      unlockedAt
    };
  }

  saveLocalSession();

  const pendingOperation = {
    id: code,
    cardId: card.id,
    code,
    unlockedAt: unlockedAt.toISOString(),
    isWelcome,
    balanceSource,
    createdAt: Date.now()
  };

  // If online, perform background Firestore update
  if (firebaseReady && db && currentUser && appMode === 'online') {
    try {
      const collRef = db.collection('pd_users').doc(currentUser.uid).collection('collection').doc(card.id);
      const codeRef = db.collection('pd_card_codes').doc(code);
      const serverUnlockedAt = firebase.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      if (existingData) {
        batch.update(collRef, {
          count: firebase.firestore.FieldValue.increment(1),
          primaryCode: firstCode,
          latestCode: code,
          codes: firebase.firestore.FieldValue.arrayUnion(code)
        });
      } else {
        batch.set(collRef, {
          cardId: card.id,
          type: card.type,
          count: 1,
          primaryCode: code,
          latestCode: code,
          codes: [code],
          unlockedAt: serverUnlockedAt
        });
      }
      batch.set(codeRef, buildPublicCardCodeData(card, code, serverUnlockedAt));

      if (!isWelcome) {
        const packBalanceUpdate = {
          totalPacksOpened: firebase.firestore.FieldValue.increment(1)
        };
        if (balanceSource === 'daily') {
          packBalanceUpdate.dailyPacks = firebase.firestore.FieldValue.increment(-1);
        } else if (balanceSource === 'bonus') {
          packBalanceUpdate.bonusPacks = firebase.firestore.FieldValue.increment(-1);
        }
        batch.update(db.collection('pd_users').doc(currentUser.uid), packBalanceUpdate);
      }

      await batch.commit();
    } catch (fsErr) {
      console.warn('Background Firestore pack update failed:', fsErr);
      queuePendingPackSync(pendingOperation);
    }
  } else if (currentUser?.uid) {
    queuePendingPackSync(pendingOperation);
  }

  return card;
}

async function openWelcomePack() {
  const card = await openPack('nations', true);
  await showPackAnimation(card, 'nations');
}

// Event listeners for open buttons
$('btn-open-pack').addEventListener('click', async () => {
  if (isAnimating || getTotalPacks() <= 0) return;
  isAnimating = true;
  try {
    const card = await openPack(selectedPack);
    await showPackAnimation(card, selectedPack);
    updateHeaderUI();
    updatePackButtons();
    startTimerIfNeeded();
    checkAllChallenges();
  } catch (err) {
    console.error('Open pack error:', err);
    showToast('Connessione non pronta. Puoi sfogliare la collezione salvata.');
  } finally {
    isAnimating = false;
  }
});

$('btn-open-x3').addEventListener('click', async () => {
  if (isAnimating || getTotalPacks() < 3) return;
  isAnimating = true;

  try {
    for (let i = 0; i < 3; i++) {
      if (getTotalPacks() <= 0) break;
      const card = await openPack(selectedPack);
      await showPackAnimation(card, selectedPack, i > 0); // abbreviated for 2nd/3rd
      updateHeaderUI();
      updatePackButtons();
    }

    startTimerIfNeeded();
    checkAllChallenges();
  } catch (err) {
    console.error('Open x3 error:', err);
    showToast('Connessione non pronta. Riprova tra poco.');
  } finally {
    isAnimating = false;
  }
});

// ════════════════════════════════════════════════════════════
// 6. ANIMATION ENGINE
// ════════════════════════════════════════════════════════════

function showPackAnimation(card, packType, abbreviated = false) {
  return new Promise(resolve => {
    const overlay = packOverlay;
    const overlayBg = $('overlay-bg');
    const meta = RARITY_META[card.rarity];
    const packMeta = PACK_TYPES[packType];

    // Clear previous content (keep overlay-bg)
    Array.from(overlay.children).forEach(ch => {
      if (ch.id !== 'overlay-bg') ch.remove();
    });

    overlay.classList.add('active');
    overlayBg.className = 'overlay-bg fade-in';

    if (abbreviated) {
      // Abbreviated: skip phase 1-3, go directly to card reveal
      setTimeout(() => showCardReveal(overlay, card, meta, resolve), 300);
      return;
    }

    // Phase 1: Pack appears (0-300ms)
    const packEl = document.createElement('div');
    packEl.className = 'pack-3d glass';
    packEl.style.borderColor = packMeta.accentColor;
    packEl.style.setProperty('--pack-accent', packMeta.accentColor);
    packEl.style.animation = 'micro-pulse 0.2s ease';

    // Pack halves for split animation
    const topHalf = document.createElement('div');
    topHalf.className = 'pack-half pack-half-top';
    topHalf.style.background = `linear-gradient(180deg, ${packMeta.accentColor}22, ${packMeta.accentColor}11)`;
    const bottomHalf = document.createElement('div');
    bottomHalf.className = 'pack-half pack-half-bottom';
    bottomHalf.style.background = `linear-gradient(0deg, ${packMeta.accentColor}22, ${packMeta.accentColor}11)`;

    // Pack content
    const iconEl = document.createElement('div');
    iconEl.className = 'pack-animation-icon';
    iconEl.innerHTML = svgIcon(packMeta.icon || 'package');
    const nameEl = document.createElement('div');
    nameEl.className = 'pack-animation-name';
    nameEl.textContent = packMeta.name;

    packEl.appendChild(topHalf);
    packEl.appendChild(bottomHalf);
    packEl.appendChild(iconEl);
    packEl.appendChild(nameEl);

    // Glow
    const glow = document.createElement('div');
    glow.className = 'pack-glow';
    glow.style.cssText = `border: 2px solid ${packMeta.accentColor}; box-shadow: 0 0 30px ${packMeta.accentColor}`;
    packEl.appendChild(glow);

    overlay.appendChild(packEl);

    // Phase 2: Tremble (300-1200ms)
    setTimeout(() => {
      packEl.classList.add('tremble');
      glow.style.animation = 'glow-pulse 0.6s ease-in-out infinite';
    }, 300);

    // Phase 3: Open on tap or auto after 1.2s
    let opened = false;
    function openPack() {
      if (opened) return;
      opened = true;

      topHalf.classList.add('open-top');
      bottomHalf.classList.add('open-bottom');
      iconEl.style.opacity = '0';
      nameEl.style.opacity = '0';

      // Flash
      const flash = document.createElement('div');
      flash.className = card.rarity === 'legendary' ? 'flash-white intense' : 'flash-white';
      overlay.appendChild(flash);
      setTimeout(() => flash.remove(), 300);

      // Remove pack after split
      setTimeout(() => {
        packEl.remove();
        showCardReveal(overlay, card, meta, resolve);
      }, 500);
    }

    packEl.addEventListener('click', openPack);
    setTimeout(openPack, 1500);
  });
}

function showCardReveal(overlay, card, meta, resolve) {
  // Phase 4: Card reveal
  const revealContainer = document.createElement('div');
  revealContainer.className = 'reveal-card scale-in';
  revealContainer.style.cssText = 'position:relative; z-index:3';

  const inner = document.createElement('div');
  inner.className = 'reveal-card-inner unflipped';

  // Front
  const front = document.createElement('div');
  front.className = 'reveal-card-front';
  front.style.background = `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`;
  if (card.rarity !== 'common') {
    front.style.border = `${card.rarity === 'epic' ? 3 : card.rarity === 'legendary' ? 4 : 2}px solid ${meta.color}`;
  } else {
    front.style.border = `2px solid ${meta.color}`;
  }

  front.innerHTML = `
    ${cardMark(card, 'card-mark-large')}
    <span class="card-reveal-name">${card.name}</span>
    <span class="card-reveal-nation">${card.nation}</span>
    <span class="card-reveal-type">${card.type === 'team' ? 'Stemma Nazione' : card.type === 'player' ? 'Star Player' : 'Icona Storica'}</span>
    <span class="reveal-rarity-badge" style="background:${meta.color}">${meta.label}</span>
  `;

  // Back
  const back = document.createElement('div');
  back.className = 'reveal-card-back';
  back.innerHTML = `<span class="back-pattern">${svgIcon('ball', 'back-pattern-icon')}</span>`;

  inner.appendChild(front);
  inner.appendChild(back);
  revealContainer.appendChild(inner);
  overlay.appendChild(revealContainer);

  // Flip after scale-in
  setTimeout(() => {
    inner.classList.remove('unflipped');
    inner.classList.add('flipped');
  }, 400);

  // Phase 5: Post-reveal effects (after flip completes at ~1000ms)
  setTimeout(() => {
    applyRarityEffects(overlay, revealContainer, card, meta);
  }, 1000);

  // Continue button
  const btnContinue = document.createElement('button');
  btnContinue.className = 'btn-continue';
  btnContinue.textContent = 'Continua';
  btnContinue.style.opacity = '0';
  overlay.appendChild(btnContinue);

  setTimeout(() => {
    btnContinue.style.opacity = '1';
    btnContinue.style.transition = 'opacity 0.3s';
  }, 1200);

  btnContinue.addEventListener('click', () => {
    // Phase 6: Close
    revealContainer.style.transition = 'transform 0.3s, opacity 0.3s';
    revealContainer.style.transform = 'scale(0.8)';
    revealContainer.style.opacity = '0';
    btnContinue.style.opacity = '0';

    const bg = $('overlay-bg');
    bg.className = 'overlay-bg fade-out';

    setTimeout(() => {
      overlay.classList.remove('active');
      // Clean up
      Array.from(overlay.children).forEach(ch => {
        if (ch.id !== 'overlay-bg') ch.remove();
      });
      resolve();
    }, 300);
  });
}

function applyRarityEffects(overlay, container, card, meta) {
  if (card.rarity === 'common') return;

  if (card.rarity === 'rare') {
    // 8 blue stars
    spawnStarParticles(8, meta.color, overlay);
    // Glow pulse on card
    container.querySelector('.reveal-card-front').style.boxShadow =
      `0 0 20px ${meta.glow}, 0 0 40px ${meta.glow}`;
  }

  if (card.rarity === 'epic') {
    // 16 purple particles + scintille
    spawnParticles(16, meta.color, overlay);
    // Vibrate card
    container.style.animation = 'vibrate 0.1s ease-in-out 3';
    // Persistent glow
    container.querySelector('.reveal-card-front').style.boxShadow =
      `0 0 24px ${meta.glow}, 0 0 48px ${meta.glow}`;
  }

  if (card.rarity === 'legendary') {
    // Intense effects
    // 1. Extra flash already handled in phase 3

    // 2. 40 gold particles with gravity
    spawnParticles(40, meta.color, overlay, true);

    // 3. Shimmer border on revealed card
    container.querySelector('.reveal-card-front').style.cssText +=
      `; position:relative; overflow:visible;`;
    const shimmer = document.createElement('div');
    shimmer.style.cssText = `
      position:absolute; inset:-4px; border-radius:20px;
      background: linear-gradient(90deg, #f59e0b, #fde68a, #b45309, #fde68a, #f59e0b);
      background-size: 300% 100%; animation: shimmer-border 3s ease-in-out infinite; z-index: -1;
    `;
    container.querySelector('.reveal-card-front').appendChild(shimmer);

    // 4. Gold overlay bg
    const goldBg = document.createElement('div');
    goldBg.className = 'gold-overlay';
    overlay.appendChild(goldBg);
    setTimeout(() => goldBg.classList.add('fade-out'), 800);
    setTimeout(() => goldBg.remove(), 1600);

    // 5. Bounce loop
    container.classList.add('bounce');

    // 6. Vibrate
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    // 7. Legendary text banner
    const banner = document.createElement('div');
    banner.className = 'legendary-banner';
    banner.innerHTML = `${svgIcon('trophy', 'legendary-banner-icon')}<span>LEGGENDARIO</span>`;
    overlay.insertBefore(banner, container);
  }
}

// ── Particle Systems ──

function spawnParticles(count, color, container, withGravity = false) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = withGravity ? 4 + Math.random() * 8 : 4 + Math.random() * 4;
    particle.style.cssText = `
      width:${size}px; height:${size}px; background:${color};
      left:${cx}px; top:${cy}px; opacity:1;
    `;
    container.appendChild(particle);

    // Physics
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let x = 0, y = 0, opacity = 1, frame = 0;
    const maxFrames = 60;

    function animate() {
      frame++;
      vx *= 0.92;
      vy *= 0.92;
      if (withGravity) vy += 0.3;
      x += vx;
      y += vy;
      opacity = 1 - frame / maxFrames;

      particle.style.transform = `translate(${x}px, ${y}px)`;
      particle.style.opacity = opacity;

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    }
    requestAnimationFrame(animate);
  }
}

function spawnStarParticles(count, color, container) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    star.style.cssText = `
      background:${color}; left:${cx + (Math.random() - 0.5) * 120}px;
      top:${cy + (Math.random() - 0.5) * 160}px;
      animation: star-burst 0.6s ${i * 0.05}s ease-out forwards;
    `;
    container.appendChild(star);
    setTimeout(() => star.remove(), 700 + i * 50);
  }
}

// ════════════════════════════════════════════════════════════
// 7. COLLECTION MODULE
// ════════════════════════════════════════════════════════════

function renderCollection(tab) {
  const grid = $('collection-grid');
  const cards = getCardsByPack(tab);

  // Sort: legendary → epic → rare → common
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  cards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

  grid.innerHTML = '';
  cards.forEach(card => {
    const owned = userCollection[card.id];
    const el = document.createElement('div');
    el.className = `card-item rarity-${card.rarity} ${owned ? '' : 'locked'}`;
    el.dataset.cardId = card.id;

    if (owned) {
      el.innerHTML = `
        ${cardMark(card)}
        <span class="card-name">${card.name}</span>
        <span class="card-type">${card.type === 'team' ? 'Nazione' : card.type === 'player' ? 'Giocatore' : 'Icona'}</span>
        <span class="card-rarity-badge" style="background:${RARITY_META[card.rarity].color}">${RARITY_META[card.rarity].label}</span>
        ${owned.count > 1 ? `<span class="card-copies-badge">×${owned.count}</span>` : ''}
      `;
      el.addEventListener('click', () => showCardDetail(card, owned));
    } else {
      el.innerHTML = `
        ${lockedCardMark()}
        <span class="card-name">???</span>
        <span class="card-type">${card.type === 'team' ? 'Nazione' : card.type === 'player' ? 'Giocatore' : 'Icona'}</span>
      `;
    }
    grid.appendChild(el);
  });

  updateCollectionStats();
  setupCollectionTabs();
}

function setupCollectionTabs() {
  const tabs = $('collection-tabs').querySelectorAll('.tab-pill');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCollection(tab.dataset.tab);
    };
  });
}

function getActiveCollectionTab() {
  return $('collection-tabs')?.querySelector('.tab-pill.active')?.dataset.tab || 'nations';
}

function setupCollectionSearch() {
  if (collectionSearchReady) return;
  collectionSearchReady = true;
  $('btn-search-card-code').addEventListener('click', searchCardByCode);
  $('card-code-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchCardByCode();
  });
}

function updateCollectionStats() {
  const total = Object.keys(userCollection).length;
  const percent = Math.round((total / ALL_CARDS.length) * 100);

  $('collection-count').textContent = `${total} / ${ALL_CARDS.length} carte`;
  $('collection-percent').textContent = `${percent}%`;
  $('collection-progress').style.width = `${percent}%`;

  // Tab counts
  ['nations', 'stars', 'legends'].forEach(pack => {
    const packCards = getCardsByPack(pack);
    const owned = packCards.filter(c => userCollection[c.id]).length;
    const el = $(`tab-count-${pack}`);
    if (el) el.textContent = `${owned}/${packCards.length}`;
  });
}

function showCardDetail(card, owned) {
  const modal = cardModal;
  const preview = $('modal-card-preview');
  const info = $('modal-info');
  const meta = RARITY_META[card.rarity];
  const isLegendary = card.rarity === 'legendary';
  const isEpic = card.rarity === 'epic';

  preview.className = `modal-card-preview rarity-${card.rarity}` + (isLegendary ? ' legendary-hero' : '');
  preview.style.cssText = '';

  const typeLabel = card.type === 'team' ? 'Stemma Nazione'
    : card.type === 'player' ? 'Star Player' : 'Icona Storica';

  // Hero preview: distinct look per rarity
  if (isLegendary) {
    preview.style.background = `
      radial-gradient(circle at 50% 28%, ${meta.color} 0%, rgba(248,195,90,0.0) 60%),
      conic-gradient(from 210deg at 50% 50%, ${meta.gradient[0]}, ${meta.gradient[1]}, ${meta.gradient[0]})
    `;
  } else {
    preview.style.background = `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`;
  }
  preview.style.border = `${isLegendary ? 4 : isEpic ? 3 : 2}px solid ${meta.color}`;
  preview.style.boxShadow = isLegendary
    ? `0 0 28px ${meta.glow || meta.color}, inset 0 0 40px rgba(255,255,255,0.12)`
    : (meta.glow ? `0 0 18px ${meta.glow}` : 'none');

  preview.innerHTML = `
    ${isLegendary ? '<span class="legendary-rays" aria-hidden="true"></span>' : ''}
    ${cardMark(card, 'card-mark-large')}
    <span class="modal-card-name">${escapeHtml(card.name)}</span>
    <span class="modal-card-type">${escapeHtml(typeLabel)}</span>
  `;

  const unlockedDate = owned.unlockedAt?.toDate ? owned.unlockedAt.toDate() : new Date(owned.unlockedAt);
  const dateStr = Number.isNaN(unlockedDate.getTime()) ? 'Data non disponibile' : unlockedDate.toLocaleDateString('it-IT');
  const code = getPrimaryCode(owned);

  info.innerHTML = `
    <div class="modal-head">
      <h3>${escapeHtml(card.name)}</h3>
      <span class="modal-rarity-pill" style="--rarity-color:${meta.color}">${meta.label}</span>
    </div>
    ${code ? `<div class="card-unique-code">${escapeHtml(code)}</div>` : ''}
    <div class="modal-info-grid">
      <div class="modal-info-cell">
        <span class="modal-info-label">Nazione</span>
        <span class="modal-info-value">${escapeHtml(card.nation)}</span>
      </div>
      <div class="modal-info-cell">
        <span class="modal-info-label">Tipo</span>
        <span class="modal-info-value">${escapeHtml(typeLabel)}</span>
      </div>
      <div class="modal-info-cell">
        <span class="modal-info-label">Rarità</span>
        <span class="modal-info-value" style="color:${meta.color}">${meta.label}</span>
      </div>
      <div class="modal-info-cell">
        <span class="modal-info-label">Copie</span>
        <span class="modal-info-value">${owned.count || 1}</span>
      </div>
      <div class="modal-info-cell modal-info-cell--wide">
        <span class="modal-info-label">Sbloccata il</span>
        <span class="modal-info-value">${dateStr}</span>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary modal-action" id="btn-copy-card-code" ${code ? '' : 'disabled'}>${svgIcon('cards')} Copia codice</button>
      <button class="btn-primary modal-action" id="btn-share-card-image" ${code ? '' : 'disabled'}>${svgIcon('share')} Condividi</button>
    </div>
  `;

  modal.classList.add('active');

  // Close handlers
  $('modal-close').onclick = () => modal.classList.remove('active');
  $('modal-overlay').onclick = () => modal.classList.remove('active');
  $('btn-copy-card-code').onclick = () => copyCardCode(code);
  $('btn-share-card-image').onclick = () => shareCardImage(card, owned);
}

function findLocalCode(code) {
  const normalized = normalizeCardCode(code);
  for (const [cardId, owned] of Object.entries(userCollection)) {
    if (getOwnedCodes(owned).includes(normalized)) {
      const card = getCardById(cardId);
      if (!card) continue;
      return {
        code: normalized,
        cardId,
        cardName: card.name,
        cardType: card.type,
        cardNation: card.nation,
        rarity: card.rarity,
        packType: card.packType,
        ownerUid: currentUser?.uid || userData?.uid || '',
        ownerUsername: userData?.username || '',
        ownerDisplayName: userData?.displayName || currentUser?.displayName || '',
        ownerPhotoURL: userData?.photoURL || currentUser?.photoURL || '',
        unlockedAt: owned.unlockedAt
      };
    }
  }
  return null;
}

async function searchCardByCode() {
  const input = $('card-code-input');
  const resultEl = $('card-code-result');
  const code = normalizeCardCode(input.value);
  if (!code) {
    resultEl.innerHTML = '';
    return;
  }

  resultEl.innerHTML = `<div class="code-result loading">Ricerca in corso...</div>`;

  try {
    let data = null;
    if (isOnlineApp()) {
      const doc = await db.collection('pd_card_codes').doc(code).get();
      if (doc.exists) data = doc.data();
    }
    if (!data) data = findLocalCode(code);

    if (!data) {
      resultEl.innerHTML = `<div class="code-result"><p class="text-muted">Nessuna carta trovata con questo codice.</p></div>`;
      return;
    }

    renderCardCodeResult(data);
  } catch (err) {
    console.error('Card code search error:', err);
    const local = findLocalCode(code);
    if (local) renderCardCodeResult(local);
    else resultEl.innerHTML = `<div class="code-result"><p class="text-muted">Ricerca non disponibile ora. Riprova quando Firebase è collegato.</p></div>`;
  }
}

function renderCardCodeResult(data) {
  const resultEl = $('card-code-result');
  const card = getCardById(data.cardId) || {
    id: data.cardId,
    name: data.cardName || 'Carta sconosciuta',
    type: data.cardType || 'team',
    nation: data.cardNation || '',
    rarity: data.rarity || 'common',
    packType: data.packType || 'nations'
  };
  const meta = RARITY_META[card.rarity] || RARITY_META.common;
  const ownerUid = data.ownerUid;
  const isMine = ownerUid && currentUser?.uid === ownerUid;
  const isFriend = ownerUid && (userData?.friends || []).includes(ownerUid);
  const isPending = ownerUid && (userData?.sentRequests || []).includes(ownerUid);
  const isReceived = ownerUid && (userData?.friendRequests || []).includes(ownerUid);
  let action = '';

  if (!ownerUid || isMine) {
    action = '<span class="result-status">Tua carta</span>';
  } else if (isFriend) {
    action = '<span class="result-status">Già amici</span>';
  } else if (!isOnlineApp()) {
    action = '<span class="result-status">Accedi per inviare richiesta</span>';
  } else {
    const label = isReceived ? 'Accetta richiesta' : isPending ? 'Richiesta inviata' : 'Invia richiesta';
    action = `<button class="btn-add-friend" id="btn-code-friend" data-uid="${ownerUid}" ${isPending ? 'disabled' : ''}>${label}</button>`;
  }

  resultEl.innerHTML = `
    <div class="code-result">
      <div class="code-result-card rarity-${card.rarity}">
        ${cardMark(card)}
      </div>
      <div class="code-result-info">
        <div class="code-result-top">
          <span class="card-unique-code">${escapeHtml(normalizeCardCode(data.code))}</span>
          <span class="reveal-rarity-badge" style="background:${meta.color}">${meta.label}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p>${escapeHtml(card.nation || data.cardNation || '')}</p>
        <div class="code-result-meta">
          <span>${formatDate(data.unlockedAt)}</span>
          <span>@${escapeHtml(data.ownerUsername || 'utente')}</span>
        </div>
        ${action}
      </div>
    </div>
  `;

  const btn = $('btn-code-friend');
  if (btn && !btn.disabled) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      if (isReceived) {
        await acceptFriendRequest(ownerUid);
        btn.textContent = 'Amico aggiunto';
      } else {
        const result = await sendFriendRequest(ownerUid);
        btn.textContent = result?.status === 'accepted' ? 'Amico aggiunto' : 'Richiesta inviata';
      }
      updateRequestBadge();
    });
  }
}

async function copyCardCode(code) {
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    showToast('Codice copiato.');
  } catch (err) {
    showToast(code);
  }
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function createCardImageBlob(card, owned) {
  // Wait for fonts to load to avoid standard Arial fallback on canvas text
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (err) {
    console.warn("Font loading error, continuing with system fonts:", err);
  }

  const meta = RARITY_META[card.rarity] || RARITY_META.common;
  const code = getPrimaryCode(owned);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const glowColor = meta.color || '#2dd4bf';

  // 1. Deep Rich Background Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#040d0a');
  bg.addColorStop(0.5, '#010504');
  bg.addColorStop(1, '#020907');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Soft Ambient Radial Glow behind the card
  const radialGlow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 100,
    canvas.width / 2, canvas.height / 2, 700
  );
  radialGlow.addColorStop(0, glowColor + '22'); // ~13% opacity
  radialGlow.addColorStop(0.5, glowColor + '06'); // ~2% opacity
  radialGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Futuristic Blueprint Blueprint Grid
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.02)';
  ctx.lineWidth = 1;
  for (let x = 60; x < canvas.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 60; y < canvas.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Concentric blueprint circles in background
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.015)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(540, 675, 450, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(540, 675, 550, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Card Shadow/Glow
  ctx.save();
  drawRoundRect(ctx, 104, 118, 872, 1114, 54);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 80;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();
  ctx.restore();

  // 5. Card Glassmorphic Background Fill
  const cardBg = ctx.createLinearGradient(104, 118, 104, 118 + 1114);
  cardBg.addColorStop(0, 'rgba(16, 36, 29, 0.88)');
  cardBg.addColorStop(0.3, 'rgba(10, 22, 18, 0.94)');
  cardBg.addColorStop(1, 'rgba(3, 8, 6, 0.99)');
  ctx.fillStyle = cardBg;
  drawRoundRect(ctx, 104, 118, 872, 1114, 54);
  ctx.fill();

  // 6. Glowing Outer Card Border
  const borderGrad = ctx.createLinearGradient(104, 118, 104 + 872, 118 + 1114);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  borderGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)');
  borderGrad.addColorStop(0.5, glowColor + '50');
  borderGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
  borderGrad.addColorStop(1, glowColor + '80');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner subtle glass border reflection
  ctx.save();
  drawRoundRect(ctx, 110, 124, 860, 1102, 48);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 7. Card Header
  ctx.fillStyle = 'rgba(243, 255, 248, 0.4)';
  ctx.font = '800 20px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText("OFFICIAL WC26 DIGITAL COLLECTIBLE", 540, 162);

  // 8. High-Tech Concentric Initials Badge
  // Dashed tracking ring
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(540, 540, 310, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Crosshair ticks
  ctx.strokeStyle = glowColor + '40';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(540, 205); ctx.lineTo(540, 225); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(540, 855); ctx.lineTo(540, 875); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(205, 540); ctx.lineTo(225, 540); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(855, 540); ctx.lineTo(875, 540); ctx.stroke();

  // Badge Container Sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(540, 540, 270, 0, Math.PI * 2);
  ctx.closePath();

  const sphereBg = ctx.createRadialGradient(540, 540, 0, 540, 540, 270);
  sphereBg.addColorStop(0, 'rgba(18, 38, 31, 0.95)');
  sphereBg.addColorStop(0.7, 'rgba(8, 18, 14, 0.98)');
  sphereBg.addColorStop(1, '#020504');
  ctx.fillStyle = sphereBg;
  ctx.fill();

  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Striped overlays inside the badge circle
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 3;
  for (let offset = -540; offset < 540; offset += 25) {
    ctx.beginPath();
    ctx.moveTo(540 + offset, 270);
    ctx.lineTo(540 + offset + 270, 810);
    ctx.stroke();
  }
  ctx.restore();

  // Initials Text
  ctx.save();
  ctx.font = '800 160px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Apply custom rarity gradient styles
  if (card.rarity === 'legendary') {
    const textGrad = ctx.createLinearGradient(380, 460, 700, 620);
    textGrad.addColorStop(0, '#ffe89c');
    textGrad.addColorStop(0.5, '#f8c35a');
    textGrad.addColorStop(1, '#e2a13c');
    ctx.fillStyle = textGrad;
  } else if (card.rarity === 'epic') {
    const textGrad = ctx.createLinearGradient(380, 460, 700, 620);
    textGrad.addColorStop(0, '#f3e8ff');
    textGrad.addColorStop(0.5, '#c084fc');
    textGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = textGrad;
  } else if (card.rarity === 'rare') {
    const textGrad = ctx.createLinearGradient(380, 460, 700, 620);
    textGrad.addColorStop(0, '#e0f2fe');
    textGrad.addColorStop(0.5, '#38bdf8');
    textGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = textGrad;
  } else {
    ctx.fillStyle = '#ffffff';
  }

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillText(getCardInitials(card), 540, 546);
  ctx.restore();

  // 9. Card Details Typography
  ctx.fillStyle = '#f3fff8';
  ctx.font = '800 76px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.name, 540, 915);

  ctx.fillStyle = 'rgba(243, 255, 248, 0.6)';
  ctx.font = '700 32px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.nation.toUpperCase(), 540, 970);

  // 10. Rarity Badge Capsule
  ctx.save();
  const badgeX = 360;
  const badgeY = 1010;
  const badgeW = 360;
  const badgeH = 54;
  const badgeR = 27;
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.strokeStyle = glowColor + '80';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = glowColor;
  ctx.font = '800 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.label.toUpperCase(), 540, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // 11. Unique Code Certificate Capsule (Centered, No Barcode)
  ctx.save();
  const certX = 180;
  const certY = 1090;
  const certW = 720;
  const certH = 100;
  const certR = 12;

  drawRoundRect(ctx, certX, certY, certW, certH, certR);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundRect(ctx, certX + 6, certY + 6, certW - 12, certH - 12, certR - 6);
  ctx.strokeStyle = glowColor + '20';
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Label (Centered)
  ctx.fillStyle = 'rgba(243, 255, 248, 0.4)';
  ctx.font = '700 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText("CERTIFICATE OF AUTHENTICITY", 540, certY + 20);

  // Unique Code (Centered)
  ctx.fillStyle = '#f3fff8';
  ctx.font = '800 32px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(code || 'N/A', 540, certY + certH - 18);

  // 12. Footer Branding
  ctx.fillStyle = '#b8c8bf';
  ctx.font = '700 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PackDrop | @${userData?.username || 'utente'} | ${formatDate(owned.unlockedAt)}`, 540, 1295);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

async function shareCardImage(card, owned) {
  const code = getPrimaryCode(owned);
  if (!code) {
    showToast('Codice non ancora disponibile. Riprova quando Firebase sincronizza.');
    return;
  }
  const blob = await createCardImageBlob(card, owned);
  if (!blob) {
    showToast('Immagine non generata. Riprova.');
    return;
  }
  const file = new File([blob], `${code}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${card.name} | PackDrop`,
        text: `Carta PackDrop ${card.name} - codice ${code}`,
        files: [file]
      });
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Immagine carta scaricata.');
}

// ════════════════════════════════════════════════════════════
// 8. PROFILE MODULE
// ════════════════════════════════════════════════════════════

function getUserAvatarUrl(profile = {}, fallbackSeed = '') {
  if (profile.photoURL) return profile.photoURL;
  const label = (profile.displayName || profile.username || fallbackSeed || '?').trim()[0] || '?';
  const safeLabel = encodeURIComponent(label.toUpperCase());
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='50' fill='%2342d392'/%3E%3Ctext x='50' y='62' text-anchor='middle' font-family='Arial' font-size='40' font-weight='700' fill='%2304110c'%3E${safeLabel}%3C/text%3E%3C/svg%3E`;
}

function uniqueArray(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function addUniqueLocal(field, uid) {
  userData[field] = uniqueArray([...(userData?.[field] || []), uid]);
}

function removeLocal(field, uid) {
  userData[field] = (userData?.[field] || []).filter(item => item !== uid);
}

function getFriendshipId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

async function fetchUserProfiles(uids) {
  if (!isOnlineApp()) return new Map();
  const unique = uniqueArray(uids);
  const entries = await Promise.all(unique.map(async uid => {
    try {
      const snap = await db.collection('pd_users').doc(uid).get();
      return snap.exists ? [uid, snap.data()] : null;
    } catch (err) {
      return null;
    }
  }));
  return new Map(entries.filter(Boolean));
}

function renderProfile() {
  // Hero
  $('profile-avatar').src = getUserAvatarUrl({ ...userData, photoURL: currentUser?.photoURL || userData?.photoURL });
  $('profile-name').textContent = userData?.displayName || currentUser?.displayName || '';
  $('profile-username').textContent = `@${userData?.username || ''}`;
  const percent = Math.round((Object.keys(userCollection).length / ALL_CARDS.length) * 100);
  $('profile-completion').textContent = `${percent}% completato`;

  // Stats
  $('stat-packs').textContent = userData?.totalPacksOpened || 0;
  $('stat-cards').textContent = Object.keys(userCollection).length;
  $('stat-legendary').textContent = Object.keys(userCollection).filter(id => {
    const card = getCardById(id);
    return card && card.rarity === 'legendary';
  }).length;
  $('stat-challenges').textContent = userData?.completedChallenges?.length || 0;

  renderFriendsList();
  renderFriendRequests();
  setupProfileHandlers();
  syncUpdateNowButton();
}

// Show the "Aggiorna ora" button only when an update has been postponed
// (i.e. the pending SHA is set, typically after clicking "Più tardi").
function syncUpdateNowButton() {
  const btn = $('btn-update-now');
  if (!btn) return;
  const pendingSha = localStorage.getItem(UPDATE_PENDING_SHA_KEY);
  btn.classList.toggle('hidden', !pendingSha);
}

async function renderFriendsList() {
  const list = $('friends-list');
  const friends = userData?.friends || [];

  if (friends.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${svgIcon('users')}</div>
        <p>Nessun amico ancora</p>
      </div>
    `;
    return;
  }

  if (!isOnlineApp()) {
    list.innerHTML = `<div class="empty-state"><p>Amici salvati: ${friends.length}. Dettagli disponibili appena Firebase è collegato.</p></div>`;
    return;
  }

  list.innerHTML = '';
  const profiles = await fetchUserProfiles(friends);
  friends.forEach(uid => {
    const fData = profiles.get(uid);
    if (!fData) return;
    const item = document.createElement('div');
    item.className = 'friend-card';
    item.innerHTML = `
      <img class="friend-card-avatar" src="${escapeAttr(getUserAvatarUrl(fData, uid))}" alt="" loading="lazy">
      <div class="friend-card-info">
        <div class="friend-card-name">${escapeHtml(fData.displayName || 'Utente')}</div>
        <div class="friend-card-username">@${escapeHtml(fData.username || 'utente')}</div>
      </div>
      <div class="friend-card-actions">
        <button class="btn-friend-action primary btn-view" data-uid="${escapeAttr(uid)}">Collezione</button>
        <button class="btn-friend-action btn-remove" data-uid="${escapeAttr(uid)}">
          <svg class="icon"><use href="#icon-x"></use></svg>
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  if (!list.children.length) {
    list.innerHTML = `<div class="empty-state"><p>Amici non caricati. Riprova tra poco.</p></div>`;
  }

  // Add view collection handlers
  list.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const fData = profiles.get(uid);
      if (fData) showFriendCollection({ ...fData, uid });
    });
  });

  // Remove friend handlers
  list.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      await removeFriend(uid);
      renderFriendsList();
    });
  });
}

// ── Friend Collection Modal ──
async function showFriendCollection(fData) {
  const modal = $('friend-collection-modal');
  if (!modal) return;

  $('friend-modal-title').textContent = `Collezione di ${fData.displayName || fData.username || 'Utente'}`;
  $('friend-modal-avatar').src = getUserAvatarUrl(fData, fData.uid || '');

  const grid = $('friend-collection-grid');
  grid.innerHTML = '<div class="empty-state"><p style="padding:20px;color:var(--text-muted)">Caricamento…</p></div>';

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  // Close handler
  const closeBtn = $('friend-collection-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    };
  }

  // Load friend collection from Firestore
  friendCardsCache = {};
  if (isOnlineApp() && fData.uid) {
    try {
      const snap = await db.collection('pd_users').doc(fData.uid).collection('collection').get();
      snap.forEach(doc => { friendCardsCache[doc.id] = doc.data(); });
    } catch (err) {
      console.warn('Friend collection load error:', err);
    }
  }

  // Progress summary
  const owned = Object.keys(friendCardsCache).length;
  const total = ALL_CARDS.length;
  const pct = Math.round((owned / total) * 100);
  const progressEl = $('friend-collection-progress');
  if (progressEl) {
    progressEl.innerHTML = `
      <div class="friend-progress-text">
        <span>${owned}/${total} carte</span>
        <span>${pct}%</span>
      </div>
      <div class="friend-progress-bar"><div style="width:${pct}%"></div></div>
    `;
  }

  renderFriendCollectionGrid('nations');

  // Tab handlers
  const tabWrap = $('friend-collection-tabs');
  if (tabWrap && !tabWrap._bound) {
    tabWrap._bound = true;
    tabWrap.querySelectorAll('.friend-tab-pill').forEach(t => {
      bindProfileOpener(t, () => {
        tabWrap.querySelectorAll('.friend-tab-pill').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        renderFriendCollectionGrid(t.dataset.pack);
      });
    });
  }
}

// In-memory cache of the currently viewed friend's cards
let friendCardsCache = {};

function renderFriendCollectionGrid(pack) {
  const grid = $('friend-collection-grid');
  if (!grid) return;
  const cards = getCardsByPack(pack);
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  cards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

  grid.innerHTML = '';
  cards.forEach(card => {
    const isOwned = !!friendCardsCache[card.id];
    const el = document.createElement('div');
    el.className = `card-item rarity-${card.rarity} ${isOwned ? '' : 'locked'}`;
    if (isOwned) {
      el.innerHTML = `
        ${cardMark(card)}
        <span class="card-name">${escapeHtml(card.name)}</span>
        <span class="card-rarity-badge" style="background:${RARITY_META[card.rarity].color}">${RARITY_META[card.rarity].label}</span>
      `;
    } else {
      el.innerHTML = `${lockedCardMark()}<span class="card-name">???</span>`;
    }
    grid.appendChild(el);
  });
}

async function renderFriendRequests() {
  const section = $('requests-section');
  const list = $('requests-list');
  if (!section || !list) return;

  // Prefer the realtime incoming list; fall back to userData.friendRequests.
  const requests = (incomingRequests && incomingRequests.length)
    ? incomingRequests.map(r => r.from)
    : (userData?.friendRequests || []);

  if (requests.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (!isOnlineApp()) {
    list.innerHTML = `<div class="empty-state"><p>${requests.length} richiesta in attesa. Accedi online per gestirla.</p></div>`;
    return;
  }

  let profiles;
  try {
    profiles = await fetchUserProfiles(requests);
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><p>Errore nel caricamento. Riprova.</p></div>`;
    return;
  }

  list.innerHTML = '';
  requests.forEach(fromUid => {
    const fData = profiles.get(fromUid);
    if (!fData) return;
    const item = document.createElement('div');
    item.className = 'request-item';
    item.innerHTML = `
      <img class="friend-avatar" src="${escapeAttr(getUserAvatarUrl(fData, fromUid))}" alt="" loading="lazy">
      <div class="friend-info">
        <div class="friend-name">${escapeHtml(fData.displayName || 'Utente')}</div>
        <div class="friend-username">@${escapeHtml(fData.username || 'utente')}</div>
      </div>
      <div class="request-actions">
        <button class="btn-accept" data-uid="${escapeAttr(fromUid)}">Accetta</button>
        <button class="btn-reject" data-uid="${escapeAttr(fromUid)}">Rifiuta</button>
      </div>
    `;
    list.appendChild(item);
  });

  if (!list.children.length) {
    section.style.display = 'none';
    return;
  }

  list.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await acceptFriendRequest(btn.dataset.uid);
      } catch (err) {
        showToast('Errore. Riprova.');
        btn.disabled = false;
        btn.textContent = 'Accetta';
        return;
      }
      renderFriendRequests();
      renderFriendsList();
      updateRequestBadge();
    });
  });

  list.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await rejectFriendRequest(btn.dataset.uid);
      } catch (err) {
        showToast('Errore. Riprova.');
        btn.disabled = false;
        btn.textContent = 'Rifiuta';
        return;
      }
      renderFriendRequests();
      updateRequestBadge();
    });
  });
}

function setupProfileHandlers() {
  if (profileHandlersReady) return;
  profileHandlersReady = true;

  // Profile Tabs
  const tabs = document.querySelectorAll('.profile-tab');
  const contents = document.querySelectorAll('.profile-tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const contentId = `profile-tab-${tab.dataset.tab}`;
      const content = $(contentId);
      if (content) content.classList.add('active');
    });
  });

  // Search user
  $('btn-search-user').addEventListener('click', searchUser);
  $('friend-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchUser();
  });

  // Invite
  const btnInvite = $('btn-invite');
  if (btnInvite) btnInvite.addEventListener('click', shareInvite);

  // Manual app update (visible only when an update was postponed)
  const btnUpdateNow = $('btn-update-now');
  if (btnUpdateNow) {
    btnUpdateNow.addEventListener('click', async () => {
      if (btnUpdateNow.dataset.loading === 'true') return;
      btnUpdateNow.dataset.loading = 'true';
      btnUpdateNow.classList.add('loading');
      btnUpdateNow.disabled = true;
      const pendingSha = localStorage.getItem(UPDATE_PENDING_SHA_KEY);
      await applyAppUpdate(pendingSha || undefined);
    });
  }

  // Logout
  const btnLogout = $('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (!firebaseReady || !auth) return;
      const confirmed = window.confirm('Vuoi davvero uscire dal tuo account?');
      if (!confirmed) return;
      try {
        await auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }
}

async function searchUser() {
  const inputEl = $('friend-search-input');
  const username = inputEl ? inputEl.value.trim().toLowerCase().replace(/^@+/, '') : '';
  const resultEl = $('friend-search-result');
  if (!username) { resultEl.innerHTML = ''; return; }
  if (!isOnlineApp()) {
    resultEl.innerHTML = `<p class="text-muted" style="padding:8px">Ricerca utenti disponibile appena Firebase è collegato.</p>`;
    return;
  }

  try {
    const doc = await db.collection('pd_usernames').doc(username).get();
    if (!doc.exists) {
      resultEl.innerHTML = `<p class="text-muted" style="padding:8px">Utente non trovato.</p>`;
      return;
    }

    const targetUid = doc.data().uid;
    if (targetUid === currentUser.uid) {
      resultEl.innerHTML = `<p class="text-muted" style="padding:8px">Questo sei tu.</p>`;
      return;
    }

    const userDoc = await db.collection('pd_users').doc(targetUid).get();
    if (!userDoc.exists) { resultEl.innerHTML = ''; return; }
    const u = userDoc.data();

    const isFriend = (userData?.friends || []).includes(targetUid);
    const isPending = (userData?.sentRequests || []).includes(targetUid);
    const isReceived = (userData?.friendRequests || []).includes(targetUid);

    let btnText = 'Invia richiesta';
    let btnDisabled = false;
    if (isFriend) { btnText = 'Già amici'; btnDisabled = true; }
    else if (isPending) { btnText = 'Richiesta inviata'; btnDisabled = true; }
    else if (isReceived) { btnText = 'Accetta richiesta'; }

    resultEl.innerHTML = `
      <div class="search-result">
        <img class="friend-avatar" src="${escapeAttr(getUserAvatarUrl(u, targetUid))}" alt="" loading="lazy">
        <div class="search-result-info">
          <div class="friend-name">${escapeHtml(u.displayName || 'Utente')}</div>
          <div class="friend-username">@${escapeHtml(u.username || 'utente')}</div>
        </div>
        <button class="btn-add-friend" id="btn-add-found" data-uid="${escapeAttr(targetUid)}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
      </div>
    `;

    const addBtn = $('btn-add-found');
    if (!btnDisabled) {
      addBtn.addEventListener('click', async () => {
        if (addBtn.disabled) return;
        addBtn.disabled = true;
        const originalText = addBtn.textContent;
        addBtn.textContent = 'Invio…';
        try {
          let result = null;
          if (isReceived) {
            await acceptFriendRequest(targetUid);
            result = { status: 'accepted' };
          } else {
            result = await sendFriendRequest(targetUid);
          }
          addBtn.textContent = result?.status === 'accepted' ? 'Amico aggiunto' : 'Richiesta inviata';
          // Refresh the received-requests list too, in case we just accepted
          renderFriendRequests();
          renderFriendsList();
          updateRequestBadge();
        } catch (err) {
          console.error('Friend action error:', err);
          addBtn.disabled = false;
          addBtn.textContent = originalText;
          // Toast already shown by sendFriendRequest/acceptFriendRequest
        }
      });
    }
  } catch (err) {
    console.error('Search error:', err);
    resultEl.innerHTML = `<p class="text-muted" style="padding:8px">Errore nella ricerca.</p>`;
  }
}

// ════════════════════════════════════════════════════════════
// 9. SOCIAL MODULE
// ════════════════════════════════════════════════════════════

async function sendFriendRequest(targetUid) {
  if (!isOnlineApp()) {
    showToast('Accedi online per inviare richieste.');
    return { status: 'offline' };
  }
  if (!targetUid || targetUid === currentUser.uid) {
    showToast('Non puoi aggiungere te stesso.');
    return { status: 'self' };
  }

  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const theirRef = db.collection('pd_users').doc(targetUid);
  const requestRef = db.collection('pd_friend_requests').doc(getFriendshipId(currentUser.uid, targetUid));

  try {
    const result = await db.runTransaction(async transaction => {
      const [mySnap, theirSnap, requestSnap] = await Promise.all([
        transaction.get(myRef),
        transaction.get(theirRef),
        transaction.get(requestRef)
      ]);
      const myData = mySnap.exists ? mySnap.data() : {};
      if ((myData.friends || []).includes(targetUid)) return { status: 'accepted' };

      if (requestSnap.exists) {
        const request = requestSnap.data();
        if (request.status === 'accepted') return { status: 'accepted' };
        if (request.status === 'pending') {
          if (request.to === currentUser.uid && request.from === targetUid) {
            // They sent us a request first — auto-accept.
            transaction.update(requestRef, {
              status: 'accepted',
              acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Each user updates ONLY their own doc.
            transaction.update(myRef, {
              friends: firebase.firestore.FieldValue.arrayUnion(targetUid),
              sentRequests: firebase.firestore.FieldValue.arrayRemove(targetUid)
            });
            return { status: 'accepted' };
          }
          return { status: 'pending' };
        }
      }

      // Create a fresh pending request. Only the sender's own doc is touched.
      transaction.set(requestRef, {
        from: currentUser.uid,
        fromUsername: userData?.username || '',
        to: targetUid,
        toUsername: theirSnap.exists ? (theirSnap.data().username || '') : '',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      transaction.update(myRef, {
        sentRequests: firebase.firestore.FieldValue.arrayUnion(targetUid)
      });
      return { status: 'created' };
    });

    if (result.status === 'accepted') {
      addUniqueLocal('friends', targetUid);
      removeLocal('sentRequests', targetUid);
      showToast('Amicizia accettata.');
      // Best-effort: add ourselves to the other user's friends list
      try {
        await db.collection('pd_users').doc(targetUid).update({
          friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
          sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
      } catch (e) {
        console.warn('Cross-user friend update skipped:', e);
      }
    } else if (result.status === 'pending') {
      addUniqueLocal('sentRequests', targetUid);
      showToast('Richiesta già inviata.');
    } else if (result.status === 'created') {
      addUniqueLocal('sentRequests', targetUid);
      showToast('✓ Richiesta inviata.');
      await incrementSentRequestCount();
    }
    saveLocalSession();
    checkAllChallenges();
    return result;
  } catch (err) {
    console.error('sendFriendRequest error:', err);
    showToast('Errore nell\'invio della richiesta. Riprova.');
    return { status: 'error' };
  }
}

async function acceptFriendRequest(fromUid) {
  if (!isOnlineApp()) {
    showToast('Accedi online per accettare richieste.');
    return;
  }
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const requestRef = db.collection('pd_friend_requests').doc(getFriendshipId(currentUser.uid, fromUid));

  try {
    await db.runTransaction(async transaction => {
      const [requestSnap] = await Promise.all([
        transaction.get(requestRef)
      ]);

      if (requestSnap.exists) {
        const request = requestSnap.data();
        if (request.status === 'pending' && request.to !== currentUser.uid) {
          throw new Error('Richiesta non valida.');
        }
        if (request.status !== 'accepted') {
          transaction.update(requestRef, {
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        transaction.set(requestRef, {
          from: fromUid,
          to: currentUser.uid,
          status: 'accepted',
          acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update the accepter's own friends array inside the transaction.
      transaction.update(myRef, {
        friends: firebase.firestore.FieldValue.arrayUnion(fromUid),
        sentRequests: firebase.firestore.FieldValue.arrayRemove(fromUid)
      });
    });

    addUniqueLocal('friends', fromUid);
    removeLocal('sentRequests', fromUid);
    saveLocalSession();
    showToast('✓ Amicizia accettata.');

    // Best-effort: also add ourselves to the sender's friends list so
    // they see the friendship immediately. If Firestore rules block
    // cross-user writes, the sender will still pick up the friendship
    // via their outgoing-accepted listener or syncAcceptedFriendships.
    try {
      await db.collection('pd_users').doc(fromUid).update({
        friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
      });
    } catch (crossErr) {
      console.warn('Cross-user friend update skipped (rules may block it):', crossErr);
    }

    await syncAcceptedFriendships();
    checkAllChallenges();
  } catch (err) {
    console.error('acceptFriendRequest error:', err);
    showToast('Errore nell\'accettazione. Riprova.');
    throw err;
  }
}

async function rejectFriendRequest(fromUid) {
  if (!isOnlineApp()) return;
  const requestRef = db.collection('pd_friend_requests').doc(getFriendshipId(currentUser.uid, fromUid));

  try {
    await requestRef.delete();
    showToast('Richiesta rifiutata.');
  } catch (err) {
    console.error('rejectFriendRequest error:', err);
    showToast('Errore. Riprova.');
  }
}

async function removeFriend(friendUid) {
  if (!isOnlineApp()) {
    showToast('Accedi online per modificare gli amici.');
    return;
  }
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const requestRef = db.collection('pd_friend_requests').doc(getFriendshipId(currentUser.uid, friendUid));

  try {
    const batch = db.batch();
    batch.update(myRef, {
      friends: firebase.firestore.FieldValue.arrayRemove(friendUid),
      sentRequests: firebase.firestore.FieldValue.arrayRemove(friendUid)
    });
    batch.set(requestRef, {
      status: 'removed',
      removedBy: currentUser.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();

    removeLocal('friends', friendUid);
    saveLocalSession();
    showToast('Amico rimosso.');
  } catch (err) {
    console.error('removeFriend error:', err);
    showToast('Errore nella rimozione. Riprova.');
  }
}

// Incoming friend requests discovered via realtime query on pd_friend_requests
// (where to == me). This replaces the old cross-user array write, which was
// silently denied by Firestore rules.
let incomingRequests = [];          // array of { id, from, fromUsername, status }
let incomingRequestsListenerUnsubscribe = null;
let outgoingRequestsListenerUnsubscribe = null;

// Starts listening for pending friend requests addressed to the current user.
// Realtime: as soon as someone sends a request, it shows up in the Amici tab
// and the profile badge updates.
// Uses single-field queries to avoid composite-index requirements — status
// filtering is done client-side.
function startIncomingRequestsListener() {
  if (!isOnlineApp()) return;
  stopIncomingRequestsListener();
  try {
    // Incoming requests (where to == me): single-field query, filter by
    // status client-side so it works without a composite Firestore index.
    const q = db.collection('pd_friend_requests')
      .where('to', '==', currentUser.uid);
    incomingRequestsListenerUnsubscribe = q.onSnapshot(snap => {
      incomingRequests = snap.docs
        .map(d => {
          const data = d.data();
          return { id: d.id, from: data.from, fromUsername: data.fromUsername || '', status: data.status };
        })
        .filter(r => r.status === 'pending');
      // Keep userData.friendRequests in sync so the "Accetta richiesta" label
      // in searchUser() and the badge stay correct.
      userData.friendRequests = incomingRequests.map(r => r.from);
      saveLocalSession();
      updateRequestBadge();
      const panel = $('profile-panel');
      if (panel && panel.classList.contains('active')) {
        renderFriendRequests();
      }
    }, err => {
      console.warn('Incoming requests listener error:', err);
    });

    // Outgoing requests (where from == me): single-field query, filter
    // accepted ones client-side. When the other party accepts, we discover
    // it in realtime and add them to our friends list.
    const qOut = db.collection('pd_friend_requests')
      .where('from', '==', currentUser.uid);
    outgoingRequestsListenerUnsubscribe = qOut.onSnapshot(snap => {
      const current = new Set(userData.friends || []);
      const toAdd = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'accepted' && data.to && !current.has(data.to)) toAdd.push(data.to);
      });
      if (toAdd.length) {
        db.collection('pd_users').doc(currentUser.uid).update({
          friends: firebase.firestore.FieldValue.arrayUnion(...toAdd)
        }).then(() => {
          toAdd.forEach(uid => addUniqueLocal('friends', uid));
          saveLocalSession();
          renderFriendsList();
          checkAllChallenges();
        }).catch(err => console.warn('Outgoing-accepted reconcile error:', err));
      }
    }, err => {
      console.warn('Outgoing requests listener error:', err);
    });
  } catch (err) {
    console.warn('Could not start incoming requests listener:', err);
  }
}

function stopIncomingRequestsListener() {
  if (incomingRequestsListenerUnsubscribe) {
    try { incomingRequestsListenerUnsubscribe(); } catch (e) {}
    incomingRequestsListenerUnsubscribe = null;
  }
  if (outgoingRequestsListenerUnsubscribe) {
    try { outgoingRequestsListenerUnsubscribe(); } catch (e) {}
    outgoingRequestsListenerUnsubscribe = null;
  }
}

// Reconcile the local friends list with accepted request docs, so that when
// the other party accepts, this client picks up the friendship without needing
// a cross-user write. Called on login and after accepting.
async function syncAcceptedFriendships() {
  if (!isOnlineApp()) return;
  try {
    const q1 = db.collection('pd_friend_requests').where('to', '==', currentUser.uid);
    const q2 = db.collection('pd_friend_requests').where('from', '==', currentUser.uid);
    const [s1, s2] = await Promise.all([q1.get(), q2.get()]);
    const accepted = new Set();
    [...s1.docs, ...s2.docs].forEach(d => {
      const data = d.data();
      if (data.status === 'accepted') {
        const other = data.from === currentUser.uid ? data.to : data.from;
        if (other) accepted.add(other);
      }
    });
    if (!accepted.size) return;
    const current = new Set(userData.friends || []);
    const toAdd = [...accepted].filter(uid => !current.has(uid));
    if (toAdd.length) {
      await db.collection('pd_users').doc(currentUser.uid).update({
        friends: firebase.firestore.FieldValue.arrayUnion(...toAdd)
      });
      toAdd.forEach(uid => addUniqueLocal('friends', uid));
      saveLocalSession();
      renderFriendsList();
    }
  } catch (err) {
    console.warn('syncAcceptedFriendships error:', err);
  }
}

// Increment the "Invia 2 richieste" daily challenge counter.
async function incrementSentRequestCount() {
  if (!isOnlineApp()) return;
  try {
    await db.collection('pd_users').doc(currentUser.uid).update({
      sentRequestToday: firebase.firestore.FieldValue.increment(1)
    });
    userData.sentRequestToday = (userData.sentRequestToday || 0) + 1;
    saveLocalSession();
  } catch (err) {
    console.warn('incrementSentRequestCount error:', err);
  }
}

async function shareInvite() {
  const url = window.location.origin + window.location.pathname + (currentUser?.uid ? `?ref=${currentUser.uid}` : '');
  const text = `Sto collezionando carte del Mondiale! Unisciti a PackDrop WC26 → ${url}`;

  try {
    if (navigator.share) {
      await navigator.share({ title: 'PackDrop WC26', text: text, url: url });
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Link copiato.');
    }
    // Track share for challenges. sharedToday feeds the daily "Condividi"
    // challenge; inviteCount stays cumulative for referral tracking.
    if (isOnlineApp()) {
      try {
        await db.collection('pd_users').doc(currentUser.uid).update({
          inviteCount: firebase.firestore.FieldValue.increment(1),
          sharedToday: firebase.firestore.FieldValue.increment(1)
        });
        userData.inviteCount = (userData.inviteCount || 0) + 1;
        userData.sharedToday = (userData.sharedToday || 0) + 1;
        saveLocalSession();
        await checkAllChallenges();
      } catch (err) {
        console.warn('Share track error:', err);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Share error:', err);
  }
}

function handleReferral() {
  if (!isOnlineApp()) return;
  const params = new URLSearchParams(window.location.search);
  const refUid = params.get('ref');
  if (!refUid || refUid === currentUser.uid) return;

  // Check if already counted (per-referrer, on this device)
  const counted = localStorage.getItem(`ref_counted_${refUid}`);
  if (counted) return;

  // The invitee writes a referral doc in their OWN namespace (create-only rule
  // below). The referrer reconciles inviteCount/invitedToday on next login via
  // processPendingReferrals(). This avoids any cross-user write.
  db.collection('pd_referrals').doc(`${refUid}_${currentUser.uid}`).set({
    referrer: refUid,
    invitee: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    localStorage.setItem(`ref_counted_${refUid}`, '1');
  }).catch(err => {
    console.warn('Referral write error:', err);
  });

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// Reconcile pending referrals addressed to the current user: count them and
// bump inviteCount (+ invitedToday, for the daily "Invita 5 amici" challenge).
// Each counted referral is then deleted so it isn't double-counted.
async function processPendingReferrals() {
  if (!isOnlineApp()) return;
  try {
    const snap = await db.collection('pd_referrals').where('referrer', '==', currentUser.uid).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const count = snap.size;
    await db.collection('pd_users').doc(currentUser.uid).update({
      inviteCount: firebase.firestore.FieldValue.increment(count),
      invitedToday: firebase.firestore.FieldValue.increment(count)
    });
    userData.inviteCount = (userData.inviteCount || 0) + count;
    userData.invitedToday = (userData.invitedToday || 0) + count;
    saveLocalSession();
    checkAllChallenges();
  } catch (err) {
    console.warn('processPendingReferrals error:', err);
  }
}

// ════════════════════════════════════════════════════════════
// 10. CHALLENGES MODULE
// ════════════════════════════════════════════════════════════

const CHALLENGES = [
  // ── Repeatable (reset at local midnight ONLY if already completed) ──
  { id:'share1',        title:'Condividi',            icon:'share',    target:1,  field:'sharedToday',         repeatable:true,  reward:1 },
  { id:'invite5',       title:'Invita 5 amici',       icon:'mail',     target:5,  field:'invitedToday',        repeatable:true,  reward:3 },
  { id:'friends2',      title:'Invia 2 richieste',    icon:'users',    target:2,  field:'sentRequestToday',    repeatable:true,  reward:1 },
  // ── Permanent milestones ──
  { id:'open10',        title:'Apri 10 pacchetti',    icon:'package',  target:10, field:'totalPacksOpened',                        reward:2 },
  { id:'open50',        title:'Collezionista Serio',  icon:'medal',    target:50, field:'totalPacksOpened',                        reward:5 },
  { id:'open100',       title:'Apri 100 pacchetti',   icon:'package',  target:100,field:'totalPacksOpened',                        reward:8 },
  { id:'open250',       title:'Macchina da Pacchi',   icon:'package',  target:250,field:'totalPacksOpened',                        reward:15 },
  { id:'rare5',         title:'Cacciatore di Rare',   icon:'gem',      target:5,  check:'rareCount',                               reward:2 },
  { id:'rare15',        title:'Collezionista di Rare',icon:'gem',      target:15, check:'rareCount',                               reward:4 },
  { id:'epic1',         title:'Prima Epica',          icon:'zap',      target:1,  check:'epicCount',                               reward:2 },
  { id:'epic5',         title:'Collezionista di Epiche',icon:'zap',    target:5,  check:'epicCount',                               reward:5 },
  { id:'legendary1',    title:'Leggenda!',            icon:'star',     target:1,  check:'legendaryCount',                          reward:3 },
  { id:'legendary3',    title:'Cacciatore di Leggende',icon:'star',    target:3,  check:'legendaryCount',                          reward:6 },
  { id:'login7',        title:'Costante',             icon:'calendar', target:7,  field:'loginStreak',                             reward:5 },
  { id:'login14',       title:'Fedele al Mondiale',   icon:'calendar', target:14, field:'loginStreak',                             reward:10 },
  { id:'complete_team', title:'Nazione Completa',     icon:'trophy',   target:1,  check:'completeNation',                          reward:3 },
  { id:'complete3',     title:'3 Nazioni Complete',   icon:'trophy',   target:3,  check:'completeNationsCount',                    reward:8 },
  { id:'first_friend',  title:'Prima Amicizia',       icon:'users',    target:1,  field:'friends',  isArray:true,                 reward:1 },
];

// Returns today's date string (local midnight boundaries), matching the
// existing lastLoginDate mechanism used for daily packs.
function challengeTodayKey() {
  return new Date().toDateString();
}

// Did a repeatable challenge already get completed today? Stored on the user
// doc as challengeCompletions: { [id]: 'Mon Jun 23 2026' }.
function isChallengeCompletedToday(ch) {
  if (!ch.repeatable) return false;
  const completions = userData?.challengeCompletions || {};
  return completions[ch.id] === challengeTodayKey();
}

function isChallengeCompleted(ch) {
  const completed = userData?.completedChallenges || [];
  if (completed.includes(ch.id)) return true;
  return isChallengeCompletedToday(ch);
}

function getChallengeProgress(challenge) {
  if (challenge.field) {
    const val = userData?.[challenge.field];
    if (challenge.isArray) return Array.isArray(val) ? val.length : 0;
    return val || 0;
  }
  if (challenge.check === 'rareCount') {
    return Object.keys(userCollection).filter(id => {
      const c = getCardById(id);
      return c && (c.rarity === 'rare' || c.rarity === 'epic' || c.rarity === 'legendary');
    }).length;
  }
  if (challenge.check === 'epicCount') {
    return Object.keys(userCollection).filter(id => {
      const c = getCardById(id);
      return c && (c.rarity === 'epic' || c.rarity === 'legendary');
    }).length;
  }
  if (challenge.check === 'legendaryCount') {
    return Object.keys(userCollection).filter(id => {
      const c = getCardById(id);
      return c && c.rarity === 'legendary';
    }).length;
  }
  if (challenge.check === 'completeNation') {
    const nations = buildNationStats();
    return Object.values(nations).some(n => n.total >= 3 && n.owned >= n.total) ? 1 : 0;
  }
  if (challenge.check === 'completeNationsCount') {
    const nations = buildNationStats();
    return Object.values(nations).filter(n => n.total >= 3 && n.owned >= n.total).length;
  }
  return 0;
}

function buildNationStats() {
  const nations = {};
  ALL_CARDS.forEach(c => {
    if (!nations[c.nation]) nations[c.nation] = { total: 0, owned: 0 };
    nations[c.nation].total++;
    if (userCollection[c.id]) nations[c.nation].owned++;
  });
  return nations;
}

function renderChallenges() {
  const container = $('challenges-container');
  container.innerHTML = '';

  CHALLENGES.forEach(ch => {
    const isCompleted = isChallengeCompleted(ch);
    const progress = getChallengeProgress(ch);
    const pct = Math.min(100, Math.round((progress / ch.target) * 100));
    const repeatable = ch.repeatable ? ' <span class="challenge-repeat">↻</span>' : '';

    const card = document.createElement('div');
    card.className = `challenge-card ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `
      <span class="challenge-icon">${svgIcon(ch.icon)}</span>
      <span class="challenge-title">${ch.title}${repeatable}</span>
      <div class="challenge-progress-wrap">
        <div class="challenge-progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="challenge-meta">
        <span class="challenge-count">${Math.min(progress, ch.target)}/${ch.target}</span>
        ${isCompleted
          ? `<span class="challenge-complete-badge">${svgIcon('check', 'inline-icon')} Completata</span>`
          : `<span class="challenge-reward">+${ch.reward} pack</span>`}
      </div>
    `;
    container.appendChild(card);
  });
}

// True mutex for challenge checks. At most one check runs at a time.
// If calls arrive while one is running, a single re-run is coalesced
// and executed after the current one finishes. This prevents the old
// bug where N waiters all resumed after await and ran in parallel,
// each awarding the same challenge reward → duplication.
let challengeCheckInFlight = null;
let challengeCheckQueued = false;

async function checkAllChallenges() {
  if (!isOnlineApp()) {
    renderChallenges();
    return;
  }
  // If a check is already running, mark that a re-run is needed and
  // return immediately. The in-flight check will pick it up.
  if (challengeCheckInFlight) {
    challengeCheckQueued = true;
    return;
  }

  challengeCheckInFlight = _doCheckAllChallenges();
  try {
    await challengeCheckInFlight;
  } finally {
    challengeCheckInFlight = null;
    // If another call arrived while we were running, re-run once.
    if (challengeCheckQueued) {
      challengeCheckQueued = false;
      checkAllChallenges();
    }
  }
}

async function _doCheckAllChallenges() {
  const completed = userData?.completedChallenges || [];
  const completions = userData?.challengeCompletions || {};
  let awarded = 0;
  const updates = {};
  const challengeToast = [];

  for (const ch of CHALLENGES) {
    const alreadyDone = ch.repeatable
      ? isChallengeCompletedToday(ch)
      : completed.includes(ch.id);
    if (alreadyDone) continue;

    const progress = getChallengeProgress(ch);
    if (progress >= ch.target) {
      awarded += ch.reward;
      challengeToast.push(`Sfida "${ch.title}" completata. +${ch.reward} pack`);

      if (ch.repeatable) {
        completions[ch.id] = challengeTodayKey();
      } else {
        completed.push(ch.id);
      }
    }
  }

  if (awarded > 0) {
    // Apply local state SYNCHRONOUSLY before any await. This prevents
    // the onSnapshot from resetting these fields while our Firestore
    // write is in flight (the onSnapshot handler checks challengeCheckInFlight).
    userData.completedChallenges = completed;
    userData.challengeCompletions = completions;
    userData.bonusPacks = (userData.bonusPacks || 0) + awarded;
    saveLocalSession();
    updateHeaderUI();
    updatePackButtons();
    startTimerIfNeeded();
    challengeToast.forEach(t => showToast(t));

    updates.completedChallenges = completed;
    updates.bonusPacks = firebase.firestore.FieldValue.increment(awarded);
    if (Object.keys(completions).length) updates.challengeCompletions = completions;

    try {
      await db.collection('pd_users').doc(currentUser.uid).update(updates);
    } catch (err) {
      console.warn('Challenge write error:', err);
    }
  }

  renderChallenges();
}

// Reset repeatable challenges whose completion date is before today.
// Called on app init and whenever the date rolls over. Only challenges that
// were ALREADY completed get reset; partial progress (e.g. 2/5 invites) is
// preserved and continues from where it was.
async function checkDailyChallengeReset() {
  if (!isOnlineApp()) return;
  const today = challengeTodayKey();
  const completions = userData?.challengeCompletions || {};
  let changed = false;
  const fieldsToReset = {};

  for (const ch of CHALLENGES) {
    if (!ch.repeatable) continue;
    const lastDone = completions[ch.id];
    if (lastDone && lastDone !== today) {
      // It was completed on a previous day → reset both the completion marker
      // and the daily counter that feeds its progress.
      delete completions[ch.id];
      changed = true;
      if (ch.field && ch.field !== 'inviteCount') {
        // inviteCount is the cumulative total (used for referral tracking);
        // invitedToday is the per-day counter we reset instead.
        fieldsToReset[ch.field] = 0;
      }
    }
  }

  if (changed) {
    const update = { challengeCompletions: completions, ...fieldsToReset };
    try {
      await db.collection('pd_users').doc(currentUser.uid).update(update);
      userData.challengeCompletions = completions;
      Object.keys(fieldsToReset).forEach(k => { userData[k] = 0; });
      saveLocalSession();
      checkAllChallenges();
    } catch (err) {
      console.warn('Daily reset error:', err);
    }
  }
}

// Schedule a check at the next local midnight so repeatable challenges that
// were completed "yesterday" become available again while the app stays open.
let midnightResetTimer = null;
function scheduleMidnightReset() {
  if (midnightResetTimer) clearTimeout(midnightResetTimer);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  midnightResetTimer = setTimeout(() => {
    checkDailyChallengeReset().finally(() => scheduleMidnightReset());
  }, msUntilMidnight);
}

// ════════════════════════════════════════════════════════════
// 11. PWA MODULE
// ════════════════════════════════════════════════════════════

// Service Worker registration
if ('serviceWorker' in navigator) {
  let swReloading = false;
  const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadServiceWorkerController || swReloading) return;
    swReloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        reg.update().catch(() => {});
        scheduleIdle(checkForAppUpdates, 4000);
      })
      .catch(err => {
        console.warn('SW registration failed:', err);
        scheduleIdle(checkForAppUpdates, 5000);
      });
  });
} else {
  window.addEventListener('load', () => scheduleIdle(checkForAppUpdates, 5000));
}

async function checkForAppUpdates() {
  try {
    const ignoredUntil = Number(localStorage.getItem(UPDATE_IGNORED_UNTIL_KEY) || 0);
    if (ignoredUntil && Date.now() < ignoredUntil) return;

    const response = await fetch(GITHUB_LATEST_COMMIT_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) return;

    const data = await response.json();
    const latestSha = data?.sha;
    if (!latestSha) return;

    const currentSha = localStorage.getItem(UPDATE_CURRENT_SHA_KEY);
    if (!currentSha) {
      localStorage.setItem(UPDATE_CURRENT_SHA_KEY, latestSha);
      return;
    }

    if (latestSha === currentSha) {
      localStorage.removeItem(UPDATE_PENDING_SHA_KEY);
      return;
    }

    localStorage.setItem(UPDATE_PENDING_SHA_KEY, latestSha);
    showUpdatePrompt(latestSha);
  } catch (err) {
    console.warn('Update check unavailable:', err);
  }
}

function hideUpdatePrompt() {
  const prompt = $('update-prompt');
  if (!prompt) return;
  prompt.classList.remove('active');
  prompt.setAttribute('aria-hidden', 'true');
}

function showUpdatePrompt(latestSha) {
  const prompt = $('update-prompt');
  const confirmBtn = $('btn-update-confirm');
  const dismissBtn = $('btn-update-dismiss');
  if (!prompt || !confirmBtn || !dismissBtn) return;

  prompt.classList.add('active');
  prompt.setAttribute('aria-hidden', 'false');

  dismissBtn.onclick = () => {
    localStorage.setItem(UPDATE_IGNORED_UNTIL_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    hideUpdatePrompt();
  };

  prompt.onclick = event => {
    if (event.target === prompt) {
      localStorage.setItem(UPDATE_IGNORED_UNTIL_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      hideUpdatePrompt();
    }
  };

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.classList.add('loading');
    confirmBtn.textContent = 'Aggiorno...';
    await applyAppUpdate(latestSha);
  };
}

async function applyAppUpdate(latestSha) {
  try {
    localStorage.setItem(UPDATE_CURRENT_SHA_KEY, latestSha);
    localStorage.removeItem(UPDATE_PENDING_SHA_KEY);
    localStorage.removeItem(UPDATE_IGNORED_UNTIL_KEY);

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
  } catch (err) {
    console.warn('Cache cleanup partial:', err);
  } finally {
    window.location.reload();
  }
}

// Install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!appEl.classList.contains('hidden')) showInstallPrompt();
});

function setupInstallHandlers() {
  const installBtn = $('btn-install');
  const dismissBtn = $('btn-dismiss-install');
  if (installBtn.dataset.ready === 'true') return;
  installBtn.dataset.ready = 'true';

  installBtn.addEventListener('click', async () => {
    $('install-toast').classList.remove('active');
    if (!deferredInstallPrompt) {
      showToast('Da Safari/Chrome usa “Aggiungi alla schermata Home”.');
      return;
    }
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });

  dismissBtn.addEventListener('click', () => {
    $('install-toast').classList.remove('active');
  });
}

function showInstallPrompt() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isStandalone) return;
  if (!deferredInstallPrompt && !/iphone|ipad|ipod/i.test(navigator.userAgent)) return;
  $('install-toast').classList.add('active');
}

// ════════════════════════════════════════════════════════════
// 12. PRONOSTICI MODULE
// ════════════════════════════════════════════════════════════

let predictionsState = {
  matches: {},          // matchId -> { homeScore, awayScore, status, kickoffMs }
  myPredictions: {},    // matchId -> { homeScore, awayScore, claimed }
  isAdmin: false,
  ready: false,
  filter: 'upcoming'    // 'upcoming' (in programma) | 'past' (passate)
};
let predictionsTick = null;

function isPdAdminUser() {
  return currentUser && PD_ADMIN_UIDS.includes(currentUser.uid);
}

function isPredictionLocked(match) {
  const kickoff = (match.kickoffMs || (match.kickoff ? new Date(match.kickoff).getTime() : 0));
  return Date.now() >= kickoff - (PREDICTION_LOCK_SECONDS * 1000);
}

function isMatchStarted(match) {
  const kickoff = (match.kickoffMs || (match.kickoff ? new Date(match.kickoff).getTime() : 0));
  return Date.now() >= kickoff;
}

async function initPredictionsSection() {
  predictionsState.isAdmin = isPdAdminUser();
  setupPredictionsFilterTabs();
  await loadAllMatches();
  await loadMyPredictions();
  predictionsState.ready = true;
  refreshPredictionsView();
  startPredictionsTicker();
}

function setupPredictionsFilterTabs() {
  const wrap = $('predictions-tabs');
  if (!wrap || wrap.dataset.bound === 'true') return;
  wrap.dataset.bound = 'true';
  wrap.querySelectorAll('.tab-pill').forEach(tab => {
    tab.addEventListener('click', () => {
      wrap.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      predictionsState.filter = tab.dataset.predFilter;
      refreshPredictionsView();
    });
  });
}

function startPredictionsTicker() {
  if (predictionsTick) clearInterval(predictionsTick);
  // Re-render every 30s so lock/status badges update live
  predictionsTick = setInterval(() => {
    if ($('section-predictions')?.classList.contains('active')) {
      refreshPredictionsView();
    }
  }, 30000);
}

// Load all match docs (results + status) in a single batch
async function loadAllMatches() {
  predictionsState.matches = {};
  if (typeof WC26_MATCHES_FULL === 'undefined') return;
  // Seed defaults from static schedule
  WC26_MATCHES_FULL.forEach(m => {
    predictionsState.matches[m.id] = {
      id: m.id,
      home: m.home.name,
      away: m.away.name,
      homeCode: m.home.code,
      awayCode: m.away.code,
      kickoff: m.kickoff,
      kickoffMs: m.kickoffMs,
      phase: m.phase,
      homeScore: null,
      awayScore: null,
      status: 'scheduled'
    };
  });
  if (!isOnlineApp()) return;
  try {
    const snap = await db.collection('pd_matches').get();
    snap.forEach(doc => {
      const d = doc.data();
      const base = predictionsState.matches[doc.id];
      if (!base) return;
      predictionsState.matches[doc.id] = {
        ...base,
        homeScore: (d.homeScore !== undefined && d.homeScore !== null) ? d.homeScore : null,
        awayScore: (d.awayScore !== undefined && d.awayScore !== null) ? d.awayScore : null,
        status: d.status || (d.homeScore !== undefined && d.homeScore !== null ? 'finished' : 'scheduled')
      };
    });
  } catch (err) {
    console.warn('Matches load error:', err);
  }
}

// Load the current user's predictions
async function loadMyPredictions() {
  predictionsState.myPredictions = {};
  predictionsState.claimed = loadClaimedSet();
  if (!isOnlineApp() || !currentUser) return;
  // Query by the `uid` field — the rule allows reading docs where
  // resource.data.uid == request.auth.uid. Robust to any uid shape.
  try {
    const snap = await db.collection('pd_predictions')
      .where('uid', '==', currentUser.uid)
      .get();
    snap.forEach(doc => {
      const d = doc.data();
      predictionsState.myPredictions[d.matchId] = {
        matchId: d.matchId,
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        uid: d.uid
      };
    });
  } catch (err) {
    console.warn('My predictions load error:', err);
  }
}

function loadClaimedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(PD_PRED_CLAIMED_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveClaimedSet() {
  try { localStorage.setItem(PD_PRED_CLAIMED_KEY, JSON.stringify([...predictionsState.claimed])); }
  catch { /* ignore */ }
}

function renderPredictionsStats() {
  const my = predictionsState.myPredictions || {};
  const played = Object.keys(my).length;
  let won = 0;
  Object.keys(my).forEach(mid => {
    const m = predictionsState.matches[mid];
    const p = my[mid];
    if (m && m.status === 'finished' && m.homeScore !== null && m.homeScore !== undefined &&
        m.homeScore === p.homeScore && m.awayScore === p.awayScore) won++;
  });
  const pe = $('pred-played'); if (pe) pe.textContent = played;
  const we = $('pred-won'); if (we) we.textContent = won;
}

function refreshPredictionsView() {
  const list = $('predictions-list');
  if (!list) return;
  if (!predictionsState.ready) {
    list.innerHTML = '<div class="empty-state"><p>Caricamento partite…</p></div>';
    return;
  }

  // Process rewards first (silent claim on re-entry)
  processPendingRewards().catch(err => console.warn('Reward process skipped:', err));

  // Split into upcoming (in programma) and past (concluse con risultato).
  const all = Object.values(predictionsState.matches);
  const upcoming = all.filter(m => m.status !== 'finished').sort((a, b) => a.kickoffMs - b.kickoffMs);
  const finished = all.filter(m => m.status === 'finished').sort((a, b) => b.kickoffMs - a.kickoffMs);

  // Update the count badges on the filter tabs
  const upCount = $('pred-tab-count-upcoming');
  const pastCount = $('pred-tab-count-past');
  if (upCount) upCount.textContent = upcoming.length;
  if (pastCount) pastCount.textContent = finished.length;

  list.innerHTML = '';

  const showPast = predictionsState.filter === 'past';
  const shown = showPast ? finished : upcoming;

  if (!shown.length) {
    list.innerHTML = showPast
      ? '<div class="empty-state"><p>Nessuna partita passata. Torna qui dopo che un admin ha pubblicato i risultati.</p></div>'
      : '<div class="empty-state"><p>Nessuna partita in programma.</p></div>';
    renderPredictionsStats();
    return;
  }

  // Optional admin badge at top (shown in both views)
  if (predictionsState.isAdmin) {
    const banner = document.createElement('div');
    banner.className = 'pred-admin-banner';
    banner.innerHTML = `<span class="pred-admin-dot"></span> Console admin attiva · puoi impostare e correggere i risultati`;
    list.appendChild(banner);
  }

  shown.forEach(m => list.appendChild(buildMatchCard(m, showPast)));
  renderPredictionsStats();
}

function buildMatchCard(m, isFinished) {
  const card = document.createElement('div');
  card.className = 'match-card' + (isFinished ? ' match-card--finished' : '');
  card.dataset.matchId = m.id;

  const locked = isPredictionLocked(m);
  const my = predictionsState.myPredictions[m.id];
  const kickDate = new Date(m.kickoffMs);
  const dateStr = kickDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = kickDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const homeFlag = `<img class="match-flag" src="${flagUrl(m.homeCode, 80)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  const awayFlag = `<img class="match-flag" src="${flagUrl(m.awayCode, 80)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;

  let statusBadge = '';
  if (m.status === 'finished' && m.homeScore !== null && m.homeScore !== undefined) {
    statusBadge = `<span class="match-status match-status--done">Finale</span>`;
  } else if (locked) {
    statusBadge = `<span class="match-status match-status--locked">Bloccata</span>`;
  } else {
    statusBadge = `<span class="match-status match-status--open">Aperta</span>`;
  }

  // Result / input row
  let middle = '';
  if (isFinished && m.homeScore !== null && m.homeScore !== undefined) {
    middle = `<div class="match-score match-score--final">${m.homeScore}<span class="match-score-sep">:</span>${m.awayScore}</div>`;
  } else {
    const hVal = my ? my.homeScore : '';
    const aVal = my ? my.awayScore : '';
    middle = `
      <div class="match-score ${locked ? 'match-score--locked' : ''}">
        <input type="number" inputmode="numeric" min="0" max="99" class="score-input"
               data-side="home" data-match="${m.id}" value="${hVal}" placeholder="–" ${locked ? 'disabled' : ''} aria-label="Gol ${escapeAttr(m.home)}">
        <span class="match-score-sep">:</span>
        <input type="number" inputmode="numeric" min="0" max="99" class="score-input"
               data-side="away" data-match="${m.id}" value="${aVal}" placeholder="–" ${locked ? 'disabled' : ''} aria-label="Gol ${escapeAttr(m.away)}">
      </div>`;
  }

  // Outcome line (for finished matches where user had a prediction)
  let outcome = '';
  if (isFinished && my) {
    const correct = (m.homeScore === my.homeScore && m.awayScore === my.awayScore);
    const claimed = predictionsState.claimed && predictionsState.claimed.has(m.id);
    if (correct) {
      outcome = `<div class="match-outcome match-outcome--win">${claimed ? 'Vinto! +10 pacchetti' : 'Vinto! Ricompensa in arrivo…'}</div>`;
    } else {
      outcome = `<div class="match-outcome match-outcome--lose">Risultato non indovinato</div>`;
    }
  } else if (!isFinished && my) {
    outcome = `<div class="match-outcome match-outcome--pending">Il tuo pronostico: ${my.homeScore} – ${my.awayScore}</div>`;
  }

  // Admin controls
  let adminControls = '';
  if (predictionsState.isAdmin) {
    const hs = (m.homeScore !== null && m.homeScore !== undefined) ? m.homeScore : '';
    const as = (m.awayScore !== null && m.awayScore !== undefined) ? m.awayScore : '';
    // When a result is already published we allow editing it ("Correggi")
    // and clearing it ("Annulla", which sends the match back to "in programma").
    const hasResult = isFinished && hs !== '' && as !== '';
    adminControls = `
      <div class="match-admin">
        <span class="match-admin-label">Admin:</span>
        <input type="number" inputmode="numeric" min="0" max="99" class="score-input admin-score"
               data-side="home" data-match="${m.id}" value="${hs}" placeholder="–">
        <span class="match-score-sep">:</span>
        <input type="number" inputmode="numeric" min="0" max="99" class="score-input admin-score"
               data-side="away" data-match="${m.id}" value="${as}" placeholder="–">
        <button class="btn-admin-save" data-match="${m.id}">${hasResult ? 'Correggi risultato' : 'Salva risultato'}</button>
        ${hasResult ? `<button class="btn-admin-cancel" data-match="${m.id}">Annulla risultato</button>` : ''}
      </div>`;
  }

  card.innerHTML = `
    <div class="match-top">
      <span class="match-phase">${escapeHtml(m.phase)}</span>
      ${statusBadge}
    </div>
    <div class="match-teams">
      <div class="match-side match-side--home">
        ${homeFlag}
        <span class="match-team-name">${escapeHtml(m.home)}</span>
      </div>
      ${middle}
      <div class="match-side match-side--away">
        ${awayFlag}
        <span class="match-team-name">${escapeHtml(m.away)}</span>
      </div>
    </div>
    <div class="match-foot">
      <span class="match-time">${escapeHtml(dateStr)} · ${escapeHtml(timeStr)}</span>
      ${outcome}
    </div>
    ${adminControls}
  `;

  // Bind score inputs (user)
  if (!locked && !isFinished) {
    card.querySelectorAll('.score-input[data-side]').forEach(inp => {
      inp.addEventListener('change', () => savePredictionFromInputs(card, m.id));
      inp.addEventListener('blur',   () => savePredictionFromInputs(card, m.id));
    });
  }
  // Bind admin save (publish) / edit
  if (predictionsState.isAdmin) {
    const btnSave = card.querySelector('.btn-admin-save');
    if (btnSave) btnSave.addEventListener('click', () => saveMatchResultFromCard(card, m.id));
    const btnCancel = card.querySelector('.btn-admin-cancel');
    if (btnCancel) btnCancel.addEventListener('click', () => clearMatchResultFromCard(card, m.id));
  }

  return card;
}

// Run a Firestore write with up to 2 automatic retries on transient
// failures (unavailable/network). Permission errors are surfaced as-is.
async function runFirestoreWrite(writeFn, { retries = 2, baseDelay = 700 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await writeFn();
    } catch (err) {
      lastErr = err;
      const code = err?.code || '';
      const transient = code === 'unavailable' ||
        code === 'deadline-exceeded' ||
        code === 'internal' ||
        err?.message?.includes('__timeout__');
      if (!transient || attempt === retries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function savePredictionFromInputs(card, matchId) {
  if (!isOnlineApp() || !currentUser) {
    showToast('Attendi la connessione per salvare.');
    return;
  }
  const hInp = card.querySelector('.score-input[data-side="home"]');
  const aInp = card.querySelector('.score-input[data-side="away"]');
  const m = predictionsState.matches[matchId];
  if (!m || isPredictionLocked(m)) {
    showToast('La partita è bloccata.');
    refreshPredictionsView();
    return;
  }
  if (hInp.value === '' || aInp.value === '') return; // wait for both
  const homeScore = clampScore(hInp.value);
  const awayScore = clampScore(aInp.value);
  if (homeScore === null || awayScore === null) {
    showToast('Inserisci un punteggio valido (0–99).');
    return;
  }
  const predId = `${matchId}_${currentUser.uid}`;
  // First save is a create (full doc); subsequent edits are an update, which
  // the Firestore rules restrict to only {homeScore, awayScore, updatedAt}.
  // Writing the full payload on edit would re-touch matchId/uid/createdAt and
  // be rejected with permission-denied — so we branch here.
  const alreadyExists = !!predictionsState.myPredictions[matchId];
  const createPayload = {
    matchId,
    uid: currentUser.uid,
    homeScore,
    awayScore,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    const write = alreadyExists
      ? () => db.collection('pd_predictions').doc(predId).update({
          homeScore, awayScore, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
      : () => db.collection('pd_predictions').doc(predId).set(createPayload);
    try {
      await runFirestoreWrite(write);
    } catch (err) {
      // Edge case: local cache says the doc exists, but Firestore doesn't
      // (e.g. cleared server-side). Fall back to a create and retry.
      if (alreadyExists && (err?.code === 'not-found')) {
        await runFirestoreWrite(() => db.collection('pd_predictions').doc(predId).set(createPayload));
      } else {
        throw err;
      }
    }
    predictionsState.myPredictions[matchId] = { matchId, uid: currentUser.uid, homeScore, awayScore };
    showToast('Pronostico salvato.');
    refreshPredictionsView();
  } catch (err) {
    console.error('Save prediction error:', err);
    showToast('Salvataggio non riuscito. Riprova tra un attimo.');
  }
}

async function saveMatchResultFromCard(card, matchId) {
  if (!isOnlineApp()) {
    showToast('Senza connessione non puoi pubblicare il risultato.');
    return;
  }
  if (!predictionsState.isAdmin) {
    showToast('Solo gli amministratori possono pubblicare i risultati.');
    return;
  }
  const hInp = card.querySelector('.admin-score[data-side="home"]');
  const aInp = card.querySelector('.admin-score[data-side="away"]');
  const homeScore = clampScore(hInp.value);
  const awayScore = clampScore(aInp.value);
  if (homeScore === null || awayScore === null) {
    showToast('Inserisci un risultato valido (0–99).');
    return;
  }
  const saveBtn = card.querySelector('.btn-admin-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvo…'; }
  try {
    await runFirestoreWrite(() => db.collection('pd_matches').doc(matchId).set({
      homeScore,
      awayScore,
      status: 'finished',
      finishedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }));
    predictionsState.matches[matchId] = {
      ...predictionsState.matches[matchId],
      homeScore, awayScore, status: 'finished'
    };
    showToast('Risultato pubblicato.');
    refreshPredictionsView();
  } catch (err) {
    console.error('Save match result error:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showToast('Il tuo account non è abilitato come admin (controlla PD_ADMIN_UIDS e le regole Firestore).');
    } else {
      showToast('Salvataggio non riuscito. Riprova tra un attimo.');
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salva risultato'; }
  }
}

// Admin: clear a published result. The match goes back to "scheduled"
// (in programma) and predictions become editable again based on kickoff.
async function clearMatchResultFromCard(card, matchId) {
  if (!isOnlineApp()) {
    showToast('Senza connessione non puoi modificare il risultato.');
    return;
  }
  if (!predictionsState.isAdmin) {
    showToast('Solo gli amministratori possono annullare i risultati.');
    return;
  }
  const m = predictionsState.matches[matchId];
  if (!m) return;
  const ok = confirm(`Annullare il risultato di ${m.home} – ${m.away}?\nLa partita tornerà tra quelle in programma e i pronostici saranno riaperti in base all'orario di inizio.`);
  if (!ok) return;

  const cancelBtn = card.querySelector('.btn-admin-cancel');
  if (cancelBtn) { cancelBtn.disabled = true; cancelBtn.textContent = 'Annullamento…'; }
  try {
    await runFirestoreWrite(() => db.collection('pd_matches').doc(matchId).set({
      homeScore: firebase.firestore.FieldValue.delete(),
      awayScore: firebase.firestore.FieldValue.delete(),
      status: 'scheduled',
      finishedAt: firebase.firestore.FieldValue.delete()
    }, { merge: true }));
    predictionsState.matches[matchId] = {
      ...predictionsState.matches[matchId],
      homeScore: null, awayScore: null, status: 'scheduled'
    };
    // Note: we intentionally do NOT reset the local "claimed" reward marker.
    // If the admin republishes the same score, that prevents awarding the
    // reward twice; if the score changes, new winners are credited naturally
    // because their claim marker was never set.
    showToast('Risultato annullato. La partita è di nuovo in programma.');
    refreshPredictionsView();
  } catch (err) {
    console.error('Clear match result error:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showToast('Il tuo account non è abilitato come admin (controlla PD_ADMIN_UIDS e le regole Firestore).');
    } else {
      showToast('Annullamento non riuscito. Riprova tra un attimo.');
    }
    if (cancelBtn) { cancelBtn.disabled = false; cancelBtn.textContent = 'Annulla risultato'; }
  }
}

function clampScore(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  return n;
}

// Award pending rewards for finished matches the user predicted correctly.
// Called on view refresh; claims at most once per match (tracked locally).
// In-flight lock: matches are added to `claimed` and persisted to localStorage
// BEFORE the async Firestore write, so concurrent calls (ticker, tab switch,
// admin result save) cannot claim the same match a second time.
let _rewardClaimInFlight = false;
async function processPendingRewards() {
  if (!isOnlineApp() || !currentUser) return;
  if (_rewardClaimInFlight) return; // already processing; skip this call
  if (!predictionsState.claimed) predictionsState.claimed = loadClaimedSet();
  const my = predictionsState.myPredictions || {};
  const rewards = [];
  Object.keys(my).forEach(mid => {
    const m = predictionsState.matches[mid];
    const p = my[mid];
    if (!m || m.status !== 'finished') return;
    if (m.homeScore === null || m.homeScore === undefined) return;
    if (predictionsState.claimed.has(mid)) return;
    const correct = (m.homeScore === p.homeScore && m.awayScore === p.awayScore);
    if (correct) rewards.push(mid);
  });
  if (!rewards.length) return;

  // ── Mark as claimed BEFORE the await so re-entrant calls see them ──
  _rewardClaimInFlight = true;
  rewards.forEach(mid => predictionsState.claimed.add(mid));
  saveClaimedSet(); // persist immediately; survives a page reload too

  try {
    await db.collection('pd_users').doc(currentUser.uid).update({
      bonusPacks: firebase.firestore.FieldValue.increment(rewards.length * PREDICTION_REWARD)
    });
    // onSnapshot will overwrite userData.bonusPacks with the server value,
    // but update it locally now so the UI is instant.
    userData.bonusPacks = (userData.bonusPacks || 0) + rewards.length * PREDICTION_REWARD;
    saveLocalSession();
    updatePackButtons();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (rewards.length === 1) {
      showToast(`Pronostico azzeccato! +${PREDICTION_REWARD} pacchetti`);
    } else {
      showToast(`${rewards.length} pronostici vinti! +${rewards.length * PREDICTION_REWARD} pacchetti`);
    }
  } catch (err) {
    // Firestore write failed: the claim is already in localStorage to prevent
    // double-award if the write actually went through despite the error.
    console.warn('Reward claim failed (will retry next visit):', err);
  } finally {
    _rewardClaimInFlight = false;
  }
}

// ════════════════════════════════════════════════════════════
// 13. UTILITIES
// ════════════════════════════════════════════════════════════

function showToast(message) {
  // Remove existing toasts
  document.querySelectorAll('.toast-notification').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

})();
