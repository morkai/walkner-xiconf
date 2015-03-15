// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  '../socket',
  '../core/Model',
  './util/decorateLogEntry'
], function(
  _,
  socket,
  Model,
  decorateLogEntry
) {
  'use strict';

  return Model.extend({

    urlRoot: '/history',

    clientUrlRoot: '#history',

    topicPrefix: 'history',

    nlsDomain: 'history',

    defaults: {

    },

    initialize: function()
    {

    },

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

      return data;
    },

    getProgramName: function()
    {
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

    hasOrder: function()
    {
      return this.get('order') !== null;
    },

    isOrderFinished: function()
    {
      if (this.isRemoteInput())
      {
        var remoteData = this.get('remoteData');

        return remoteData && remoteData.nc12 && remoteData.nc12.length && _.all(remoteData.nc12, function(nc12)
        {
          return nc12.quantityDone >= nc12.quantityTodo;
        });
      }

      var order = this.get('order');

      return order && order.successCounter >= order.quantity;
    },

    getCarouselItemId: function()
    {
      var result = this.get('result');

      return result === 'success' || result === 'failure' ? result : 'program';
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
