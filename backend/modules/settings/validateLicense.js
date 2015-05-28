// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var lodash = require('lodash');
var ursa = require('ursa');
var semver = require('semver');

var LICENSE_RE = new RegExp(
  '^-----BEGIN LICENSE KEY-----' +
  '([a-zA-Z0-9=+\/]+)' +
  '-----END LICENSE KEY-----$'
);

module.exports = function validateLicense(app, settingsModule, rawSettings, newSettings, settings)
{
  var config = settingsModule.config;

  if (!lodash.isString(config.licenseEdPem) || lodash.isEmpty(config.licenseEdPem))
  {
    if (settings.licenseInfo.error !== 'INVALID_ED_PEM')
    {
      resetLicense('INVALID_ED_PEM');
    }

    return;
  }

  var rawLicenseKey = rawSettings.licenseKey;

  if (!lodash.isString(rawLicenseKey))
  {
    return;
  }

  rawLicenseKey = rawLicenseKey.trim();

  var matches = rawLicenseKey.trim().replace(/\r|\n/g, '').match(LICENSE_RE);

  if (matches === null)
  {
    return;
  }

  var licenseKey = matches[1];
  var publicEdKey;

  try
  {
    publicEdKey = ursa.createPublicKey(config.licenseEdPem);
  }
  catch (err)
  {
    if (settings.licenseInfo.error !== 'INVALID_ED_PEM')
    {
      resetLicense('INVALID_ED_PEM');
    }

    settingsModule.error("Failed to create ED public key: %s", err.message);

    return;
  }

  var licenseInfo;

  try
  {
    licenseInfo = publicEdKey.publicDecrypt(licenseKey, 'base64', 'utf8');
  }
  catch (err)
  {
    if (settings.licenseInfo.error !== 'NO_KEY')
    {
      resetLicense('NO_KEY');
    }

    settingsModule.error(
      "Failed to decrypt the specified license key: %s\nLICENSE KEY:\n%s",
      err.message,
      licenseKey
    );

    return;
  }

  licenseInfo = licenseInfo.split('\n').map(function(str) { return str.trim(); });
  licenseInfo = {
    appId: licenseInfo[0] || null,
    appVersion: licenseInfo[1] || null,
    date: licenseInfo[2] || null,
    uuid: licenseInfo[3] || null,
    licensee: licenseInfo[4] || null,
    features: parseInt(licenseInfo[5], 10),
    error: null
  };

  if (licenseInfo.date !== null && /^[0-9]{6}$/.test(licenseInfo.date))
  {
    licenseInfo.date = '20' + licenseInfo.date.substr(0, 2)
      + '-' + licenseInfo.date.substr(2, 2)
      + '-' + licenseInfo.date.substr(4, 2);
  }

  if (isNaN(licenseInfo.features))
  {
    licenseInfo.features = 0;
  }

  if (!semver.satisfies(app.options.version.split('-')[0], licenseInfo.appVersion.split('-')[0]))
  {
    licenseInfo.error = 'APP_VERSION';
  }

  if (licenseInfo.appId !== app.options.id)
  {
    licenseInfo.error = 'APP_ID';
  }

  newSettings.licenseKey = rawLicenseKey;
  newSettings.licenseInfo = licenseInfo;

  function resetLicense(error)
  {
    newSettings.licenseKey = '';
    newSettings.licenseInfo = {
      appId: null,
      appVersion: null,
      date: null,
      uuid: null,
      licensee: null,
      features: 0,
      error: error
    };
  }
};
