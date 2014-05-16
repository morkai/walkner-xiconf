// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'moment',
  '../core/Collection',
  './HistoryEntry'
], function(
  moment,
  Collection,
  HistoryEntry
) {
  'use strict';

  return Collection.extend({

    model: HistoryEntry,

    rqlQuery: function(rql)
    {
      var sevenDaysAgo = moment()
        .hours(6)
        .minutes(0)
        .seconds(0)
        .milliseconds(0)
        .subtract('days', 7)
        .valueOf();

      return rql.Query.fromObject({
        fields: {
          _id: 1,
          _order: 1,
          nc12: 1,
          featureFileName: 1,
          no: 1,
          quantity: 1,
          counter: 1,
          result: 1,
          startedAt: 1,
          duration: 1
        },
        sort: {
          startedAt: -1
        },
        limit: 20,
        selector: {
          name: 'and',
          args: [
            {name: 'ge', args: ['startedAt', sevenDaysAgo]}
          ]
        }
      });
    }

  });
});
