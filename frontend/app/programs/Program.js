// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  '../time',
  '../core/Model'
], function(
  time,
  Model
) {
  'use strict';

  return Model.extend({

    urlRoot: '/programs',

    clientUrlRoot: '#programs',

    topicPrefix: 'programs',

    nlsDomain: 'programs',

    labelAttribute: 'name',

    defaults: function()
    {
      return {
        type: 't24vdc',
        name: '',
        steps: [
          {
            type: 'pe',
            enabled: 1,
            startTime: 2,
            duration: 3,
            voltage: 10,
            resistanceMax: 0.1
          },
          {
            type: 'sol',
            enabled: 1,
            voltage: 12
          },
          {
            type: 'fn',
            enabled: 1,
            startTime: 2,
            duration: 28,
            voltage: 12,
            powerReq: 100,
            powerRel: 5,
            powerMin: 95,
            powerMax: 105
          }
        ]
      };
    },

    serialize: function()
    {
      var obj = this.toJSON();

      obj.createdAt = time.format(obj.createdAt, 'LLLL');
      obj.updatedAt = time.format(obj.updatedAt, 'LLLL');

      return obj;
    }

  });
});
