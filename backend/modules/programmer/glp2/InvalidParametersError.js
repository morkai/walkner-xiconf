// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = InvalidParametersError;

/**
 * @constructor
 * @extends {Error}
 * @param {string} message
 */
function InvalidParametersError(message)
{
  Error.captureStackTrace(this, this.constructor);

  this.name = this.constructor.name;
  this.code = 'GLP2:INVALID_PARAMETERS';
  this.message = message;
}

util.inherits(InvalidParametersError, Error);
