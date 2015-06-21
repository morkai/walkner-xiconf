// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/user',
  'app/core/util/pageActions',
  'app/core/pages/DetailsPage',
  '../views/XiconfProgramDetailsView'
], function(
  t,
  user,
  pageActions,
  DetailsPage,
  XiconfProgramDetailsView
) {
  'use strict';

  return DetailsPage.extend({

    DetailsView: XiconfProgramDetailsView,

    actions: function()
    {
      var page = this;
      var actions = [{
        label: t.bound(this.model.getNlsDomain(), 'PAGE_ACTION:toggle'),
        icon: 'info-circle',
        callback: function()
        {
          page.view.toggleSteps();

          return false;
        }
      }];

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
