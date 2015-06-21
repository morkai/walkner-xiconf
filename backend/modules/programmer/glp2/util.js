// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('util');
var transliteration = require('transliteration');
var constants = require('./constants');

var DATE_VALUE_RE = /^([0-9]{2})\.([0-9]{2})\.([0-9]{2})_([0-9]{2}):([0-9]{2}):([0-9]{2})$/;
var VALUE_AND_UNIT_RE = /^(<|>)?([0-9]+)(?:\.([0-9]+))?([A-Za-z]+)?$/;
var FAULT_STATUS_TO_TEXT = null;

exports.inherits = util.inherits;

exports.format = util.format;

exports.CHR = {
  0: 'NUL',
  NUL: 0,
  1: 'SOH',
  SOH: 1,
  2: 'STX',
  STX: 2,
  3: 'ETX',
  ETX: 3,
  4: 'EOT',
  EOT: 4,
  5: 'ENQ',
  ENQ: 5,
  6: 'ACK',
  ACK: 6,
  7: 'BEL',
  BEL: 7,
  8: 'BS',
  BS: 8,
  9: 'TAB',
  TAB: 9,
  10: 'LF',
  LF: 10,
  11: 'VT',
  VT: 11,
  12: 'FF',
  FF: 12,
  13: 'CR',
  CR: 13,
  14: 'SO',
  SO: 14,
  15: 'SI',
  SI: 15,
  16: 'DLE',
  DLE: 16,
  17: 'DC1',
  DC1: 17,
  18: 'DC2',
  DC2: 18,
  19: 'DC3',
  DC3: 19,
  20: 'DC4',
  DC4: 20,
  21: 'NAK',
  NAK: 21,
  22: 'SYN',
  SYN: 22,
  23: 'ETB',
  ETB: 23,
  24: 'CAN',
  CAN: 24,
  25: 'EM',
  EM: 25,
  26: 'SUB',
  SUB: 26,
  27: 'ESC',
  ESC: 27,
  28: 'FS',
  FS: 28,
  29: 'GS',
  GS: 29,
  30: 'RS',
  RS: 30,
  31: 'US',
  US: 31,
  SPACE: 32,
  127: 'DEL',
  DEL: 127,
  244: 'Ω',
  246: 'LIST',
  LIST: 246,
  247: 'TYP',
  TYP: 247,
  248: 'SAMP',
  SAMP: 248,
  249: 'DAT',
  DAT: 249,
  250: 'EMP',
  EMP: 250,
  251: 'AUF',
  AUF: 251,
  253: 'OPT',
  OPT: 253,
  254: 'SEL',
  SEL: 254,
  255: 'IST',
  IST: 255
};

/**
 * @param {number} faultStatus
 * @returns {string}
 */
exports.getFaultText = function(faultStatus)
{
  if (faultStatus === 0)
  {
    return '';
  }

  if (FAULT_STATUS_TO_TEXT === null)
  {
    FAULT_STATUS_TO_TEXT = {};

    Object.keys(require('./constants').FaultStatus).forEach(function(text)
    {
      FAULT_STATUS_TO_TEXT[constants.FaultStatus[text]] = text;
    });
  }

  var faultText = FAULT_STATUS_TO_TEXT[faultStatus];

  if (faultText === undefined)
  {
    return 'F_' + faultStatus;
  }

  return faultText;
};

/**
 * @param {string} optionName
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @throws {Error}
 */
exports.validateNumber = function(optionName, value, min, max)
{
  if (typeof value !== 'number' || isNaN(value) || value < min || value > max)
  {
    throw new Error(util.format(
      "Invalid `%s`. Expected a number between `%s` and `%s`, got: `%s`.",
      optionName,
      min,
      max,
      value
    ));
  }
};

/**
 * @param {string} optionName
 * @param {*} value
 * @param {Array.<*>} validValues
 * @throws {Error}
 */
exports.validateEnum = function(optionName, value, validValues)
{
  if (validValues.indexOf(value) === -1)
  {
    throw new Error(util.format(
      "Invalid `%s`. Expected one of the following values: `%s`, got: `%s`.",
      optionName,
      validValues.join('`, `'),
      value
    ));
  }
};

/**
 * @param {string} optionName
 * @param {*} value
 * @throws {Error}
 */
exports.validateBool = function(optionName, value)
{
  this.validateEnum(optionName, value, [0, 1, '0', '1', true, false]);
};

/**
 * @param {*} value
 * @returns {number}
 */
exports.bool = function(value)
{
  return value === true || value === 1 || value === '1' ? 1 : 0;
};

/**
 * @param {Buffer|Array.<number>} buffer
 * @returns {string}
 */
exports.prettifyBuffer = function(buffer)
{
  var result = '';

  for (var i = 0; i < buffer.length; ++i)
  {
    var charCode = buffer[i];

    if (exports.CHR[charCode] !== undefined)
    {
      result += '<' + exports.CHR[charCode] + '>';
    }
    else if (charCode >= 128)
    {
      result += '<0x' + charCode.toString(16).toUpperCase() + '>';
    }
    else
    {
      result += String.fromCharCode(charCode);
    }
  }

  return result;
};

/**
 * @param {string} stringValue
 * @returns {string}
 */
exports.encodeStringValue = function(stringValue)
{
  stringValue = stringValue.replace(/\*|_/g, ' ').trim().replace(/\s+/g, '*');
  stringValue = transliteration.transliterate(stringValue, '?');

  if (stringValue.length > 32)
  {
    stringValue = stringValue.substr(0, 32);
  }

  return stringValue;
};

/**
 * @param {*} rawValue
 * @returns {string}
 */
exports.decodeStringValue = function(rawValue)
{
  return typeof rawValue === 'string' ? rawValue.replace(/\*+/g, ' ').trim() : '';
};

/**
 * @param {*} rawValue
 * @returns {Date}
 */
exports.decodeDateValue = function(rawValue)
{
  var matches = (typeof rawValue === 'string' ? rawValue : '').match(DATE_VALUE_RE);

  if (matches === null)
  {
    return new Date(0);
  }

  return new Date(
    2000 + parseInt(matches[1], 10),
    parseInt(matches[2], 10) - 1,
    parseInt(matches[3], 10),
    parseInt(matches[4], 10),
    parseInt(matches[5], 10),
    parseInt(matches[6], 10),
    0
  );
};

/**
 * @param {*} rawValue
 * @returns {Array.<string>}
 */
exports.decodeOrderDataValue = function(rawValue)
{
  return exports.decodeStringValue(rawValue).split('_');
};

/**
 * @param {string} rawValueAndUnit
 * @returns {{value: number, unit: string}}
 */
exports.decodeValueAndUnit = function(rawValueAndUnit)
{
  var matches = (typeof rawValueAndUnit === 'string' ? rawValueAndUnit : '')
    .replace('\uFFFD', 'OHM')
    .match(VALUE_AND_UNIT_RE);

  if (matches === null)
  {
    return {
      value: 0,
      unit: ''
    };
  }

  var integer = parseInt(matches[2], 10);
  var fractions = parseInt(matches[3] || '0', 10);
  var unit = (matches[4] || '').replace('OHM', 'Ω');
  var value = integer;

  if (fractions > 0)
  {
    value += '.' + matches[3];
  }

  return {
    value: parseFloat(value),
    unit: unit
  };
};
