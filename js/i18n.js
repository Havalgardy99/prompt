/**
 * Load i18n from JSON (i18n/en.json, ckb.json, ar.json), apply translations, set dir/lang
 */
(function() {
  const STORAGE_KEY = 'aihub-lang';
  const I18N_BASE = 'i18n';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'ckb';
  let translations = {};

  function getNested(obj, path) {
    return path.split('.').reduce(function(o, k) {
      return o && o[k] != null ? o[k] : null;
    }, obj);
  }

  function setMeta(lang) {
    var t = translations[lang];
    if (!t || !t.meta) return;
    var root = document.documentElement;
    root.setAttribute('dir', t.meta.dir || 'ltr');
    root.setAttribute('lang', t.meta.lang || lang);
  }

  function applyTranslations() {
    var t = translations[currentLang];
    if (!t) return;
    setMeta(currentLang);
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var value = getNested(t, key);
      if (value != null) {
        el.textContent = value;
        if (el.tagName === 'TITLE') document.title = value;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var value = getNested(t, key);
      if (value != null) el.placeholder = value;
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var value = getNested(t, key);
      if (value != null) el.setAttribute('aria-label', value);
    });
    var langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = currentLang;
  }

  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    setMeta(lang);
    applyTranslations();
    try { if (window.onLangChange) window.onLangChange(lang); } catch (e) {}
  }

  function loadLang(lang) {
    return fetch(I18N_BASE + '/' + lang + '.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        translations[lang] = data;
        return data;
      });
  }

  function init() {
    var langs = ['en', 'ckb', 'ar'];
    Promise.all(langs.map(loadLang))
      .then(function() {
        if (!translations[currentLang]) currentLang = translations.ckb ? 'ckb' : 'en';
        applyTranslations();
        var langSelect = document.getElementById('lang-select');
        if (langSelect) {
          langSelect.addEventListener('change', function(e) {
            setLanguage(e.target.value);
          });
        }
        if (window.AIHub.i18nReadyResolve) window.AIHub.i18nReadyResolve();
      })
      .catch(function() {
        translations.en = {};
        applyTranslations();
        if (window.AIHub.i18nReadyResolve) window.AIHub.i18nReadyResolve();
      });
  }

  var i18nReadyResolve;
  window.AIHub = {
    i18nReady: new Promise(function(r) { i18nReadyResolve = r; }),
    i18nReadyResolve: null,
    setLanguage: setLanguage,
    applyTranslations: applyTranslations,
    getLang: function() { return currentLang; },
    t: function(path) {
      var t = translations[currentLang] || translations.ckb || translations.en;
      return getNested(t, path) || (translations.ckb ? getNested(translations.ckb, path) : null) || (translations.en ? getNested(translations.en, path) : null) || path;
    },
    getTranslations: function() { return translations; }
  };
  window.AIHub.i18nReadyResolve = i18nReadyResolve;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
