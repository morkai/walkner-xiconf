// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
