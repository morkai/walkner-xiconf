// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');

module.exports = InvalidChecksumError;

/**
 * @constructor
 * @extends {Error}
 * @param {Buffer} [buffer]
 * @param {string} [calculatedChecksum]
 */
function InvalidChecksumError(buffer, calculatedChecksum)
{
  Error.captureStackTrace(this, this.constructor);

  var expectedChecksum = arguments.length === 2
    ? String.fromCharCode(buffer[buffer.length - 3]) + String.fromCharCode(buffer[buffer.length - 2])
    : null;

  this.buffer = buffer;
  this.name = this.constructor.name;
  this.code = 'GLP2:INVALID_CHECKSUM';
  this.message = expectedChecksum === null ? "Invalid request checksum." : util.format(
    "Invalid checksum. Expected `0x%s`, calculated `0x%s` from: `%s`",
    expectedChecksum,
    calculatedChecksum,
    util.prettifyBuffer(buffer)
  );
}

util.inherits(InvalidChecksumError, Error);
