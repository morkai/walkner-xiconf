// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = NoConnectionError;

/**
 * @constructor
 * @extends {Error}
 */
function NoConnectionError()
{
  Error.captureStackTrace(this, this.constructor);

  this.name = this.constructor.name;
  this.code = 'GLP2:NO_CONNECTION';
  this.message = "No serial port connection.";
}

util.inherits(NoConnectionError, Error);
