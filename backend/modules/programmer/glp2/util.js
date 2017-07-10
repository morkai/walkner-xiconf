// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('util');
var transliteration = require('transliteration');
var constants = require('./constants');
var CHR = require('./CHR');

var DATE_VALUE_RE = /^([0-9]{2})\.([0-9]{2})\.([0-9]{2})_([0-9]{2}):([0-9]{2}):([0-9]{2})$/;
var VALUE_AND_UNIT_RE = /^(<|>)?([0-9]+)(?:\.([0-9]+))?([A-Za-z]+)?$/;
var FAULT_STATUS_TO_TEXT = null;

exports.inherits = util.inherits;

exports.format = util.format;

exports.CHR = CHR;

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

    Object.keys(constants.FaultStatus).forEach(function(text)
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
  stringValue = transliteration.transliterate(stringValue, {unknown: '?'});

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
  var unit = (matches[4] || '').replace('OHM', '?');
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

/**
 * @param {Buffer} responseBuffer
 * @returns {Array.<string>}
 */
exports.decodeResponseBuffer = function(responseBuffer)
{
  return responseBuffer.slice(4, -3).toString('utf8').trim().replace(/\s+/g, ' ').split(' ');
};
