// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = InvalidResponseError;

/**
 * @constructor
 * @extends {Error}
 * @param {Buffer|BufferQueueReader} incomingData
 */
function InvalidResponseError(incomingData)
{
  Error.captureStackTrace(this, this.constructor);

  this.responseBuffer = Buffer.isBuffer(incomingData) ? incomingData : incomingData.readBuffer(0, incomingData.length);
  this.name = this.constructor.name;
  this.code = 'GLP2:INVALID_RESPONSE';
  this.message = "Invalid response: " + util.prettifyBuffer(this.responseBuffer);
}

util.inherits(InvalidResponseError, Error);
