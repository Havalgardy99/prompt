/**
 * Category prompts page: load prompts from JSON, filter by category, search, difficulty, subcategory, tag, load more, copy toast
 */
(function() {
  var grid, searchEl, difficultyEl, subcategoryEl, tagEl, loadMoreWrap, btnLoadMore, emptyState;
  var allPrompts = [];
  var visible = 6;
  var step = 6;

  function capitalize(s) {
    return (s && s.charAt(0).toUpperCase() + s.slice(1)) || s;
  }

  function showToast(msg, type) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    var toast = document.createElement('div');
    toast.className = 'toast' + (type === 'success' ? ' success' : '');
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<i class="fa-solid fa-check"></i> ' + msg;
    wrap.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  window.copyToClipboard = function(text, btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function() {
      var t = (window.AIHub && window.AIHub.t('actions.copied')) || 'Copied!';
      showToast(t, 'success');
      var orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + t;
      btn.classList.add('copied');
      setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
    });
  };

  window.showMeaningModal = function(title, description, detail) {
    var closeLabel = (window.AIHub && window.AIHub.t('actions.closeModal')) || 'Close';
    var overlay = document.getElementById('meaning-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'meaning-modal-overlay';
      overlay.className = 'meaning-modal-overlay';
      overlay.style.display = 'none';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'meaning-modal-title');
      overlay.innerHTML =
        '<div class="meaning-modal">' +
        '<div class="meaning-modal-header">' +
        '<h2 id="meaning-modal-title"></h2>' +
        '<button type="button" class="meaning-modal-close" aria-label="' + closeLabel + '"><i class="fa-solid fa-times"></i></button>' +
        '</div>' +
        '<div class="meaning-modal-body">' +
        '<p class="meaning-desc" id="meaning-modal-desc"></p>' +
        '<div class="meaning-detail" id="meaning-modal-detail"></div>' +
        '</div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.meaning-modal-close').addEventListener('click', function() { overlay.style.display = 'none'; });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.style.display = 'none'; });
    }
    overlay.querySelector('#meaning-modal-title').textContent = title || '';
    overlay.querySelector('#meaning-modal-desc').textContent = description || '';
    var detailEl = overlay.querySelector('#meaning-modal-detail');
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    var closeBtn = overlay.querySelector('.meaning-modal-close');
    if (closeBtn) closeBtn.setAttribute('aria-label', (window.AIHub && window.AIHub.t('actions.closeModal')) || 'Close');
    overlay.style.display = 'flex';
  };

  window.showMeaningModalFromId = function(meaningId) {
    var titleEl = document.getElementById(meaningId + '-title');
    var descEl = document.getElementById(meaningId + '-desc');
    var detailEl = document.getElementById(meaningId + '-detail');
    var title = titleEl ? titleEl.innerText : '';
    var desc = descEl ? descEl.innerText : '';
    var detail = detailEl ? detailEl.innerText : '';
    window.showMeaningModal(title, desc, detail);
  };

  function t(path) {
    return (window.AIHub && window.AIHub.t(path)) || path;
  }

  function getTitle(p) {
    var key = 'prompts.' + p.id + '.title';
    var val = (window.AIHub && window.AIHub.t(key));
    return (val && val !== key) ? val : (p.title || ('Prompt ' + p.id));
  }
  function getDesc(p) {
    var key = 'prompts.' + p.id + '.description';
    var val = (window.AIHub && window.AIHub.t(key));
    return (val && val !== key) ? val : (p.description || '');
  }
  function getDetail(p) {
    var key = 'prompts.' + p.id + '.detail';
    var val = (window.AIHub && window.AIHub.t(key));
    return (val && val !== key) ? val : '';
  }

  function renderCard(p) {
    var displayTitle = p.title || ('Prompt ' + p.id);
    var displayDesc = p.description || '';
    var meaningTitle = getTitle(p);
    var meaningDesc = getDesc(p);
    var detail = getDetail(p);
    var copyLabel = t('actions.copyPrompt') || t('actions.copy');
    var viewMeaningLabel = t('actions.viewMeaning') || 'View meaning';
    var tag = (p.toolTags && p.toolTags[0]) ? (p.toolTags[0].charAt(0).toUpperCase() + p.toolTags[0].slice(1)) : '';
    var diff = p.difficulty ? '<span class="difficulty-badge ' + p.difficulty + '">' + t('difficulty.' + p.difficulty) + '</span>' : '';
    var imgSrc = p.image || 'https://placehold.co/800x450/1e1b4b/6366f1?text=Prompt';
    var promptEscaped = (p.prompt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var cardId = 'prompt-content-' + p.id + '-' + Math.random().toString(36).slice(2, 9);
    var meaningId = 'meaning-card-' + p.id + '-' + Math.random().toString(36).slice(2, 9);
    var card = document.createElement('article');
    card.className = 'glass-card prompt-card';
    card.setAttribute('data-title', displayTitle);
    card.setAttribute('data-desc', displayDesc);
    card.setAttribute('data-prompt', p.prompt);
    card.setAttribute('data-difficulty', p.difficulty || '');
    card.innerHTML =
      '<div class="card-image"><a href="prompt.html?id=' + p.id + '"><img src="' + imgSrc + '" alt="" loading="lazy"></a></div>' +
      '<div class="card-body">' +
      '<div class="tag-row">' + diff +
      (tag ? '<span class="prompt-tag blue">' + tag + '</span>' : '') + '</div>' +
      '<h3><a href="prompt.html?id=' + p.id + '" style="color:inherit;text-decoration:none;">' + displayTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a></h3>' +
      '<p class="card-desc">' + displayDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>' +
      '<div class="d-none" id="' + cardId + '">' + promptEscaped + '</div>' +
      '<div class="d-none" id="' + meaningId + '-title">' + meaningTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '<div class="d-none" id="' + meaningId + '-desc">' + meaningDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '<div class="d-none" id="' + meaningId + '-detail">' + (detail || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '<div class="btn-row" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">' +
      '<button type="button" class="btn-copy" onclick="copyToClipboard(document.getElementById(\'' + cardId + '\').innerText, this)"><i class="fa-regular fa-copy"></i> ' + copyLabel + '</button>' +
      '<button type="button" class="btn-secondary" onclick="showMeaningModalFromId(\'' + meaningId + '\')"><i class="fa-solid fa-circle-info"></i> ' + viewMeaningLabel + '</button>' +
      '</div>' +
      '</div>';
    return card;
  }

  function filterAndRender() {
    var q = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
    var diff = difficultyEl ? difficultyEl.value : '';
    var sub = subcategoryEl ? subcategoryEl.value : '';
    var tag = tagEl ? tagEl.value : '';
    var list = allPrompts.filter(function(p) {
      var title = (p.title || '').toLowerCase();
      var desc = (p.description || '').toLowerCase();
      var prompt = (p.prompt || '').toLowerCase();
      var matchSearch = !q || title.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || prompt.indexOf(q) >= 0;
      var matchDiff = !diff || p.difficulty === diff;
      var matchSub = !sub || p.subcategory === sub;
      var matchTag = !tag || (p.tags && p.tags.indexOf(tag) >= 0);
      return matchSearch && matchDiff && matchSub && matchTag;
    });
    grid.innerHTML = '';
    var show = list.slice(0, visible);
    show.forEach(function(p) { grid.appendChild(renderCard(p)); });
    if (loadMoreWrap) loadMoreWrap.style.display = (list.length > visible) ? 'block' : 'none';
    if (emptyState) {
      emptyState.style.display = list.length === 0 ? 'block' : 'none';
      var cat = window.CATEGORY || 'image';
      var page = (cat === 'image') ? 'image-prompts.html' : (cat === 'video') ? 'video-prompts.html' : (cat === 'student') ? 'student-prompts.html' : 'image-prompts.html';
      emptyState.innerHTML = '<p>' + (t('ui.noResults') || 'No results. Try different filters or browse all.') + '</p><a href="' + page + '" class="btn-secondary">' + (t('ui.browseAll') || 'Browse all') + '</a>';
    }
  }

  function loadMore() {
    visible += step;
    filterAndRender();
  }

  function init() {
    grid = document.getElementById('prompts-grid');
    searchEl = document.getElementById('search-input') || document.getElementById('filter-search');
    difficultyEl = document.getElementById('filter-difficulty');
    subcategoryEl = document.getElementById('filter-subcategory');
    tagEl = document.getElementById('filter-tag');
    loadMoreWrap = document.getElementById('load-more-wrap');
    btnLoadMore = document.getElementById('btn-load-more');
    emptyState = document.getElementById('empty-state');
    if (!grid) return;

    var category = window.CATEGORY || 'image';
    var url = window.PROMPTS_URL || 'data/prompts.json';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allPrompts = (data.prompts || []).filter(function(p) { return p.category === category; });
        visible = step;
        var subcats = [];
        var tagsSet = {};
        allPrompts.forEach(function(p) {
          if (p.subcategory && subcats.indexOf(p.subcategory) < 0) subcats.push(p.subcategory);
          (p.tags || []).forEach(function(t) { tagsSet[t] = true; });
        });
        var tags = Object.keys(tagsSet).sort();
        if (subcategoryEl) {
          subcats.forEach(function(s) {
            var opt = document.createElement('option');
            opt.value = s;
            opt.textContent = capitalize(s);
            subcategoryEl.appendChild(opt);
          });
        }
        if (tagEl) {
          tags.forEach(function(t) {
            var opt = document.createElement('option');
            opt.value = t;
            opt.textContent = capitalize(t);
            tagEl.appendChild(opt);
          });
        }
        var params = new URLSearchParams(window.location.search);
        var q = params.get('q');
        if (searchEl && q) searchEl.value = q;
        filterAndRender();
        window.onLangChange = function() { filterAndRender(); };
      })
      .catch(function() {
        grid.innerHTML = '<p class="empty-state">' + (t('errors.loadPrompts') || 'Failed to load prompts.') + '</p>';
      });

    if (searchEl) searchEl.addEventListener('input', filterAndRender);
    if (difficultyEl) difficultyEl.addEventListener('change', filterAndRender);
    if (subcategoryEl) subcategoryEl.addEventListener('change', filterAndRender);
    if (tagEl) tagEl.addEventListener('change', filterAndRender);
    if (btnLoadMore) btnLoadMore.addEventListener('click', loadMore);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
