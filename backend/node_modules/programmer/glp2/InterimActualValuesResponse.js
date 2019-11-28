// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var constants = require('./constants');
var InvalidResponseError = require('./InvalidResponseError');
var Response = require('./Response');

module.exports = InterimActualValuesResponse;

/**
 * @constructor
 * @extends {Response}
 * @param {number} stepNumber
 * @param {number} time
 * @param {number} value1
 * @param {string} unit1
 * @param {number} value2
 * @param {string} unit2
 * @param {number} messageCounter
 */
function InterimActualValuesResponse(stepNumber, time, value1, unit1, value2, unit2, messageCounter)
{
  Response.call(this, constants.ResponseType.INTERIM_ACTUAL_VALUES);

  /**
   * @type {number}
   */
  this.stepNumber = stepNumber;

  /**
   * @type {number}
   */
  this.time = time;

  /**
   * @type {number}
   */
  this.value1 = value1;

  /**
   * @type {string}
   */
  this.unit1 = unit1;

  /**
   * @type {number}
   */
  this.value2 = value2;

  /**
   * @type {string}
   */
  this.unit2 = unit2;

  /**
   * @type {number}
   */
  this.messageCounter = messageCounter;
}

util.inherits(InterimActualValuesResponse, Response);

/**
 * @param {Buffer} responseBuffer
 * @returns {InterimActualValuesResponse}
 * @throws {InvalidResponseError}
 */
InterimActualValuesResponse.fromResponseBuffer = function(responseBuffer)
{
  var data = util.decodeResponseBuffer(responseBuffer);

  if (data.length < 4)
  {
    throw new InvalidResponseError(responseBuffer);
  }

  var stepNumber = parseInt(data.shift(), 10);
  var valueAndUnit1 = util.decodeValueAndUnit(data.shift());
  var valueAndUnit2 = util.decodeValueAndUnit(data.shift());
  var time = parseInt(data.shift(), 10);

  if (isNaN(stepNumber) || isNaN(time))
  {
    throw new InvalidResponseError(responseBuffer);
  }

  var messageCounter;

  for (var i = 0; i < data.length; ++i)
  {
    messageCounter = parseInt('0' + data[i], 16);
  }

  return new InterimActualValuesResponse(
    stepNumber,
    time,
    valueAndUnit1.value,
    valueAndUnit1.unit,
    valueAndUnit2.value,
    valueAndUnit2.unit,
    typeof messageCounter === 'number' ? messageCounter : -1
  );
};
