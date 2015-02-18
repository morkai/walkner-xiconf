define([
  'underscore',
  '../pubsub',
  '../history/HistoryEntry'
], function(
  _,
  pubsub,
  HistoryEntry
) {
  'use strict';

  var currentState = new HistoryEntry(window.CURRENT_STATE || {});

  pubsub.subscribe('programmer.stateChanged', function(changes)
  {
    currentState.set(changes);
  });

  pubsub.subscribe('programmer.logged', function(logEntry)
  {
    currentState.pushLogEntry(logEntry);
  });

  pubsub.subscribe('programmer.stepProgressed', function(message)
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
