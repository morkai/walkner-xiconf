// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
