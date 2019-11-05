define([
  '../pubsub'
], function(
  pubsub
) {
  'use strict';

  var scanBuffer = [];
  var clearTimer = null;

  function scheduleBufferClear()
  {
    if (clearTimer !== null)
    {
      clearTimeout(clearTimer);
    }

    clearTimer = setTimeout(clearBuffer, 60 * 1000);
  }

  function clearBuffer()
  {
    if (clearTimer !== null)
    {
      clearTimeout(clearTimer);
      clearTimer = null;
    }

    scanBuffer = [];
  }

  pubsub.subscribe('programmer.finished', clearBuffer);

  return {
    new: {
      raw1: '',
      raw2: '',
      time: 0
    },
    add: function(raw, nc12, serialNumber, scannerId)
    {
      scanBuffer.push({
        raw: raw,
        nc12: nc12,
        serialNumber: serialNumber,
        scannerId: scannerId || null
      });

      scheduleBufferClear();
    },
    get: function()
    {
      var buffer = scanBuffer;

      clearBuffer();

      return buffer;
    },
    clear: clearBuffer
  };
});
