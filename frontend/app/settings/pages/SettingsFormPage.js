// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'app/i18n',
  'app/core/View',
  '../views/SettingsFormView'
], function(
  t,
  View,
  SettingsFormView
) {
  'use strict';

  return View.extend({

    layoutName: 'page',

    breadcrumbs: [t.bound('settings', 'breadcrumb')],

    initialize: function()
    {
      this.view = new SettingsFormView({tab: this.options.tab});
    }

  });
});
