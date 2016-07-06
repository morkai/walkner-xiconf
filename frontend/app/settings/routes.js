// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
