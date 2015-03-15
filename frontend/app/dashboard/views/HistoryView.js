// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'app/time',
  'app/core/View',
  'app/data/settings',
  'app/dashboard/templates/history',
  'app/dashboard/templates/historyEntry'
], function(
  _,
  time,
  View,
  settings,
  historyTemplate,
  historyEntryTemplate
) {
  'use strict';

  return View.extend({

    template: historyTemplate,

    remoteTopics: {
      'programmer.finished': function(historyEntry)
      {
        this.collection.add(historyEntry, {at: 0});

        if (this.collection.length > 50)
        {
          this.collection.pop();
        }
      }
    },

    localTopics: {
      'hotkeys.focusHistory': function()
      {
        this.$('a.list-group-item:first-child').focus();
      }
    },

    events: {
      'keydown .list-group-item': function(e)
      {
        var el = e.target;

        if (e.which === 38)
        {
          e.preventDefault();

          if (el.previousElementSibling)
          {
            el.previousElementSibling.focus();
          }
          else
          {
            el.parentNode.lastElementChild.focus();
          }
        }
        else if (e.which === 40)
        {
          e.preventDefault();

          if (el.nextElementSibling)
          {
            el.nextElementSibling.focus();
          }
          else
          {
            el.parentNode.firstElementChild.focus();
          }
        }
      }
    },

    initialize: function()
    {
      this.firstRender = true;

      this.listenTo(this.collection, 'request', this.onCollectionRequest);
      this.listenTo(this.collection, 'error', this.onCollectionError);
      this.listenTo(this.collection, 'reset', this.render);
      this.listenTo(this.collection, 'add', this.onCollectionAdd);
      this.listenTo(this.collection, 'remove', this.onCollectionRemove);
      this.listenTo(settings, 'change:title', this.onTitleChange);
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        renderHistoryEntry: historyEntryTemplate,
        models: this.collection.map(this.serializeModel, this)
      };
    },

    serializeModel: function(model)
    {
      var order = model.get('order');

      return {
        _id: model.id,
        href: model.genClientUrl(),
        className: model.get('result') === 'success' ? 'success' : 'danger',
        time: time.format(model.get('finishedAt'), 'HH:mm:ss'),
        orderNo: order ? order.no : '&nbsp;',
        quantity: order ? (model.get('counter') + '/' + order.quantity) : '&nbsp;',
        nc12: model.get('nc12'),
        programName: model.getProgramName() || '&nbsp;'
      };
    },

    afterRender: function()
    {
      if (this.firstRender)
      {
        this.collection.url = '/history;recent';

        this.promised(this.collection.fetch({reset: true}));
      }

      this.firstRender = false;

      this.onTitleChange();
    },

    onCollectionRequest: function()
    {
      this.$('.list-group').html('<i class="fa fa-spinner fa-spin"></i>');
    },

    onCollectionError: function()
    {
      this.$('.fa-spinner').removeClass('fa-spin').addClass('is-error');
    },

    onCollectionAdd: function(model)
    {
      this.$('.list-group').prepend(historyEntryTemplate(this.serializeModel(model)));
    },

    onCollectionRemove: function()
    {
      this.$('.list-group-item:last-child').remove();
    },

    onTitleChange: function()
    {
      var title = settings.get('title');

      if (typeof title === 'string' && title.length)
      {
        this.$id('title').text(title).show();
      }
      else
      {
        this.$id('title').hide();
      }
    }

  });
});
