// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/time',
  'app/core/views/ListView',
  'app/xiconfPrograms/util/buildStepLabels'
], function(
  t,
  time,
  ListView,
  buildStepLabels
) {
  'use strict';

  return ListView.extend({

    className: 'is-colored is-clickable',

    remoteTopics: {
      'history.orderUpdated': 'refreshCollection',
      'programmer.finished': 'refreshCollection',
      'programmer.resultToggled': 'refreshCollection'
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
      {id: 'programName', className: 'is-min'},
      'programSteps'
    ],

    serializeActions: function()
    {
      return null;
    },

    serializeRow: function(model)
    {
      var order = model.get('order');
      var program = model.get('program');
      var className = ['history-entry', model.get('result') === 'success' ? 'success' : 'danger'];

      if (model.get('cancelled'))
      {
        className.push('is-cancelled');
      }

      return {
        _id: model.id,
        className: className.join(' '),
        serviceTag: model.get('serviceTag') || '-',
        order: order ? order.no : '-',
        programName: model.getProgramName() || '-',
        programSteps: program ? buildStepLabels(program.steps, model.get('steps')) : '-',
        nc12: model.get('nc12') || '-',
        counter: model.get('counter'),
        quantity: order ? order.quantity : '-',
        startedAt: time.format(model.get('startedAt'), 'YYYY-MM-DD, HH:mm:ss.SSS'),
        duration: time.toString(model.get('duration') / 1000, false, true)
      };
    }

  });
});
