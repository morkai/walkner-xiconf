// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/user',
  'app/core/util/pageActions',
  'app/core/util/embedded',
  'app/core/pages/DetailsPage',
  '../views/XiconfProgramDetailsView'
], function(
  t,
  user,
  pageActions,
  embedded,
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
    },

    afterRender: function()
    {
      embedded.render(this);
    }

  });
});
