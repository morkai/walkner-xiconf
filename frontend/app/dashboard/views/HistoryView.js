// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
      },
      'programmer.resultToggled': function(message)
      {
        var model = this.collection.get(message.resultId);

        if (model)
        {
          model.set('cancelled', message.cancelled);
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
      },
      'click .dashboard-history-serviceTag': function(e)
      {
        var serviceTag = e.currentTarget.innerText.trim();

        if (serviceTag === '')
        {
          return;
        }

        this.broker.publish('serviceTagPrintRequested', {serviceTag: serviceTag});

        return false;
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
      this.listenTo(this.collection, 'change:cancelled', this.onResultToggled);
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
        serviceTag: model.get('serviceTag') || '&nbsp;',
        nc12: model.get('nc12'),
        programName: model.getProgramName() || '&nbsp;',
        cancelled: model.get('cancelled') === 1
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
    },

    onResultToggled: function(model, cancelled)
    {
      this.$('[data-id="' + model.id + '"]').toggleClass('is-cancelled', cancelled === 1);
    }

  });
});
