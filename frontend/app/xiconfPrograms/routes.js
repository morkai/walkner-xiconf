// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  '../broker',
  '../router',
  '../viewport',
  '../core/util/showDeleteFormPage',
  '../core/pages/AddFormPage',
  '../core/pages/EditFormPage',
  './XiconfProgram',
  './XiconfProgramCollection',
  './pages/XiconfProgramListPage',
  './pages/XiconfProgramDetailsPage',
  './views/XiconfProgramFormView',
  'i18n!app/nls/xiconfPrograms'
], function(
  broker,
  router,
  viewport,
  showDeleteFormPage,
  AddFormPage,
  EditFormPage,
  XiconfProgram,
  XiconfProgramCollection,
  XiconfProgramListPage,
  XiconfProgramDetailsPage,
  XiconfProgramFormView
) {
  'use strict';

  broker.subscribe('hotkeys.showProgramsPage', function()
  {
    broker.publish('router.navigate', {
      url: '/xiconf/programs',
      trigger: true,
      replace: false
    });
  });

  router.map('/xiconf/programs', function(req)
  {
    viewport.showPage(new XiconfProgramListPage({
      collection: new XiconfProgramCollection(null, {
        rqlQuery: req.rql
      })
    }));
  });

  router.map('/xiconf/programs/:id', function(req)
  {
    viewport.showPage(new XiconfProgramDetailsPage({
      model: new XiconfProgram({_id: req.params.id})
    }));
  });

  router.map('/xiconf/programs;add', function()
  {
    viewport.showPage(new AddFormPage({
      FormView: XiconfProgramFormView,
      model: new XiconfProgram()
    }));
  });

  router.map('/xiconf/programs/:id;edit', function(req)
  {
    viewport.showPage(new EditFormPage({
      FormView: XiconfProgramFormView,
      model: new XiconfProgram({_id: req.params.id})
    }));
  });

  router.map('/xiconf/programs/:id;delete', showDeleteFormPage.bind(null, XiconfProgram));
});
