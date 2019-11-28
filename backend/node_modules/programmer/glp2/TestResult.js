// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

module.exports = TestResult;

/**
 * @constructor
 * @param {string} testMethod
 * @param {number} stepNumber
 * @param {string} label
 * @param {boolean} evaluation
 */
function TestResult(testMethod, stepNumber, label, evaluation)
{
  /**
   * @type {string}
   */
  this.testMethod = testMethod;

  /**
   * @type {number}
   */
  this.stepNumber = stepNumber;

  /**
   * @type {string}
   */
  this.label = label;

  /**
   * @type {boolean}
   */
  this.evaluation = evaluation;
}
