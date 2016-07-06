// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
        .subtract(7, 'days')
        .valueOf();

      return rql.Query.fromObject({
        fields: {
          _id: 1,
          _order: 1,
          serviceTag: 1,
          nc12: 1,
          featureFileName: 1,
          program: 1,
          steps: 1,
          no: 1,
          quantity: 1,
          counter: 1,
          result: 1,
          startedAt: 1,
          duration: 1,
          cancelled: 1
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
