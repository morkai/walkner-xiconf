// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-wmes project <http://lukasz.walukiewicz.eu/p/walkner-wmes>

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

    remoteTopics: {
      'history.orderUpdated': 'refreshCollection',
      'programmer.finished': 'refreshCollection'
    },

    events: {
      'click tr': function(e)
      {
        this.broker.publish('router.navigate', {
          url: this.collection.get(e.currentTarget.dataset.id).genClientUrl(),
          trigger: true,
          replace: false
        });
      }
    },

    columns: ['order', 'nc12', 'programName', 'counter', 'quantity', 'startedAt', 'duration'],

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
        order: order ? order.no : null,
        programName: model.getProgramName(),
        nc12: model.get('nc12'),
        counter: model.get('counter'),
        quantity: order ? order.quantity : null,
        startedAt: time.format(model.get('startedAt'), 'YYYY-MM-DD, HH:mm:ss.SSS'),
        duration: time.toString(model.get('duration') / 1000, false, true)
      };
    }

  });
});
