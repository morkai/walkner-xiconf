define([
  'underscore',
  '../socket',
  '../history/HistoryEntry'
], function(
  _,
  socket,
  HistoryEntry
) {
  'use strict';

  var currentState = new HistoryEntry(window.CURRENT_STATE || {});

  socket.on('programmer.stateChanged', function(changes)
  {
    currentState.set(changes);
  });

  socket.on('programmer.logged', function(logEntry)
  {
    currentState.pushLogEntry(logEntry);
  });

  socket.on('programmer.hidLampManager.updated', function(message)
  {
    currentState.updateHidLamp(message.index, message.data);
  });

  socket.on('programmer.ledManager.updated', function(message)
  {
    currentState.updateLed(message.index, message.data);
  });

  socket.on('programmer.stepProgressed', function(message)
  {
    var steps = currentState.get('steps');

    if (!steps || !steps[message.stepIndex])
    {
      return;
    }

    _.extend(steps[message.stepIndex], message.stepProgress);

    currentState.trigger('progress', message.stepIndex, message.stepProgress);
  });

  window.currentState = currentState;

  return currentState;
});
