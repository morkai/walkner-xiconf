// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

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
