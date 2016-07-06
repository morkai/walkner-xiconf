// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var constants = require('./constants');
var TestResult = require('./TestResult');

module.exports = VisTestResult;

/**
 * @constructor
 * @extends {TestResult}
 * @param {number} stepNumber
 * @param {string} label
 * @param {boolean} evaluation
 */
function VisTestResult(stepNumber, label, evaluation)
{
  TestResult.call(this, 'VIS', stepNumber, label, evaluation);
}

util.inherits(VisTestResult, TestResult);

/**
 * @param {string} testMethod
 * @param {number} stepNumber
 * @param {Array.<string>} data
 * @returns {VisTestResult}
 */
VisTestResult.fromResponseData = function(testMethod, stepNumber, data)
{
  var extraData = (data.shift() || '').split('_');
  var evaluation = extraData.shift() === constants.TestEvaluation.SUCCESS;
  var label = util.decodeStringValue(extraData.join('_'));

  return new VisTestResult(stepNumber, label, evaluation);
};
