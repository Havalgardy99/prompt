/**
 * AI Tools directory: load from JSON, featured top 4, search, filter by category/pricing, load more
 */
(function() {
  var featuredEl, grid, searchEl, categoryEl, pricingEl, loadMoreWrap, btnLoadMore, emptyState;
  var allTools = [];
  var featuredList = [];
  var visible = 12;
  var step = 12;
  var TOOLS_URL = 'data/tools.json';

  function t(path) { return (window.AIHub && window.AIHub.t(path)) || path; }

  function renderToolCard(tool, featuredRank) {
    var name = t('tools.' + tool.slug + '.name') || tool.name || tool.slug;
    var summary = t('tools.' + tool.slug + '.summary') || tool.summary || '';
    var pricingLabel = t('pricing.' + tool.pricing) || tool.pricing;
    var catLabel = t('categories.' + tool.category + 'Cat') || t('categories.' + tool.category) || tool.category;
    var visitLabel = t('actions.visit') || 'Visit';
    var imgSrc = tool.image || ('https://placehold.co/400x220/1e1b4b/6366f1?text=' + encodeURIComponent(name.substring(0, 12)));
    var card = document.createElement('div');
    card.className = 'tool-card' + (featuredRank ? ' featured-' + featuredRank : '');
    card.setAttribute('data-name', name);
    card.setAttribute('data-desc', summary);
    card.setAttribute('data-category', tool.category);
    card.setAttribute('data-pricing', tool.pricing);
    card.innerHTML =
      '<div class="tool-card-image"><a href="' + (tool.link || '#') + '" target="_blank" rel="noopener"><img src="' + imgSrc + '" alt="" loading="lazy"></a></div>' +
      '<div class="tool-card-body">' +
      '<h4 class="tool-name">' + name + '</h4>' +
      '<p class="tool-desc">' + summary + '</p>' +
      '<p class="tool-meta">' + pricingLabel + ' · ' + catLabel + '</p>' +
      '<a href="' + (tool.link || '#') + '" target="_blank" rel="noopener" class="tool-link">' + visitLabel + ' <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
      '</div>';
    return card;
  }

  function filterAndRender() {
    var q = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
    var cat = categoryEl ? categoryEl.value : '';
    var price = pricingEl ? pricingEl.value : '';
    var list = allTools.filter(function(tool) {
      var name = (t('tools.' + tool.slug + '.name') || tool.name || tool.slug).toLowerCase();
      var summary = (t('tools.' + tool.slug + '.summary') || tool.summary || '').toLowerCase();
      var matchSearch = !q || name.indexOf(q) >= 0 || summary.indexOf(q) >= 0 || (tool.tags && tool.tags.join(' ').toLowerCase().indexOf(q) >= 0);
      var matchCat = !cat || tool.category === cat;
      var matchPrice = !price || tool.pricing === price;
      return matchSearch && matchCat && matchPrice;
    });
    grid.innerHTML = '';
    var show = list.slice(0, visible);
    show.forEach(function(tool) { grid.appendChild(renderToolCard(tool)); });
    if (loadMoreWrap) loadMoreWrap.style.display = (list.length > visible) ? 'block' : 'none';
    if (emptyState) {
      emptyState.style.display = list.length === 0 ? 'block' : 'none';
      emptyState.innerHTML = '<p>' + (t('ui.noResults') || 'No results. Try different filters or browse all.') + '</p><a href="ai-tools.html" class="btn-secondary">' + (t('ui.browseAll') || 'Browse all') + '</a>';
    }
  }

  function loadMore() {
    visible += step;
    filterAndRender();
  }

  function init() {
    featuredEl = document.getElementById('tools-featured');
    grid = document.getElementById('tools-grid');
    searchEl = document.getElementById('tools-search') || document.getElementById('filter-search');
    categoryEl = document.getElementById('filter-category');
    pricingEl = document.getElementById('filter-pricing');
    loadMoreWrap = document.getElementById('load-more-wrap');
    btnLoadMore = document.getElementById('btn-load-more');
    emptyState = document.getElementById('empty-state');

    fetch(TOOLS_URL)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var tools = data.tools || [];
        featuredList = tools.filter(function(t) { return t.featured; });
        featuredList.forEach(function(tool, i) {
          if (featuredEl) featuredEl.appendChild(renderToolCard(tool, i + 1));
        });
        allTools = tools.filter(function(t) { return !t.featured; });
        visible = step;
        filterAndRender();
        window.onLangChange = function() {
          if (featuredEl) {
            featuredEl.innerHTML = '';
            featuredList.forEach(function(tool, i) { featuredEl.appendChild(renderToolCard(tool, i + 1)); });
          }
          filterAndRender();
        };
      })
      .catch(function() {
        if (grid) grid.innerHTML = '<p class="empty-state">' + (t('errors.loadTools') || 'Failed to load tools.') + '</p>';
      });

    if (searchEl) searchEl.addEventListener('input', filterAndRender);
    if (categoryEl) categoryEl.addEventListener('change', filterAndRender);
    if (pricingEl) pricingEl.addEventListener('change', filterAndRender);
    if (btnLoadMore) btnLoadMore.addEventListener('click', loadMore);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
