/**
 * TENANT ADVOCATE — GLOBAL ACCESSIBILITY SCRIPT
 * ================================================
 * Drop this file on every page (before </body>) and it will:
 *  1. Inject an accessibility toolbar at the top of the page
 *  2. Inject a Google Translate language selector
 *  3. Restore saved user preferences from localStorage
 *  4. Handle all toggle logic and persistence
 *
 * No per-page changes needed beyond adding the <script> tag.
 *
 * Preference keys stored in localStorage:
 *   a11y-font-size     : number (step offset, default 0)
 *   a11y-high-contrast : 'true' | 'false'
 *   a11y-dyslexia-font : 'true' | 'false'
 *   a11y-simplified    : 'true' | 'false'
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────────── */

  const STORAGE_KEYS = {
    fontSize:       'a11y-font-size',
    highContrast:   'a11y-high-contrast',
    dyslexiaFont:   'a11y-dyslexia-font',
    simplified:     'a11y-simplified',
  };

  // Font size steps: each step adds this % to the root font-size
  const FONT_SIZE_STEP     = 10;  // percent per step
  const FONT_SIZE_MIN      = -1;  // minimum steps (one smaller)
  const FONT_SIZE_MAX      =  3;  // maximum steps (three larger)
  const FONT_SIZE_BASE     = 100; // base percent (browser default)

  // Languages to offer in the Google Translate selector
  // These are the primary languages spoken by renters in England
  // beyond English — ordered by estimated renter population size
  const TRANSLATE_LANGUAGES = [
    { code: 'en',    label: 'English' },
    { code: 'pl',    label: 'Polish — Polski' },
    { code: 'ro',    label: 'Romanian — Română' },
    { code: 'ur',    label: 'Urdu — اردو' },
    { code: 'ar',    label: 'Arabic — العربية' },
    { code: 'bn',    label: 'Bengali — বাংলা' },
    { code: 'pa',    label: 'Punjabi — ਪੰਜਾਬੀ' },
    { code: 'gu',    label: 'Gujarati — ગુજરાતી' },
    { code: 'hi',    label: 'Hindi — हिन्दी' },
    { code: 'so',    label: 'Somali — Soomaali' },
    { code: 'tr',    label: 'Turkish — Türkçe' },
    { code: 'pt',    label: 'Portuguese — Português' },
    { code: 'lt',    label: 'Lithuanian — Lietuvių' },
    { code: 'zh-CN', label: 'Chinese — 中文' },
  ];

  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */

  let fontSizeStep = 0;

  /* ─────────────────────────────────────────────
     TOOLBAR HTML
  ───────────────────────────────────────────── */

  function buildToolbarHTML() {
    return `
      <div id="a11y-bar" role="toolbar" aria-label="Accessibility options">

        <span class="a11y-label" aria-hidden="true">Accessibility</span>

        <div class="a11y-controls">

          <!-- Text size -->
          <button id="a11y-increase-text"
                  aria-label="Increase text size"
                  title="Increase text size">
            A+
          </button>

          <button id="a11y-decrease-text"
                  aria-label="Decrease text size"
                  title="Decrease text size">
            A−
          </button>

          <div class="a11y-divider" aria-hidden="true"></div>

          <!-- Toggle modes -->
          <button id="a11y-contrast"
                  aria-label="Toggle high contrast mode"
                  aria-pressed="false"
                  title="High contrast mode">
            ◑ Contrast
          </button>

          <button id="a11y-dyslexia"
                  aria-label="Toggle dyslexia-friendly font"
                  aria-pressed="false"
                  title="Dyslexia-friendly font (OpenDyslexic)">
            Aa Font
          </button>

          <button id="a11y-simplified"
                  aria-label="Toggle simplified layout"
                  aria-pressed="false"
                  title="Simplified layout — larger text and single column">
            ▤ Simple
          </button>

          <div class="a11y-divider" aria-hidden="true"></div>

          <button id="a11y-reset"
                  aria-label="Reset all accessibility settings to default">
            ↺ Reset
          </button>

        </div>

        <!-- Language selector -->
        <div class="a11y-lang-wrap">
          <label for="google_translate_element" id="lang-label">
            🌐 Translate
          </label>
          <div id="google_translate_element" aria-labelledby="lang-label"></div>
        </div>

      </div>

      <!-- Skip to content link — visible only on keyboard focus -->
      <a class="skip-link" href="#main-content">Skip to main content</a>
    `;
  }

  /* ─────────────────────────────────────────────
     INJECT TOOLBAR
  ───────────────────────────────────────────── */

  function injectToolbar() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildToolbarHTML();

    // Insert toolbar as the very first child of <body>
    document.body.insertBefore(wrapper, document.body.firstChild);

    // Ensure there is a landmark for the skip link to target.
    // We look for an existing <main> or the first .container/.content div.
    ensureMainLandmark();
  }

  function ensureMainLandmark() {
    // If the page already has a <main>, just ensure it has an id
    let main = document.querySelector('main');
    if (main) {
      if (!main.id) main.id = 'main-content';
      return;
    }

    // Otherwise mark the first likely content container
    const candidates = [
      '.content', '.main', '.container', '.generator',
      'article', 'section:not(header section)',
    ];

    for (const selector of candidates) {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('id', 'main-content');
        el.setAttribute('tabindex', '-1'); // allows focus from skip link
        return;
      }
    }
  }

  /* ─────────────────────────────────────────────
     FONT SIZE
  ───────────────────────────────────────────── */

  function applyFontSize(step) {
    fontSizeStep = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, step));
    const pct = FONT_SIZE_BASE + fontSizeStep * FONT_SIZE_STEP;
    document.documentElement.style.fontSize = pct + '%';

    // Update button states
    const inc = document.getElementById('a11y-increase-text');
    const dec = document.getElementById('a11y-decrease-text');
    if (inc) inc.disabled = fontSizeStep >= FONT_SIZE_MAX;
    if (dec) dec.disabled = fontSizeStep <= FONT_SIZE_MIN;

    // If we are in large-text class mode (legacy), remove it so inline style takes over
    document.documentElement.classList.remove('large-text');

    // Persist
    localStorage.setItem(STORAGE_KEYS.fontSize, String(fontSizeStep));

    // Announce to screen readers
    announceChange('Text size ' + (pct === FONT_SIZE_BASE ? 'reset to default' : (pct > FONT_SIZE_BASE ? 'increased' : 'decreased')));
  }

  /* ─────────────────────────────────────────────
     TOGGLE HELPERS
  ───────────────────────────────────────────── */

  function toggleClass(cls, storageKey, btnId) {
    const html = document.documentElement;
    const isActive = html.classList.toggle(cls);
    localStorage.setItem(storageKey, String(isActive));

    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle('a11y-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }

    announceChange(cls.replace(/-/g, ' ') + ' ' + (isActive ? 'enabled' : 'disabled'));
    return isActive;
  }

  function setClass(cls, storageKey, btnId, value) {
    const html = document.documentElement;
    html.classList.toggle(cls, value);
    localStorage.setItem(storageKey, String(value));

    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle('a11y-active', value);
      btn.setAttribute('aria-pressed', String(value));
    }
  }

  /* ─────────────────────────────────────────────
     SCREEN READER ANNOUNCEMENTS
     Uses an aria-live region so that changes are
     announced without moving focus.
  ───────────────────────────────────────────── */

  let liveRegion;

  function createLiveRegion() {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    // Visually hidden but readable by screen readers
    Object.assign(liveRegion.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(liveRegion);
  }

  function announceChange(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    // Small delay ensures the DOM update is noticed by screen readers
    setTimeout(() => { liveRegion.textContent = message; }, 50);
  }

  /* ─────────────────────────────────────────────
     RESET
  ───────────────────────────────────────────── */

  function resetAll() {
    // Clear all preferences
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    // Remove all classes
    const html = document.documentElement;
    html.classList.remove('high-contrast', 'dyslexia-font', 'simplified-layout', 'large-text');
    html.style.fontSize = '';

    fontSizeStep = 0;

    // Reset button states
    ['a11y-contrast', 'a11y-dyslexia', 'a11y-simplified'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove('a11y-active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    const inc = document.getElementById('a11y-increase-text');
    const dec = document.getElementById('a11y-decrease-text');
    if (inc) inc.disabled = false;
    if (dec) dec.disabled = false;

    announceChange('All accessibility settings reset to default.');
  }

  /* ─────────────────────────────────────────────
     RESTORE SAVED PREFERENCES
  ───────────────────────────────────────────── */

  function restorePreferences() {
    // Font size
    const savedStep = parseInt(localStorage.getItem(STORAGE_KEYS.fontSize), 10);
    if (!isNaN(savedStep) && savedStep !== 0) {
      applyFontSize(savedStep);
    }

    // High contrast
    if (localStorage.getItem(STORAGE_KEYS.highContrast) === 'true') {
      setClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast', true);
    }

    // Dyslexia font
    if (localStorage.getItem(STORAGE_KEYS.dyslexiaFont) === 'true') {
      setClass('dyslexia-font', STORAGE_KEYS.dyslexiaFont, 'a11y-dyslexia', true);
    }

    // Simplified layout
    if (localStorage.getItem(STORAGE_KEYS.simplified) === 'true') {
      setClass('simplified-layout', STORAGE_KEYS.simplified, 'a11y-simplified', true);
    }
  }

  /* ─────────────────────────────────────────────
     BIND BUTTON EVENTS
  ───────────────────────────────────────────── */

  function bindEvents() {
    document.getElementById('a11y-increase-text')
      ?.addEventListener('click', () => applyFontSize(fontSizeStep + 1));

    document.getElementById('a11y-decrease-text')
      ?.addEventListener('click', () => applyFontSize(fontSizeStep - 1));

    document.getElementById('a11y-contrast')
      ?.addEventListener('click', () =>
        toggleClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast'));

    document.getElementById('a11y-dyslexia')
      ?.addEventListener('click', () =>
        toggleClass('dyslexia-font', STORAGE_KEYS.dyslexiaFont, 'a11y-dyslexia'));

    document.getElementById('a11y-simplified')
      ?.addEventListener('click', () =>
        toggleClass('simplified-layout', STORAGE_KEYS.simplified, 'a11y-simplified'));

    document.getElementById('a11y-reset')
      ?.addEventListener('click', resetAll);
  }

  /* ─────────────────────────────────────────────
     GOOGLE TRANSLATE INTEGRATION
     Uses the free Google Translate widget API.
     No API key required. Targets the languages
     most common among renters in England.
  ───────────────────────────────────────────── */

  function initGoogleTranslate() {
    // Expose the callback Google Translate requires
    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: TRANSLATE_LANGUAGES.map(l => l.code).join(','),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    // Load the Google Translate script dynamically
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = function () {
      // If Google Translate fails to load (e.g. offline), show a graceful fallback
      const el = document.getElementById('google_translate_element');
      if (el) {
        el.innerHTML = `<span style="font-size:0.7rem;color:rgba(176,196,204,0.5);">
          Translation unavailable</span>`;
      }
    };
    document.head.appendChild(script);
  }

  /* ─────────────────────────────────────────────
     SYSTEM PREFERENCE DETECTION
     Respect OS-level high contrast / dark mode
     preferences on first visit (before any user
     override is saved).
  ───────────────────────────────────────────── */

  function detectSystemPreferences() {
    // Only apply system preferences if the user has not previously
    // made an explicit choice
    const hasExistingPrefs = Object.values(STORAGE_KEYS)
      .some(key => localStorage.getItem(key) !== null);

    if (hasExistingPrefs) return;

    // System high contrast
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      setClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast', true);
    }
  }

  /* ─────────────────────────────────────────────
     KEYBOARD SHORTCUT SUPPORT
     Provides keyboard accessibility for power
     users and screen reader users.
     Alt+1 : Increase text
     Alt+2 : Decrease text
     Alt+3 : Toggle contrast
     Alt+4 : Toggle dyslexia font
     Alt+5 : Toggle simplified layout
     Alt+0 : Reset all
  ───────────────────────────────────────────── */

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (!e.altKey) return;

      switch (e.key) {
        case '1': e.preventDefault(); applyFontSize(fontSizeStep + 1); break;
        case '2': e.preventDefault(); applyFontSize(fontSizeStep - 1); break;
        case '3': e.preventDefault(); toggleClass('high-contrast',    STORAGE_KEYS.highContrast, 'a11y-contrast');  break;
        case '4': e.preventDefault(); toggleClass('dyslexia-font',    STORAGE_KEYS.dyslexiaFont, 'a11y-dyslexia');  break;
        case '5': e.preventDefault(); toggleClass('simplified-layout', STORAGE_KEYS.simplified,  'a11y-simplified'); break;
        case '0': e.preventDefault(); resetAll(); break;
      }
    });
  }

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */

  function init() {
    injectToolbar();
    createLiveRegion();
    detectSystemPreferences();
    restorePreferences();
    bindEvents();
    bindKeyboardShortcuts();
    initGoogleTranslate();
  }

  // Run as soon as the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
