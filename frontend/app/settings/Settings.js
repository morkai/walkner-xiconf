// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  '../core/Model'
], function(
  _,
  Model
) {
  'use strict';

  return Model.extend({

    urlRoot: '/settings',

    clientUrlRoot: '#settings',

    topicPrefix: 'settings',

    nlsDomain: 'settings',

    initHotkeys: function()
    {
      var actionToHotkey = this.get('hotkeys');
      var hotkeyToActions = this.hotkeyToActions = {};

      if (!actionToHotkey)
      {
        return;
      }

      Object.keys(actionToHotkey).forEach(function(action)
      {
        var hotkey = actionToHotkey[action];

        if (hotkey === 'Space')
        {
          hotkey = ' ';
        }

        if (hotkeyToActions[hotkey] === undefined)
        {
          hotkeyToActions[hotkey] = [action];
        }
        else
        {
          hotkeyToActions[hotkey].push(action);
        }
      });
    },

    getLicenseFeatures: function()
    {
      var licenseInfo = this.get('licenseInfo');

      if (!licenseInfo || !licenseInfo.features)
      {
        return '';
      }

      return ['WMES', 'SOL', 'T24VDC', 'LED', 'GPRS', 'GLP2']
        .filter(function(feature) { return this.supportsFeature(feature); }, this)
        .join(', ');
    },

    isValidLicense: function()
    {
      var licenseInfo = this.get('licenseInfo');

      return licenseInfo && !licenseInfo.error;
    },

    supportsFeature: function(feature)
    {
      var licenseInfo = this.get('licenseInfo');

      if (!licenseInfo)
      {
        return false;
      }

      var supportedFeatures = licenseInfo.features;

      switch (feature.toLowerCase())
      {
        case 'wmes':
          return !!(supportedFeatures & 1);

        case 'sol':
          return !!(supportedFeatures & 2);

        case 't24vdc':
          return !!(supportedFeatures & 4);

        case 'led':
          return !!(supportedFeatures & 8);

        case 'gprs':
          return !!(supportedFeatures & 16);

        case 'glp2':
          return !!(supportedFeatures & 32);

        default:
          return false;
      }
    }

  });
});
