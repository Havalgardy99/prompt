/**
 * NextMind AI Resource Hub – Language, direction, copy, filter & search
 */
(function () {
  const STORAGE_KEY = 'aihub-lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

  function getNested(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  function setDirection(dir) {
    document.documentElement.dir = dir;
    document.documentElement.lang = currentLang === 'en' ? 'en' : currentLang;
  }

  function setFont(font) {
    document.documentElement.style.setProperty('--font-body', font);
  }

  function applyTranslations() {
    const t = TRANSLATIONS[currentLang];
    if (!t) return;
    setDirection(t.dir);
    setFont(t.font);
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = getNested(t, key);
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = getNested(t, key);
      if (value != null) el.placeholder = value;
    });
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = currentLang;
  }

  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
  }

  window.AIHub = {
    setLanguage,
    getLang: () => currentLang,
    t: (path) => getNested(TRANSLATIONS[currentLang], path) || path,
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  });
})();

function copyToClipboard(text, buttonEl) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const t = window.AIHub ? window.AIHub.t('actions.copied') : 'Copied!';
    const orig = buttonEl.innerHTML;
    buttonEl.innerHTML = `<i class="fa-solid fa-check"></i> ${t}`;
    buttonEl.classList.add('copied');
    setTimeout(() => {
      buttonEl.innerHTML = orig;
      buttonEl.classList.remove('copied');
    }, 2000);
  });
}

function filterAiTools() {
  const searchInput = document.getElementById('ai-tools-search');
  const filterSelect = document.getElementById('ai-tools-filter');
  const grid = document.getElementById('ai-tools-grid');
  const topFour = document.getElementById('ai-tools-top4');
  if (!grid) return;
  const query = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
  const category = filterSelect ? filterSelect.value : '';
  const cards = Array.from(grid.querySelectorAll('.tool-card'));
  const topCards = topFour ? Array.from(topFour.querySelectorAll('.tool-card')) : [];
  const allCards = [...topCards, ...cards];
  allCards.forEach((card) => {
    const name = (card.getAttribute('data-name') || '').toLowerCase();
    const desc = (card.getAttribute('data-desc') || '').toLowerCase();
    const tags = (card.getAttribute('data-tags') || '').toLowerCase();
    const cat = card.getAttribute('data-category') || '';
    const matchSearch = !query || name.includes(query) || desc.includes(query) || tags.includes(query);
    const matchCat = !category || cat === category;
    const isTop = card.closest('#ai-tools-top4');
    if (isTop) {
      card.style.display = matchSearch && matchCat ? '' : 'none';
    } else {
      card.style.display = matchSearch && matchCat ? '' : 'none';
    }
  });
}

function filterPrompts(sectionId, searchId) {
  const section = document.getElementById(sectionId);
  const searchEl = document.getElementById(searchId);
  if (!section || !searchEl) return;
  const query = (searchEl.value || '').trim().toLowerCase();
  section.querySelectorAll('.prompt-card').forEach(function(card) {
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const desc = (card.getAttribute('data-desc') || '').toLowerCase();
    const text = (card.getAttribute('data-prompt') || '').toLowerCase();
    const match = !query || title.includes(query) || desc.includes(query) || text.includes(query);
    card.style.display = match ? '' : 'none';
  });
}
