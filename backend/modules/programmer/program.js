// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var spawn = require('child_process').spawn;
var fs = require('fs');
var step = require('h5.step');
var findFeatureFile = require('./findFeatureFile');
var readFeatureFile = require('./readFeatureFile');
var programSolDriver = require('./programSolDriver');
var LptIo = require('./LptIo');

module.exports = function program(app, programmerModule, data, done)
{
  var currentState = programmerModule.currentState;

  if (currentState.isProgramming())
  {
    return done(new Error('IN_PROGRESS'));
  }
  else
  {
    done();
  }

  var settings = app[programmerModule.config.settingsId];

  programmerModule.cancelled = false;

  currentState.reset(data.orderNo, data.quantity, data.nc12);

  programmerModule.changeState();

  step(
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
    tryToProgramLptStep,
    tryToProgramStep,
    finalizeStep
  );

  function countdownStep()
  {
    /*jshint validthis:true*/

    var delay = settings.get('programDelay');

    if (!delay)
    {
      return;
    }

    programmerModule.log('COUNTDOWN_STARTED', {delay: delay});
    programmerModule.changeState({countdown: delay});

    var next = this.next();
    var timer = setInterval(function()
    {
      --delay;

      if (delay < 0)
      {
        delay = -1;
      }

      programmerModule.changeState({countdown: delay});

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

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    var featurePath1 = settings.get('featurePath1');

    if (typeof featurePath1 !== 'string' || featurePath1.length === 0)
    {
      return this.skip('UNSET_FEATURE_PATH_1');
    }

    programmerModule.log('SEARCHING_FEATURE_FILE', {
      featurePath: featurePath1
    });

    this.sub = app.broker.subscribe(
      'programmer.cancelled',
      findFeatureFile(
        featurePath1,
        currentState.nc12,
        settings.get('searchTimeout1'),
        this.next()
      )
    );
  }

  function handleFindFeatureFile1ResultStep(err, filePath, files)
  {
    /*jshint validthis:true*/

    this.sub.cancel();
    this.sub = null;

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    this.foundFeature1 = false;

    if (err)
    {
      programmerModule.log('SEARCHING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (filePath === false)
    {
      programmerModule.log('SEARCHING_FEATURE_FILE_TIMEOUT');
    }
    else if (filePath === null)
    {
      programmerModule.log('MISSING_FEATURE_FILE_1');
    }
    else if (files.length > 1)
    {
      programmerModule.log('DUPLICATE_FEATURE_FILE_1', {fileCount: files.length, files: files});
    }
    else
    {
      this.foundFeature1 = true;

      programmerModule.changeState({
        featureFile: filePath,
        featureFileName: files[0]
      });

      programmerModule.log('FEATURE_FILE_FOUND', {
        featureFile: files[0]
      });
    }

    setImmediate(this.next());
  }

  function readFeatureFile1Step()
  {
    /*jshint validthis:true*/

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (!this.foundFeature1)
    {
      return;
    }

    programmerModule.log('READING_FEATURE_FILE', {
      featureFile: currentState.featureFile
    });

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

    if (!this.foundFeature1)
    {
      return;
    }

    this.sub.cancel();
    this.sub = null;

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (err)
    {
      programmerModule.log('READING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (feature === false)
    {
      programmerModule.log('READING_FEATURE_FILE_TIMEOUT');
    }
    else
    {
      programmerModule.changeState({
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

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (this.foundFeature1)
    {
      programmerModule.log('SKIPPING_FEATURE_FILE_2');

      return setImmediate(this.next());
    }

    var featurePath2 = settings.get('featurePath2');

    if (typeof featurePath2 !== 'string' || featurePath2.length === 0)
    {
      return this.skip('MISSING_FEATURE_FILE');
    }

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

    if (this.foundFeature1)
    {
      return;
    }

    this.sub.cancel();
    this.sub = null;

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (err)
    {
      programmerModule.log('SEARCHING_FEATURE_FILE_FAILURE', {
        error: err.message
      });
    }
    else if (filePath === false)
    {
      programmerModule.log('SEARCHING_FEATURE_FILE_TIMEOUT');
    }
    else if (filePath === null)
    {
      programmerModule.log('MISSING_FEATURE_FILE_2');
    }
    else if (files.length > 1)
    {
      programmerModule.log('DUPLICATE_FEATURE_FILE_2', {fileCount: files.length, files: files});

      return this.skip('DUPLICATE_FEATURE_FILE');
    }
    else
    {
      programmerModule.changeState({
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

    if (this.foundFeature1)
    {
      return;
    }

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

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

    if (this.foundFeature1)
    {
      return;
    }

    this.sub.cancel();
    this.sub = null;

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

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

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    var solFilePattern = settings.get('solFilePattern') || '';
    var featureFile = currentState.featureFile;

    this.isSolProgram = solFilePattern.length && featureFile.indexOf(solFilePattern) !== -1;
  }

  function writeWorkflowFileStep()
  {
    /*jshint validthis:true*/

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (this.isSolProgram)
    {
      return;
    }

    var workflowFile = programmerModule.config.workflowFile;

    if (typeof workflowFile !== 'string' || workflowFile.length === 0)
    {
      return this.skip('UNSET_WORKFLOW_FILE');
    }

    var workflow = '';
    var workflowOptions = [];

    if (settings.get('workflowVerify'))
    {
      workflow += 'verify=true\r\n';
      workflowOptions.push('verify');
    }
    else
    {
      workflow += 'verify=false\r\n';
    }

    if (settings.get('workflowIdentifyAlways'))
    {
      workflow += 'identifyalways=true\r\n';
      workflowOptions.push('identifyalways');
    }
    else
    {
      workflow += 'identifyalways=false\r\n';
    }

    if (settings.get('workflowMultiDevice'))
    {
      workflow += 'multidevice=true\r\n';
      workflowOptions.push('multidevice');
    }
    else
    {
      workflow += 'multidevice=false\r\n';
    }

    programmerModule.log('WRITING_WORKFLOW_FILE', {
      workflowFile: workflowFile,
      workflowOptions: workflowOptions
    });

    programmerModule.changeState({
      workflowFile: workflowFile,
      workflow: workflow.trim()
    });

    fs.writeFile(workflowFile, workflow, this.next());
  }

  function handleWriteWorkflowFileResultStep(err)
  {
    /*jshint validthis:true*/

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (this.isSolProgram)
    {
      return;
    }

    if (err)
    {
      err.code = 'WORKFLOW_FILE_WRITE_ERROR';

      return this.skip(err);
    }

    programmerModule.log('WORKFLOW_FILE_WRITTEN', {
      length: Buffer.byteLength(programmerModule.currentState.workflow, 'utf8')
    });

    setImmediate(this.next());
  }

  function tryToProgramLptStep()
  {
    /*jshint validthis:true*/

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (this.isSolProgram || !settings.get('lptEnabled'))
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

    if (programmerModule.cancelled)
    {
      return this.skip('CANCELLED');
    }

    if (this.isSolProgram)
    {
      return programSolDriver(app, programmerModule, this.next());
    }

    if (err)
    {
      return this.skip(err);
    }

    if (this.sub)
    {
      this.sub.cancel();
      this.sub = null;
    }

    var programmerFile = settings.get('programmerFile');

    if (typeof programmerFile !== 'string' || !programmerFile.length)
    {
      return this.skip('UNSET_PROGRAMMER_FILE');
    }

    var args = [
      '/f', currentState.featureFile,
      '/w', currentState.workflowFile,
      '/i', settings.get('interface') || 'd',
      '/v', settings.get('logVerbosity') || 'fatal',
      '/c', settings.get('continueOnWarnings') || 'halt'
    ];

    programmerModule.log('STARTING_PROGRAMMER', {
      programmerFile: programmerFile,
      interface: args[5]
    });

    var programmer = spawn(programmerFile, args);
    var next = this.next();
    var finalized = false;
    var output = '';

    programmer.on('exit', function(exitCode)
    {
      if (exitCode === 0)
      {
        finalize();
      }
      else
      {
        finalize('EXIT_CODE:' + exitCode);
      }
    });

    programmer.on('error', function(err)
    {
      if (err.code === 'ENOENT')
      {
        finalize('MISSING_PROGRAMMER_FILE');
      }
      else
      {
        err.code = 'PROGRAMMER_FILE_ERROR';

        finalize(err);
      }
    });

    programmer.stderr.on('data', function(stderr) { output += stderr; });
    programmer.stdout.on('data', function(stdout) { output += stdout; });

    this.sub = app.broker.subscribe('programmer.cancelled', function()
    {
      programmer.removeAllListeners();
      programmer.on('error', function() {});
      programmer.kill();

      finalize('CANCELLED');
    });

    function finalize(err)
    {
      if (finalized)
      {
        return;
      }

      finalized = true;

      programmerModule.changeState({
        output: output
      });

      setImmediate(function() { next(err); });
    }
  }

  function finalizeStep(err)
  {
    /*jshint validthis:true*/

    if (this.sub != null)
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
      order: currentState.order
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
        nc12: currentState.nc12
      });
    }
    else
    {
      changes.counter = currentState.counter + 1;

      programmerModule.log('PROGRAMMING_SUCCESS', {
        time: changes.finishedAt,
        duration: changes.duration,
        nc12: currentState.nc12
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

    app.broker.publish('programmer.finished', currentState.toJSON());

    currentState.save(programmerModule.config.featureDbPath, function(err)
    {
      if (err)
      {
        programmerModule.error("Failed to save the current state: %s", err.stack);
      }
    });
  }

};
