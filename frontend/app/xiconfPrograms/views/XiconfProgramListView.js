// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
