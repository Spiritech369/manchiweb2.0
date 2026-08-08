(function () {
  'use strict';

  var script = document.currentScript;
  var rootUrl = new URL('.', script && script.src ? script.src : window.location.href);
  function loadLanguageSwitcher() {
    if (document.querySelector('script[data-kdl-language]')) return;
    var languageScript = document.createElement('script');
    languageScript.src = new URL('kdl-language.js?v=10', rootUrl).href;
    languageScript.defer = true;
    languageScript.setAttribute('data-kdl-language', '');
    document.head.appendChild(languageScript);
  }
  if (window.KDLI18n) loadLanguageSwitcher();
  else {
    var i18nScript = document.querySelector('script[data-kdl-i18n]');
    if (!i18nScript) {
      i18nScript = document.createElement('script');
      i18nScript.src = new URL('kdl-i18n.js?v=2', rootUrl).href;
      i18nScript.defer = true;
      i18nScript.setAttribute('data-kdl-i18n', '');
      document.head.appendChild(i18nScript);
    }
    i18nScript.addEventListener('load', loadLanguageSwitcher, { once: true });
  }
  var indexPage = /(?:^|\/)index\.html$/i.test(window.location.pathname);
  var isRootIndex = indexPage && !/(?:^|\/)productos\/index\.html$/i.test(window.location.pathname);
  if (isRootIndex && document.querySelector('.kdl-header')) return;

  var FALLBACK_CATEGORIES = [
    { key: 'neumatica', name: 'Neumática industrial', products: ['Cilindros ISO 15552', 'Minicilindros ISO 6432', 'Cilindros compactos CQ2', 'Cilindros guiados MGP', 'Grippers neumáticos'] },
    { key: 'hidraulica', name: 'Hidráulica industrial', products: ['Bombas hidráulicas', 'Motores hidráulicos', 'Válvulas direccionales', 'Cilindros hidráulicos', 'Unidades de potencia HPU'] },
    { key: 'sensores', name: 'Sensores y control', products: ['Sensores fotoeléctricos', 'Sensores inductivos y capacitivos', 'Sensores láser', 'Sensores de presión', 'IO-Link Masters'] },
    { key: 'automatizacion', name: 'Automatización', products: ['PLC y controladores', 'HMI', 'Variadores de frecuencia', 'Servomotores y drives', 'Comunicación industrial'] },
    { key: 'movimiento', name: 'Movimiento lineal', products: ['Guías lineales', 'Guías compactas', 'Husillos de bolas', 'Actuadores lineales'] },
    { key: 'corte', name: 'Herramientas de corte e insertos', products: ['Insertos de torneado', 'Insertos de fresado', 'Insertos de ranurado', 'Carburo sólido'] },
    { key: 'iqf', name: 'Refrigeración industrial / IQF', products: ['Equipos de congelación IQF', 'Túneles y congeladores de banda', 'Sistemas mecánicos y eléctricos'] },
    { key: 'electrico', name: 'Sistemas eléctricos y de control', products: ['Tableros de control', 'Protección eléctrica', 'Fuentes y relevadores'] },
    { key: 'suministros', name: 'Suministros industriales', products: ['Componentes de mantenimiento', 'Transmisión de potencia', 'Sujeción y fijación', 'Consumibles industriales'] }
  ];

  var NAV_ITEMS = [
    ['Inicio', 'index.html', 'inicio'],
    ['Productos', 'Productos.dc.html', 'productos'],
    ['Soluciones', 'Soluciones.dc.html', 'soluciones'],
    ['Catálogos', 'Catalogos.dc.html', 'catalogos'],
    ['Contacto', 'Contacto.dc.html', 'contacto']
  ];

  function href(path) {
    return new URL(path, rootUrl).href;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slug(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function activePage() {
    var path = window.location.pathname.toLowerCase();
    if (/\/productos(?:\/|$)|producto\.dc\.html/.test(path)) return 'productos';
    if (path.indexOf('soluciones') !== -1) return 'soluciones';
    if (path.indexOf('industrias') !== -1) return 'industrias';
    if (path.indexOf('servicios') !== -1) return 'servicios';
    if (path.indexOf('catalogos') !== -1) return 'catalogos';
    if (path.indexOf('contacto') !== -1) return 'contacto';
    if (path.indexOf('compatibilidad') !== -1) return 'compatibilidad';
    if (path.indexOf('cesta') !== -1) return 'cesta';
    return 'inicio';
  }

  function categories() {
    if (window.KDL && Array.isArray(window.KDL.cats) && window.KDL.cats.length) {
      return window.KDL.cats.map(function (category) {
        return {
          key: category.key,
          name: category.name,
          products: (category.products || []).map(function (product) {
            return { name: product.n, slug: product.slug || slug(product.n) };
          })
        };
      });
    }
    return FALLBACK_CATEGORIES.map(function (category) {
      return {
        key: category.key,
        name: category.name,
        products: category.products.map(function (product) {
          return { name: product, slug: slug(product), fallback: true };
        })
      };
    });
  }

  function cartCount() {
    try {
      return JSON.parse(localStorage.getItem('kdl_cart') || '[]').reduce(function (total, item) {
        return total + (Number(item.qty) || 1);
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  function navMarkup(active) {
    return NAV_ITEMS.map(function (item) {
      var current = item[2] === active;
      return '<a class="kdl-shared-nav__link' + (current ? ' is-active' : '') + '" href="' + href(item[1]) + '"' + (current ? ' aria-current="page"' : '') + '>' + escapeHtml(item[0]) + '</a>';
    }).join('');
  }

  function categoryMarkup(list) {
    return list.map(function (category, index) {
      return '<a class="kdl-shared-mega__category' + (index === 0 ? ' is-active' : '') + '" href="' + href('Productos.dc.html?cat=' + encodeURIComponent(category.key)) + '" data-kdl-category="' + escapeHtml(category.key) + '">' +
        '<span>' + escapeHtml(category.name) + '</span><span aria-hidden="true">›</span></a>';
    }).join('');
  }

  function mobileCategoryMarkup(list) {
    return list.map(function (category) {
      return '<a href="' + href('Productos.dc.html?cat=' + encodeURIComponent(category.key)) + '">' +
        '<span>' + escapeHtml(category.name) + '</span><span aria-hidden="true">→</span></a>';
    }).join('');
  }

  function productMarkup(category) {
    return category.products.slice(0, 12).map(function (product) {
      var path = product.fallback
        ? 'Productos.dc.html?cat=' + encodeURIComponent(category.key)
        : 'Producto.dc.html?cat=' + encodeURIComponent(category.key) + '&p=' + encodeURIComponent(product.slug);
      return '<a href="' + href(path) + '">' + escapeHtml(product.name) + '</a>';
    }).join('');
  }

  function injectStylesheet() {
    [
      { href: 'kdl-site-header.css?v=3', attr: 'data-kdl-shared-header' },
      { href: 'kdl-corporate.css?v=1', attr: 'data-kdl-corporate' }
    ].forEach(function (sheet) {
      var existing = document.querySelector('link[' + sheet.attr + ']');
      if (existing) {
        existing.href = href(sheet.href);
        return;
      }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href(sheet.href);
      link.setAttribute(sheet.attr, '');
      document.head.appendChild(link);
    });
  }

  function buildHeader() {
    if (document.querySelector('.kdl-shared-header')) return;
    injectStylesheet();

    var active = activePage();
    var cats = categories();
    var firstCategory = cats[0];
    var original = document.querySelector('x-dc header, body > header.top');
    if (original) original.classList.add('kdl-shared-header-original');

    var header = document.createElement('header');
    header.className = 'kdl-shared-header';
    header.innerHTML =
      '<div class="kdl-shared-header__inner">' +
        '<a class="kdl-shared-brand" href="' + href('index.html') + '" aria-label="KDL, Suministros y Servicios Industriales">' +
          '<img src="' + href('assets/kdl-logo-lockup.png') + '" alt="" width="1729" height="457">' +
        '</a>' +
        '<nav class="kdl-shared-nav" aria-label="Navegación principal">' +
          navMarkup(active).replace(
            /<a class="kdl-shared-nav__link([^"]*)" href="([^"]+)"([^>]*)>Productos<\/a>/,
            '<div class="kdl-shared-products"><a class="kdl-shared-nav__link$1" href="$2"$3 aria-haspopup="true" aria-expanded="false">Productos <span aria-hidden="true">⌄</span></a>' +
              '<div class="kdl-shared-mega" aria-label="Categorías y productos">' +
                '<div class="kdl-shared-mega__inner">' +
                  '<div class="kdl-shared-mega__side">' +
                    '<div class="kdl-shared-mega__heading"><strong>Productos</strong><a href="' + href('Productos.dc.html') + '">Ver todo</a></div>' +
                    '<div class="kdl-shared-mega__categories">' + categoryMarkup(cats) + '</div>' +
                  '</div>' +
                  '<div class="kdl-shared-mega__panel">' +
                    '<div class="kdl-shared-mega__heading"><strong data-kdl-mega-title>' + escapeHtml(firstCategory.name) + '</strong><a data-kdl-mega-all href="' + href('Productos.dc.html?cat=' + encodeURIComponent(firstCategory.key)) + '">Ver todo</a></div>' +
                    '<div class="kdl-shared-mega__products" data-kdl-mega-products>' + productMarkup(firstCategory) + '</div>' +
                  '</div>' +
                '</div>' +
              '</div></div>'
          ) +
        '</nav>' +
        '<div class="kdl-shared-actions">' +
          '<a class="kdl-shared-cart" href="' + href('Cesta.dc.html') + '" aria-label="Cesta de cotización">' +
            '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h2l2.2 11h11l2-8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>' +
            '<span class="kdl-shared-cart__count" aria-label="Productos en la cesta"></span>' +
          '</a>' +
          '<a class="kdl-shared-whatsapp" href="https://wa.me/528112273382?text=' + encodeURIComponent('Hola KDL, quiero cotizar una refacción industrial.') + '" target="_blank" rel="noopener">Cotizar por WhatsApp</a>' +
          '<button class="kdl-shared-menu-button" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="kdl-shared-mobile-menu">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="kdl-shared-mobile-menu" id="kdl-shared-mobile-menu" aria-label="Navegación móvil" hidden>' +
        '<div class="kdl-shared-mobile-menu__nav">' + navMarkup(active) + '</div>' +
        '<div class="kdl-shared-mobile-menu__heading">Categorías de productos</div>' +
        '<div class="kdl-shared-mobile-menu__categories">' + mobileCategoryMarkup(cats) + '</div>' +
        '<div class="kdl-shared-mobile-menu__actions">' +
          '<a href="' + href('Cesta.dc.html') + '">Revisar cesta</a>' +
          '<a href="https://wa.me/528112273382?text=' + encodeURIComponent('Hola KDL, quiero cotizar una refacción industrial.') + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '</div>' +
      '</nav>';

    var insertionPoint = document.querySelector('x-dc') || document.body.firstChild;
    document.body.insertBefore(header, insertionPoint);
    document.body.classList.add('kdl-shared-header-active');

    var products = header.querySelector('.kdl-shared-products');
    var productsTrigger = products.querySelector(':scope > .kdl-shared-nav__link');
    var mega = products.querySelector('.kdl-shared-mega');
    var closeTimer = 0;
    var openTimer = 0;

    function openMega() {
      window.clearTimeout(closeTimer);
      products.classList.add('is-open');
      productsTrigger.setAttribute('aria-expanded', 'true');
    }

    function closeMega(immediate) {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () {
        products.classList.remove('is-open');
        productsTrigger.setAttribute('aria-expanded', 'false');
      }, immediate ? 0 : 260);
    }

    productsTrigger.addEventListener('pointerenter', function () {
      window.clearTimeout(openTimer);
      openTimer = window.setTimeout(openMega, 180);
    });
    products.addEventListener('pointerleave', function () { window.clearTimeout(openTimer); closeMega(false); });
    products.addEventListener('focusin', openMega);
    products.addEventListener('focusout', function (event) {
      if (!products.contains(event.relatedTarget)) closeMega(false);
    });
    mega.addEventListener('pointerenter', openMega);
    window.addEventListener('scroll', function () { closeMega(true); }, { passive: true });

    var title = header.querySelector('[data-kdl-mega-title]');
    var allLink = header.querySelector('[data-kdl-mega-all]');
    var productList = header.querySelector('[data-kdl-mega-products]');
    header.querySelectorAll('[data-kdl-category]').forEach(function (categoryLink) {
      function selectCategory() {
        var key = categoryLink.getAttribute('data-kdl-category');
        var category = cats.find(function (item) { return item.key === key; }) || firstCategory;
        header.querySelectorAll('[data-kdl-category]').forEach(function (item) {
          item.classList.toggle('is-active', item === categoryLink);
        });
        title.textContent = category.name;
        allLink.href = href('Productos.dc.html?cat=' + encodeURIComponent(category.key));
        productList.innerHTML = productMarkup(category);
      }
      categoryLink.addEventListener('pointerenter', selectCategory);
      categoryLink.addEventListener('focus', selectCategory);
    });

    var menuButton = header.querySelector('.kdl-shared-menu-button');
    var mobileMenu = header.querySelector('.kdl-shared-mobile-menu');
    function setMobileMenu(open) {
      mobileMenu.hidden = !open;
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      header.classList.toggle('is-mobile-open', open);
    }
    menuButton.addEventListener('click', function () {
      setMobileMenu(mobileMenu.hidden);
      if (!mobileMenu.hidden) {
        var firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    });

    header.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeMega(true);
      if (!mobileMenu.hidden) {
        setMobileMenu(false);
        menuButton.focus();
      }
    });
    document.addEventListener('pointerdown', function (event) {
      if (!header.contains(event.target)) {
        closeMega(true);
        setMobileMenu(false);
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) setMobileMenu(false);
    });

    function updateCart() {
      var count = cartCount();
      var badge = header.querySelector('.kdl-shared-cart__count');
      badge.textContent = count ? String(count) : '';
      badge.hidden = count < 1;
    }
    updateCart();
    window.addEventListener('storage', updateCart);

    function enhanceBusinessFooter() {
      var footer = document.querySelector('footer');
      if (!footer) return;
      var firstHomeLink = footer.querySelector('a[href$="index.html"], a[href$="index.html#inicio"]');
      if (!firstHomeLink) {
        firstHomeLink = document.createElement('a');
        firstHomeLink.href = href('index.html');
        var footerContainer = footer.querySelector('.shell, div') || footer;
        footerContainer.insertBefore(firstHomeLink, footerContainer.firstChild);
      }
      if (firstHomeLink && !firstHomeLink.querySelector('.kdl-footer-lockup')) {
        firstHomeLink.innerHTML = '<img class="kdl-footer-lockup" src="' + href('assets/kdl-logo-lockup.png') + '" alt="KDL · Suministros y Servicios Industriales">';
        firstHomeLink.classList.add('kdl-footer-brand');
      }
      if (!footer.querySelector('[data-kdl-footer-nav]')) {
        var footerNav = document.createElement('nav');
        footerNav.className = 'kdl-footer-nav';
        footerNav.setAttribute('data-kdl-footer-nav', '');
        footerNav.setAttribute('aria-label', 'Navegación del pie de página');
        footerNav.innerHTML =
          '<div><strong>Navegación</strong><a href="' + href('Productos.dc.html') + '">Productos</a><a href="' + href('Soluciones.dc.html') + '">Soluciones</a><a href="' + href('Industrias.dc.html') + '">Industrias</a><a href="' + href('Cesta.dc.html') + '">Lista de cotización</a></div>' +
          '<div><strong>Soporte</strong><a href="' + href('Compatibilidad.dc.html') + '">Compatibilidad</a><a href="' + href('Catalogos.dc.html') + '">Centro documental</a><a href="' + href('Servicios.dc.html') + '">Servicios técnicos</a><a href="' + href('Contacto.dc.html') + '">Contacto</a></div>';
        footer.appendChild(footerNav);
      }
      if (footer.querySelector('[data-kdl-business-meta]')) return;
      var businessMeta = document.createElement('div');
      businessMeta.className = 'kdl-business-meta';
      businessMeta.setAttribute('data-kdl-business-meta', '');
      businessMeta.innerHTML =
        '<strong>Refacciones y Distribuciones KDL</strong>' +
        '<span>Lic. José Benítez 2186, Obispado, C.P. 64060, Monterrey, N.L.</span>' +
        '<span>Lunes a viernes · 8:00 a.m. a 6:00 p.m.</span>' +
        '<a href="' + href('Aviso-Privacidad.html') + '">Aviso de privacidad</a>';
      footer.appendChild(businessMeta);
    }
    enhanceBusinessFooter();
    window.setTimeout(enhanceBusinessFooter, 300);
    window.setTimeout(enhanceBusinessFooter, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader, { once: true });
  } else {
    buildHeader();
  }
})();
