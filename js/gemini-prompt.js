/**
 * Generate text prompt via Gemini API. Rate limit: 10 per user per 24h (stored in localStorage).
 * Requires window.GEMINI_API_KEY (set in gemini-config.js).
 * Optional: window.GEMINI_MODEL in gemini-config.js (e.g. 'gemini-2.5-flash'). Free tier typically supports gemini-2.5-flash.
 */
(function() {
  var STORAGE_KEY_COUNT = 'gemini_prompt_count';
  var STORAGE_KEY_RESET = 'gemini_prompt_reset';
  var LIMIT = 10;
  var WINDOW_MS = 24 * 60 * 60 * 1000;
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
  /* Only models that support v1beta generateContent (gemini-pro is deprecated/unavailable on free tier) */
  var MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash'];

  function getUsage() {
    var count = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
    var resetAt = parseInt(localStorage.getItem(STORAGE_KEY_RESET) || '0', 10);
    var now = Date.now();
    if (resetAt && now >= resetAt) {
      count = 0;
      resetAt = now + WINDOW_MS;
      localStorage.setItem(STORAGE_KEY_COUNT, '0');
      localStorage.setItem(STORAGE_KEY_RESET, String(resetAt));
    }
    return { count: count, resetAt: resetAt || (now + WINDOW_MS) };
  }

  function incrementUsage() {
    var u = getUsage();
    if (u.count >= LIMIT) return false;
    var next = u.count + 1;
    localStorage.setItem(STORAGE_KEY_COUNT, String(next));
    if (!localStorage.getItem(STORAGE_KEY_RESET)) localStorage.setItem(STORAGE_KEY_RESET, String(u.resetAt));
    return true;
  }

  function updateRemainingHint() {
    var u = getUsage();
    var remaining = Math.max(0, LIMIT - u.count);
    var countEl = document.getElementById('gemini-remaining-count');
    var suffixEl = document.getElementById('gemini-hint-suffix');
    if (countEl) countEl.textContent = remaining;
    if (suffixEl) suffixEl.textContent = t('gemini.hintSuffix') || 'free today';
  }

  function t(key) {
    return (window.AIHub && window.AIHub.t(key)) || key;
  }

  function ensureModal() {
    var id = 'gemini-result-modal';
    var existing = document.getElementById(id);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'meaning-modal-overlay';
    wrap.style.display = 'none';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    var closeLabel = t('actions.closeModal') || 'Close';
    wrap.innerHTML =
      '<div class="meaning-modal gemini-result-modal">' +
      '<div class="meaning-modal-header">' +
      '<h2 id="gemini-result-title">' + (t('gemini.resultTitle') || 'Generated prompt') + '</h2>' +
      '<button type="button" class="meaning-modal-close" aria-label="' + closeLabel + '"><i class="fa-solid fa-times"></i></button>' +
      '</div>' +
      '<div class="meaning-modal-body">' +
      '<pre id="gemini-result-text" style="white-space:pre-wrap;word-break:break-word;margin:0;"></pre>' +
      '<div class="btn-row" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '<button type="button" class="btn-copy" id="gemini-result-copy"><i class="fa-regular fa-copy"></i> ' + (t('actions.copyPrompt') || 'Copy prompt') + '</button>' +
      '<button type="button" class="btn-secondary" id="gemini-result-translate"><i class="fa-solid fa-language"></i> ' + (t('gemini.translate') || 'Translate') + '</button>' +
      (typeof window.saveCurrentPromptToMemory === 'function' ? '<button type="button" class="btn-secondary" id="gemini-result-save-memory"><i class="fa-solid fa-bookmark"></i> ' + (t('generate.saveToMemory') || 'Save to memory') + '</button>' : '') +
      '</div>' +
      '<div id="gemini-result-meaning-wrap" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.15);">' +
      '<p class="meaning-label" style="margin:0 0 0.5rem 0;font-weight:600;font-size:0.9rem;" id="gemini-result-meaning-label"></p>' +
      '<pre id="gemini-result-meaning" style="white-space:pre-wrap;word-break:break-word;margin:0;"></pre>' +
      '</div></div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.meaning-modal-close').addEventListener('click', function() { wrap.style.display = 'none'; });
    wrap.addEventListener('click', function(e) { if (e.target === wrap) wrap.style.display = 'none'; });
    document.getElementById('gemini-result-copy').addEventListener('click', function() {
      var pre = document.getElementById('gemini-result-text');
      if (!pre || !pre.textContent) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(pre.textContent).then(function() {
          var btn = document.getElementById('gemini-result-copy');
          var orig = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + (t('actions.copied') || 'Copied!');
          btn.classList.add('copied');
          setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
        });
      }
    });
    var translateBtn = document.getElementById('gemini-result-translate');
    if (translateBtn) {
      translateBtn.addEventListener('click', function() {
        var pre = document.getElementById('gemini-result-text');
        var text = (pre && pre.textContent) ? pre.textContent.trim() : '';
        if (!text) return;
        var meaningWrap = document.getElementById('gemini-result-meaning-wrap');
        var meaningPre = document.getElementById('gemini-result-meaning');
        var meaningLabel = document.getElementById('gemini-result-meaning-label');
        var lang = (window.AIHub && window.AIHub.getLang) ? window.AIHub.getLang() : 'en';
        var langNames = { en: 'English', ckb: 'Kurdish (Central Kurdish)', ar: 'Arabic' };
        var targetName = langNames[lang] || 'English';
        if (meaningLabel) meaningLabel.textContent = (t('gemini.meaningLabel') || 'Meaning') + ' (' + targetName + ')';
        if (lang === 'en') {
          if (meaningPre) meaningPre.textContent = text;
          if (meaningWrap) { meaningWrap.style.display = 'block'; }
          return;
        }
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (t('gemini.translating') || 'Translating…');
        translateViaGemini(text, targetName).then(function(translated) {
          if (meaningPre) meaningPre.textContent = translated || text;
          if (meaningWrap) meaningWrap.style.display = 'block';
        }).catch(function() {
          if (meaningPre) meaningPre.textContent = text;
          if (meaningWrap) meaningWrap.style.display = 'block';
        }).finally(function() {
          translateBtn.disabled = false;
          translateBtn.innerHTML = '<i class="fa-solid fa-language"></i> ' + (t('gemini.translate') || 'Translate');
        });
      });
    }
    return wrap;
  }

  function translateViaGemini(text, targetLanguage) {
    var key = window.GEMINI_API_KEY;
    if (!key || key === 'YOUR_GEMINI_API_KEY') {
      return Promise.reject(new Error('No API key'));
    }
    var models = (window.GEMINI_MODEL && [window.GEMINI_MODEL]) || MODELS_TO_TRY;
    var userMessage = 'Translate the following text to ' + targetLanguage + '. Output only the translation, no explanation or extra text.\n\n' + text;
    var body = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
    };
    function tryModel(index) {
      if (index >= models.length) return Promise.reject(new Error('No model'));
      var model = models[index];
      var url = API_BASE + '/' + model + ':generateContent?key=' + encodeURIComponent(key);
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) {
            var msg = (data.error.message || '').toLowerCase();
            if (msg.indexOf('not found') !== -1 || msg.indexOf('not supported') !== -1) return tryModel(index + 1);
            return Promise.reject(new Error(data.error.message || 'Translation failed'));
          }
          var out = data.candidates && data.candidates[0] && data.candidates[0].content &&
            data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text;
          return out ? Promise.resolve(out.trim()) : Promise.reject(new Error('Empty response'));
        })
        .catch(function(err) {
          if (err && err.message && (err.message.toLowerCase().indexOf('not found') !== -1 || err.message.toLowerCase().indexOf('not supported') !== -1)) {
            return tryModel(index + 1);
          }
          return Promise.reject(err);
        });
    }
    return tryModel(0);
  }

  function showResult(text) {
    var modal = ensureModal();
    var pre = document.getElementById('gemini-result-text');
    if (pre) pre.textContent = text || '';
    var meaningWrap = document.getElementById('gemini-result-meaning-wrap');
    var meaningPre = document.getElementById('gemini-result-meaning');
    if (meaningWrap) { meaningWrap.style.display = 'none'; }
    if (meaningPre) meaningPre.textContent = '';
    modal.style.display = 'flex';
  }

  function showError(msg) {
    var modal = ensureModal();
    var pre = document.getElementById('gemini-result-text');
    if (pre) pre.textContent = msg || '';
    var meaningWrap = document.getElementById('gemini-result-meaning-wrap');
    var meaningPre = document.getElementById('gemini-result-meaning');
    if (meaningWrap) meaningWrap.style.display = 'none';
    if (meaningPre) meaningPre.textContent = '';
    modal.style.display = 'flex';
  }

  function generatePrompt(userText) {
    var key = window.GEMINI_API_KEY;
    if (!key || key === 'YOUR_GEMINI_API_KEY') {
      showError(t('gemini.noKey') || 'API key not configured. Add your key in js/gemini-config.js');
      return Promise.reject(new Error('No API key'));
    }
    var u = getUsage();
    if (u.count >= LIMIT) {
      var resetIn = Math.ceil((u.resetAt - Date.now()) / 60000);
      showError((t('gemini.limitReached') || 'You can generate up to 10 prompts per 24 hours. Try again in {{min}} minutes.').replace('{{min}}', resetIn));
      return Promise.reject(new Error('Rate limit'));
    }
    var models = (window.GEMINI_MODEL && [window.GEMINI_MODEL]) || MODELS_TO_TRY;
    var categoryEl = document.querySelector('input[name="gemini-category"]:checked');
    var category = (categoryEl && categoryEl.value) || 'image';
    var systemKey = 'gemini.system' + category.charAt(0).toUpperCase() + category.slice(1);
    var systemInstruction = (t(systemKey) || t('gemini.systemImage')).trim();
    systemInstruction = systemInstruction +
      '\n\nQuality rules: Produce the best possible prompt—detailed, specific, and ready to use. Use clear, vivid language; include relevant technical terms (e.g. lighting, composition, style) where they improve results. Structure the prompt so the target AI (image/video/study/code tool) can give a strong result on the first try. Stay true to what the user asked; do not add unrelated elements. Output in English only. Output only the prompt text: no explanations, no code, no extra sentences.';
    var body = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
    };

    function tryModel(index) {
      if (index >= models.length) {
        showError('No working model found. List models: GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY — then set window.GEMINI_MODEL in js/gemini-config.js to a model name from the list.');
        return Promise.reject(new Error('No model'));
      }
      var model = models[index];
      var url = API_BASE + '/' + model + ':generateContent?key=' + encodeURIComponent(key);
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) {
            var msg = (data.error.message || '').toLowerCase();
            if (msg.indexOf('not found') !== -1 || msg.indexOf('not supported') !== -1) {
              return tryModel(index + 1);
            }
            if (msg.indexOf('quota') !== -1 || msg.indexOf('exceeded') !== -1 || msg.indexOf('rate') !== -1 || msg.indexOf('billing') !== -1) {
              var friendly = t('gemini.quotaExceeded') || 'Google API quota exceeded. Try again in a few minutes or check your plan at https://ai.google.dev/gemini-api/docs/rate-limits';
              var retryMatch = (data.error.message || '').match(/retry in (\d+(?:\.\d+)?)\s*s/i);
              if (retryMatch) friendly += '\n\n' + (t('gemini.retryIn') || 'Retry after about') + ' ' + Math.ceil(parseFloat(retryMatch[1])) + ' ' + (t('gemini.seconds') || 'seconds') + '.';
              showError(friendly);
              return Promise.reject(new Error(data.error.message));
            }
            showError((t('gemini.error') || 'Generation failed: ') + (data.error.message || JSON.stringify(data)));
            return Promise.reject(new Error(data.error.message));
          }
          var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
            data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text;
          if (text) {
            incrementUsage();
            updateRemainingHint();
            var trimmed = text.trim();
            showResult(trimmed);
            if (typeof window.addToGenerateHistory === 'function') {
              window.addToGenerateHistory({
                input: userText,
                category: category,
                text: trimmed,
                time: Date.now()
              });
            }
          } else {
            var errMsg = JSON.stringify(data);
            showError((t('gemini.error') || 'Generation failed: ') + errMsg);
          }
        })
        .catch(function(err) {
          if (err && err.message && (err.message.toLowerCase().indexOf('not found') !== -1 || err.message.toLowerCase().indexOf('not supported') !== -1)) {
            return tryModel(index + 1);
          }
          showError((t('gemini.error') || 'Request failed: ') + (err.message || String(err)));
          return Promise.reject(err);
        });
    }
    return tryModel(0);
  }

  function wireGenerateUI() {
    var input = document.getElementById('header-generate-input');
    var btn = document.getElementById('header-generate-btn');
    if (!input || !btn) return;
    updateRemainingHint();
    try { window.AIHub.i18nReady.then(updateRemainingHint); } catch (e) {}
    var prevLangChange = window.onLangChange;
    window.onLangChange = function(lang) {
      updateRemainingHint();
      if (prevLangChange) prevLangChange(lang);
    };
    function submit() {
      var text = (input.value || '').trim();
      if (!text) return;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (t('gemini.generating') || 'Generating…');
      generatePrompt(text).finally(function() {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ' + (t('gemini.generate') || 'Generate');
      });
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submit(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireGenerateUI);
  } else {
    setTimeout(wireGenerateUI, 0);
  }
})();
