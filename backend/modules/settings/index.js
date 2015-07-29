// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var format = require('util').format;
var _ = require('lodash');
var step = require('h5.step');
var setUpRoutes = require('./routes');
var validateLicense = require('./validateLicense');
var setUpServiceTagPrinterZpl = require('./setUpServiceTagPrinterZpl');

exports.DEFAULT_CONFIG = {
  expressId: 'express',
  programmerId: 'programmer',
  settingsFile: 'settings.json',
  defaults: {
    hotkeys: {}
  }
};

exports.start = function startSettingsModule(app, module, done)
{
  var settings = {
    multiOneWorkflowVersion: '0.0.0.0',
    coreScannerDriver: false
  };

  module.has = function(name)
  {
    return name !== 'password' && name !== 'licenseKey' && typeof settings[name] !== 'undefined';
  };

  module.get = function(name)
  {
    return typeof name === 'undefined' ? settings : settings[name];
  };

  module.export = function(password, includeLicenseInfo)
  {
    var copy = _.merge({}, settings);

    if (password === copy.password)
    {
      copy.password1 = password;
      copy.password2 = password;
    }
    else
    {
      delete copy.licenseKey;

      if (!includeLicenseInfo)
      {
        delete copy.licenseInfo;
      }
    }

    delete copy.password;

    return copy;
  };

  module.import = function(newSettings, done, allowEmpty, noPassword)
  {
    if (settings.password)
    {
      if (newSettings.password !== settings.password && noPassword !== true)
      {
        return done(new Error('PASSWORD'));
      }
    }
    else
    {
      delete newSettings.password;
    }

    var changes = validateSettings(newSettings);

    if (_.isEmpty(changes))
    {
      if (!allowEmpty)
      {
        return done(new Error('INVALID_CHANGES'));
      }

      changes = {};
    }

    step(
      function()
      {
        if (changes.programmerFile)
        {
          readMultiOneWorkflowVersion(changes.programmerFile, this.next());
        }
      },
      function()
      {
        if (changes.programmerFile)
        {
          changes.multiOneWorkflowVersion = settings.multiOneWorkflowVersion;
        }

        settings = _.merge(settings, changes);

        fs.writeFile(
          module.config.settingsFile,
          JSON.stringify(settings),
          {encoding: 'utf8'},
          this.next()
        );
      },
      function(err)
      {
        if (err)
        {
          return done(err);
        }

        done();

        if (!_.isEmpty(changes))
        {
          delete changes.licenseKey;

          app.broker.publish('settings.changed', changes);
        }
      }
    );
  };

  module.supportsFeature = function(feature)
  {
    var licenseInfo = module.get('licenseInfo');

    if (!licenseInfo)
    {
      return false;
    }

    var supportedFeatures = licenseInfo.features;

    switch (feature)
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

      case 'fl':
        return !!(supportedFeatures & 64);

      default:
        return false;
    }
  };

  module.getInstallationId = function()
  {
    var appId = module.get('id') || '';
    var machineId = process.env.COMPUTERNAME || process.env.USERNAME || '';

    if (_.isEmpty(appId) && _.isEmpty(machineId))
    {
      return 'XICONF-' + Math.round(1000000000 + Math.random() * 8999999999).toString().toUpperCase().substr(0, 5);
    }

    var installId = appId;

    if (!_.isEmpty(machineId))
    {
      installId = _.isEmpty(installId) ? machineId : (machineId + '-' + installId);
    }

    return installId;
  };

  app.onModuleReady(
    [
      module.config.expressId
    ],
    setUpRoutes.bind(null, app, module)
  );

  step(
    function()
    {
      readInitialSettings(this.next());
    },
    function(err)
    {
      if (err)
      {
        return this.skip(err);
      }

      readMultiOneWorkflowVersion(null, this.group());
      checkCoreScannerDriver(this.group());
    },
    done
  );

  app.broker.subscribe('app.started', setUpServiceTagPrinterZpl.bind(null, app, module)).setLimit(1);
  app.broker.subscribe('settings.changed')
    .on('message', setUpServiceTagPrinterZpl.bind(null, app, module))
    .setFilter(function(changes) { return changes.serviceTagPrinter !== undefined; });

  function readInitialSettings(done)
  {
    fs.readFile(module.config.settingsFile, {encoding: 'utf8'}, function(err, contents)
    {
      if (err && err.code !== 'ENOENT')
      {
        return done(err);
      }

      try
      {
        settings = JSON.parse(contents || '{}');
      }
      catch (err)
      {
        module.warn("Failed to parse the settings file: %s", err.message);
      }

      if (settings === null || typeof settings !== 'object')
      {
        settings = {};
      }

      settings = _.defaults(settings, module.config.defaults);

      module.import(_.merge({}, settings), done, true);
    });
  }

  function readMultiOneWorkflowVersion(programmerFile, done)
  {
    var cmd = format('"%s" /f dummy /w dummy /c Halt', programmerFile || module.get('programmerFile'));
    var options = {
      timeout: 5000
    };

    exec(cmd, options, function(err, stdout)
    {
      var matches = stdout.match(/v(?:ersion)?.*?((?:[0-9]+\.?){4})/);

      settings.multiOneWorkflowVersion = matches ? matches[1] : '0.0.0.0';

      done();
    });
  }

  function checkCoreScannerDriver(done)
  {
    exec('sc qc CoreScanner', {timeout: 5000}, function(err, stdout)
    {
      settings.coreScannerDriver = _.includes(stdout, 'SERVICE_NAME: CoreScanner');

      done();
    });
  }

  function validateSettings(rawSettings)
  {
    var newSettings = {};

    // General settings
    validateStringSetting(rawSettings, newSettings, 'title', 0);
    validateStringSetting(rawSettings, newSettings, 'password1');
    validateEnum(rawSettings, newSettings, 'protectInputMode', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'orders', String, ['disabled', 'optional', 'required']);
    validateEnum(rawSettings, newSettings, 'imWorkin', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'bgScanner', Number, [0, 1]);
    validateBgScannerFilter(rawSettings, newSettings);
    validateNumericSetting(rawSettings, newSettings, 'bgScannerBeepGood', -1, 26);
    validateNumericSetting(rawSettings, newSettings, 'bgScannerBeepBad', -1, 26);
    validateNumericSetting(rawSettings, newSettings, 'bgScannerBeepDone', -1, 26);
    validateNumericSetting(rawSettings, newSettings, 'programDelay', 0);
    validateNumericSetting(rawSettings, newSettings, 'cancelDelay', 0);
    validateNumericSetting(rawSettings, newSettings, 'blockageInterval', 0);
    validateNumericSetting(rawSettings, newSettings, 'blockageDuration', 0);
    validateStringSetting(rawSettings, newSettings, 'featurePath1');
    validateStringSetting(rawSettings, newSettings, 'featurePath2', 0);
    validateNumericSetting(rawSettings, newSettings, 'searchTimeout1', 100);
    validateNumericSetting(rawSettings, newSettings, 'searchTimeout2', 100);
    validateNumericSetting(rawSettings, newSettings, 'readTimeout1', 100);
    validateNumericSetting(rawSettings, newSettings, 'readTimeout2', 100);
    validateNumericSetting(rawSettings, newSettings, 'backupDelay', 5);
    validateEnum(rawSettings, newSettings, 'backupPath', Number, [1, 2]);
    // Remote
    validateStringSetting(rawSettings, newSettings, 'prodLine', 0);
    validateEnum(rawSettings, newSettings, 'serviceTagInLocalMode', String, ['disabled', 'optional', 'required']);
    validateEnum(rawSettings, newSettings, 'serviceTagPrint', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'ledsEnabled', Number, [0, 1, 2]);
    validateEnum(rawSettings, newSettings, 'programming', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'serviceTagPrinter', 0);
    validateEnum(rawSettings, newSettings, 'serviceTagLabelType', String, ['zpl', 'dpl']);
    validateStringSetting(rawSettings, newSettings, 'serviceTagLabelCode', 0);
    // MultiOne Workflow
    validateEnum(rawSettings, newSettings, 'workflowVerify', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowIdentifyAlways', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowMultiDevice', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowCheckDeviceModel', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowCommissionAll', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'interface', String, ['d', 's']);
    validateEnum(rawSettings, newSettings, 'continueOnWarnings', String, ['continue', 'halt']);
    validateEnum(rawSettings, newSettings, 'logVerbosity', String, ['info', 'error', 'fatal']);
    validateStringSetting(rawSettings, newSettings, 'programmerFile');
    validateEnum(rawSettings, newSettings, 'schedulerEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'schedulerFile', 0);
    validateEnum(rawSettings, newSettings, 'supportedDevicesEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'supportedDevicesFile', 0);
    // GPRS
    validateStringSetting(rawSettings, newSettings, 'gprsOrdersPath');
    validateStringSetting(rawSettings, newSettings, 'gprsProgrammerFile');
    validateNumericSetting(rawSettings, newSettings, 'gprsDaliPort', 0, 256);
    validateStringSetting(rawSettings, newSettings, 'gprsInputTemplateFile');
    validateEnum(rawSettings, newSettings, 'gprsVerification', Number, [0, 1]);
    validateNumericSetting(rawSettings, newSettings, 'gprsVerificationTimeout', 5 * 1000, 3600 * 1000);
    validateStringSetting(rawSettings, newSettings, 'gprsVerificationInputPath');
    validateStringSetting(rawSettings, newSettings, 'gprsVerificationSuccessPath');
    validateStringSetting(rawSettings, newSettings, 'gprsVerificationErrorPath');
    // Petrol Station
    validateEnum(rawSettings, newSettings, 'lptEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'lptFilePattern', 0);
    validateNumericSetting(rawSettings, newSettings, 'lptStartTimeout', 1000);
    validateNumericSetting(rawSettings, newSettings, 'lptReadPort', 0);
    validateNumericSetting(rawSettings, newSettings, 'lptReadBit', 0);
    validateEnum(rawSettings, newSettings, 'lptReadInverted', Number, [0, 1]);
    validateNumericSetting(rawSettings, newSettings, 'lptWritePort', 0);
    validateNumericSetting(rawSettings, newSettings, 'lptWriteBit', 0);
    // Fortimo Solar
    validateStringSetting(rawSettings, newSettings, 'solComPattern');
    validateStringSetting(rawSettings, newSettings, 'solFilePattern');
    validateEnum(rawSettings, newSettings, 'solReset', Number, [0, 1]);
    validateNumericSetting(rawSettings, newSettings, 'solResetDelay', 333);
    // Tester 24V DC
    validateEnum(rawSettings, newSettings, 'testingEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'testingComPattern');
    validateNumericSetting(rawSettings, newSettings, 'testingComAddress', 0, 255);
    validateNumericSetting(rawSettings, newSettings, 'testingComTimeout', 100, 5000);
    validateNumericSetting(rawSettings, newSettings, 'testingCurrent', 0.01, 10);
    validateEnum(rawSettings, newSettings, 'testingModbusEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'testingModbusHost', 1, /^([0-9]{1,3}\.){3}[0-9]{1,3}$/);
    validateNumericSetting(rawSettings, newSettings, 'testingModbusPort', 1, 65535);
    validateNumericSetting(rawSettings, newSettings, 'testingMaxVoltage', 0.1, 99.9);
    // Tester GLP2-I
    validateEnum(rawSettings, newSettings, 'glp2Enabled', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'glp2AllInOne', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'glp2ComPattern');
    validateNumericSetting(rawSettings, newSettings, 'glp2ComAddress', 1, 255);
    validateNumericSetting(rawSettings, newSettings, 'glp2ProgrammingDelay', 0, 60000);
    validateNumericSetting(rawSettings, newSettings, 'glp2CancelDelay', 1, 10000);
    // Fluorescent Lamps
    validateStringSetting(rawSettings, newSettings, 'flResource1', 0, /^coap/);
    validateStringSetting(rawSettings, newSettings, 'flResource2', 0, /^coap/);
    // Hotkeys
    validateHotkeys(rawSettings, newSettings);
    // License
    validateStringSetting(rawSettings, newSettings, 'id', 0, /^[a-zA-Z0-9-_]*$/);
    validateStringSetting(rawSettings, newSettings, 'remoteServer', 0);
    validateNumericSetting(rawSettings, newSettings, 'syncInterval', 1);
    validateLicense(app, module, rawSettings, newSettings, settings);

    if (newSettings.password1)
    {
      newSettings.password = newSettings.password1;

      delete newSettings.password1;
    }

    if (_.isEmpty(newSettings))
    {
      return null;
    }

    return newSettings;
  }

  function validateStringSetting(rawSettings, newSettings, setting, minLength, pattern)
  {
    if (typeof minLength !== 'number')
    {
      minLength = 1;
    }

    var value = rawSettings[setting];

    if (_.isString(value)
      && value.length >= minLength
      && value !== settings[setting]
      && (!pattern || pattern.test(value)))
    {
      newSettings[setting] = value;
    }
  }

  function validateNumericSetting(rawSettings, newSettings, setting, min, max)
  {
    if (!_.isNumber(min))
    {
      min = 1;
    }

    if (!_.isNumber(max))
    {
      max = Number.MAX_VALUE;
    }

    var value = parseInt(rawSettings[setting], 10);

    if (!isNaN(value) && value >= min && value <= max && value !== settings[setting])
    {
      newSettings[setting] = value;
    }
  }

  function validateEnum(rawSettings, newSettings, setting, cast, values)
  {
    var value = cast(rawSettings[setting]);

    if (values.indexOf(value) !== -1 && value !== settings[setting])
    {
      newSettings[setting] = value;
    }
  }

  function validateBgScannerFilter(rawSettings, newSettings)
  {
    var newBgScannerFilter = rawSettings.bgScannerFilter;

    if (!_.isString(newBgScannerFilter))
    {
      return;
    }

    var serialNumbers = {};

    newBgScannerFilter
      .split(/[^0-9A-Z]/)
      .filter(function(serialNumber) { return /^[0-9A-Z]{4,}$/.test(serialNumber); })
      .forEach(function(serialNumber) { serialNumbers[serialNumber] = 1; });

    newSettings.bgScannerFilter = Object.keys(serialNumbers).join(' ');
  }

  function validateHotkeys(rawSettings, newSettings)
  {
    if (!_.isObject(rawSettings.hotkeys))
    {
      return;
    }

    var validHotkeys = module.config.defaults.hotkeys;
    var hotkeys = {};
    var changes = 0;

    Object.keys(rawSettings.hotkeys).forEach(function(action)
    {
      var hotkey = rawSettings.hotkeys[action];

      if (_.isString(validHotkeys[action])
        && /^[a-zA-Z0-9]+$/.test(action)
        && _.isString(hotkey)
        && (hotkey.length <= 1 || hotkey === 'Space'))
      {
        hotkeys[action] = hotkey.length ? rawSettings.hotkeys[action] : null;

        if (hotkey !== settings.hotkeys[action])
        {
          ++changes;
        }
      }
    });

    if (changes > 0)
    {
      newSettings.hotkeys = hotkeys;
    }
  }
};
