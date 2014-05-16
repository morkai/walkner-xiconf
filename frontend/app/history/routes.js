// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
