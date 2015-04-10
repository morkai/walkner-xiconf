// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var fs = require('fs');
var _ = require('lodash');
var step = require('h5.step');
var findFeatureFile = require('./findFeatureFile');
var readFeatureFile = require('./readFeatureFile');
var programAndTest = require('./programAndTest');
var programSolDriver = require('./programSolDriver');
var programMowDriver = require('./programMowDriver');
var LptIo = require('./LptIo');

module.exports = function program(app, programmerModule, data, done)
{
  var fake = app.options.env !== 'production';
  var settings = app[programmerModule.config.settingsId];
  var currentState = programmerModule.currentState;
  var remoteCoordinator = programmerModule.remoteCoordinator;

  if (currentState.isInProgress())
  {
    return done(new Error('IN_PROGRESS'));
  }
  else if (currentState.inputMode === 'remote' && !remoteCoordinator.isConnected())
  {
    return done(new Error('NO_REMOTE_CONNECTION'));
  }
  else
  {
    done();
  }

  programmerModule.cancelled = false;

  var thisProgrammingCancelled = false;
  var thisProgrammingCancelledSub = app.broker.subscribe('programmer.cancelled')
    .setLimit(1)
    .on('message', function() { thisProgrammingCancelled = true; });

  app.broker.subscribe('programmer.finished', function() { thisProgrammingCancelledSub.cancel(); });

  var shouldAcquireServiceTag = !_.isEmpty(data.orderNo)
    && (currentState.inputMode === 'remote' || settings.get('serviceTagInLocalMode') !== 'disabled');
  var shouldPrintServiceTag = shouldAcquireServiceTag
    && settings.get('serviceTagPrint')
    && !_.isEmpty(settings.get('serviceTagPrinter'))
    && !_.isEmpty(settings.get('serviceTagLabelCode'));

  if (programmerModule.newProgram)
  {
    if (currentState.program && currentState.program._id === programmerModule.newProgram._id)
    {
      currentState.program = programmerModule.newProgram;
    }

    programmerModule.newProgram = null;
  }

  currentState.reset(data.orderNo, data.quantity, data.nc12);

  programmerModule.changeState();

  programmerModule.OVERALL_SETUP_PROGRESS = currentState.waitingForLeds ? 25 : 20;
  programmerModule.OVERALL_PROGRAMMING_PROGRESS = shouldPrintServiceTag ? 90 : 100;

  step(
    validateRemoteOrderItemsStep,
    countdownStep,
    findFeatureFile1Step,
    handleFindFeatureFile1ResultStep,
    readFeatureFile1Step,
    handleReadFeatureFile1ResultStep,
    findFeatureFile2Step,
    handleFindFeatureFile2ResultStep,
    readFeatureFile2Step,
    handleReadFeatureFile2ResultStep,
    checkSolProgramStep,
    writeWorkflowFileStep,
    handleWriteWorkflowFileResultStep,
    waitForLedsStep,
    waitForContinueStep,
    tryToProgramLptStep,
    tryToProgramStep,
    tryToAcquireServiceTagStep,
    tryToPrintServiceTag,
    finalizeStep
  );

  function validateRemoteOrderItemsStep()
  {
    /*jshint validthis:true*/

    if (currentState.inputMode !== 'remote')
    {
      return;
    }

    var orderData = currentState.getSelectedOrderData();

    if (!orderData)
    {
      return;
    }

    var items = orderData.items;

    for (var i = 0; i < items.length; ++i)
    {
      var item = items[i];

      if (item.kind === 'program' && item.nc12 !== currentState.nc12)
      {
        continue;
      }

      var quantityPerResult = item.quantityTodo / orderData.quantityTodo;

      if (isNaN(quantityPerResult) || quantityPerResult < 1 || quantityPerResult % 1 !== 0)
      {
        var err = new Error(
          "12NC " + item.nc12 + " has an invalid quantity (" + item.quantityTodo + "). Order's quantity is "
          + orderData.quantityTodo + "."
        );
        err.code = 'INVALID_ITEM_QUANTITY';

        return this.skip(err);
      }
    }
  }

  function countdownStep()
  {
    /*jshint validthis:true*/

    var delay = settings.get('programDelay');

    if (!delay)
    {
      return programmerModule.updateOverallProgress(6);
    }

    programmerModule.log('COUNTDOWN_STARTED', {delay: delay});
    programmerModule.changeState({countdown: delay});

    var percent100 = delay;
    var next = this.next();
    var timer = setInterval(function()
    {
      --delay;

      var percent;

      if (delay < 0)
      {
        delay = -1;
        percent = 1;
      }
      else
      {
        percent = (percent100 - delay) / percent100;
      }

      programmerModule.changeState({
        overallProgress: 1 + 5 * percent,
        countdown: delay
      });

      if (delay === -1)
      {
        clearInterval(timer);
        next();
      }
    }, 1000);

    this.sub = app.broker.subscribe('programmer.cancelled', function()
    {
      programmerModule.changeState({countdown: -1});
      clearInterval(timer);
      next();
    });
  }

  function findFeatureFile1Step()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    if (!currentState.nc12)
    {
      return;
    }

    var featurePath1 = settings.get('featurePath1');

    if (typeof featurePath1 !== 'string' || featurePath1.length === 0)
    {
      return this.skip('UNSET_FEATURE_PATH_1');
    }

    programmerModule.updateOverallProgress(7);

    var lastFeatureFile = programmerModule.getLastFeatureFile(currentState.nc12);
    var next = this.next();

    if (lastFeatureFile !== null)
    {
      programmerModule.log('USING_LAST_FEATURE_FILE');

      return setImmediate(next, null, lastFeatureFile.fullPath, [lastFeatureFile.fileName]);
    }

    programmerModule.log('SEARCHING_FEATURE_FILE', {
      featurePath: featurePath1
    });

    this.sub = app.broker.subscribe(
      'programmer.cancelled',
      findFeatureFile(featurePath1, currentState.nc12, settings.get('searchTimeout1'), next)
    );
  }

  function handleFindFeatureFile1ResultStep(err, filePath, files)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12)
    {
      return;
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    this.foundFeature1 = false;

    if (fake && !filePath)
    {
      files = [currentState.nc12 + ' Program FAKE.xml'];
      filePath = '/FAKE/PATH/TO/' + files[0];

      this.foundFeature1 = true;
    }

    if (err)
    {
      programmerModule.updateOverallProgress(8);
      programmerModule.log('SEARCHING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (filePath === false)
    {
      programmerModule.updateOverallProgress(8);
      programmerModule.log('SEARCHING_FEATURE_FILE_TIMEOUT');
    }
    else if (filePath === null)
    {
      programmerModule.updateOverallProgress(8);
      programmerModule.log('MISSING_FEATURE_FILE_1');
    }
    else if (files.length > 1)
    {
      programmerModule.updateOverallProgress(8);
      programmerModule.log('DUPLICATE_FEATURE_FILE_1', {fileCount: files.length, files: files});
    }
    else
    {
      this.foundFeature1 = true;

      programmerModule.changeState({
        overallProgress: 8,
        featureFile: filePath,
        featureFileName: files[0]
      });

      programmerModule.log('FEATURE_FILE_FOUND', {
        featureFile: files[0]
      });
    }

    setImmediate(this.next());
  }

  function readFeatureFile1Step(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled || err)
    {
      return this.skip(err);
    }

    if (!currentState.nc12 || !this.foundFeature1)
    {
      return;
    }

    programmerModule.updateOverallProgress(9);

    programmerModule.log('READING_FEATURE_FILE', {
      featureFile: currentState.featureFile
    });

    if (currentState.featureFile.indexOf('FAKE') === 1)
    {
      return setImmediate(this.next(), null, 'FAKE FEATURE FILE');
    }

    this.sub = app.broker.subscribe(
      'programmer.cancelled',
      readFeatureFile(
        currentState.featureFile,
        settings.get('readTimeout1'),
        this.next()
      )
    );
  }

  function handleReadFeatureFile1ResultStep(err, feature)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || !this.foundFeature1)
    {
      return;
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    if (err)
    {
      programmerModule.updateOverallProgress(10);
      programmerModule.log('READING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (feature === false)
    {
      programmerModule.updateOverallProgress(10);
      programmerModule.log('READING_FEATURE_FILE_TIMEOUT');
    }
    else
    {
      programmerModule.changeState({
        overallProgress: 10,
        feature: feature
      });

      programmerModule.log('FEATURE_FILE_READ', {
        length: Buffer.byteLength(feature, 'utf8')
      });
    }

    setImmediate(this.next());
  }

  function findFeatureFile2Step()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.foundFeature1)
    {
      return setImmediate(this.next());
    }

    var featurePath2 = settings.get('featurePath2');

    if (typeof featurePath2 !== 'string' || featurePath2.length === 0)
    {
      return this.skip('MISSING_FEATURE_FILE');
    }

    programmerModule.updateOverallProgress(11);

    programmerModule.log('SEARCHING_FEATURE_FILE', {
      featurePath: featurePath2
    });

    this.sub = app.broker.subscribe(
      'programmer.cancelled',
      findFeatureFile(
        featurePath2,
        currentState.nc12,
        settings.get('searchTimeout2'),
        this.next()
      )
    );
  }

  function handleFindFeatureFile2ResultStep(err, filePath, files)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.foundFeature1)
    {
      return;
    }

    this.sub.cancel();
    this.sub = null;

    if (err)
    {
      programmerModule.updateOverallProgress(12);
      programmerModule.log('SEARCHING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (filePath === false)
    {
      programmerModule.updateOverallProgress(12);
      programmerModule.log('SEARCHING_FEATURE_FILE_TIMEOUT');
    }
    else if (filePath === null)
    {
      programmerModule.updateOverallProgress(12);
      programmerModule.log('MISSING_FEATURE_FILE_2');
    }
    else if (files.length > 1)
    {
      programmerModule.updateOverallProgress(12);
      programmerModule.log('DUPLICATE_FEATURE_FILE_2', {fileCount: files.length, files: files});

      return this.skip('DUPLICATE_FEATURE_FILE');
    }
    else
    {
      programmerModule.changeState({
        overallProgress: 12,
        featureFile: filePath,
        featureFileName: files[0]
      });

      programmerModule.log('FEATURE_FILE_FOUND', {
        featureFile: files[0]
      });
    }

    if (currentState.featureFile === null)
    {
      return this.skip('MISSING_FEATURE_FILE');
    }

    setImmediate(this.next());
  }

  function readFeatureFile2Step()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.foundFeature1)
    {
      return;
    }

    programmerModule.updateOverallProgress(13);

    programmerModule.log('READING_FEATURE_FILE', {
      featureFile: currentState.featureFile
    });

    this.sub = app.broker.subscribe(
      'programmer.cancelled',
      readFeatureFile(
        currentState.featureFile,
        settings.get('readTimeout2'),
        this.next()
      )
    );
  }

  function handleReadFeatureFile2ResultStep(err, feature)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.foundFeature1)
    {
      return;
    }

    this.sub.cancel();
    this.sub = null;

    if (err)
    {
      err.code = 'FEATURE_FILE_ERROR';

      return this.skip(err);
    }

    if (feature === false)
    {
      return this.skip('READING_FEATURE_FILE_TIMEOUT');
    }

    programmerModule.changeState({
      overallProgress: 14,
      feature: feature
    });

    programmerModule.log('FEATURE_FILE_READ', {
      length: Buffer.byteLength(feature, 'utf8')
    });

    setImmediate(this.next());
  }

  function checkSolProgramStep()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    var featureFile = currentState.featureFile;

    if (_.isEmpty(featureFile))
    {
      return;
    }

    var solFilePattern = settings.get('solFilePattern') || '';

    this.isSolProgram = solFilePattern.length && featureFile.indexOf(solFilePattern) !== -1;

    programmerModule.updateOverallProgress(15);

    if (!this.isSolProgram && currentState.workMode === 'testing')
    {
      return this.skip('TESTING_NOT_SOL');
    }
  }

  function writeWorkflowFileStep()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (this.isSolProgram || _.isEmpty(currentState.featureFile))
    {
      return;
    }

    var workflowFile = programmerModule.config.workflowFile;

    if (typeof workflowFile !== 'string' || workflowFile.length === 0)
    {
      return this.skip('UNSET_WORKFLOW_FILE');
    }

    var workflowOptions = [];
    var workflow = buildWorkflowFile(settings, workflowOptions);

    programmerModule.log('WRITING_WORKFLOW_FILE', {
      workflowFile: workflowFile,
      workflowOptions: workflowOptions
    });

    programmerModule.changeState({
      overallProgress: 16,
      workflowFile: workflowFile,
      workflow: workflow.trim()
    });

    fs.writeFile(workflowFile, workflow, this.next());
  }

  function handleWriteWorkflowFileResultStep(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.isSolProgram)
    {
      return;
    }

    if (err)
    {
      err.code = 'WORKFLOW_FILE_WRITE_ERROR';

      return this.skip(err);
    }

    programmerModule.updateOverallProgress(17);

    programmerModule.log('WORKFLOW_FILE_WRITTEN', {
      length: Buffer.byteLength(programmerModule.currentState.workflow, 'utf8')
    });

    setImmediate(this.next());
  }

  function waitForLedsStep()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    var ledCount = currentState.leds.length;

    if (!ledCount)
    {
      return;
    }

    programmerModule.updateOverallProgress(20);

    if (!currentState.waitingForLeds)
    {
      return;
    }

    programmerModule.log('WAITING_FOR_LEDS', {
      ledCount: ledCount
    });

    var next = this.next();
    var cancelSub;
    var waitingSub;

    cancelSub = app.broker.subscribe('programmer.cancelled', function()
    {
      waitingSub.cancel();
      waitingSub = null;

      setImmediate(next);
    }).setLimit(1);

    waitingSub = app.broker.subscribe('programmer.stateChanged', function(changes)
    {
      if (changes.waitingForLeds === false)
      {
        waitingSub.cancel();
        waitingSub = null;

        cancelSub.cancel();
        cancelSub = null;

        setImmediate(next);
      }
    });
  }

  function waitForContinueStep()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || settings.get('ledsEnabled') !== 2 || _.isEmpty(currentState.leds))
    {
      return;
    }

    programmerModule.log('WAITING_FOR_CONTINUE');

    programmerModule.changeState({waitingForContinue: 'led'});

    var next = this.next();
    var cancelSub;
    var waitingSub;

    cancelSub = app.broker.subscribe('programmer.cancelled', function()
    {
      waitingSub.cancel();
      waitingSub = null;

      setImmediate(next);
    }).setLimit(1);

    waitingSub = app.broker.subscribe('programmer.stateChanged', function(changes)
    {
      if (changes.waitingForContinue === null)
      {
        waitingSub.cancel();
        waitingSub = null;

        cancelSub.cancel();
        cancelSub = null;

        setImmediate(next);
      }
    });
  }

  function tryToProgramLptStep()
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      return this.skip();
    }

    if (!currentState.nc12 || this.isSolProgram || !settings.get('lptEnabled'))
    {
      return;
    }

    var lptFilePattern = settings.get('lptFilePattern') || '';
    var featureFile = currentState.featureFile;

    if (lptFilePattern !== '' && featureFile.indexOf(lptFilePattern) === -1)
    {
      return;
    }

    this.lptIo = new LptIo({
      lptIoFile: programmerModule.config.lptIoFile,
      startTimeout: settings.get('lptStartTimeout'),
      readPort: settings.get('lptReadPort'),
      readBit: settings.get('lptReadBit'),
      readInverted: settings.get('lptReadInverted'),
      writePort: settings.get('lptWritePort'),
      writeBit: settings.get('lptWriteBit'),
      done: this.next()
    });

    this.sub = app.broker.subscribe('programmer.cancelled', this.lptIo.cancel.bind(this.lptIo));

    programmerModule.log('LPT_STARTING', {
      port: this.lptIo.options.readPort,
      bit: this.lptIo.options.readBit,
      inverted: this.lptIo.options.readInverted
    });

    this.lptIo.start();
  }

  function tryToProgramStep(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled || err)
    {
      return this.skip(err);
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    programmerModule.updateOverallProgress(programmerModule.OVERALL_SETUP_PROGRESS);

    if (currentState.program)
    {
      return programAndTest(app, programmerModule, this.next());
    }

    if (this.isSolProgram)
    {
      return programSolDriver(app, programmerModule, null, onProgress, this.next());
    }

    if (_.isEmpty(currentState.workflow))
    {
      return;
    }

    this.sub = programMowDriver(app, programmerModule, onProgress, this.next());

    function onProgress(progress)
    {
      programmerModule.updateOverallProgress(progress, true);
    }
  }

  function tryToAcquireServiceTagStep(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled || err)
    {
      return this.skip(err);
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    if (!shouldAcquireServiceTag)
    {
      return;
    }

    if (currentState.inputMode === 'local'
      && !remoteCoordinator.isConnected()
      && settings.get('serviceTagInLocalMode') === 'optional')
    {
      return programmerModule.log('SKIPPING_SERVICE_TAG_ACQUIRING');
    }

    programmerModule.updateOverallProgress(92);

    programmerModule.log('ACQUIRING_SERVICE_TAG');

    var next = this.next();
    var serviceTagRequestData = currentState.createServiceTagRequestData();

    this.sub = app.broker.subscribe('programmer.cancelled', next);

    remoteCoordinator.acquireServiceTag(serviceTagRequestData, function(err, serviceTag)
    {
      if (thisProgrammingCancelled)
      {
        if (serviceTag)
        {
          remoteCoordinator.releaseServiceTag(serviceTagRequestData, serviceTag);
        }

        return;
      }

      if (err)
      {
        err.code = 'REMOTE_SERVICE_TAG_FAILURE';
      }
      else
      {
        programmerModule.changeState({serviceTag: serviceTag});
        programmerModule.log('SERVICE_TAG_ACQUIRED', {serviceTag: serviceTag});
      }

      next(err);
    });
  }

  function tryToPrintServiceTag(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled || err)
    {
      return this.skip(err);
    }

    if (!shouldPrintServiceTag || !currentState.serviceTag)
    {
      return;
    }

    programmerModule.updateOverallProgress(97);

    programmerModule.log('PRINTING_SERVICE_TAG', {printerName: settings.get('serviceTagPrinter')});

    var next = this.next();
    var cancel = programmerModule.printServiceTag(currentState.serviceTag, function(err)
    {
      if (err)
      {
        programmerModule.log('PRINTING_SERVICE_TAG_FAILURE', {error: err.message});
      }

      next();
    });

    this.sub = app.broker.subscribe('programmer.cancelled', cancel);
  }

  function finalizeStep(err)
  {
    /*jshint validthis:true*/

    if (thisProgrammingCancelled)
    {
      err = 'CANCELLED';
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    if (this.lptIo)
    {
      programmerModule.log('LPT_FINISHING', {
        port: this.lptIo.options.writePort,
        bit: this.lptIo.options.writeBit
      });

      this.lptIo.finish(err ? false : true);
      this.lptIo = null;
    }

    var finishedAt = Date.now();
    var changes = {
      finishedAt: finishedAt,
      duration: finishedAt - currentState.startedAt,
      errorCode: 0,
      exception: null,
      result: 'success',
      order: currentState.order,
      waitingForLeds: false,
      waitingForContinue: null,
      inProgress: false,
      overallProgress: 100
    };

    if (err)
    {
      changes.result = 'failure';

      if (typeof err === 'string')
      {
        changes.errorCode = err;
      }
      else
      {
        changes.errorCode = err.code;
        changes.exception = err.message;
      }

      programmerModule.log('PROGRAMMING_FAILURE', {
        time: changes.finishedAt,
        duration: changes.duration,
        errorCode: changes.errorCode,
        nc12: currentState.nc12 || '-'
      });

      if (currentState.serviceTag !== null)
      {
        remoteCoordinator.releaseServiceTag(currentState.createServiceTagRequestData(), currentState.serviceTag);
      }
    }
    else
    {
      changes.counter = currentState.counter + 1;

      programmerModule.log('PROGRAMMING_SUCCESS', {
        time: changes.finishedAt,
        duration: changes.duration,
        nc12: currentState.nc12 || '-'
      });
    }

    if (changes.order !== null)
    {
      changes.order[err ? 'failureCounter' : 'successCounter'] += 1;
      changes.order.finishedAt = finishedAt;
      changes.order.duration = finishedAt - changes.order.startedAt;
    }

    changes.featureFileHash = currentState.hashFeatureFile();

    programmerModule.changeState(changes);

    currentState.save(programmerModule.config.featureDbPath, function(err)
    {
      if (err)
      {
        programmerModule.error("Failed to save the current state: %s", err.stack);
      }

      app.broker.publish('programmer.finished', currentState.toJSON());
    });
  }

  function buildWorkflowFile(settings, workflowOptions)
  {
    return buildWorkflowFileOption(settings, workflowOptions, 'Verify')
      + buildWorkflowFileOption(settings, workflowOptions, 'IdentifyAlways')
      + buildWorkflowFileOption(settings, workflowOptions, 'MultiDevice')
      + buildWorkflowFileOption(settings, workflowOptions, 'CheckDeviceModel')
      + buildWorkflowFileOption(settings, workflowOptions, 'CommissionAll');
  }

  function buildWorkflowFileOption(settings, workflowOptions, configOption)
  {
    var fileOption = configOption.toLowerCase();

    if (settings.get('workflow' + configOption))
    {
      workflowOptions.push(fileOption);

      return fileOption + '=true\r\n';
    }

    return fileOption + '=false\r\n';
  }
};
