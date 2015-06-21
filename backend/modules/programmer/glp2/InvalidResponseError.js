// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
