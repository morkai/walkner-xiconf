// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/broker',
  'app/router',
  'app/viewport',
  './pages/HistoryEntryListPage',
  './pages/HistoryEntryDetailsPage',
  'i18n!app/nls/history'
], function(
  broker,
  router,
  viewport,
  HistoryEntryListPage,
  HistoryEntryDetailsPage
) {
  'use strict';

  broker.subscribe('hotkeys.showHistoryPage', function()
  {
    broker.publish('router.navigate', {
      url: '/history',
      trigger: true,
      replace: false
    });
  });

  router.map('/history', function(req)
  {
    viewport.showPage(new HistoryEntryListPage({rql: req.rql}));
  });

  router.map('/history/:id', function(req)
  {
    viewport.showPage(new HistoryEntryDetailsPage({
      modelId: req.params.id,
      tab: req.query.tab
    }));
  });
});
