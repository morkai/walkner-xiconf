// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var path = require('path');
var spawn = require('child_process').spawn;

exports.DEFAULT_CONFIG = {
  settingsId: 'settings',
  imWorkingExe: null
};

exports.start = function startImWorkinModule(app, module)
{
  var settings = app[module.config.settingsId];

  if (!settings)
  {
    throw new Error("settings module is required!");
  }

  var imWorkinProcess = null;

  app.broker.subscribe('settings.changed')
    .setFilter(function(changes) { return changes.imWorkin !== undefined; })
    .on('message', toggleProcess);

  app.broker.subscribe('app.started', toggleProcess).setLimit(1);

  function toggleProcess()
  {
    if (settings.get('imWorkin'))
    {
      startProcess();
    }
    else
    {
      stopProcess();
    }
  }

  function startProcess()
  {
    if (imWorkinProcess !== null)
    {
      return;
    }

    imWorkinProcess = spawn(
      module.config.imWorkingExe || path.join(app.options.rootPath, '..', 'bin', 'ImWorkin.exe')
    );

    var respawn = true;

    imWorkinProcess.on('error', function(err)
    {
      if (err.code === 'ENOENT')
      {
        respawn = false;
      }

      module.error(err.message);
    });

    imWorkinProcess.on('close', function()
    {
      module.debug("Stopped!");

      imWorkinProcess = null;

      if (respawn)
      {
        setTimeout(toggleProcess, 1337);
      }
    });

    module.debug("Started!");
  }

  function stopProcess()
  {
    if (imWorkinProcess === null)
    {
      return;
    }

    imWorkinProcess.kill();
  }
};
