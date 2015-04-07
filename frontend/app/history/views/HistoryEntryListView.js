// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/i18n',
  'app/time',
  'app/core/views/ListView'
], function(
  t,
  time,
  ListView
) {
  'use strict';

  return ListView.extend({

    className: 'is-colored is-clickable',

    remoteTopics: {
      'history.orderUpdated': 'refreshCollection',
      'programmer.finished': 'refreshCollection'
    },

    events: {
      'click tr': function(e)
      {
        var model = this.collection.get(e.currentTarget.dataset.id);

        if (!model || window.getSelection().toString() !== '')
        {
          return;
        }

        this.broker.publish('router.navigate', {
          url: model.genClientUrl(),
          trigger: true,
          replace: false
        });
      }
    },

    columns: [
      {id: 'serviceTag', className: 'is-min'},
      {id: 'order', className: 'is-min'},
      {id: 'nc12', className: 'is-min'},
      {id: 'counter', className: 'is-min'},
      {id: 'quantity', className: 'is-min'},
      {id: 'startedAt', className: 'is-min'},
      {id: 'duration', className: 'is-min'},
      'programName'
    ],

    serializeActions: function()
    {
      return null;
    },

    serializeRow: function(model)
    {
      var order = model.get('order');

      return {
        _id: model.id,
        className: 'history-entry ' + (model.get('result') === 'success' ? 'success' : 'danger'),
        serviceTag: model.get('serviceTag'),
        order: order ? order.no : null,
        programName: model.getProgramName(),
        nc12: model.get('nc12') || null,
        counter: model.get('counter'),
        quantity: order ? order.quantity : null,
        startedAt: time.format(model.get('startedAt'), 'YYYY-MM-DD, HH:mm:ss.SSS'),
        duration: time.toString(model.get('duration') / 1000, false, true)
      };
    }

  });
});
