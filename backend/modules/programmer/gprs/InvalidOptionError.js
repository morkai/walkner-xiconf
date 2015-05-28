// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var inherits = require('util').inherits;

module.exports = InvalidOptionError;

function InvalidOptionError(optionName, value)
{
  Error.captureStackTrace(this, this.constructor);

  this.name = this.constructor.name;
  this.code = 'GPRS:INVALID_OPTION';
  this.message = arguments.length === 2
    ? ('Invalid value for option `' + optionName + '`: `' + value + '`')
    : ('Invalid value for option `' + optionName + '`');
}

inherits(InvalidOptionError, Error);
