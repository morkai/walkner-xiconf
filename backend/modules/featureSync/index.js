// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var path = require('path');
var os = require('os');
var exec = require('child_process').exec;
var step = require('h5.step');

exports.DEFAULT_CONFIG = {
  settingsId: 'settings',
  rmdirCmd: 'rmdir /S /Q "{dir}"',
  copyCmd: 'xcopy /C /I /Q /Y "{src}" "{dst}"'
};

exports.start = function startFeatureSyncModule(app, module)
{
  var timer = null;
  var syncing = false;

  module.isSyncing = function() { return syncing; };

  module.sync = sync;

  app.broker.subscribe('app.started', scheduleSync);

  function scheduleSync()
  {
    var settings = app[module.config.settingsId];

    if (!settings)
    {
      return module.warn("Not syncing: no settings module.");
    }

    var delay = parseInt(settings.get('backupDelay'), 10) * 1000;

    if (isNaN(delay) || delay < 1000)
    {
      return module.warn("Not syncing: invalid backup delay.");
    }

    timer = setTimeout(sync, delay);
  }

  function sync(done)
  {
    var settings = app[module.config.settingsId];

    if (!settings)
    {
      return done && done(new Error('NO_SETTINGS'));
    }

    if (syncing)
    {
      return done && done(new Error('IN_PROGRESS'));
    }

    var backupPath = settings.get('backupPath') === 1 ? 1 : 2;
    var srcPath = backupPath === 1 ? settings.get('featurePath1') : settings.get('featurePath2');
    var dstPath = backupPath === 1 ? settings.get('featurePath2') : settings.get('featurePath1');
    var tmpPath = path.join(os.tmpdir(), 'walkner-xiconf-features');

    if (typeof srcPath !== 'string' || !srcPath.length
      || typeof dstPath !== 'string' || !dstPath.length)
    {
      if (done)
      {
        return done(new Error('INVALID_SETTINGS'));
      }

      return module.warn("Not syncing: invalid paths.");
    }

    if (timer !== null)
    {
      clearTimeout(timer);
      timer = null;
    }

    syncing = true;

    module.info("Started syncing...");

    if (done)
    {
      done(null, {
        tmpPath: tmpPath,
        srcPath: srcPath,
        dstPath: dstPath
      });
    }

    app.broker.publish('featureSync.started');

    step(
      function removeTmpDirStep()
      {
        module.debug("Removing the tmp dir...");

        this.cmd = module.config.rmdirCmd.replace('{dir}', tmpPath);

        exec(this.cmd, this.next());
      },
      function copySrcToTmpStep(err)
      {
        if (err)
        {
          module.debug(
            "Failed to remove the tmp dir: %s%scmd: %s", err.message.trim(), os.EOL, this.cmd
          );
        }

        module.debug("Copying the src dir to the tmp dir...");

        this.cmd = module.config.copyCmd
          .replace('{src}', srcPath)
          .replace('{dst}', tmpPath);

        exec(this.cmd, this.next());
      },
      function removeDstDirStep(err)
      {
        if (err)
        {
          module.error(
            "Failed to copy the src dir to the tmp dir: %s%scmd: %s",
            err.message.trim(),
            os.EOL,
            this.cmd
          );

          return this.skip(new Error('SRC_TO_TMP'));
        }

        module.debug("Removing the dst dir...");

        this.cmd = module.config.rmdirCmd.replace('{dir}', dstPath);

        exec(this.cmd, this.next());
      },
      function copyTmpToDstStep(err)
      {
        if (err)
        {
          module.debug(
            "Failed to remove the dst dir: %s%scmd: %s", err.message.trim(), os.EOL, this.cmd
          );
        }

        module.debug("Copying the tmp dir to the dst dir...");

        this.cmd = module.config.copyCmd
          .replace('{src}', tmpPath)
          .replace('{dst}', dstPath);

        exec(this.cmd, this.next());
      },
      function removeTmpDirStep(err)
      {
        if (err)
        {
          module.error(
            "Failed to copy the tmp dir to the dst dir: %s%scmd: %s",
            err.message.trim(),
            os.EOL,
            this.cmd
          );

          return this.skip(new Error('TMP_TO_DST'));
        }

        module.debug("Removing the tmp dir...");

        var cmd = module.config.rmdirCmd.replace('{dir}', tmpPath);
        var next = this.next();

        exec(cmd, function(err)
        {
          if (err)
          {
            module.debug(
              "Failed to remove the tmp dir: %s%scmd: %s", err.message.trim(), os.EOL, cmd
            );
          }

          next();
        });
      },
      function finalizeStep(err)
      {
        if (err)
        {
          module.info("Failed to sync the feature files: %s", err.message);

          app.broker.publish('featureSync.finished', {error: {message: err.message}});
        }
        else
        {
          module.info("Synced the feature files!");

          app.broker.publish('featureSync.finished', {});
        }

        syncing = false;
      }
    );
  }
};
