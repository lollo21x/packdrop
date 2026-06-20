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

const LOCAL_SESSION_KEY = 'packdrop:last-session:v2';
const LAST_SECTION_KEY = 'packdrop:last-section';
const AUTH_CACHE_DELAY = 1600;

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

function cardMark(card, className = '') {
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
    showToast('Connessione ancora in avvio. Puoi usare la copia salvata se disponibile.');
    showCachedApp('Copia salvata attiva mentre Firebase si collega.');
    return;
  }
  if (!navigator.onLine) { showToast('Sei offline. Connettiti per accedere.'); return; }
  btn.classList.add('loading');
  try {
    // Popup first, redirect fallback
    try {
      const result = await Promise.race([
        auth.signInWithPopup(googleProvider),
        new Promise((_, reject) => setTimeout(() => reject(new Error('__popup_timeout__')), 8000))
      ]);
      if (result?.user) return;
    } catch (popupErr) {
      const code = popupErr?.code || '';
      const msg = popupErr?.message || '';
      const shouldRedirect = code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg === '__popup_timeout__';
      if (!shouldRedirect) throw popupErr;
    }
    btn._redirecting = true;
    await auth.signInWithRedirect(googleProvider);
  } catch (err) {
    console.error('Login error:', err);
    showToast('Errore di accesso. Riprova.');
  } finally {
    if (!btn._redirecting) btn.classList.remove('loading');
  }
});

if (firebaseReady && auth) {
  // Handle redirect result
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

  setTimeout(() => {
    if (!currentUser && appEl.classList.contains('hidden') && hasCachedSession()) {
      showCachedApp('Connessione lenta: sto usando la copia salvata.');
    }
  }, AUTH_CACHE_DELAY);

  // Auth state observer
  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUser = user;
      appMode = 'online';
      loginScreen.classList.add('hidden');
      await initApp();
    } else {
      if (userListenerUnsubscribe) { userListenerUnsubscribe(); userListenerUnsubscribe = null; }
      if (collectionListenerUnsubscribe) { collectionListenerUnsubscribe(); collectionListenerUnsubscribe = null; }
      currentUser = null;
      userData = null;
      userCollection = {};
      if (!navigator.onLine && hasCachedSession()) {
        showCachedApp('Sei offline: copia salvata attiva.');
        return;
      }
      loginScreen.classList.remove('hidden');
      appEl.classList.add('hidden');
      bottomNav.classList.add('hidden');
      closeProfilePanel();
    }
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
  let userDoc;
  try {
    userDoc = await withTimeout(userRef.get(), 7000);
  } catch (err) {
    console.warn('User load slow/unavailable:', err);
    if (showCachedApp('Connessione lenta: copia salvata attiva.')) return;
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
  await updateLoginStreak();
  await loadUserCollection();
  saveLocalSession();
  ensureCollectionCodes().then(() => {
    saveLocalSession();
    if ($('section-collection')?.classList.contains('active')) renderCollection(getActiveCollectionTab());
  }).catch(err => console.warn('Code sync skipped:', err));
  handleReferral();

  // Unsubscribe old listeners if any
  if (userListenerUnsubscribe) { userListenerUnsubscribe(); userListenerUnsubscribe = null; }
  if (collectionListenerUnsubscribe) { collectionListenerUnsubscribe(); collectionListenerUnsubscribe = null; }

  // Set up real-time listener for user profile (packs, streak, etc.)
  userListenerUnsubscribe = userRef.onSnapshot(doc => {
    if (doc.exists) {
      userData = doc.data();
      updateHeaderUI();
      updatePackButtons();
      startTimerIfNeeded();
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

function showCachedApp(message) {
  const session = loadLocalSession();
  if (!session) return false;
  appMode = 'cached';
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
        inviteCount: 0,
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
  const snapshot = await db.collection('pd_users').doc(currentUser.uid)
    .collection('collection').get();
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

  const savedSection = localStorage.getItem(LAST_SECTION_KEY) || 'play';
  switchSection(savedSection === 'collection' ? 'collection' : 'play');

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
  $('header-profile-btn').addEventListener('click', openProfilePanel);
  $('profile-close').addEventListener('click', closeProfilePanel);
  $('profile-panel-overlay').addEventListener('click', closeProfilePanel);
}

function switchSection(name) {
  if (!['play', 'collection'].includes(name)) name = 'play';
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
}

function openProfilePanel() {
  renderProfile();
  const panel = $('profile-panel');
  panel.classList.add('active');
  panel.setAttribute('aria-hidden', 'false');
}

function closeProfilePanel() {
  const panel = $('profile-panel');
  if (!panel) return;
  panel.classList.remove('active');
  panel.setAttribute('aria-hidden', 'true');
}

function updateHeaderUI() {
  const avatar = $('header-avatar');
  if (currentUser?.photoURL) {
    avatar.src = currentUser.photoURL;
  } else {
    avatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%236366f1"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">' + (userData?.displayName?.[0] || '?') + '</text></svg>';
  }
  // Badge for friend requests
  updateRequestBadge();
}

function updateRequestBadge() {
  const count = userData?.friendRequests?.length || 0;
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
  if (packType === 'nations') {
    if (rand < 1) return 'legendary';
    if (rand < 10) return 'epic';
    if (rand < 40) return 'rare';
    return 'common';
  }
  if (packType === 'stars') {
    if (rand < 3) return 'legendary';
    if (rand < 15) return 'epic';
    if (rand < 45) return 'rare';
    return 'common';
  }
  if (packType === 'legends') {
    if (rand < 12) return 'legendary';
    if (rand < 50) return 'epic';
    return 'rare';
  }
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
  const uid = currentUser?.uid || 'offline-uid';
  const code = generateCardCode(card, uid);
  const unlockedAt = new Date();

  // Deduct pack balance locally
  if (!isWelcome && userData) {
    if (userData.dailyPacks > 0) {
      userData.dailyPacks--;
    } else if (userData.bonusPacks > 0) {
      userData.bonusPacks--;
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
        batch.update(db.collection('pd_users').doc(currentUser.uid), {
          dailyPacks: userData.dailyPacks,
          bonusPacks: userData.bonusPacks,
          totalPacksOpened: firebase.firestore.FieldValue.increment(1)
        });
      }

      await batch.commit();
    } catch (fsErr) {
      console.warn('Background Firestore pack update failed:', fsErr);
    }
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

  preview.className = `modal-card-preview rarity-${card.rarity}`;
  preview.style.background = `linear-gradient(135deg, ${meta.gradient[0]}, ${meta.gradient[1]})`;
  preview.style.border = `${card.rarity === 'legendary' ? 4 : card.rarity === 'epic' ? 3 : 2}px solid ${meta.color}`;
  if (meta.glow) preview.style.boxShadow = `0 0 20px ${meta.glow}`;

  preview.innerHTML = `
    ${cardMark(card, 'card-mark-large')}
    <span style="font-size:15px;font-weight:700">${card.name}</span>
  `;

  const unlockedDate = owned.unlockedAt?.toDate ? owned.unlockedAt.toDate() : new Date(owned.unlockedAt);
  const dateStr = Number.isNaN(unlockedDate.getTime()) ? 'Data non disponibile' : unlockedDate.toLocaleDateString('it-IT');
  const code = getPrimaryCode(owned);

  info.innerHTML = `
    <h3>${card.name}</h3>
    ${code ? `<div class="card-unique-code">${code}</div>` : ''}
    <div class="modal-info-row">
      <span class="modal-info-label">Nazione</span>
      <span class="modal-info-value">${card.nation}</span>
    </div>
    <div class="modal-info-row">
      <span class="modal-info-label">Tipo</span>
      <span class="modal-info-value">${card.type === 'team' ? 'Stemma Nazione' : card.type === 'player' ? 'Star Player' : 'Icona Storica'}</span>
    </div>
    <div class="modal-info-row">
      <span class="modal-info-label">Rarità</span>
      <span class="modal-info-value" style="color:${meta.color}">${meta.label}</span>
    </div>
    <div class="modal-info-row">
      <span class="modal-info-label">Copie</span>
      <span class="modal-info-value">${owned.count || 1}</span>
    </div>
    <div class="modal-info-row" style="border:none">
      <span class="modal-info-label">Sbloccata il</span>
      <span class="modal-info-value">${dateStr}</span>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary modal-action" id="btn-copy-card-code" ${code ? '' : 'disabled'}>${svgIcon('cards')} Copia codice</button>
      <button class="btn-primary modal-action" id="btn-share-card-image" ${code ? '' : 'disabled'}>${svgIcon('share')} Condividi immagine</button>
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
    action = '<span class="result-status">Gia amici</span>';
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
          <span class="card-unique-code">${normalizeCardCode(data.code)}</span>
          <span class="reveal-rarity-badge" style="background:${meta.color}">${meta.label}</span>
        </div>
        <h3>${card.name}</h3>
        <p>${card.nation || data.cardNation || ''}</p>
        <div class="code-result-meta">
          <span>${formatDate(data.unlockedAt)}</span>
          <span>@${data.ownerUsername || 'utente'}</span>
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
        await sendFriendRequest(ownerUid);
        btn.textContent = 'Richiesta inviata';
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

function renderProfile() {
  // Hero
  $('profile-avatar').src = currentUser?.photoURL || '';
  $('profile-name').textContent = userData?.displayName || '';
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

  list.innerHTML = '';
  for (const fUid of friends) {
    try {
      const fDoc = await db.collection('pd_users').doc(fUid).get();
      if (!fDoc.exists) continue;
      const fData = fDoc.data();
      const item = document.createElement('div');
      item.className = 'friend-item';
      item.innerHTML = `
        <img class="friend-avatar" src="${fData.photoURL || ''}" alt="" loading="lazy">
        <div class="friend-info">
          <div class="friend-name">${fData.displayName || ''}</div>
          <div class="friend-username">@${fData.username || ''}</div>
        </div>
        <button class="btn-remove" data-uid="${fUid}">Rimuovi</button>
      `;
      list.appendChild(item);
    } catch (e) { /* skip */ }
  }

  // Remove friend handlers
  list.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      await removeFriend(uid);
      renderFriendsList();
    });
  });
}

async function renderFriendRequests() {
  const section = $('requests-section');
  const list = $('requests-list');
  const requests = userData?.friendRequests || [];

  if (requests.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  for (const fromUid of requests) {
    try {
      const fDoc = await db.collection('pd_users').doc(fromUid).get();
      if (!fDoc.exists) continue;
      const fData = fDoc.data();
      const item = document.createElement('div');
      item.className = 'request-item';
      item.innerHTML = `
        <img class="friend-avatar" src="${fData.photoURL || ''}" alt="" loading="lazy">
        <div class="friend-info">
          <div class="friend-name">${fData.displayName || ''}</div>
          <div class="friend-username">@${fData.username || ''}</div>
        </div>
        <div class="request-actions">
          <button class="btn-accept" data-uid="${fromUid}">Accetta</button>
          <button class="btn-reject" data-uid="${fromUid}">Rifiuta</button>
        </div>
      `;
      list.appendChild(item);
    } catch (e) { /* skip */ }
  }

  list.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', async () => {
      await acceptFriendRequest(btn.dataset.uid);
      renderFriendRequests();
      renderFriendsList();
      updateRequestBadge();
    });
  });

  list.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', async () => {
      await rejectFriendRequest(btn.dataset.uid);
      renderFriendRequests();
      updateRequestBadge();
    });
  });
}

function setupProfileHandlers() {
  if (profileHandlersReady) return;
  profileHandlersReady = true;
  // Search user
  $('btn-search-user').addEventListener('click', searchUser);
  $('search-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchUser();
  });

  // Invite
  $('btn-invite').addEventListener('click', shareInvite);
}

async function searchUser() {
  const username = $('search-username').value.trim().toLowerCase();
  const resultEl = $('search-result');
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
        <img class="friend-avatar" src="${u.photoURL || ''}" alt="" loading="lazy">
        <div class="search-result-info">
          <div class="friend-name">${u.displayName || ''}</div>
          <div class="friend-username">@${u.username || ''}</div>
        </div>
        <button class="btn-add-friend" id="btn-add-found" data-uid="${targetUid}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
      </div>
    `;

    const addBtn = $('btn-add-found');
    if (!btnDisabled) {
      addBtn.addEventListener('click', async () => {
        if (isReceived) {
          await acceptFriendRequest(targetUid);
        } else {
          await sendFriendRequest(targetUid);
        }
        addBtn.disabled = true;
        addBtn.textContent = isReceived ? 'Amico aggiunto' : 'Richiesta inviata';
        renderFriendRequests();
        renderFriendsList();
        updateRequestBadge();
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
    return;
  }
  const batch = db.batch();
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const theirRef = db.collection('pd_users').doc(targetUid);

  batch.update(myRef, { sentRequests: firebase.firestore.FieldValue.arrayUnion(targetUid) });
  batch.update(theirRef, { friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
  await batch.commit();

  userData.sentRequests = [...(userData.sentRequests || []), targetUid];
  showToast('Richiesta inviata.');
}

async function acceptFriendRequest(fromUid) {
  if (!isOnlineApp()) {
    showToast('Accedi online per accettare richieste.');
    return;
  }
  const batch = db.batch();
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const theirRef = db.collection('pd_users').doc(fromUid);

  // Add to friends
  batch.update(myRef, {
    friends: firebase.firestore.FieldValue.arrayUnion(fromUid),
    friendRequests: firebase.firestore.FieldValue.arrayRemove(fromUid)
  });
  batch.update(theirRef, {
    friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
    sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
  });
  await batch.commit();

  userData.friends = [...(userData.friends || []), fromUid];
  userData.friendRequests = (userData.friendRequests || []).filter(u => u !== fromUid);
  showToast('Amicizia accettata.');
}

async function rejectFriendRequest(fromUid) {
  if (!isOnlineApp()) return;
  const batch = db.batch();
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const theirRef = db.collection('pd_users').doc(fromUid);

  batch.update(myRef, { friendRequests: firebase.firestore.FieldValue.arrayRemove(fromUid) });
  batch.update(theirRef, { sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
  await batch.commit();

  userData.friendRequests = (userData.friendRequests || []).filter(u => u !== fromUid);
}

async function removeFriend(friendUid) {
  if (!isOnlineApp()) {
    showToast('Accedi online per modificare gli amici.');
    return;
  }
  const batch = db.batch();
  const myRef = db.collection('pd_users').doc(currentUser.uid);
  const theirRef = db.collection('pd_users').doc(friendUid);

  batch.update(myRef, { friends: firebase.firestore.FieldValue.arrayRemove(friendUid) });
  batch.update(theirRef, { friends: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
  await batch.commit();

  userData.friends = (userData.friends || []).filter(u => u !== friendUid);
  showToast('Amico rimosso.');
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
    // Track share for challenges
    if (isOnlineApp()) {
      await db.collection('pd_users').doc(currentUser.uid).update({
        inviteCount: firebase.firestore.FieldValue.increment(1)
      });
      userData.inviteCount = (userData.inviteCount || 0) + 1;
      checkAllChallenges();
      saveLocalSession();
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

  // Check if already counted
  const counted = localStorage.getItem(`ref_counted_${refUid}`);
  if (counted) return;

  // Increment referrer's invite count
  db.collection('pd_users').doc(refUid).update({
    inviteCount: firebase.firestore.FieldValue.increment(1)
  }).then(() => {
    localStorage.setItem(`ref_counted_${refUid}`, '1');
  }).catch(() => {});

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// ════════════════════════════════════════════════════════════
// 10. CHALLENGES MODULE
// ════════════════════════════════════════════════════════════

const CHALLENGES = [
  { id:'invite5',       title:'Invita 5 amici',       icon:'mail',     target:5,  field:'inviteCount',                            reward:3 },
  { id:'friends2',      title:'Invia 2 richieste',    icon:'users',    target:2,  field:'sentRequests',       isArray:true,       reward:1 },
  { id:'open10',        title:'Apri 10 pacchetti',    icon:'package',  target:10, field:'totalPacksOpened',                       reward:2 },
  { id:'open50',        title:'Collezionista Serio',  icon:'medal',    target:50, field:'totalPacksOpened',                       reward:5 },
  { id:'rare5',         title:'Cacciatore di Rare',   icon:'gem',      target:5,  check:'rareCount',                              reward:2 },
  { id:'epic1',         title:'Prima Epica',          icon:'zap',      target:1,  check:'epicCount',                              reward:2 },
  { id:'legendary1',    title:'Leggenda!',            icon:'star',     target:1,  check:'legendaryCount',                         reward:3 },
  { id:'login7',        title:'Costante',             icon:'calendar', target:7,  field:'loginStreak',                            reward:5 },
  { id:'complete_team', title:'Nazione Completa',     icon:'trophy',   target:1,  check:'completeNation',                         reward:3 },
  { id:'share1',        title:'Condividi',            icon:'share',    target:1,  field:'inviteCount',                            reward:1 },
];

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
    // Check if any nation has all 3 cards (team + star + legend)
    const nations = {};
    ALL_CARDS.forEach(c => {
      if (!nations[c.nation]) nations[c.nation] = { total: 0, owned: 0 };
      nations[c.nation].total++;
      if (userCollection[c.id]) nations[c.nation].owned++;
    });
    return Object.values(nations).some(n => n.total >= 3 && n.owned >= n.total) ? 1 : 0;
  }
  return 0;
}

function renderChallenges() {
  const container = $('challenges-container');
  container.innerHTML = '';
  const completed = userData?.completedChallenges || [];

  CHALLENGES.forEach(ch => {
    const isCompleted = completed.includes(ch.id);
    const progress = getChallengeProgress(ch);
    const pct = Math.min(100, Math.round((progress / ch.target) * 100));

    const card = document.createElement('div');
    card.className = `challenge-card ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `
      <span class="challenge-icon">${svgIcon(ch.icon)}</span>
      <span class="challenge-title">${ch.title}</span>
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

async function checkAllChallenges() {
  const completed = userData?.completedChallenges || [];
  let awarded = 0;

  for (const ch of CHALLENGES) {
    if (completed.includes(ch.id)) continue;
    const progress = getChallengeProgress(ch);
    if (progress >= ch.target) {
      // Complete!
      await db.collection('pd_users').doc(currentUser.uid).update({
        completedChallenges: firebase.firestore.FieldValue.arrayUnion(ch.id),
        bonusPacks: firebase.firestore.FieldValue.increment(ch.reward)
      });
      userData.completedChallenges = [...completed, ch.id];
      userData.bonusPacks = (userData.bonusPacks || 0) + ch.reward;
      awarded += ch.reward;
      showToast(`Sfida "${ch.title}" completata. +${ch.reward} pack`);
    }
  }

  if (awarded > 0) {
    updateHeaderUI();
    updatePackButtons();
    startTimerIfNeeded();
  }

  renderChallenges();
}

// ════════════════════════════════════════════════════════════
// 11. PWA MODULE
// ════════════════════════════════════════════════════════════

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
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
// 12. UTILITIES
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
