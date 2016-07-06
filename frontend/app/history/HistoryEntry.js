// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  '../socket',
  '../data/settings',
  '../core/Model',
  './util/decorateLogEntry'
], function(
  _,
  socket,
  settings,
  Model,
  decorateLogEntry
) {
  'use strict';

  return Model.extend({

    urlRoot: '/history',

    clientUrlRoot: '#history',

    topicPrefix: 'history',

    nlsDomain: 'history',

    parse: function(data)
    {
      data.order = !data._order ? null : {
        _id: data._order,
        no: data.no,
        quantity: data.quantity,
        successCounter: data.successCounter,
        failureCounter: data.failureCounter,
        startedAt: data.orderStartedAt,
        finishedAt: data.orderFinishedAt,
        duration: data.orderDuration
      };

      delete data._order;
      delete data.no;
      delete data.quantity;
      delete data.successCounter;
      delete data.failureCounter;
      delete data.orderStartedAt;
      delete data.orderFinishedAt;
      delete data.orderDuration;

      ['hidLamps', 'leds', 'program', 'steps'].forEach(function(p)
      {
        if (typeof data[p] === 'string')
        {
          data[p] = JSON.parse(data[p]);
        }
      });

      return data;
    },

    getProgramId: function()
    {
      var program = this.get('program');

      return program ? program._id : null;
    },

    getProgramName: function()
    {
      var program = this.get('program');

      if (program)
      {
        return program.name;
      }

      var featureFileName = this.get('featureFileName');

      if (typeof featureFileName !== 'string')
      {
        return null;
      }

      var nc12 = this.get('nc12');

      featureFileName = featureFileName.replace(/\.([a-z]+)$/i, '');

      if (typeof nc12 !== 'string')
      {
        return featureFileName;
      }

      featureFileName = featureFileName
        .replace(nc12, '')
        .trim()
        .replace(/^[-_ ]+/g, '')
        .replace(/[-_ ]+$/g, '')
        .replace(/^PROGRAM/i, '');

      return featureFileName === '' ? null : featureFileName;
    },

    isInProgress: function()
    {
      return this.get('inProgress');
    },

    isProgrammingMode: function()
    {
      return this.get('workMode') === 'programming';
    },

    isTestingMode: function()
    {
      return this.get('workMode') === 'testing';
    },

    isLocalInput: function()
    {
      return this.get('inputMode') === 'local';
    },

    isRemoteInput: function()
    {
      return this.get('inputMode') === 'remote';
    },

    isNoProgramming: function()
    {
      return this.isRemoteInput() && settings.get('programming') === 0;
    },

    isFtActive: function()
    {
      if (!settings.get('ftEnabled'))
      {
        return false;
      }

      if (!this.isRemoteInput())
      {
        // TODO ???
        return true;
      }

      var remoteData = this.getSelectedRemoteData();

      if (!remoteData)
      {
        return false;
      }

      return settings.isFtOrder(remoteData.name);
    },

    isHidActive: function()
    {
      if (!settings.get('hidEnabled'))
      {
        return false;
      }

      if (!this.isRemoteInput())
      {
        return false;
      }

      var remoteData = this.getSelectedRemoteData();

      if (!remoteData)
      {
        return false;
      }

      return _.some(remoteData.items, function(item) { return item.kind === 'hid'; });
    },

    hasOrder: function()
    {
      return this.get('order') !== null;
    },

    hasProgram: function()
    {
      return !!this.get('program');
    },

    hasProgramStep: function(type)
    {
      var program = this.get('program');

      if (!program)
      {
        return false;
      }

      for (var i = 0; i < program.steps.length; ++i)
      {
        var step = program.steps[i];

        if (step.enabled && step.type === type)
        {
          return true;
        }
      }

      return false;
    },

    getActiveProgramStep: function()
    {
      var steps = this.get('steps');

      if (!Array.isArray(steps))
      {
        return false;
      }

      for (var i = 0; i < steps.length; ++i)
      {
        if (steps[i].status === 'active')
        {
          return this.get('program').steps[i];
        }
      }

      return null;
    },

    isOrderFinished: function()
    {
      if (this.isRemoteInput())
      {
        var remoteData = this.getSelectedRemoteData();

        return remoteData && remoteData.status !== -1;
      }

      var order = this.get('order');

      return order && order.successCounter >= order.quantity;
    },

    getSelectedRemoteData: function()
    {
      var remoteData = this.get('remoteData');

      if (!Array.isArray(remoteData) || !remoteData.length)
      {
        return null;
      }

      var selectedOrderNo = this.get('selectedOrderNo');

      if (!selectedOrderNo)
      {
        return null;
      }

      var selectedRemoteData = _.findWhere(remoteData, {_id: selectedOrderNo});

      if (!selectedRemoteData)
      {
        return null;
      }

      return selectedRemoteData;
    },

    getNextOrderNo: function()
    {
      var remoteData = this.get('remoteData');

      if (!Array.isArray(remoteData) || !remoteData.length)
      {
        return null;
      }

      for (var i = remoteData.length - 1; i >= 0; --i)
      {
        var orderData = remoteData[i];

        if (orderData.status === -1)
        {
          return orderData._id;
        }
      }

      return remoteData[0]._id;
    },

    getCarouselItemId: function()
    {
      var result = this.get('result');

      return result === 'success' || result === 'failure' ? result : 'program';
    },

    updateHidLamp: function(index, data)
    {
      var hidLamps = this.get('hidLamps');

      if (!Array.isArray(hidLamps) || !hidLamps[index])
      {
        return;
      }

      hidLamps[index] = data;

      this.trigger('change:hidLamp', index, data);
    },

    updateLed: function(index, data)
    {
      var leds = this.get('leds');

      if (!Array.isArray(leds) || !leds[index])
      {
        return;
      }

      leds[index] = data;

      this.trigger('change:led', index, data);
    },

    pushLogEntry: function(logEntry)
    {
      var log = this.get('log');

      if (Array.isArray(log))
      {
        log.push(logEntry);

        this.trigger('push:log', logEntry);
      }
    },

    getDecoratedLog: function()
    {
      var log = this.get('log');

      if (typeof log === 'string')
      {
        log = JSON.parse(log);
      }

      return Array.isArray(log) ? log.map(decorateLogEntry) : [];
    },

    hasFeatureData: function()
    {
      var feature = this.get('feature');

      return typeof feature === 'string' && feature.length !== 0;
    }

  });
});
