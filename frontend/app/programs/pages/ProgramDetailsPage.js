// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/user',
  'app/core/util/pageActions',
  'app/core/pages/DetailsPage',
  '../views/ProgramDetailsView'
], function(
  user,
  pageActions,
  DetailsPage,
  ProgramDetailsView
) {
  'use strict';

  return DetailsPage.extend({

    DetailsView: ProgramDetailsView,

    actions: function()
    {
      var actions = [];

      if (user.isLocal())
      {
        actions.push(
          pageActions.edit(this.model, false),
          pageActions.delete(this.model, false)
        );
      }

      return actions;
    }

  });
});
