// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/core/util/bindLoadingMessage',
  'app/core/View',
  '../HistoryEntry',
  '../views/HistoryEntryDetailsView',
  'app/history/templates/downloadAction'
], function(
  t,
  bindLoadingMessage,
  View,
  HistoryEntry,
  HistoryEntryDetailsView,
  downloadActionTemplate
) {
  'use strict';

  return View.extend({

    layoutName: 'page',

    pageId: 'historyEntryDetails',

    breadcrumbs: function()
    {
      return [
        {
          label: t.bound('history', 'BREADCRUMBS:browse'),
          href: this.model.genClientUrl('base')
        },
        t.bound('history', 'BREADCRUMBS:details')
      ];
    },

    actions: function()
    {
      var model = this.model;
      var workflow = model.get('workflow');
      var feature = model.get('feature');
      var gprsOrderFile = model.get('gprsOrderFile');
      var gprsInputFile = model.get('gprsInputFile');
      var gprsOutputFile = model.get('gprsOutputFile');
      var url = model.url() + ';';

      return [{
        template: function()
        {
          return downloadActionTemplate({
            files: {
              gprsOrderFile: gprsOrderFile && gprsOrderFile.length ? (url + 'gprsOrder') : null,
              workflow: workflow && workflow.length ? (url + 'workflow') : null,
              feature: feature && feature.length ? (url + 'feature') : null,
              gprsInputFile: gprsInputFile && gprsInputFile.length ? (url + 'gprsInput') : null,
              gprsOutputFile: gprsOutputFile && gprsOutputFile.length ? (url + 'gprsOutput') : null
            }
          });
        }
      }];
    },

    remoteTopics: {
      'history.orderUpdated': function(changes)
      {
        var order = this.model.get('order');

        if (order && changes._id === order._id)
        {
          this.model.set('order', changes);
        }
      }
    },

    initialize: function()
    {
      this.model = bindLoadingMessage(new HistoryEntry({_id: this.options.modelId}), this);

      this.view = new HistoryEntryDetailsView({
        model: this.model,
        tab: this.options.tab
      });
    },

    load: function(when)
    {
      return when(this.model.fetch());
    }

  });
});
