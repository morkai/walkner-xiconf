define([
  '../pubsub',
  '../history/HistoryEntry'
], function(
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

  window.currentState = currentState;

  return currentState;
});
