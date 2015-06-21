// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var util = require('./util');
var ProgramStep = require('./ProgramStep');

module.exports = IsoTest;

var SET_VALUE_BOUNDRIES = {
  0: [1, 500, 10],
  1: [0.001, 3, 1000],
  2: [10, 1000, 1]
};
var MAX_MIN_SET_VALUE = {
  0: [0, 1],
  1: [3, 1000],
  2: [1000, 1]
};

/**
 * @constructor
 * @param {object} options
 * @param {string} [options.label]
 * @param {number} options.step
 * @param {number} options.setValue
 * @param {number} options.duration
 * @param {boolean} options.probe
 * @param {number} options.connection
 * @param {number} options.u
 * @param {number} options.rMax
 * @param {number} options.startTime
 * @param {number} options.retries
 * @param {boolean} options.cancelOnFailure
 * @param {boolean} options.enabled
 * @param {boolean} options.multi
 * @param {number} options.ramp
 * @param {number} options.mode
 * @param {number} options.minSetValue
 * @throws {Error}
 */
function IsoTest(options)
{
  ProgramStep.call(this, options);

  var setValueBoundries = SET_VALUE_BOUNDRIES[options.mode];
  var maxMinSetValue = MAX_MIN_SET_VALUE[options.mode];

  util.validateEnum('mode', options.mode, [0, 1, 2]);
  util.validateNumber('setValue', options.setValue, setValueBoundries[0], setValueBoundries[1]);
  util.validateNumber('duration', options.duration, 0, 60);
  util.validateBool('probe', options.probe);
  util.validateNumber('connection', options.connection, 0, 17);
  util.validateNumber('u', options.u, 100, 1000);
  util.validateNumber('rMax', options.rMax, 0, 500);
  util.validateNumber('startTime', options.startTime, 0, 60);
  util.validateNumber('retries', options.retries, 0, 5);
  util.validateBool('cancelOnFailure', options.cancelOnFailure);
  util.validateBool('enabled', options.enabled);
  util.validateBool('multi', options.multi);
  util.validateNumber('ramp', options.ramp, 0, 60);
  util.validateNumber('minSetValue', options.minSetValue, 0, maxMinSetValue[0]);

  this.setValue = Math.round(options.setValue * setValueBoundries[2]) / setValueBoundries[2];
  this.duration = options.duration;
  this.probe = util.bool(options.probe);
  this.connection = Math.floor(options.connection);
  this.u = Math.floor(options.u);
  this.rMax = Math.floor(options.rMax);
  this.startTime = options.startTime;
  this.buzzer = 0;
  this.retries = Math.floor(options.retries);
  this.cancelOnFailure = util.bool(options.cancelOnFailure);
  this.enabled = util.bool(options.enabled);
  this.multi = util.bool(options.multi);
  this.ramp = options.ramp;
  this.mode = options.mode;
  this.minSetValue = Math.round(options.minSetValue * maxMinSetValue[1]) / maxMinSetValue[1];
}

util.inherits(IsoTest, ProgramStep);

IsoTest.Mode = {
  RESISTANCE: 0,
  CURRENT: 1,
  VARISTOR: 2
};

IsoTest.Connection = {
  PE1_PE2: 0,
  LN_PE1_PE2: 1,
  L1_N: 2,
  L1_PE1: 3,
  N_PE1: 4,
  L1_PE2: 5,
  N_PE2: 6,
  LN_PE1: 7,
  LN_PE2: 8,
  L2_N: 9,
  L1_L2: 10,
  L3_N: 11,
  L1_L3: 12,
  L2_L3: 13,
  L2_PE1: 14,
  L2_PE2: 15,
  L3_PE1: 16,
  L3_PE2: 17
};

/**
 * @returns {IsoTest}
 */
IsoTest.fromObject = function(obj)
{
  if (obj instanceof IsoTest)
  {
    return obj;
  }

  return new IsoTest(obj);
};

/**
 * @returns {number}
 */
IsoTest.prototype.getTotalTime = function()
{
  return (this.startTime + this.duration) * 1000;
};

/**
 * @param {number} [step]
 * @returns {string}
 */
IsoTest.prototype.serializeCommand = function(step)
{
  return 'I9-' + [
    step || this.step,
    this.setValue.toFixed(Math.log10(SET_VALUE_BOUNDRIES[this.mode][2])),
    Math.floor(this.duration * 1000),
    this.probe,
    this.connection,
    this.u,
    this.rMax,
    Math.floor(this.startTime * 1000),
    this.buzzer,
    this.retries,
    this.cancelOnFailure,
    this.enabled ? 0 : 1,
    this.multi,
    Math.floor(this.ramp * 1000),
    this.mode,
    this.minSetValue.toFixed(Math.log10(MAX_MIN_SET_VALUE[this.mode][1]))
  ].join('_');
};
