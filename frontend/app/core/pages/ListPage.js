// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  '../util/bindLoadingMessage',
  '../util/pageActions',
  '../View',
  '../views/ListView'
], function(
  t,
  bindLoadingMessage,
  pageActions,
  View,
  ListView
) {
  'use strict';

  return View.extend({

    layoutName: 'page',

    pageId: 'list',

    breadcrumbs: function()
    {
      return [
        t.bound(this.collection.getNlsDomain(), 'BREADCRUMBS:browse')
      ];
    },

    actions: function()
    {
      return [
        pageActions.add(this.collection, this.collection.getPrivilegePrefix() + ':MANAGE')
      ];
    },

    initialize: function()
    {
      this.collection = bindLoadingMessage(this.options.collection, this);

      var ListViewClass = this.options.ListView || ListView;

      this.view = new ListViewClass({
        collection: this.collection,
        columns: this.options.columns || ListViewClass.prototype.columns,
        serializeRow: this.options.serializeRow || ListViewClass.prototype.serializeRow,
        className: this.options.listClassName || ListViewClass.prototype.className || 'is-clickable'
      });
    },

    load: function(when)
    {
      return when(this.collection.fetch({reset: true}));
    }

  });
});
