// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');

module.exports = ProgramStep;

/**
 * @constructor
 * @param {object} options
 * @param {string} [options.label]
 * @param {number} [options.step]
 * @throws {Error}
 */
function ProgramStep(options)
{
  if (!options.step)
  {
    options.step = 1;
  }

  util.validateNumber('step', options.step, 1, 254);

  this.label = (typeof options.label === 'string' ? options.label : '').trim();

  if (this.label.length > 32)
  {
    throw new Error("Label's max length exceeded. Expected at most 32 characters, got: : " + this.label.length);
  }

  this.step = Math.floor(options.step);
}

/**
 * @returns {number}
 */
ProgramStep.prototype.getTotalTime = function()
{
  return 0;
};

/**
 * @returns {string}
 */
ProgramStep.prototype.serializeCommand = function()
{
  return '';
};

/**
 * @param {number} [step]
 * @returns {string}
 */
ProgramStep.prototype.toString = function(step)
{
  var dataString = this.serializeCommand(step);

  if (dataString.charAt(dataString.length - 1) !== ' ')
  {
    dataString += ' ';
  }

  if (this.label.length > 0)
  {
    dataString += 'D' + (step || this.step) + '_' + util.encodeStringValue(this.label) + ' ';
  }

  return dataString;
};
