// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/broker',
  'app/router',
  'app/viewport',
  './pages/SettingsFormPage',
  'i18n!app/nls/settings'
], function(
  broker,
  router,
  viewport,
  SettingsFormPage
) {
  'use strict';

  broker.subscribe('hotkeys.showSettingsPage', function()
  {
    broker.publish('router.navigate', {
      url: '/settings',
      trigger: true,
      replace: false
    });
  });

  router.map('/settings', function(req)
  {
    viewport.showPage(new SettingsFormPage({tab: req.query.tab}));
  });
});
