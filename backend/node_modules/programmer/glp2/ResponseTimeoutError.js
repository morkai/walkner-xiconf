// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = ResponseTimeoutError;

/**
 * @constructor
 * @extends {Error}
 */
function ResponseTimeoutError()
{
  Error.captureStackTrace(this, this.constructor);

  this.name = this.constructor.name;
  this.code = 'GLP2:RESPONSE_TIMEOUT';
  this.message = "Response timeout.";
}

util.inherits(ResponseTimeoutError, Error);
