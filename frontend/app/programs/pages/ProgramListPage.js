// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/viewport',
  'app/core/pages/FilteredListPage',
  '../views/ProgramListView',
  '../views/ProgramFilterView'
], function(
  t,
  viewport,
  FilteredListPage,
  ProgramListView,
  ProgramFilterView
) {
  'use strict';

  return FilteredListPage.extend({

    FilterView: ProgramFilterView,

    ListView: ProgramListView,

    actions: function()
    {
      var actions = FilteredListPage.prototype.actions.call(this);

      actions.unshift({
        icon: 'refresh',
        label: t('programs', 'PAGE_ACTION:sync'),
        callback: this.onSyncActionClick.bind(this)
      });

      return actions;
    },

    onSyncActionClick: function(e)
    {
      var btnEl = e.currentTarget.querySelector('.btn');

      btnEl.disabled = true;

      var req = this.ajax({
        type: 'POST',
        url: '/programs;sync'
      });

      req.done(function(res)
      {
        viewport.msg.show({
          type: res.type,
          time: 3000,
          text: t('programs', 'sync:' + res.text)
        });
      });

      req.fail(function()
      {
        viewport.msg.show({
          type: 'error',
          time: 3000,
          text: t('programs', 'sync:failure')
        });
      });

      req.always(function()
      {
        btnEl.disabled = false;
      });
    }

  });
});
