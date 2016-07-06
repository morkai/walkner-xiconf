// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/core/views/ListView'
], function(
  t,
  ListView
) {
  'use strict';

  return ListView.extend({

    className: 'xiconfPrograms-list is-clickable',

    columns: [
      {id: 'name', className: 'is-min'},
      {id: 'prodLines', className: 'is-min'},
      {id: 'programType', label: t.bound('xiconfPrograms', 'PROPERTY:type'), className: 'is-min'},
      'steps',
      {id: 'updatedAt', className: 'is-min'}
    ],

    serializeActions: function()
    {
      return ListView.actions.viewEditDelete(this.collection, false);
    }

  });
});
