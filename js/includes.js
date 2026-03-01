/**
 * Load header and footer fragments once, inject into placeholders, set active nav, wire mobile menu.
 * Use <div id="header-placeholder"></div> and <div id="footer-placeholder"></div> in each page.
 */
(function() {
  var BASE = '';
  var headerEl = document.getElementById('header-placeholder');
  var footerEl = document.getElementById('footer-placeholder');

  function currentPage() {
    var path = window.location.pathname || '';
    var name = path.split('/').pop() || '';
    return (name === '' || name === '/') ? 'index.html' : name;
  }

  function setActiveNav(container) {
    if (!container) return;
    var page = currentPage();
    container.querySelectorAll('.nav-links a').forEach(function(a) {
      var href = a.getAttribute('href') || '';
      if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function wireMobileMenu() {
    var toggle = document.getElementById('nav-toggle');
    var wrap = document.getElementById('nav-wrap');
    if (!toggle || !wrap) return;
    toggle.addEventListener('click', function() {
      var open = wrap.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open);
      var icon = toggle.querySelector('i');
      if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    });
    wrap.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        wrap.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        var icon = toggle.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      });
    });
  }

  function apply() {
    setActiveNav(document.querySelector('.site-header'));
    wireMobileMenu();
    if (window.AIHub && typeof window.AIHub.applyTranslations === 'function') window.AIHub.applyTranslations();
  }

  function inject(where, html) {
    if (!where) return;
    where.innerHTML = html;
  }

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = BASE + src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (!headerEl && !footerEl) return;

  var total = (headerEl ? 1 : 0) + (footerEl ? 1 : 0);
  var done = 0;
  function maybeDone() {
    done++;
    if (done >= total) apply();
  }

  if (headerEl) {
    fetch(BASE + 'fragments/header.html')
      .then(function(r) { return r.text(); })
      .then(function(html) {
        inject(headerEl, html);
        maybeDone();
      })
      .catch(function() { maybeDone(); });
  }
  if (footerEl) {
    fetch(BASE + 'fragments/footer.html')
      .then(function(r) { return r.text(); })
      .then(function(html) {
        inject(footerEl, html);
        maybeDone();
      })
      .catch(function() { maybeDone(); });
  }
})();
