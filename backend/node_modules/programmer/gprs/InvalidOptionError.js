// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
