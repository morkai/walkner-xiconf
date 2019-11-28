// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var constants = require('./constants');
var TestResult = require('./TestResult');

module.exports = HvTestResult;

/**
 * @constructor
 * @extends {TestResult}
 * @param {number} stepNumber
 * @param {string} label
 * @param {boolean} evaluation
 * @param {number} testVoltage
 * @param {number} maxCurrent
 * @param {number} actualVoltage
 * @param {number} actualCurrent
 * @param {number} time
 */
function HvTestResult(stepNumber, label, evaluation, testVoltage, maxCurrent, actualVoltage, actualCurrent, time)
{
  TestResult.call(this, 'HV', stepNumber, label, evaluation);

  /**
   * @type {number}
   */
  this.testVoltage = testVoltage;

  /**
   * @type {number}
   */
  this.maxCurrent = maxCurrent;

  /**
   * @type {number}
   */
  this.actualVoltage = actualVoltage;

  /**
   * @type {number}
   */
  this.actualCurrent = actualCurrent;

  /**
   * @type {number}
   */
  this.time = time;
}

util.inherits(HvTestResult, TestResult);

/**
 * @param {string} testMethod
 * @param {number} stepNumber
 * @param {Array.<string>} data
 * @returns {HvTestResult|null}
 */
HvTestResult.fromResponseData = function(testMethod, stepNumber, data)
{
  var testVoltage = parseFloat(data.shift());
  var maxCurrent = parseFloat(data.shift());
  var actualVoltage = parseFloat(data.shift());
  var actualCurrent = parseFloat(data.shift());

  if (isNaN(testVoltage) || isNaN(maxCurrent) || isNaN(actualVoltage) || isNaN(actualCurrent))
  {
    return null;
  }

  var time = -1;
  var label = '';
  var extraData = (data.shift() || '').split('_');
  var evaluation = extraData.shift() === constants.TestEvaluation.SUCCESS;

  if (extraData.length > 0)
  {
    time = Math.round(parseFloat(extraData.shift()) * 1000);

    if (isNaN(time))
    {
      return null;
    }
  }

  if (extraData.length > 0)
  {
    label = util.decodeStringValue(extraData.join('_'));
  }

  return new HvTestResult(
    stepNumber,
    label,
    evaluation,
    testVoltage,
    maxCurrent,
    actualVoltage,
    actualCurrent,
    time
  );
};
