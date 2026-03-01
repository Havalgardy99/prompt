/**
 * Generate page: history, saved (memory), and tools. Only runs on generate.html.
 */
(function() {
  var STORAGE_HISTORY = 'gemini_prompt_history';
  var STORAGE_SAVED = 'gemini_prompt_saved';
  var HISTORY_MAX = 30;

  function t(key) {
    return (window.AIHub && window.AIHub.t(key)) || key;
  }
  function tr(key, fallback) {
    var v = t(key);
    return (v && v !== key) ? v : (fallback || key);
  }

  function getHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function setHistory(list) {
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    } catch (e) {}
  }

  function getSaved() {
    try {
      var raw = localStorage.getItem(STORAGE_SAVED);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function setSaved(list) {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(list));
    } catch (e) {}
  }

  window.addToGenerateHistory = function(item) {
    var list = getHistory();
    list.unshift({ id: Date.now().toString(36), input: item.input || '', category: item.category || 'image', text: item.text || '', time: item.time || Date.now() });
    setHistory(list);
    renderHistory();
  };

  function addToSaved(text, label) {
    var list = getSaved();
    list.unshift({ id: Date.now().toString(36), text: text || '', label: label || '', time: Date.now() });
    setSaved(list);
    renderSaved();
  }

  function removeSaved(id) {
    var list = getSaved().filter(function(s) { return s.id !== id; });
    setSaved(list);
    renderSaved();
  }

  window.saveCurrentPromptToMemory = function() {
    var pre = document.getElementById('gemini-result-text');
    var text = (pre && pre.textContent) ? pre.textContent.trim() : '';
    if (text) addToSaved(text);
  };

  function showToast(msg) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    var toast = document.createElement('div');
    toast.className = 'toast success';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<i class="fa-solid fa-check"></i> ' + msg;
    wrap.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  function copyText(text, btn) {
    if (!navigator.clipboard || !text) return;
    navigator.clipboard.writeText(text).then(function() {
      showToast(tr('actions.copied', 'Copied!'));
      if (btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + tr('actions.copied', 'Copied!');
        setTimeout(function() { btn.innerHTML = orig; }, 1500);
      }
    });
  }

  function wordCount(str) {
    if (!str || !str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  }

  function renderHistory() {
    var wrap = document.getElementById('generate-history-list');
    if (!wrap) return;
    var list = getHistory();
    var categoryLabels = {
      image: tr('gemini.categoryImage', 'Image'),
      video: tr('gemini.categoryVideo', 'Video'),
      student: tr('gemini.categoryStudent', 'Student'),
      developing: tr('gemini.categoryDeveloping', 'Developing')
    };
    if (list.length === 0) {
      wrap.innerHTML = '<p class="generate-empty" data-i18n="generate.historyEmpty">No generations yet. Generate a prompt above.</p>';
      return;
    }
    wrap.innerHTML = list.map(function(item) {
      var date = new Date(item.time);
      var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var cat = categoryLabels[item.category] || item.category;
      var preview = (item.text || '').slice(0, 120);
      if ((item.text || '').length > 120) preview += '…';
      var wc = wordCount(item.text);
      return '<article class="generate-history-item glass-card">' +
        '<div class="generate-history-meta">' +
        '<span class="generate-history-cat">' + (cat || '') + '</span>' +
        '<span class="generate-history-date">' + dateStr + '</span>' +
        '</div>' +
        '<p class="generate-history-input">' + (item.input || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>' +
        '<pre class="generate-history-preview">' + (preview || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>' +
        '<div class="generate-history-actions">' +
        '<span class="generate-tool-wc">' + tr('generate.words', 'Words') + ': ' + wc + '</span>' +
        '<button type="button" class="btn-copy btn-small" data-text="' + (item.text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"><i class="fa-regular fa-copy"></i> ' + tr('actions.copy', 'Copy') + '</button>' +
        '</div></article>';
    }).join('');

    wrap.querySelectorAll('.btn-small[data-text]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var text = btn.getAttribute('data-text');
        if (text) copyText(text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), btn);
      });
    });
  }

  function renderSaved() {
    var wrap = document.getElementById('generate-saved-list');
    if (!wrap) return;
    var list = getSaved();
    if (list.length === 0) {
      wrap.innerHTML = '<p class="generate-empty" data-i18n="generate.savedEmpty">No saved prompts. Use "Save to memory" in the result modal.</p>';
      return;
    }
    wrap.innerHTML = list.map(function(item) {
      var preview = (item.text || '').slice(0, 100);
      if ((item.text || '').length > 100) preview += '…';
      return '<article class="generate-saved-item glass-card">' +
        '<pre class="generate-saved-preview">' + (preview || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>' +
        '<div class="generate-saved-actions">' +
        '<button type="button" class="btn-copy btn-small save-copy" data-text="' + (item.text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"><i class="fa-regular fa-copy"></i> ' + tr('actions.copy', 'Copy') + '</button>' +
        '<button type="button" class="btn-secondary btn-small save-remove" data-id="' + (item.id || '') + '" aria-label="' + tr('generate.remove', 'Remove') + '"><i class="fa-solid fa-trash-can"></i></button>' +
        '</div></article>';
    }).join('');

    wrap.querySelectorAll('.save-copy').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var text = btn.getAttribute('data-text');
        if (text) copyText(text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), btn);
      });
    });
    wrap.querySelectorAll('.save-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        removeSaved(btn.getAttribute('data-id'));
      });
    });
  }

  function renderTools() {
    var wrap = document.getElementById('generate-tools');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="generate-tools-grid">' +
      '<div class="generate-tool-card glass-card">' +
      '<span class="generate-tool-icon"><i class="fa-solid fa-font"></i></span>' +
      '<h4>' + tr('generate.wordCount', 'Word count') + '</h4>' +
      '<p class="generate-tool-desc">' + tr('generate.wordCountDesc', 'Word count is shown for each item in history.') + '</p>' +
      '</div>' +
      '<div class="generate-tool-card glass-card">' +
      '<span class="generate-tool-icon"><i class="fa-solid fa-download"></i></span>' +
      '<h4>' + tr('generate.exportHistory', 'Export history') + '</h4>' +
      '<p class="generate-tool-desc">' + tr('generate.exportHistoryDesc', 'Download your generation history as a text file.') + '</p>' +
      '<button type="button" class="btn-secondary" id="generate-export-btn"><i class="fa-solid fa-file-export"></i> ' + tr('generate.export', 'Export') + '</button>' +
      '</div>' +
      '<div class="generate-tool-card glass-card">' +
      '<span class="generate-tool-icon"><i class="fa-solid fa-eraser"></i></span>' +
      '<h4>' + tr('generate.clearHistory', 'Clear history') + '</h4>' +
      '<p class="generate-tool-desc">' + tr('generate.clearHistoryDesc', 'Remove all items from history. Saved prompts are kept.') + '</p>' +
      '<button type="button" class="btn-secondary" id="generate-clear-btn"><i class="fa-solid fa-trash-can"></i> ' + tr('generate.clear', 'Clear') + '</button>' +
      '</div>' +
      '</div>';

    var exportBtn = document.getElementById('generate-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var list = getHistory();
        if (list.length === 0) {
          showToast(tr('generate.historyEmpty', 'No history to export.'));
          return;
        }
        var lines = list.map(function(item, i) {
          return '--- ' + (i + 1) + ' | ' + item.category + ' | ' + new Date(item.time).toISOString() + '\n' + (item.input || '') + '\n' + (item.text || '');
        });
        var blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'prompt-history-' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(tr('generate.exported', 'Exported!'));
      });
    }
    var clearBtn = document.getElementById('generate-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (!confirm(tr('generate.clearConfirm', 'Clear all history? Saved prompts will be kept.'))) return;
        setHistory([]);
        renderHistory();
        showToast(tr('generate.cleared', 'History cleared.'));
      });
    }
  }

  function init() {
    var historySection = document.getElementById('generate-history');
    if (!historySection) return;

    function run() {
      renderHistory();
      renderSaved();
      renderTools();
      if (window.AIHub && typeof window.AIHub.applyTranslations === 'function') window.AIHub.applyTranslations();
    }

    if (window.AIHub && window.AIHub.i18nReady) {
      window.AIHub.i18nReady.then(run);
      setTimeout(run, 400);
    } else {
      run();
    }

    document.body.addEventListener('click', function(e) {
      var saveBtn = e.target.closest('#gemini-result-save-memory');
      if (saveBtn) {
        window.saveCurrentPromptToMemory();
        showToast(tr('generate.savedToMemory', 'Saved to memory!'));
      }
    });

    var prevLangChange = window.onLangChange;
    window.onLangChange = function(lang) {
      run();
      if (prevLangChange) prevLangChange(lang);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
