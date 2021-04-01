// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/core/util/bindLoadingMessage',
  'app/core/util/pageActions',
  'app/core/util/embedded',
  'app/core/View',
  '../HistoryEntryCollection',
  '../views/HistoryEntryListView',
  '../views/HistoryEntryFilterView',
  'app/history/templates/listPage'
], function(
  t,
  bindLoadingMessage,
  pageActions,
  embedded,
  View,
  HistoryEntryCollection,
  HistoryEntryListView,
  HistoryEntryFilterView,
  listPageTemplate
) {
  'use strict';

  return View.extend({

    template: listPageTemplate,

    layoutName: 'page',

    pageId: 'historyEntryList',

    breadcrumbs: [
      t.bound('history', 'BREADCRUMBS:browse')
    ],

    actions: function(layout)
    {
      return [pageActions.export(layout, this, this.collection, null)];
    },

    initialize: function()
    {
      this.defineModels();
      this.defineViews();

      this.setView('.filter-container', this.filterView);
      this.setView('.list-container', this.listView);
    },

    defineModels: function()
    {
      this.collection = bindLoadingMessage(
        new HistoryEntryCollection(null, {rqlQuery: this.options.rql}), this
      );
    },

    defineViews: function()
    {
      this.listView = new HistoryEntryListView({collection: this.collection});

      this.filterView = new HistoryEntryFilterView({
        model: {
          rqlQuery: this.collection.rqlQuery
        }
      });

      this.listenTo(this.filterView, 'filterChanged', this.refreshList);
    },

    load: function(when)
    {
      return when(this.collection.fetch({reset: true}));
    },

    afterRender: function()
    {
      embedded.render(this);
    },

    refreshList: function(newRqlQuery)
    {
      this.collection.rqlQuery = newRqlQuery;

      this.listView.refreshCollectionNow();

      this.broker.publish('router.navigate', {
        url: this.collection.genClientUrl() + '?' + newRqlQuery,
        trigger: false,
        replace: true
      });
    }

  });
});
