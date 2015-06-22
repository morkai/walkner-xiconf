// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  '../core/Collection',
  './XiconfProgram'
], function(
  _,
  Collection,
  XiconfProgram
) {
  'use strict';

  return Collection.extend({

    model: XiconfProgram,

    rqlQuery: 'limit(15)',

    sortNaturally: function()
    {
      _.forEach(this.models, function(program)
      {
        program.attributes.name$ = program.attributes.name
          .trim()
          .toLowerCase()
          .split(/(-?\d*\.?\d+)/g)
          .map(function(part)
          {
            var num = parseFloat(part);

            return isNaN(num) ? part : num;
          });
      });

      this.models.sort(function(a, b)
      {
        a = a.attributes.name$;
        b = b.attributes.name$;

        for (var i = 0, l = Math.min(a.length, b.length); i < l; ++i)
        {
          if (a[i] < b[i])
          {
            return -1;
          }
          else if (a[i] > b[i])
          {
            return 1;
          }
        }

        return 0;
      });

      return this;
    },

    filterByProdLine: function(prodLineId)
    {
      if (!_.isString(prodLineId) || _.isEmpty(prodLineId))
      {
        return this.toJSON();
      }

      var programs = [];

      _.forEach(this.models, function(program)
      {
        var prodLines = program.get('prodLines');

        if (_.isEmpty(prodLines))
        {
          programs.push(program.toJSON());

          return;
        }

        var patterns = prodLines.split(';');

        for (var i = 0; i < patterns.length; ++i)
        {
          var pattern = new RegExp('^' + patterns[i].trim().replace(/\*/g, '.*?') + '$', 'i');

          if (pattern.test(prodLineId))
          {
            programs.push(program.toJSON());

            return;
          }
        }
      });

      return programs;
    }

  });
});
