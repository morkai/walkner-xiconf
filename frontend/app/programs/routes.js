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
  './Program',
  './ProgramCollection',
  './pages/ProgramListPage',
  './pages/ProgramDetailsPage',
  './views/ProgramFormView',
  'i18n!app/nls/programs'
], function(broker,
  router,
  viewport,
  showDeleteFormPage,
  AddFormPage,
  EditFormPage,
  Program,
  ProgramCollection,
  ProgramListPage,
  ProgramDetailsPage,
  ProgramFormView
) {
  'use strict';

  broker.subscribe('hotkeys.showProgramsPage', function()
  {
    broker.publish('router.navigate', {
      url: '/programs',
      trigger: true,
      replace: false
    });
  });

  router.map('/programs', function(req)
  {
    viewport.showPage(new ProgramListPage({
      collection: new ProgramCollection(null, {
        rqlQuery: req.rql
      })
    }));
  });

  router.map('/programs/:id', function(req)
  {
    viewport.showPage(new ProgramDetailsPage({
      model: new Program({_id: req.params.id})
    }));
  });

  router.map('/programs;add', function()
  {
    viewport.showPage(new AddFormPage({
      FormView: ProgramFormView,
      model: new Program()
    }));
  });

  router.map('/programs/:id;edit', function(req)
  {
    viewport.showPage(new EditFormPage({
      FormView: ProgramFormView,
      model: new Program({_id: req.params.id})
    }));
  });

  router.map('/programs/:id;delete', showDeleteFormPage.bind(null, Program));
});
