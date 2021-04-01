// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/user',
  'app/viewport',
  'app/core/util/pageActions',
  'app/core/util/embedded',
  'app/core/pages/FilteredListPage',
  '../views/XiconfProgramListView',
  '../views/XiconfProgramFilterView'
], function(
  t,
  user,
  viewport,
  pageActions,
  embedded,
  FilteredListPage,
  XiconfProgramListView,
  XiconfProgramFilterView
) {
  'use strict';

  return FilteredListPage.extend({

    FilterView: XiconfProgramFilterView,

    ListView: XiconfProgramListView,

    actions: function()
    {
      var actions = [];

      if (user.isLocal())
      {
        actions.push({
          label: t.bound('xiconfPrograms', 'PAGE_ACTION:add'),
          icon: 'plus',
          href: this.collection.genClientUrl('add')
        });
      }

      actions.unshift({
        icon: 'refresh',
        label: t.bound('xiconfPrograms', 'PAGE_ACTION:sync'),
        callback: this.onSyncActionClick.bind(this)
      });

      return actions;
    },

    afterRender: function()
    {
      embedded.render(this);
    },

    onSyncActionClick: function(e)
    {
      var btnEl = e.currentTarget.querySelector('.btn');

      btnEl.disabled = true;

      var req = this.ajax({
        type: 'POST',
        url: '/xiconf/programs;sync'
      });

      req.done(function(res)
      {
        viewport.msg.show({
          type: res.type,
          time: 3000,
          text: t('xiconfPrograms', 'sync:' + res.text)
        });
      });

      req.fail(function()
      {
        viewport.msg.show({
          type: 'error',
          time: 3000,
          text: t('xiconfPrograms', 'sync:failure')
        });
      });

      req.always(function()
      {
        btnEl.disabled = false;
      });
    }

  });
});
