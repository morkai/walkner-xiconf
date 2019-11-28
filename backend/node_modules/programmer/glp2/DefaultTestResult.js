// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var constants = require('./constants');
var TestResult = require('./TestResult');

module.exports = DefaultTestResult;

/**
 * @constructor
 * @extends {TestResult}
 * @param {string} testMethod
 * @param {number} stepNumber
 * @param {string} label
 * @param {boolean} evaluation
 * @param {number} setValue
 * @param {number} actualValue
 * @param {number} setValue2
 * @param {number} actualValue2
 * @param {number} time
 */
function DefaultTestResult(
  testMethod, stepNumber, label, evaluation, setValue, actualValue, setValue2, actualValue2, time)
{
  TestResult.call(this, testMethod, stepNumber, label, evaluation);

  /**
   * @type {number}
   */
  this.setValue = setValue;

  /**
   * @type {number}
   */
  this.actualValue = actualValue;

  /**
   * @type {number}
   */
  this.setValue2 = setValue2;

  /**
   * @type {number}
   */
  this.actualValue2 = actualValue2;

  /**
   * @type {number}
   */
  this.time = time;
}

util.inherits(DefaultTestResult, TestResult);

/**
 * @param {string} testMethod
 * @param {number} stepNumber
 * @param {Array.<string>} data
 * @returns {DefaultTestResult|null}
 */
DefaultTestResult.fromResponseData = function(testMethod, stepNumber, data)
{
  var setValue = data.shift();
  var actualValue = data.shift();

  setValue = setValue === '-----' ? 0 : parseFloat(setValue);
  actualValue = actualValue === '-----' ? 0 : parseFloat(actualValue);

  if (isNaN(setValue) || isNaN(actualValue))
  {
    return null;
  }

  var setValue2 = -1;
  var actualValue2 = -1;
  var time = -1;
  var label = '';
  var extraData = (data.shift() || '').split('_');
  var evaluation = extraData.shift() === constants.TestEvaluation.SUCCESS;

  if (extraData.length > 0)
  {
    setValue2 = parseFloat(extraData.shift());
  }

  if (extraData.length > 0)
  {
    actualValue2 = parseFloat(extraData.shift());
  }

  if (isNaN(setValue2) || isNaN(actualValue2))
  {
    return null;
  }

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

  return new DefaultTestResult(
    testMethod,
    stepNumber,
    label,
    evaluation,
    setValue,
    actualValue,
    setValue2,
    actualValue2,
    time
  );
};
