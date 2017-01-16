// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var spawn = require('child_process').spawn;

module.exports = function programSolDriver(app, programmerModule, onProgress, done)
{
  var settings = app[programmerModule.config.settingsId];
  var mowVersion = parseFloat(settings.get('multiOneWorkflowVersion') || '0.0.0.0');
  var programmerFile = settings.get('programmerFile');

  if (typeof programmerFile !== 'string' || !programmerFile.length)
  {
    return done('UNSET_PROGRAMMER_FILE');
  }

  var OVERALL_PROGRESS_MAP = {
    PrepareSystem: 10,
    SelectFeatureFile: 15,
    InitializeCommunication: 20,
    IdentifyDevice: 40,
    ConvertFeatureData: 50,
    CheckIfFeaturesMatchFile: 60,
    WriteFeatureData: 70,
    FinalizeCommunication: 90,
    Stop: 100
  };

  var schedulerFile = settings.get('schedulerFile');
  var supportedDevicesFile = settings.get('supportedDevicesFile');
  var labelDataLocation = settings.get('mowLabelDataLocation');
  var uniqueId = settings.get('mowUniqueId');
  var comInterface = settings.get('interface') || 'd';
  var args = [
    '/f', programmerModule.currentState.featureFile,
    '/w', programmerModule.currentState.workflowFile,
    mowVersion >= 3.3 ? '/p' : '/i', comInterface,
    '/v', settings.get('logVerbosity') || 'fatal',
    '/c', settings.get('continueOnWarnings') || 'halt'
  ];

  if (settings.get('schedulerEnabled') && schedulerFile.length)
  {
    args.push('/s', schedulerFile);
  }

  if (settings.get('supportedDevicesEnabled') && supportedDevicesFile.length)
  {
    args.push('/d', supportedDevicesFile);
  }

  if (settings.get('mowLabelDataLocationEnabled') && labelDataLocation.length)
  {
    args.push('/l', labelDataLocation);
  }

  if (uniqueId.length)
  {
    args.push('/id', uniqueId);
  }

  programmerModule.log('STARTING_PROGRAMMER', {
    programmerFile: programmerFile,
    interface: comInterface
  });

  var lastProgress = 0;
  var programmer = spawn(programmerFile, args);
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

  programmer.stderr.setEncoding('utf8');
  programmer.stderr.on('data', onProcessData);
  programmer.stdout.setEncoding('utf8');
  programmer.stdout.on('data', onProcessData);

  return app.broker.subscribe('programmer.cancelled', function()
  {
    programmer.removeAllListeners();
    programmer.on('error', function() {});
    programmer.kill();

    finalize('CANCELLED');
  }).setLimit(1);

  function onProcessData(data)
  {
    if (finalized)
    {
      return;
    }

    output += data;

    var newProgress = 0;
    var matches = data.match(/\Start.*?\(([a-zA-Z]+)\)/);

    if (matches === null)
    {
      matches = output.match(/\Start.*?\(([a-zA-Z]+)\)/g);

      if (matches !== null)
      {
        matches = matches[matches.length - 1].match(/\Start.*?\(([a-zA-Z]+)\)/);
      }
    }

    if (matches !== null)
    {
      newProgress = OVERALL_PROGRESS_MAP[matches[1]];
    }

    if (newProgress && lastProgress < newProgress)
    {
      lastProgress = newProgress;
    }
    else if (/\.\.\.\s*$/.test(data))
    {
      lastProgress += 2;
    }

    onProgress(lastProgress);
  }

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

    setImmediate(function() { done(err); });
  }
};
