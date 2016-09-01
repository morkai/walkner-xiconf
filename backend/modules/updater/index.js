// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var os = require('os');
var path = require('path');
var url = require('url');
var fs = require('fs');
var exec = require('child_process').exec;
var util = require('util');
var _ = require('lodash');
var request = require('request');
var step = require('h5.step');
var semver = require('semver');

exports.DEFAULT_CONFIG = {
  settingsId: 'settings',
  unzipExe: 'unzip.exe'
};

exports.start = function startUpdaterModule(app, updaterModule)
{
  var settings = app[updaterModule.config.settingsId];

  var isCheckingUpdates = false;
  var isProgrammingInProgress = false;

  app.broker.subscribe('programmer.stateChanged', onProgrammerStateChanged);
  app.broker.subscribe('updater.checkRequested', update);

  function onProgrammerStateChanged(message)
  {
    if (message.inProgress !== undefined)
    {
      isProgrammingInProgress = message.inProgress;
    }
  }

  function update()
  {
    if (isCheckingUpdates)
    {
      return;
    }

    var updatesUrl = url.parse(settings.get('remoteServer'));

    if (_.isEmpty(updatesUrl.hostname))
    {
      return updaterModule.warn("Not updating: no remote server :(");
    }

    if (_.isEmpty(updatesUrl.protocol))
    {
      updatesUrl.prototcol = 'http:';
    }

    var path = '/xiconf/updates/' + app.options.version;

    _.assign(updatesUrl, {
      path: path,
      pathname: path,
      query: '',
      search: '',
      hash: ''
    });

    updatesUrl = url.format(updatesUrl);

    checkUpdate(updatesUrl);
  }

  function checkUpdate(updatesUrl)
  {
    isCheckingUpdates = true;

    updaterModule.debug("Checking updates at %s...", updatesUrl);

    request
      .get(updatesUrl)
      .on('error', function(err)
      {
        isCheckingUpdates = false;

        updaterModule.error("Failed to check updates: %s", err.message);
      })
      .on('response', function(res)
      {
        if (res.statusCode === 204)
        {
          isCheckingUpdates = false;

          return updaterModule.info("No updates!");
        }

        if (res.statusCode === 200)
        {
          updaterModule.debug("Downloading the update archive...");

          var updateZipPath = path.join(os.tmpdir(), 'XICONF_UPDATE-' + Math.round(Math.random() * 99999999) + '.zip');

          res.on('end', unzipUpdate.bind(null, updateZipPath));
          res.pipe(fs.createWriteStream(updateZipPath));

          return;
        }

        isCheckingUpdates = false;

        return updaterModule.warn("Received an invalid status code: %d", res.statusCode);
      });
  }

  function unzipUpdate(updateZipPath)
  {
    var updateDirPath = path.join(app.options.rootPath, '..', 'update');

    step(
      function rmdirStep()
      {
        updaterModule.debug("Removing old update directory...");

        var cmd = util.format(
          process.platform === 'win32' ? 'RD /S /Q "%s"' : 'rm -rf "%s"',
          updateDirPath
        );

        exec(cmd, {timeout: 15000}, this.next());
      },
      function unzipStep()
      {
        updaterModule.debug("Unzipping the update archive...");

        var cmd = util.format(
          '"%s" "%s" -d "%s"',
          updaterModule.config.unzipExe,
          updateZipPath,
          updateDirPath
        );

        exec(cmd, {timeout: 60000}, this.next());
      },
      function checkStep(err)
      {
        fs.unlink(updateZipPath, function() {});

        if (err)
        {
          isCheckingUpdates = false;

          return updaterModule.error("Failed to unzip the update: %s", err.message);
        }

        var oldPackageJson;
        var newPackageJson;

        try
        {
          oldPackageJson = require(path.join(app.options.rootPath, '..', 'package.json'));
          newPackageJson = findNewPackageJson(updateDirPath);

          if (newPackageJson.name !== oldPackageJson.name
            || !semver.gt(newPackageJson.version, oldPackageJson.version))
          {
            throw new Error(util.format(
              "invalid package.json: old %s v%s, new %s v%s",
              oldPackageJson.name,
              oldPackageJson.version,
              newPackageJson.name,
              newPackageJson.version
            ));
          }
        }
        catch (err)
        {
          isCheckingUpdates = false;

          return updaterModule.error("Failed to require the package.json: %s", err.message);
        }

        setImmediate(installUpdate, updateDirPath, newPackageJson);
      }
    );
  }

  function installUpdate(updateDirPath, packageJson)
  {
    if (isProgrammingInProgress)
    {
      updaterModule.debug("Delaying update to version %s...", packageJson.version);

      return app.broker
        .subscribe('programmer.finished', installUpdate.bind(null, updateDirPath, packageJson))
        .setLimit(1);
    }

    updaterModule.debug("Updating from version %s to %s...", app.options.version, packageJson.version);

    app.broker.publish('updater.updating', {
      fromVersion: app.options.version,
      toVersion: packageJson.version
    });

    setTimeout(function()
    {
      try
      {
        require(path.join(updateDirPath, 'install.js'))(app, updaterModule, packageJson);
      }
      catch (err)
      {
        updaterModule.error(
          "Failed to install update: %s\nSTDERR:\n%s\nSTDOUT:\n%s", err.message || err,
          err.stderr,
          err.stdout
        );

        process.exit(1);
      }
    }, 1337 * 2);
  }

  function findNewPackageJson(updateDirPath)
  {
    try
    {
      return require(path.join(updateDirPath, 'data', 'app', 'package.json'));
    }
    catch (err)
    {
      try
      {
        return require(path.join(updateDirPath, 'data', 'package.json'));
      }
      catch (err)
      {
        return require(path.join(updateDirPath, 'package.json'));
      }
    }
  }
};
