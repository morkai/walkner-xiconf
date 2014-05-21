// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

module.exports = function setUpBlockage(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];

  var timer = null;
  var remainingDuration = -1;
  var successCounter = 0;

  programmerModule.isBlocked = function()
  {
    return timer !== null;
  };

  app.broker.subscribe('settings.changed', resetBlockage).setFilter(function(changes)
  {
    return changes.blockageDuration !== undefined || changes.blockageInterval !== undefined;
  });

  app.broker.subscribe('programmer.finished', startBlockage).setFilter(function(historyEntry)
  {
    return historyEntry.result === 'success'
      && settings.get('blockageInterval') > 0
      && settings.get('blockageDuration') > 0;
  });

  function resetBlockage()
  {
    if (timer === null)
    {
      return;
    }

    clearInterval(timer);
    timer = null;
    remainingDuration = -1;
    successCounter = 0;

    countdown();
  }

  function startBlockage()
  {
    ++successCounter;

    if (successCounter === settings.get('blockageInterval'))
    {
      remainingDuration = settings.get('blockageDuration');
      timer = setInterval(progressBlockage, 1000);

      countdown();
    }
  }

  function progressBlockage()
  {
    --remainingDuration;

    if (remainingDuration === -1)
    {
      resetBlockage();
    }
    else
    {
      countdown();
    }
  }

  function countdown()
  {
    programmerModule.changeState({countdown: remainingDuration});
  }
};
