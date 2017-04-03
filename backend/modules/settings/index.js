// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
var format = require('util').format;
var _ = require('lodash');
var step = require('h5.step');
var setUpRoutes = require('./routes');
var validateLicense = require('./validateLicense');
var setUpServiceTagPrinterZpl = require('./setUpServiceTagPrinterZpl');

exports.DEFAULT_CONFIG = {
  safeFsId: 'safeFs',
  expressId: 'express',
  programmerId: 'programmer',
  settingsFile: 'settings.json',
  defaults: {
    hotkeys: {}
  },
  logsGlob: null
};

exports.start = function startSettingsModule(app, module, done)
{
  var safeFs = app[module.config.safeFsId];
  var settings = {
    multiOneWorkflowVersion: '0.0.0.0',
    coreScannerDriver: false
  };

  module.availableFeatures = ['wmes', 'sol', 't24vdc', 'led', 'gprs', 'glp2', 'fl', 'ft', 'hid', 'weight'];

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
    var copy = _.assign({}, settings);

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
        settings = _.assign(settings, changes);

        (safeFs || fs).writeFile(
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
          delete changes.password;

          module.debug("Changed: %s", JSON.stringify(changes));

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
    var featureIndex = module.availableFeatures.indexOf(feature.toLowerCase());

    return featureIndex !== -1 && !!(supportedFeatures & Math.pow(2, featureIndex));
  };

  module.getMachineId = function()
  {
    return os.hostname() || process.env.COMPUTERNAME || process.env.HOST || process.env.USERNAME || '';
  };

  module.getInstallationId = function()
  {
    var appId = module.get('id') || '';
    var machineId = module.getMachineId();

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

  readInitialSettings(done);

  app.broker.subscribe('app.started', onAppStarted).setLimit(1);

  app.broker.subscribe('settings.changed')
    .setFilter(function(changes) { return changes.serviceTagPrinter !== undefined; })
    .on('message', setUpServiceTagPrinterZpl.bind(null, app, module));

  app.broker.subscribe('settings.changed')
    .setFilter(function(changes) { return changes.programmerFile !== undefined; })
    .on('message', function()
    {
      readMultiOneWorkflowVersion(function(err, multiOneWorkflowVersion)
      {
        module.import({multiOneWorkflowVersion}, () => {}, false, true);
      });
    });

  function onAppStarted()
  {
    setUpServiceTagPrinterZpl(app, module);

    step(
      function()
      {
        readMultiOneWorkflowVersion(this.parallel());
        checkCoreScannerDriver(this.parallel());
      },
      function(err, multiOneWorkflowVersion, coreScannerDriver)
      {
        if (multiOneWorkflowVersion === '0.0.0.0')
        {
          setTimeout(tryReadMultiOneWorkflowVersion, 30000);
        }

        module.import({multiOneWorkflowVersion, coreScannerDriver}, () => {}, false, true);
      }
    );
  }

  function readInitialSettings(done)
  {
    module.debug("Reading initial settings...");

    (safeFs || fs).readFile(module.config.settingsFile, {encoding: 'utf8'}, function(err, contents)
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

      module.import(_.assign({}, settings), done, true);
    });
  }

  function tryReadMultiOneWorkflowVersion()
  {
    readMultiOneWorkflowVersion(function(err, multiOneWorkflowVersion)
    {
      if (multiOneWorkflowVersion === '0.0.0.0')
      {
        return setTimeout(tryReadMultiOneWorkflowVersion, 30000);
      }

      module.import({multiOneWorkflowVersion}, () => {}, false, true);
    });
  }

  function readMultiOneWorkflowVersion(done)
  {
    if (process.platform !== 'win32')
    {
      return done(null, '0.0.0.0');
    }

    var cmd = format('"%s" /f dummy /w dummy /c Halt', module.get('programmerFile'));

    module.debug("Checking MultiOne Workflow version...");

    exec(cmd, {timeout: 30000}, function(err, stdout)
    {
      var matches = stdout.match(/v(?:ersion)?.*?((?:[0-9]+\.?){4})/);
      var multiOneWorkflowVersion = matches ? matches[1] : '0.0.0.0';

      module.debug("MultiOne Workflow version is %s.", multiOneWorkflowVersion);

      done(null, multiOneWorkflowVersion);
    });
  }

  function checkCoreScannerDriver(done)
  {
    if (process.platform !== 'win32')
    {
      return done(null, false);
    }

    module.debug("Checking CoreScanner driver availability...");

    exec('sc qc CoreScanner', {timeout: 30000}, function(err, stdout)
    {
      var coreScannerDriver = _.includes(stdout, 'SERVICE_NAME: CoreScanner');

      module.debug("CoreScanner driver is %s.", coreScannerDriver ? 'available' : 'unavailable');

      done(null, coreScannerDriver);
    });
  }

  function validateSettings(rawSettings)
  {
    var MOW_VERSION_RE = /^([0-9]+\.?){1,5}$/;
    var IPV4_ADDRESS_RE = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
    var COAP_RESOURCE_RE = /^coap:\/\//;

    var newSettings = {};

    // Special settings
    validateEnum(rawSettings, newSettings, 'coreScannerDriver', Boolean, [false, true]);
    validateStringSetting(rawSettings, newSettings, 'multiOneWorkflowVersion', 1, MOW_VERSION_RE);
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
    validateEnum(rawSettings, newSettings, 'ledsCheckingMode', String, ['pass', 'recent', 'remote']);
    validateEnum(rawSettings, newSettings, 'forceLatestOrder', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'programming', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'serviceTagPrinter', 0);
    validateEnum(rawSettings, newSettings, 'serviceTagLabelType', String, ['zpl', 'dpl']);
    validateStringSetting(rawSettings, newSettings, 'serviceTagLabelCode', 0);
    // MultiOne Workflow
    validateEnum(rawSettings, newSettings, 'workflowVerify', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowIdentifyAlways', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowMultiDevice', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowCheckDeviceModel', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowCheckDevicePresent', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowCommissionAll', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'workflowDaliFactoryNew', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'interface', String, ['d', 's']);
    validateEnum(rawSettings, newSettings, 'continueOnWarnings', String, ['continue', 'halt']);
    validateEnum(rawSettings, newSettings, 'logVerbosity', String, ['info', 'error', 'fatal']);
    validateStringSetting(rawSettings, newSettings, 'programmerFile');
    validateEnum(rawSettings, newSettings, 'schedulerEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'schedulerFile', 0);
    validateEnum(rawSettings, newSettings, 'supportedDevicesEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'supportedDevicesFile', 0);
    validateEnum(rawSettings, newSettings, 'mowLabelDataLocationEnabled', Number, [0, 1]);
    validateStringSetting(rawSettings, newSettings, 'mowLabelDataLocation', 0);
    validateStringSetting(rawSettings, newSettings, 'mowUniqueId', 0);
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
    validateStringSetting(rawSettings, newSettings, 'testingModbusHost', 1, IPV4_ADDRESS_RE);
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
    validateStringSetting(rawSettings, newSettings, 'flResource1', 0, COAP_RESOURCE_RE);
    validateStringSetting(rawSettings, newSettings, 'flResource2', 0, COAP_RESOURCE_RE);
    // Frame Tester
    validateEnum(rawSettings, newSettings, 'ftEnabled', Number, [0, 1]);
    validateNumericSetting(rawSettings, newSettings, 'ftDuration', 1000, 60000);
    validateNumericSetting(rawSettings, newSettings, 'ftSetCurrent', 0.01, 10);
    validateNumericSetting(rawSettings, newSettings, 'ftSetVoltage', 0.1, 99.9);
    validateNumericSetting(rawSettings, newSettings, 'ftMaxVoltage', 0.1, 99.9);
    validateNumericSetting(rawSettings, newSettings, 'ftMaxResistance', 0.001);
    validateStringSetting(rawSettings, newSettings, 'ftStartResource1', 0, COAP_RESOURCE_RE);
    validateStringSetting(rawSettings, newSettings, 'ftStartResource2', 0, COAP_RESOURCE_RE);
    validateStringSetting(rawSettings, newSettings, 'ftSerialProxyAddress', 0, IPV4_ADDRESS_RE);
    validateFtOrderPattern(rawSettings, newSettings);
    // HID lamps
    validateEnum(rawSettings, newSettings, 'hidEnabled', Number, [0, 1]);
    // Component Weight
    validateEnum(rawSettings, newSettings, 'weightEnabled', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'weightStabilized', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'weightRequireComponent', Number, [0, 1]);
    validateEnum(rawSettings, newSettings, 'weightCheckScope', String, ['none', 'current', 'all']);
    validateNumericSetting(rawSettings, newSettings, 'weightTolerance', 0, 9999);
    validateNumericSetting(rawSettings, newSettings, 'weightTimeout', 0, 600);
    validateNumericSetting(rawSettings, newSettings, 'weightPort', 1, 65535);
    validateNumericSetting(rawSettings, newSettings, 'weightRefUnit', 1);
    validateStringSetting(rawSettings, newSettings, 'weightHost', 0);
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

    var value = parseFloat(rawSettings[setting]);

    if (!isNaN(value) && value >= min && value <= max && value !== settings[setting])
    {
      newSettings[setting] = value;
    }
  }

  function validateEnum(rawSettings, newSettings, setting, cast, values)
  {
    if (rawSettings[setting] === undefined)
    {
      return;
    }

    var value = cast(rawSettings[setting]);

    if (values.indexOf(value) !== -1 && value !== settings[setting])
    {
      newSettings[setting] = value;
    }
  }

  function validateBgScannerFilter(rawSettings, newSettings)
  {
    var newValue = rawSettings.bgScannerFilter;

    if (!_.isString(newValue))
    {
      return;
    }

    var serialNumbers = {};

    newValue
      .split(/[^0-9A-Z]/)
      .filter(function(serialNumber) { return /^[0-9A-Z]{4,}$/.test(serialNumber); })
      .forEach(function(serialNumber) { serialNumbers[serialNumber] = 1; });

    newValue = Object.keys(serialNumbers).join(' ');

    if (newValue !== settings.bgScannerFilter)
    {
      newSettings.bgScannerFilter = newValue;
    }
  }

  function validateFtOrderPattern(rawSettings, newSettings)
  {
    var newValue = rawSettings.ftOrderPattern;

    if (!_.isString(newValue))
    {
      return;
    }

    var patterns = {};

    newValue
      .split(/;|\n/)
      .map(function(pattern) { return pattern.trim(); })
      .filter(function(pattern) { return pattern.length > 0; })
      .forEach(function(pattern) { patterns[pattern] = 1; });


    newValue = Object.keys(patterns).join('\n');

    if (newValue !== settings.ftOrderPattern)
    {
      newSettings.ftOrderPattern = newValue;
    }
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
