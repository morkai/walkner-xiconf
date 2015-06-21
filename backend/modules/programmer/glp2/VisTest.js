// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');
var ProgramStep = require('./ProgramStep');

module.exports = VisTest;

/**
 * @constructor
 * @param {object} options
 * @param {string} [options.label]
 * @param {number} options.step
 * @param {number} options.duration
 * @param {boolean} options.goInput
 * @param {number} options.noGoInput
 * @param {boolean} options.cancelOnFailure
 * @param {number} options.mode
 * @param {boolean} options.enabled
 * @param {number} options.maxDuration
 * @throws {Error}
 */
function VisTest(options)
{
  ProgramStep.call(this, options);

  util.validateNumber('duration', options.duration, 0, 60);
  util.validateNumber('goInput', options.goInput, 0, 2000);
  util.validateNumber('noGoInput', options.noGoInput, 0, 2000);
  util.validateBool('cancelOnFailure', options.cancelOnFailure);
  util.validateEnum('mode', options.mode, [0, 1]);
  util.validateBool('enabled', options.enabled);
  util.validateNumber('maxDuration', options.maxDuration, 0, 86400);

  this.duration = Math.floor(options.duration);
  this.goInput = Math.floor(options.goInput);
  this.noGoInput = Math.floor(options.noGoInput);
  this.cancelOnFailure = util.bool(options.cancelOnFailure);
  this.mode = options.mode;
  this.enabled = util.bool(options.enabled);
  this.maxDuration = Math.floor(options.maxDuration);
}

util.inherits(VisTest, ProgramStep);

VisTest.Mode = {
  NORMAL: 0,
  CONDITION: 1
};

/**
 * @returns {VisTest}
 */
VisTest.fromObject = function(obj)
{
  if (obj instanceof VisTest)
  {
    return obj;
  }

  return new VisTest(obj);
};

/**
 * @param {number} [step]
 * @returns {string}
 */
VisTest.prototype.serializeCommand = function(step)
{
  return 'l' + [
    step || this.step,
    Math.floor(this.duration * 1000),
    this.goInput,
    this.noGoInput,
    this.cancelOnFailure,
    this.mode,
    this.enabled ? 0 : 1,
    Math.floor(this.maxDuration * 1000)
  ].join('_');
};
