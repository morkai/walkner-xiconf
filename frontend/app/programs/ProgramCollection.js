// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  '../core/Collection',
    './Program'
], function(
  Collection,
  Program
) {
  'use strict';

  return Collection.extend({

    model: Program,

    rqlQuery: 'limit(15)',

    sortNaturally: function()
    {
      this.models.forEach(function(program)
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
    }

  });
});
