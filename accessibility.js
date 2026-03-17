/**
 * TENANT ADVOCATE — ACCESSIBILITY SCRIPT (simplified)
 * =====================================================
 * Injects a lightweight accessibility toolbar on every page.
 * No skip link. No simplified layout mode.
 * Toolbar sits above the page header in normal document flow —
 * no fixed positioning on mobile, preventing header overlap.
 *
 * Features retained:
 *  • Text size cycling (3 steps)
 *  • High contrast toggle
 *  • Dyslexia-friendly font toggle
 *  • Google Translate (language selector)
 *  • Reset button
 *  • Preferences saved to localStorage
 *  • Screen reader announcements (aria-live)
 *  • System prefers-contrast detection
 *
 * localStorage keys:
 *   a11y-font-size     : number (0 = default, 1 = large, 2 = larger)
 *   a11y-high-contrast : 'true' | 'false'
 *   a11y-dyslexia-font : 'true' | 'false'
 */

(function () {
  'use strict';

  /* ── Constants ── */

  const STORAGE_KEYS = {
    fontSize:     'a11y-font-size',
    highContrast: 'a11y-high-contrast',
    dyslexiaFont: 'a11y-dyslexia-font',
  };

  // Three font-size steps: 0 = default, 1 = large (+15%), 2 = larger (+30%)
  const FONT_STEPS = [100, 115, 130];
  const FONT_LABELS = ['A', 'A+', 'A++'];

  const TRANSLATE_LANGUAGES = [
    { code: 'en',    label: 'English' },
    { code: 'pl',    label: 'Polish' },
    { code: 'ro',    label: 'Romanian' },
    { code: 'ur',    label: 'Urdu' },
    { code: 'ar',    label: 'Arabic' },
    { code: 'bn',    label: 'Bengali' },
    { code: 'pa',    label: 'Punjabi' },
    { code: 'gu',    label: 'Gujarati' },
    { code: 'hi',    label: 'Hindi' },
    { code: 'so',    label: 'Somali' },
    { code: 'tr',    label: 'Turkish' },
    { code: 'pt',    label: 'Portuguese' },
    { code: 'lt',    label: 'Lithuanian' },
    { code: 'zh-CN', label: 'Chinese' },
  ];

  /* ── State ── */
  let fontStep = 0; // 0, 1, or 2

  /* ── Build toolbar HTML ── */

  function buildToolbarHTML() {
    return `
      <div id="a11y-bar" role="toolbar" aria-label="Accessibility options">

        <span class="a11y-label" aria-hidden="true">Accessibility</span>

        <div class="a11y-controls">

          <!-- Single cycling text-size button -->
          <button id="a11y-text-size"
                  aria-label="Change text size"
                  title="Cycle through text sizes">
            <span id="a11y-text-size-label">A</span>
            <span class="a11y-btn-text">Text size</span>
          </button>

          <div class="a11y-divider" aria-hidden="true"></div>

          <button id="a11y-contrast"
                  aria-label="Toggle high contrast"
                  aria-pressed="false"
                  title="High contrast">
            ◑ <span class="a11y-btn-text">Contrast</span>
          </button>

          <button id="a11y-dyslexia"
                  aria-label="Toggle dyslexia-friendly font"
                  aria-pressed="false"
                  title="Dyslexia-friendly font">
            Aa <span class="a11y-btn-text">Dyslexia font</span>
          </button>

          <div class="a11y-divider" aria-hidden="true"></div>

          <button id="a11y-reset"
                  aria-label="Reset accessibility settings">
            ↺ <span class="a11y-btn-text">Reset</span>
          </button>

        </div>

        <!-- Language / translate -->
        <div class="a11y-lang-wrap">
          <span class="a11y-label" aria-hidden="true">🌐</span>
          <div id="google_translate_element" aria-label="Translate page"></div>
        </div>

      </div>
    `;
  }

  /* ── Inject toolbar ── */

  function injectToolbar() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildToolbarHTML();
    // Insert as very first child of <body> — above the page <header>
    document.body.insertBefore(wrapper, document.body.firstChild);
  }

  /* ── Text size (cycle through 3 steps) ── */

  function applyFontSize(step) {
    fontStep = ((step % FONT_STEPS.length) + FONT_STEPS.length) % FONT_STEPS.length;
    document.documentElement.style.fontSize = FONT_STEPS[fontStep] + '%';
    document.documentElement.classList.remove('large-text'); // remove legacy class if present

    // Update button label to show current / next state
    const labelEl = document.getElementById('a11y-text-size-label');
    if (labelEl) labelEl.textContent = FONT_LABELS[fontStep];

    const btn = document.getElementById('a11y-text-size');
    if (btn) btn.classList.toggle('a11y-active', fontStep > 0);

    localStorage.setItem(STORAGE_KEYS.fontSize, String(fontStep));
    announceChange('Text size: ' + ['default', 'large', 'larger'][fontStep]);
  }

  /* ── Toggle helpers ── */

  function toggleClass(cls, storageKey, btnId) {
    const html = document.documentElement;
    const isActive = html.classList.toggle(cls);
    localStorage.setItem(storageKey, String(isActive));

    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle('a11y-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }

    const label = cls === 'high-contrast' ? 'High contrast' : 'Dyslexia font';
    announceChange(label + ' ' + (isActive ? 'on' : 'off'));
  }

  function setClass(cls, storageKey, btnId, value) {
    document.documentElement.classList.toggle(cls, value);
    localStorage.setItem(storageKey, String(value));
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle('a11y-active', value);
      btn.setAttribute('aria-pressed', String(value));
    }
  }

  /* ── Screen reader live region ── */

  let liveRegion;

  function createLiveRegion() {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    Object.assign(liveRegion.style, {
      position: 'absolute', width: '1px', height: '1px',
      overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
    });
    document.body.appendChild(liveRegion);
  }

  function announceChange(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = message; }, 50);
  }

  /* ── Reset ── */

  function resetAll() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    const html = document.documentElement;
    html.classList.remove('high-contrast', 'dyslexia-font', 'large-text');
    html.style.fontSize = '';
    fontStep = 0;

    ['a11y-contrast', 'a11y-dyslexia'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.classList.remove('a11y-active'); btn.setAttribute('aria-pressed', 'false'); }
    });

    const sizeBtn = document.getElementById('a11y-text-size');
    if (sizeBtn) sizeBtn.classList.remove('a11y-active');
    const labelEl = document.getElementById('a11y-text-size-label');
    if (labelEl) labelEl.textContent = FONT_LABELS[0];

    announceChange('Accessibility settings reset.');
  }

  /* ── Restore saved preferences ── */

  function restorePreferences() {
    const savedStep = parseInt(localStorage.getItem(STORAGE_KEYS.fontSize), 10);
    if (!isNaN(savedStep) && savedStep > 0) applyFontSize(savedStep);

    if (localStorage.getItem(STORAGE_KEYS.highContrast) === 'true') {
      setClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast', true);
    }
    if (localStorage.getItem(STORAGE_KEYS.dyslexiaFont) === 'true') {
      setClass('dyslexia-font', STORAGE_KEYS.dyslexiaFont, 'a11y-dyslexia', true);
    }
  }

  /* ── Bind events ── */

  function bindEvents() {
    document.getElementById('a11y-text-size')
      ?.addEventListener('click', () => applyFontSize(fontStep + 1));

    document.getElementById('a11y-contrast')
      ?.addEventListener('click', () =>
        toggleClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast'));

    document.getElementById('a11y-dyslexia')
      ?.addEventListener('click', () =>
        toggleClass('dyslexia-font', STORAGE_KEYS.dyslexiaFont, 'a11y-dyslexia'));

    document.getElementById('a11y-reset')
      ?.addEventListener('click', resetAll);
  }

  /* ── Google Translate ── */

  function initGoogleTranslate() {
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

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = function () {
      const el = document.getElementById('google_translate_element');
      if (el) el.innerHTML = `<span style="font-size:0.7rem;color:rgba(176,196,204,0.4);">Translation unavailable</span>`;
    };
    document.head.appendChild(script);
  }

  /* ── System preference detection ── */

  function detectSystemPreferences() {
    const hasPrefs = Object.values(STORAGE_KEYS).some(k => localStorage.getItem(k) !== null);
    if (hasPrefs) return;
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      setClass('high-contrast', STORAGE_KEYS.highContrast, 'a11y-contrast', true);
    }
  }

  /* ── Init ── */

  function init() {
    injectToolbar();
    createLiveRegion();
    detectSystemPreferences();
    restorePreferences();
    bindEvents();
    initGoogleTranslate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
