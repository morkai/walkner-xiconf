// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

(function()
{
  'use strict';

  if (!location.origin)
  {
    location.origin = location.protocol + '//'
      + location.hostname
      + (location.port ? (':' + location.port) : '');
  }

  if (location.search.indexOf('LOCAL=') !== -1)
  {
    history.replaceState(null, document.title, '/' + location.hash);
  }

  var locale = localStorage.getItem('LOCALE') || navigator.language || 'en';

  if (locale !== 'pl')
  {
    locale = 'en';
  }

  if (window.parent)
  {
    window.parent.postMessage({type: 'init', host: location.host}, '*');
  }

  var domains = [];
  var i18n = null;
  var select2 = null;

  require.onError = function(err)
  {
    console.error(err);

    var loadingEl = document.getElementById('app-loading');

    if (!loadingEl)
    {
      return;
    }

    loadingEl.className = 'error';

    var spinnerEl = loadingEl.getElementsByClassName('fa-spin')[0];

    if (spinnerEl)
    {
      spinnerEl.classList.remove('fa-spin');
    }
  };

  require.onResourceLoad = function(context, map)
  {
    if (map.prefix === 'i18n')
    {
      var keys = context.defined[map.id];
      var domain = map.id.substr(map.id.lastIndexOf('/') + 1);

      if (i18n !== null)
      {
        i18n.register(domain, keys, map.id);
      }
      else
      {
        domains.push([domain, keys, map.id]);
      }
    }
    else if (map.id === 'app/i18n')
    {
      i18n = context.defined[map.id];
      i18n.config = context.config.config.i18n;

      domains.forEach(function(domainData)
      {
        i18n.register(domainData[0], domainData[1], domainData[2]);
      });

      domains = null;
    }
    else if (map.id === 'select2')
    {
      select2 = context.defined[map.id];
      select2.lang = function(lang)
      {
        window.jQuery.extend(window.jQuery.fn.select2.defaults, select2.lang[lang]);
      };
    }
    else if (/^select2-lang/.test(map.id))
    {
      var lang = map.id.substr(map.id.lastIndexOf('/') + 1);

      select2.lang[lang] = context.defined[map.id];
    }
  };

  function startApp(
    domReady,
    $,
    Backbone,
    Layout,
    moment,
    broker,
    i18n,
    socket,
    pubsub,
    router,
    viewport,
    loadedModules,
    PageLayout,
    NavbarView,
    currentState,
    settings,
    hotkeys)
  {
    var startBroker = null;

    monkeyPatch(Backbone, $);

    socket.connect();

    moment.locale(locale);

    $.ajaxSetup({
      dataType: 'json',
      accepts: {
        json: 'application/json',
        text: 'text/plain'
      },
      contentType: 'application/json'
    });

    Layout.configure({
      manage: true,
      el: false,
      keep: true
    });

    viewport.registerLayout('page', function createPageLayout()
    {
      return new PageLayout({
        version: window.APP_VERSION,
        views: {
          '.navbar': createNavbarView()
        }
      });
    });

    broker.subscribe('page.titleChanged', function(newTitle)
    {
      var titleSetting = settings.get('title');

      if (typeof titleSetting === 'string' && titleSetting.length)
      {
        newTitle.unshift(titleSetting);
      }
      else
      {
        newTitle.unshift(i18n('core', 'TITLE'));
      }

      newTitle.unshift('Walkner Xiconf [' + (window.location.port || 80) + ']');

      document.title = newTitle.reverse().join(' < ');
    });

    var featureSyncMsg = null;

    pubsub.subscribe('featureSync.started', function()
    {
      hideFeatureSyncMsg();

      featureSyncMsg = viewport.msg.show({
        type: 'info',
        time: 3000,
        text: i18n('core', 'featureSync:started')
      });
    });

    pubsub.subscribe('featureSync.finished', function(message)
    {
      hideFeatureSyncMsg();

      featureSyncMsg = viewport.msg.show({
        type: message.error ? 'error' : 'success',
        time: 3000,
        text: i18n('core', 'featureSync:' + (message.error ? 'failure' : 'success'))
      });
    });

    startBroker = broker.sandbox();
    startBroker.subscribe('socket.connected', doStartApp);
    startBroker.subscribe('socket.connectFailed', doStartApp);

    function hideFeatureSyncMsg()
    {
      if (featureSyncMsg !== null)
      {
        viewport.msg.hide(featureSyncMsg, true);
        featureSyncMsg = null;
      }
    }

    function createNavbarView()
    {
      var req = router.getCurrentRequest();

      return new NavbarView({
        currentPath: req === null ? '/' : req.path,
        loadedModules: loadedModules.map
      });
    }

    function doStartApp()
    {
      if (startBroker !== null)
      {
        startBroker.destroy();
        startBroker = null;
      }

      broker.subscribe('socket.connected', function()
      {
        window.location.reload(true);
      });

      broker.subscribe('i18n.reloaded', function(message)
      {
        localStorage.setItem('LOCALE', message.newLocale);
        viewport.render();
      });

      domReady(function()
      {
        $('#app-loading').fadeOut(function() { $(this).remove(); });

        hotkeys.start();

        Backbone.history.start({
          root: '/',
          hashChange: true,
          pushState: false
        });
      });
    }
  }

  function requireApp()
  {
    require([
      'domReady',
      'jquery',
      'backbone',
      'backbone.layout',
      'moment',
      'app/broker',
      'app/i18n',
      'app/socket',
      'app/pubsub',
      'app/router',
      'app/viewport',
      'app/data/loadedModules',
      'app/core/layouts/PageLayout',
      'app/core/views/NavbarView',
      'app/data/currentState',
      'app/data/settings',
      'app/data/hotkeys',
      'app/updater/index',
      'app/backdrop',
      'app/time',
      'app/routes',
      'bootstrap',
      'moment-lang/pl',
      'i18n!app/nls/core'
    ], startApp);
  }

  if (!navigator.onLine || !document.getElementsByTagName('html')[0].hasAttribute('manifest'))
  {
    return requireApp();
  }

  var appCache = window.applicationCache;
  var reload = location.reload.bind(location);
  var reloadTimer = setTimeout(reload, 60000);

  function doStartApp()
  {
    clearTimeout(reloadTimer);
    reloadTimer = null;

    appCache.onnoupdate = null;
    appCache.oncached = null;
    appCache.onerror = null;
    appCache.onobsolete = null;
    appCache.onupdateready = null;

    requireApp();
  }

  appCache.onnoupdate = doStartApp;
  appCache.oncached = doStartApp;
  appCache.onerror = doStartApp;
  appCache.onobsolete = reload;
  appCache.onupdateready = reload;

  function monkeyPatch(Backbone, $)
  {
    var originalSync = Backbone.sync;

    Backbone.sync = function(method, model, options)
    {
      options.syncMethod = method;

      return originalSync.call(this, method, model, options);
    };

    $.fn.modal.Constructor.prototype.enforceFocus = function() {};
  }
})();
