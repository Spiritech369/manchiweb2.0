(function () {
  'use strict';
  if (window.KDLLanguageSwitcher) return;
  window.KDLLanguageSwitcher = true;

  var script = document.currentScript;
  var rootUrl = new URL('.', script && script.src ? script.src : window.location.href);
  var languages = [
    { code: 'es', short: 'ES', name: 'Español', nativeName: 'Español', label: 'Idioma', heading: 'Idioma del sitio' },
    { code: 'en', short: 'EN', name: 'Inglés', nativeName: 'English', label: 'Language', heading: 'Site language' },
    { code: 'zh-CN', short: '中文', name: 'Chino mandarín', nativeName: '简体中文', label: '语言', heading: '网站语言' },
    { code: 'hi', short: 'HI', name: 'Hindi', nativeName: 'हिन्दी', label: 'भाषा', heading: 'साइट की भाषा' },
    { code: 'ar', short: 'AR', name: 'Árabe', nativeName: 'العربية', label: 'اللغة', heading: 'لغة الموقع', dir: 'rtl' }
  ];

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getCurrent() {
    var code = window.KDLI18n ? window.KDLI18n.getLanguage() : 'es';
    return languages.find(function (language) { return language.code === code; }) || languages[0];
  }

  function ensureStyles() {
    if (document.querySelector('link[data-kdl-language-styles]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('kdl-language.css?v=9', rootUrl).href;
    link.setAttribute('data-kdl-language-styles', '');
    document.head.appendChild(link);
  }

  function optionMarkup(language, current) {
    var selected = language.code === current.code;
    return '<button class="kdl-language__option' + (selected ? ' is-current' : '') + '" type="button" role="menuitemradio" aria-checked="' + selected + '" data-kdl-language-code="' + escapeHtml(language.code) + '" lang="' + escapeHtml(language.code) + '">' +
      '<span><strong' + (language.dir ? ' dir="' + language.dir + '"' : '') + '>' + escapeHtml(language.nativeName) + '</strong></span>' +
      '<svg class="kdl-language__check" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="m5 12 4 4L19 6"/></svg>' +
    '</button>';
  }

  function buildSwitcher() {
    if (document.querySelector('[data-kdl-language-switcher]')) return;
    var actions = document.querySelector('.kdl-header__actions, .kdl-shared-actions');
    if (!actions) return;
    ensureStyles();

    var current = getCurrent();
    var wrapper = document.createElement('div');
    wrapper.className = 'kdl-language';
    wrapper.setAttribute('data-kdl-language-switcher', '');
    wrapper.setAttribute('data-kdl-no-translate', '');
    wrapper.innerHTML =
      '<button class="kdl-language__button" type="button" popovertarget="kdl-language-menu" popovertargetaction="toggle" aria-haspopup="menu" aria-label="Seleccionar idioma. Actual: ' + escapeHtml(current.name) + '">' +
        '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>' +
        '<span class="kdl-language__label">' + escapeHtml(current.label) + '</span>' +
        '<span class="kdl-language__code">' + current.short + '</span>' +
        '<svg class="kdl-language__chevron" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="kdl-language__menu" id="kdl-language-menu" popover="auto" role="menu" aria-label="' + escapeHtml(current.heading) + '">' +
        '<div class="kdl-language__heading">' + escapeHtml(current.heading) + '</div>' +
        languages.map(function (language) { return optionMarkup(language, current); }).join('') +
      '</div>';
    actions.insertBefore(wrapper, actions.firstChild);

    var button = wrapper.querySelector('.kdl-language__button');
    var menu = wrapper.querySelector('.kdl-language__menu');

    function update(root, code) {
      if (!root) return;
      var selected = languages.find(function (language) { return language.code === code; }) || languages[0];
      var liveButton = root.querySelector('.kdl-language__button');
      root.querySelector('.kdl-language__code').textContent = selected.short;
      root.querySelector('.kdl-language__label').textContent = selected.label;
      root.querySelector('.kdl-language__heading').textContent = selected.heading;
      root.querySelector('.kdl-language__menu').setAttribute('aria-label', selected.heading);
      liveButton.setAttribute('aria-label', selected.heading + ': ' + selected.nativeName);
      root.querySelectorAll('[data-kdl-language-code]').forEach(function (option) {
        var isCurrent = option.getAttribute('data-kdl-language-code') === selected.code;
        option.classList.toggle('is-current', isCurrent);
        option.setAttribute('aria-checked', String(isCurrent));
      });
    }

    if (!document.documentElement.hasAttribute('data-kdl-language-events')) {
      document.documentElement.setAttribute('data-kdl-language-events', '');
      document.addEventListener('click', function (event) {
        var option = event.target.closest('[data-kdl-language-code]');
        if (!option) return;
        var liveWrapper = option.closest('[data-kdl-language-switcher]');
        var liveMenu = liveWrapper && liveWrapper.querySelector('.kdl-language__menu');
        var liveButton = liveWrapper && liveWrapper.querySelector('.kdl-language__button');
        var code = option.getAttribute('data-kdl-language-code');
        if (window.KDLI18n) window.KDLI18n.setLanguage(code);
        update(liveWrapper, code);
        if (liveMenu && typeof liveMenu.hidePopover === 'function') liveMenu.hidePopover();
        if (liveButton) liveButton.focus();
      });
      window.addEventListener('kdl:languagechange', function (event) {
        update(document.querySelector('[data-kdl-language-switcher]'), event.detail && event.detail.language);
      });
    }
  }

  function init() {
    buildSwitcher();
    if (!document.querySelector('[data-kdl-language-switcher]')) window.setTimeout(buildSwitcher, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
