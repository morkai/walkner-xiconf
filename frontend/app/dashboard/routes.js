// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/broker',
  'app/router',
  'app/viewport',
  './pages/DashboardPage',
  'i18n!app/nls/dashboard'
], function(
  broker,
  router,
  viewport,
  DashboardPage
) {
  'use strict';

  broker.subscribe('hotkeys.showDashboardPage', function()
  {
    broker.publish('router.navigate', {
      url: '/',
      trigger: true,
      replace: false
    });
  });

  router.map('/', function()
  {
    viewport.showPage(new DashboardPage());
  });
});
