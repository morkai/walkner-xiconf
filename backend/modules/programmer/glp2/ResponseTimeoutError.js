// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
