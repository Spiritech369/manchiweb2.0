(function () {
  'use strict';

  var script = document.currentScript;
  var rootUrl = new URL('.', script && script.src ? script.src : window.location.href);
  function loadLanguageSwitcher() {
    if (document.querySelector('script[data-kdl-language]') || window.KDLLanguageSwitcher) return;
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
      i18nScript.src = new URL('kdl-i18n.js?v=3', rootUrl).href;
      i18nScript.defer = true;
      i18nScript.setAttribute('data-kdl-i18n', '');
      document.head.appendChild(i18nScript);
    }
    i18nScript.addEventListener('load', loadLanguageSwitcher, { once: true });
  }

  var PHONE = '+52 81 1227 3382';
  var EMAIL = 'ventas@kdl.com.mx';
  var WA_URL = 'https://wa.me/528112273382?text=' + encodeURIComponent('Hola KDL, quiero cotizar una refacción industrial.');

  var FALLBACK_FAMILIES = [
    { key: 'neumatica', name: 'Neumática', lines: ['Cilindros', 'Válvulas solenoide', 'Pinzas neumáticas', 'Filtros reguladores', 'Amortiguadores'] },
    { key: 'hidraulica', name: 'Hidráulica', lines: ['Válvulas', 'Cilindros de sujeción', 'Reguladores de velocidad'] },
    { key: 'sensores', name: 'Sensores', lines: ['Inductivos', 'Fotoeléctricos', 'Magnéticos para cilindro', 'Presión', 'Encoders'] },
    { key: 'automatizacion', name: 'Automatización y control', lines: ['Servomotores y drivers', 'Pantallas HMI', 'Control de temperatura'] },
    { key: 'movimiento', name: 'Movimiento lineal', lines: ['Guías y patines', 'Rodamientos lineales'] },
    { key: 'electrico', name: 'Control eléctrico', lines: ['Relevadores', 'Interruptores de límite'] },
    { key: 'corte', name: 'Herramientas de corte', lines: ['Insertos de torneado', 'Insertos de fresado', 'Carburo sólido'], onRequest: true },
    { key: 'iqf', name: 'Refrigeración industrial (IQF)', lines: ['Equipos de congelación IQF', 'Túneles de banda'], onRequest: true },
    { key: 'suministros', name: 'Suministros industriales', lines: ['Mantenimiento', 'Transmisión de potencia', 'Sujeción y consumibles'], onRequest: true }
  ];

  var NAV_ITEMS = [
    ['Inicio', './', 'inicio'],
    ['Productos', 'catalogo', 'productos'],
    ['Cómo te ayudamos', 'como-te-ayudamos', 'soluciones'],
    ['Descargas', 'descargas', 'descargas'],
    ['Contacto', 'contacto', 'contacto']
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

  function activePage() {
    var path = window.location.pathname.toLowerCase();
    if (/\/productos?(?:\/|$)|\/catalogo(?:\/|$)|producto\.dc|productos\.dc/.test(path)) return 'productos';
    if (/soluciones|como-te-ayudamos|industrias|servicios|compatibilidad|alternativas|herramientas/.test(path)) return 'soluciones';
    if (/catalogos|descargas|checklists|guias|marcas/.test(path)) return 'descargas';
    if (path.indexOf('contacto') !== -1) return 'contacto';
    if (path.indexOf('cesta') !== -1 || path.indexOf('cotizacion') !== -1) return 'cesta';
    if (/(?:^|\/)(?:index\.html)?$/.test(path)) return 'inicio';
    return '';
  }

  function families() {
    var F = window.KDLFamilies;
    if (F && typeof F.list === 'function') {
      var hasInventory = !!window.KDLInventory;
      return F.list().map(function (family) {
        var models = hasInventory ? F.byFamily(family.key).slice().sort(function (a, b) { return (b.stock > 0) - (a.stock > 0); }).slice(0, 12) : [];
        var fallback = FALLBACK_FAMILIES.filter(function (item) { return item.key === family.key; })[0] || { lines: [] };
        return {
          key: family.key,
          name: family.name,
          onRequest: !family.available && hasInventory ? true : !!fallback.onRequest,
          count: family.count,
          links: models.length
            ? models.map(function (product) { return { name: product.model, sub: product.title, href: F.productHref(product) }; })
            : (family.onRequest.length ? family.onRequest : fallback.lines).map(function (line) { return { name: line, href: F.familyHref(family.key) }; })
        };
      });
    }
    return FALLBACK_FAMILIES.map(function (family) {
      return {
        key: family.key,
        name: family.name,
        onRequest: !!family.onRequest,
        links: family.lines.map(function (line) { return { name: line, href: 'catalogo?cat=' + family.key }; })
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

  /* Avisos breves compartidos (p. ej. "Añadido a Mi cotización"). */
  function toast(message, action) {
    var host = document.querySelector('.kdl-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'kdl-toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var item = document.createElement('div');
    item.className = 'kdl-toast';
    item.innerHTML = '<span>' + escapeHtml(message) + '</span>' +
      (action ? '<a href="' + escapeHtml(action.href) + '">' + escapeHtml(action.label) + '</a>' : '');
    host.appendChild(item);
    window.setTimeout(function () { item.classList.add('is-leaving'); }, 3600);
    window.setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 4000);
  }
  window.KDLToast = toast;
  window.KDLCartChanged = function (message) {
    try { window.dispatchEvent(new CustomEvent('kdl:cart-updated')); } catch (error) {}
    if (message) toast(message, { label: 'Ver mi cotización', href: href('mi-cotizacion') });
  };

  function navMarkup(active) {
    return NAV_ITEMS.map(function (item) {
      var current = item[2] === active;
      return '<a class="kdl-shared-nav__link' + (item[2] === 'inicio' ? ' kdl-shared-nav__link--home' : '') + (current ? ' is-active' : '') + '" href="' + href(item[1]) + '"' + (current ? ' aria-current="page"' : '') + '>' + escapeHtml(item[0]) + '</a>';
    }).join('');
  }

  function categoryMarkup(list) {
    return list.map(function (family, index) {
      return '<a class="kdl-shared-mega__category' + (index === 0 ? ' is-active' : '') + '" href="' + href('catalogo?cat=' + encodeURIComponent(family.key)) + '" data-kdl-category="' + escapeHtml(family.key) + '">' +
        '<span>' + escapeHtml(family.name) + (family.onRequest ? ' <small>Bajo pedido</small>' : '') + '</span><span aria-hidden="true">›</span></a>';
    }).join('');
  }

  function mobileCategoryMarkup(list) {
    return list.map(function (family) {
      return '<a href="' + href('catalogo?cat=' + encodeURIComponent(family.key)) + '">' +
        '<span>' + escapeHtml(family.name) + '</span><span aria-hidden="true">→</span></a>';
    }).join('');
  }

  function productMarkup(family) {
    return family.links.slice(0, 12).map(function (link) {
      return '<a href="' + href(link.href) + '">' + escapeHtml(link.name) + (link.sub ? '<small>' + escapeHtml(link.sub) + '</small>' : '') + '</a>';
    }).join('');
  }

  function injectStylesheet() {
    [
      { href: 'kdl-site-header.css?v=5', attr: 'data-kdl-shared-header' },
      { href: 'kdl-corporate.css?v=4', attr: 'data-kdl-corporate' }
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

  function footerMarkup(list) {
    var year = new Date().getFullYear();
    return '<div class="kdl-shared-footer__inner">' +
      '<div class="kdl-shared-footer__brand">' +
        '<a href="' + href('./') + '" aria-label="KDL, inicio"><img src="' + href('assets/kdl-logo-lockup.png') + '" alt="KDL · Suministros y Servicios Industriales" width="1729" height="457" loading="lazy"></a>' +
        '<p>Refacciones industriales, automatización y herramientas de corte para que tu línea no se detenga.</p>' +
        '<a class="kdl-shared-footer__wa" href="' + WA_URL + '" target="_blank" rel="noopener">Cotizar por WhatsApp</a>' +
      '</div>' +
      '<nav class="kdl-shared-footer__cols" aria-label="Navegación del pie de página">' +
        '<div><strong>Productos</strong>' + list.map(function (family) {
          return '<a href="' + href('catalogo?cat=' + encodeURIComponent(family.key)) + '">' + escapeHtml(family.name) + '</a>';
        }).join('') + '<a href="' + href('catalogo') + '">Ver todo el catálogo</a></div>' +
        '<div><strong>Cómo te ayudamos</strong>' +
          '<a href="' + href('como-te-ayudamos') + '">Servicios KDL</a>' +
          '<a href="' + href('contacto#solicitud') + '">Identificar una pieza</a>' +
          '<a href="' + href('alternativas-compatibles') + '">Alternativas compatibles</a>' +
          '<a href="' + href('mi-cotizacion') + '">Mi cotización</a>' +
        '</div>' +
        '<div><strong>Descargas</strong>' +
          '<a href="' + href('descargas') + '">Catálogos PDF y fichas</a>' +
          '<a href="' + href('checklists') + '">Checklists para cotizar</a>' +
          '<a href="' + href('guias') + '">Guías de selección</a>' +
          '<a href="' + href('marcas') + '">Marcas</a>' +
        '</div>' +
        '<div class="kdl-shared-footer__contact"><strong>Contacto</strong>' +
          '<a href="tel:+528112273382">' + PHONE + '</a>' +
          '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>' +
          '<span>Lic. José Benítez 2186, Obispado, C.P. 64060, Monterrey, N.L.</span>' +
          '<span>Lunes a viernes · 8:00 a.m. a 6:00 p.m.</span>' +
        '</div>' +
      '</nav>' +
      '<div class="kdl-shared-footer__legal">' +
        '<span>© ' + year + ' KDL Soluciones Industriales · Monterrey, N.L.</span>' +
        '<span>Marcas referenciales; KDL no afirma distribución exclusiva.</span>' +
        '<a href="' + href('aviso-de-privacidad') + '">Aviso de privacidad</a>' +
      '</div>' +
    '</div>';
  }

  function buildFooter(list) {
    if (document.querySelector('.kdl-shared-footer')) return;
    var footer = document.createElement('footer');
    footer.className = 'kdl-shared-footer';
    footer.innerHTML = footerMarkup(list);
    document.body.appendChild(footer);
    document.body.classList.add('kdl-shared-footer-active');
  }

  function ensureFavicon() {
    if (document.querySelector('link[rel~="icon"]')) return;
    var icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = href('assets/kdl-logo-mark.png');
    document.head.appendChild(icon);
  }

  function buildHeader() {
    if (document.querySelector('.kdl-shared-header')) return;
    injectStylesheet();
    ensureFavicon();

    var active = activePage();
    var cats = families();
    var firstCategory = cats[0];

    var header = document.createElement('header');
    header.className = 'kdl-shared-header';
    header.innerHTML =
      '<div class="kdl-shared-header__inner">' +
        '<a class="kdl-shared-brand" href="' + href('./') + '" aria-label="KDL, Suministros y Servicios Industriales">' +
          '<img src="' + href('assets/kdl-logo-lockup.png') + '" alt="" width="1729" height="457">' +
        '</a>' +
        '<nav class="kdl-shared-nav" aria-label="Navegación principal">' +
          navMarkup(active).replace(
            /<a class="kdl-shared-nav__link([^"]*)" href="([^"]+)"([^>]*)>Productos<\/a>/,
            '<div class="kdl-shared-products"><a class="kdl-shared-nav__link$1" href="$2"$3 aria-haspopup="true" aria-expanded="false">Productos <span aria-hidden="true">⌄</span></a>' +
              '<div class="kdl-shared-mega" aria-label="Familias de productos">' +
                '<div class="kdl-shared-mega__inner">' +
                  '<div class="kdl-shared-mega__side">' +
                    '<div class="kdl-shared-mega__heading"><strong>Productos</strong><a href="' + href('catalogo') + '">Ver todo</a></div>' +
                    '<div class="kdl-shared-mega__categories">' + categoryMarkup(cats) + '</div>' +
                  '</div>' +
                  '<div class="kdl-shared-mega__panel">' +
                    '<div class="kdl-shared-mega__heading"><strong data-kdl-mega-title>' + escapeHtml(firstCategory.name) + '</strong><a data-kdl-mega-all href="' + href('catalogo?cat=' + encodeURIComponent(firstCategory.key)) + '">Ver familia</a></div>' +
                    '<p class="kdl-shared-mega__note" data-kdl-mega-note' + (firstCategory.onRequest ? '' : ' hidden') + '>Bajo pedido: cotizamos según marca, medida o aplicación.</p>' +
                    '<div class="kdl-shared-mega__products" data-kdl-mega-products>' + productMarkup(firstCategory) + '</div>' +
                  '</div>' +
                '</div>' +
              '</div></div>'
          ) +
        '</nav>' +
        '<div class="kdl-shared-actions">' +
          '<a class="kdl-shared-cart' + (active === 'cesta' ? ' is-active' : '') + '" href="' + href('mi-cotizacion') + '" aria-label="Mi cotización">' +
            '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 5h2l2.2 11h11l2-8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>' +
            '<span class="kdl-shared-cart__label">Mi cotización</span>' +
            '<span class="kdl-shared-cart__count" aria-label="Piezas en mi cotización"></span>' +
          '</a>' +
          '<a class="kdl-shared-whatsapp" href="' + WA_URL + '" target="_blank" rel="noopener"><span class="kdl-shared-whatsapp__long">Cotizar por </span>WhatsApp</a>' +
          '<button class="kdl-shared-menu-button" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="kdl-shared-mobile-menu">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="kdl-shared-mobile-menu" id="kdl-shared-mobile-menu" aria-label="Navegación móvil" hidden>' +
        '<div class="kdl-shared-mobile-menu__nav">' + navMarkup(active) + '</div>' +
        '<div class="kdl-shared-mobile-menu__heading">Familias de productos</div>' +
        '<div class="kdl-shared-mobile-menu__categories">' + mobileCategoryMarkup(cats) + '</div>' +
        '<div class="kdl-shared-mobile-menu__actions">' +
          '<a href="' + href('mi-cotizacion') + '" data-kdl-mobile-cart>Mi cotización</a>' +
          '<a href="' + WA_URL + '" target="_blank" rel="noopener">WhatsApp</a>' +
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
    var note = header.querySelector('[data-kdl-mega-note]');
    var productList = header.querySelector('[data-kdl-mega-products]');
    header.querySelectorAll('[data-kdl-category]').forEach(function (categoryLink) {
      function selectCategory() {
        var key = categoryLink.getAttribute('data-kdl-category');
        var category = cats.filter(function (item) { return item.key === key; })[0] || firstCategory;
        header.querySelectorAll('[data-kdl-category]').forEach(function (item) {
          item.classList.toggle('is-active', item === categoryLink);
        });
        title.textContent = category.name;
        allLink.href = href('catalogo?cat=' + encodeURIComponent(category.key));
        note.hidden = !category.onRequest;
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
      if (window.innerWidth >= 1000) setMobileMenu(false);
    });

    function updateCart() {
      var count = cartCount();
      var badge = header.querySelector('.kdl-shared-cart__count');
      badge.textContent = count ? String(count) : '';
      badge.hidden = count < 1;
      var mobileCart = header.querySelector('[data-kdl-mobile-cart]');
      if (mobileCart) mobileCart.textContent = 'Mi cotización' + (count ? ' (' + count + ')' : '');
    }
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('kdl:cart-updated', updateCart);
    window.addEventListener('pageshow', updateCart);

    buildFooter(cats);
  }

  /* Las páginas se pintan con JS después de cargar: reintenta llevar al ancla (#herramientas, #solicitud…). */
  function scrollToHash() {
    var id = decodeURIComponent((window.location.hash || '').slice(1));
    if (!id) return;
    var tries = 0;
    (function attempt() {
      var target = document.getElementById(id);
      if (target) { target.scrollIntoView({ block: 'start' }); return; }
      if (tries++ < 30) window.setTimeout(attempt, 100);
    })();
  }
  if (document.readyState === 'complete') scrollToHash();
  else window.addEventListener('load', scrollToHash, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader, { once: true });
  } else {
    buildHeader();
  }
})();
