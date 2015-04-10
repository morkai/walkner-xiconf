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
        steps: []
      };
    },

    parse: function(obj)
    {
      if (typeof obj.steps === 'string')
      {
        obj.steps = JSON.parse(obj.steps);
      }

      return obj;
    },

    serialize: function()
    {
      var obj = this.toJSON();

      obj.createdAt = time.format(obj.createdAt, 'LLLL');
      obj.updatedAt = time.format(obj.updatedAt, 'LLLL');

      return obj;
    }

  }, {

    PROGRAM_TYPES: ['t24vdc'],
    STEP_TYPES: ['wait', 'pe', 'sol', 'fn']

  });
});
