// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = BusyTesterError;

/**
 * @constructor
 */
function BusyTesterError()
{
  Error.captureStackTrace(this, this.constructor);

  this.name = this.constructor.name;
  this.code = 'GLP2:BUSY_TESTER';
  this.message = "Test is in progress or Blackbox test is required.";
}

util.inherits(BusyTesterError, Error);
