// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
