// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var createHash = require('crypto').createHash;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var step = require('h5.step');
var moment = require('moment');
var VerificationWatcher = require('./VerificationWatcher');

var STANDARD_CLO_PROFILE = fs.readFileSync(path.join(__dirname, '/stdCloProfile.xml'), 'utf8');

module.exports = function(app, programmerModule, onProgress, done)
{
  var settings = app[programmerModule.config.settingsId];
  var remoteCoordinator = programmerModule.remoteCoordinator;
  var currentState = programmerModule.currentState;
  var gprs = currentState.gprs;

  var thisProgrammingCancelled = false;
  var thisProgrammingCancelledSub = app.broker.subscribe('programmer.cancelled')
    .setLimit(1)
    .on('message', function() { thisProgrammingCancelled = true; });

  step(
    function generateServiceTagStep()
    {
      programmerModule.updateOverallProgress(1);

      programmerModule.log('GENERATING_SERVICE_TAG');

      var next = this.next();
      var serviceTagRequestData = currentState.createServiceTagRequestData();

      this.sub = app.broker.subscribe('programmer.cancelled', next);

      remoteCoordinator.generateServiceTag(serviceTagRequestData, function(err, serviceTag)
      {
        if (thisProgrammingCancelled)
        {
          return;
        }

        if (err)
        {
          err.code = 'REMOTE_SERVICE_TAG_FAILURE';
        }
        else
        {
          programmerModule.changeState({serviceTag: serviceTag});
          programmerModule.log('SERVICE_TAG_GENERATED', {serviceTag: serviceTag});
        }

        next(err);
      });
    },
    function prepareInputFileStep(err)
    {
      if (thisProgrammingCancelled || err)
      {
        return this.skip(err);
      }

      if (this.sub)
      {
        this.sub.cancel();
        this.sub = null;
      }

      onProgress(5);

      programmerModule.log('GPRS:PREPARING_INPUT_FILE');

      var inputData = gprs.inputData;

      applyOrderData(inputData, gprs.orderData);
      applyDriverData(inputData, gprs.driverData);
      applyGprsData(inputData, gprs.gprsData);

      inputData.productionDate = moment().format('YYYY-MM-DDTHH:mm:ss');
      inputData.serviceTag = currentState.serviceTag.replace(/^P0+/, '');

      _.forEach(inputData.drivers, function(driver)
      {
        var lightSource = driver.lightSources[0];

        driver.lightSources = [];

        _.forEach(currentState.leds, function(led)
        {
          driver.lightSources.push(_.defaults({serialNumber: led.raw}, lightSource));
        });
      });

      gprs.inputFileContents = JSON.stringify(inputData, null, 2);
      gprs.inputFileHash = createHash('md5').update(gprs.inputFileContents).digest('hex');
      gprs.inputFile = path.join(programmerModule.config.featureDbPath, gprs.inputFileHash);

      fs.writeFile(gprs.inputFile, gprs.inputFileContents, this.next());
    },
    function handlePrepareInputFileResultStep(err)
    {
      onProgress(10);

      if (thisProgrammingCancelled)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'GPRS:PREPARING_INPUT_FILE_FAILURE';

        return this.skip(err);
      }

      programmerModule.log('GPRS:PREPARING_INPUT_FILE_SUCCESS');

      setImmediate(this.next());
    },
    function tryToProgramStep()
    {
      /*jshint validthis:true*/

      if (thisProgrammingCancelled)
      {
        return this.skip();
      }

      var programmerFile = settings.get('gprsProgrammerFile');

      if (typeof programmerFile !== 'string' || !programmerFile.length)
      {
        return this.skip('GPRS:PROGRAMMER_FILE_UNSET');
      }

      var args = [
        'program',
        '-p', String(settings.get('gprsDaliPort') || 0),
        '-j', gprs.inputFile,
        '-c', programmerModule.config.gprsOutputFile
      ];

      var options = {
        cwd: path.dirname(programmerFile)
      };

      programmerModule.log('GPRS:PROGRAMMER_FILE_STARTED', {
        programmerFile: programmerFile,
        daliPort: args[2]
      });

      var programmer = spawn(programmerFile, args, options);
      var next = this.next();
      var finalized = false;
      var output = '';
      var progress = '';

      programmer.on('exit', function(exitCode)
      {
        if (exitCode === 0)
        {
          finalize();
        }
        else
        {
          finalize('GPRS:EXIT_CODE:' + exitCode);
        }
      });

      programmer.on('error', function(err)
      {
        if (err.code === 'ENOENT')
        {
          finalize('GPRS:PROGRAMMER_FILE_MISSING');
        }
        else
        {
          err.code = 'GPRS:PROGRAMMER_FILE_FAILURE';

          finalize(err);
        }
      });

      programmer.stderr.on('data', onData);
      programmer.stdout.on('data', onData);

      this.sub = app.broker.subscribe('programmer.cancelled', function()
      {
        programmer.stderr.removeAllListeners();
        programmer.stdout.removeAllListeners();
        programmer.removeAllListeners();
        programmer.on('error', function() {});
        programmer.kill();

        finalize();
      });

      function onData(data)
      {
        /*jshint -W084*/

        output += data;

        if (progress === null)
        {
          return;
        }

        progress += data;

        if (progress.indexOf('Programming finished') !== -1)
        {
          updateProgress();

          progress = null;
        }
        else if (updateProgress())
        {
          progress = '';
        }
      }

      function updateProgress()
      {
        var found = false;
        var pos;

        while ((pos = progress.indexOf('Progress: ')) !== -1)
        {
          var matches = progress.substr(pos).match(/^Progress: ([0-9]+)%/);

          if (!matches)
          {
            break;
          }

          var percentage = parseInt(matches[1], 10);

          onProgress(10 + Math.round(percentage * 45 / 100));

          found = true;
          progress = progress.substr(pos + matches[0].length);
        }

        return found;
      }

      function finalize(err)
      {
        if (finalized)
        {
          return;
        }

        finalized = true;

        onProgress(55);

        programmerModule.changeState({
          output: output
        });

        setImmediate(next, err);
      }
    },
    function handleTryToProgramResultStep(err)
    {
      /*jshint validthis:true*/

      if (thisProgrammingCancelled || err)
      {
        return this.skip(err);
      }

      if (this.sub != null)
      {
        this.sub.cancel();
        this.sub = null;
      }

      programmerModule.log('GPRS:READING_OUTPUT_FILE', {
        outputFile: programmerModule.config.gprsOutputFile
      });

      fs.readFile(programmerModule.config.gprsOutputFile, 'utf8', this.next());
    },
    function writeOutputFileStep(err, outputFileContents)
    {
      /*jshint validthis:true*/

      onProgress(58);

      if (thisProgrammingCancelled)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'GPRS:OUTPUT_FILE_MISSING';

        return this.skip(err);
      }

      fs.unlink(programmerModule.config.gprsOutputFile, function(err)
      {
        if (err)
        {
          programmerModule.error("Failed to remove the GPRS output file: %s", err.message);
        }
      });

      programmerModule.log('GPRS:READING_OUTPUT_FILE_SUCCESS', {
        length: Buffer.byteLength(outputFileContents)
      });

      gprs.outputFileHash = createHash('md5').update(outputFileContents).digest('hex');

      if (!gprs.driverData.cloEnabled)
      {
        outputFileContents = outputFileContents.replace(/<CloProfile.*?\/>/, STANDARD_CLO_PROFILE);
      }

      gprs.outputFileContents = outputFileContents;
      gprs.outputFile = path.join(programmerModule.config.featureDbPath, gprs.outputFileHash);

      programmerModule.log('GPRS:COPYING_OUTPUT_FILE');

      fs.writeFile(gprs.outputFile, gprs.outputFileContents, this.next());
    },
    function verificationStep(err)
    {
      onProgress(70);

      if (thisProgrammingCancelled)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'GPRS:COPYING_OUTPUT_FILE_FAILURE';

        return this.skip(err);
      }

      programmerModule.log('GPRS:COPYING_OUTPUT_FILE_SUCCESS');

      var skipVerification = !settings.get('gprsVerification');

      if (skipVerification)
      {
        programmerModule.log('GPRS:VERIFICATION_SKIPPED');
      }
      else
      {
        programmerModule.log('GPRS:VERIFICATION_STARTED');
      }

      this.verificationWatcher = new VerificationWatcher(
        skipVerification,
        settings.get('gprsVerificationTimeout'),
        settings.get('gprsVerificationInputPath'),
        settings.get('gprsVerificationSuccessPath'),
        settings.get('gprsVerificationErrorPath'),
        gprs.inputData.serviceTag + '.xml',
        gprs.outputFileContents
      );

      this.verificationWatcher.progress = function(percentage)
      {
        onProgress(70 + Math.round(percentage * 30 / 100));
      };

      this.sub = app.broker.subscribe(
        'programmer.cancelled',
        this.verificationWatcher.cancel.bind(this.verificationWatcher)
      );

      this.verificationWatcher.start(this.next());
    },
    function finalizeStep(err)
    {
      thisProgrammingCancelledSub.cancel();
      thisProgrammingCancelledSub = null;

      if (this.sub)
      {
        this.sub.cancel();
        this.sub = null;
      }

      if (this.verificationWatcher)
      {
        this.verificationWatcher.destroy();
        this.verificationWatcher = null;
      }

      setImmediate(done, err);
    }
  );
};


function applyOrderData(inputData, orderData)
{
  var customerID = inputData.salesOrder && inputData.salesOrder.customerID !== undefined
    ? inputData.salesOrder.customerID
    : 0;

  _.extend(inputData, orderData);

  delete inputData.lightColor;

  inputData.salesOrder.customerID = customerID;

  inputData.drivers = (Array.isArray(inputData.drivers) ? inputData.drivers : []).filter(_.isObject);

  if (!inputData.drivers.length)
  {
    inputData.drivers.push({});
  }

  _.forEach(inputData.drivers, function(driver)
  {
    driver.lightSources = (Array.isArray(driver.lightSources) ? driver.lightSources : []).filter(_.isObject);

    if (!driver.lightSources.length)
    {
      driver.lightSources.push({});
    }

    _.forEach(driver.lightSources, function(lightSource)
    {
      lightSource.lightColor = orderData.lightColor;
    });
  });
}

function applyDriverData(inputData, driverData)
{
  inputData.cloEnabled = driverData.cloEnabled;
  inputData.cloProfile = driverData.cloProfile;

  _.forEach(inputData.drivers, function(driver)
  {
    driver.current = driverData.current;
    driver.startupDelay = driverData.startupDelay;
    driver.ntcSelection = driverData.ntcSelection;
    driver.moduleThermalProtection = {
      warningTemperature: driverData.warningTemperature,
      maxTemperature: driverData.maxTemperature,
      minDimLevel: driverData.minDimLevel
    };
  });

  if (!_.isObject(inputData.olc))
  {
    inputData.olc = {};
  }

  inputData.olc.dynaDimmerEnabled = driverData.dynaDimmerEnabled;
  inputData.olc.dynaDimmerProfile = driverData.dynaDimmerProfile;
  inputData.olc.midPointShift = driverData.midPointShift;
}

function applyGprsData(inputData, gprsData)
{
  inputData.olc.switchRegime = gprsData.switchRegime;
  inputData.olc.photoCellLevels = gprsData.photoCellLevels;
  inputData.olc.telemanagementMode = gprsData.telemanagementMode;
}
