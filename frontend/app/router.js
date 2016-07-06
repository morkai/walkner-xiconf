// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'backbone',
  'app/broker',
  'app/viewport',
  'app/core/Router',
  'app/core/pages/ErrorPage'
], function(
  Backbone,
  broker,
  viewport,
  Router,
  ErrorPage
) {
  'use strict';

  // Disable Backbone's decodeURIComponent
  Backbone.Router.prototype._extractParameters = function(route, fragment)
  {
    return route.exec(fragment).slice(1);
  };

  var router = new Router(broker);
  var backboneRouter = new Backbone.Router();

  backboneRouter.route('*catchall', 'catchall', function(url)
  {
    router.dispatch(url);
  });

  broker.subscribe('router.navigate', function(message)
  {
    var url = message.url;
    var firstChar = url.charAt(0);

    if (firstChar === '#' || firstChar === '/')
    {
      url = url.substr(1);
    }

    backboneRouter.navigate(url, {
      trigger: message.trigger === true,
      replace: message.replace === true
    });
  });

  var notFoundUrl = '/404';

  broker.subscribe('router.404', function(req)
  {
    if (req.path === notFoundUrl)
    {
      viewport.showPage(new ErrorPage({code: 404, req: req}));
    }
    else
    {
      router.dispatch(notFoundUrl);
    }
  });

  window.router = router;

  return router;
});
