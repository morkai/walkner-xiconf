// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var util = require('./util');
var ProgramStep = require('./ProgramStep');

module.exports = FctTest;

var SET_VALUE_BOUNDRIES = {
  0: [0.01, 64, 100],
  1: [1, 15000, 10],
  2: [1, 15000, 10],
  3: [0.01, 1, 100],
  6: [20, 300, 1],
  7: [10, 9999, 1],
  8: [1, 2, 1]
};

/**
 * @constructor
 * @param {object} options
 * @param {string} [options.label]
 * @param {number} options.step
 * @param {number} options.upperToleranceRel
 * @param {number} options.startTime
 * @param {number} options.duration
 * @param {number} options.execution
 * @param {number} options.range
 * @param {number} options.voltage
 * @param {number} options.lowerToleranceAbs
 * @param {number} options.upperToleranceAbs
 * @param {boolean} options.correction
 * @param {boolean} options.leaveOn
 * @param {number} options.uTolerance
 * @param {number} options.retries
 * @param {number} options.lowerToleranceRel
 * @param {boolean} options.cancelOnFailure
 * @param {number} options.visMode
 * @param {number} options.goInput
 * @param {number} options.noGoInput
 * @param {boolean} options.enabled
 * @param {number} options.rsvChannel
 * @param {number} options.rsvNumber
 * @param {boolean} options.multi
 * @param {number} options.trigger
 * @throws {Error}
 */
function FctTest(options)
{
  ProgramStep.call(this, options);

  var setValueBoundries = SET_VALUE_BOUNDRIES[options.mode] || [0, 0, 1];

  util.validateEnum(
    'mode',
    options.mode,
    [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
  );
  util.validateNumber('setValue', options.setValue, setValueBoundries[0], setValueBoundries[1]);
  util.validateNumber('upperToleranceRel', options.upperToleranceRel, 0, 100);
  util.validateNumber('startTime', options.startTime, 0, 86400);
  util.validateNumber('duration', options.duration, 0, 86400);
  util.validateEnum('execution', options.execution, [0, 1, 2, 4]);
  util.validateNumber('range', options.range, 0, 65535);
  util.validateNumber('voltage', options.voltage, 0, 400);
  util.validateNumber('lowerToleranceAbs', options.lowerToleranceAbs, 0, setValueBoundries[1] * 2);
  util.validateNumber('upperToleranceAbs', options.upperToleranceAbs, 0, setValueBoundries[1] * 2);
  util.validateBool('correction', options.correction);
  util.validateBool('leaveOn', options.leaveOn);
  util.validateNumber('uTolerance', options.uTolerance, 0, 100);
  util.validateNumber('retries', options.retries, 0, 5);
  util.validateNumber('lowerToleranceRel', options.lowerToleranceRel, 0, 100);
  util.validateBool('cancelOnFailure', options.cancelOnFailure);
  util.validateEnum('visMode', options.visMode, [0, 1]);
  util.validateNumber('goInput', options.goInput, 0, 2000);
  util.validateNumber('noGoInput', options.noGoInput, 0, 2000);
  util.validateBool('enabled', options.enabled);
  util.validateEnum('rsvChannel', options.rsvChannel, [0, 1, 2, 3, 4, 5, 6, 7]);
  util.validateNumber('rsvNumber', options.rsvNumber, 1, 100);
  util.validateBool('multi', options.multi);
  util.validateEnum('trigger', options.trigger, [0, 1, 2]);

  this.setValue = Math.round(options.setValue * setValueBoundries[2]) / setValueBoundries[2];
  this.upperToleranceRel = Math.floor(options.upperToleranceRel);
  this.startTime = options.startTime;
  this.duration = options.duration;
  this.execution = options.execution;
  this.range = Math.floor(options.range);
  this.voltage = Math.floor(options.voltage);
  this.lowerToleranceAbs = Math.round(options.lowerToleranceAbs * setValueBoundries[2]) / setValueBoundries[2];
  this.upperToleranceAbs = Math.round(options.upperToleranceAbs * setValueBoundries[2]) / setValueBoundries[2];
  this.correction = util.bool(options.correction);
  this.mode = options.mode;
  this.leaveOn = util.bool(options.leaveOn);
  this.uTolerance = Math.floor(options.uTolerance);
  this.rMin = 0;
  this.retries = Math.floor(options.retries);
  this.lowerToleranceRel = Math.floor(options.lowerToleranceRel);
  this.cancelOnFailure = util.bool(options.cancelOnFailure);
  this.visMode = options.visMode;
  this.goInput = Math.floor(options.goInput);
  this.noGoInput = Math.floor(options.noGoInput);
  this.enabled = util.bool(options.enabled);
  this.rsvChannel = options.rsvChannel;
  this.rsvNumber = Math.floor(options.rsvNumber);
  this.multi = util.bool(options.multi);
  this.trigger = options.trigger;
}

util.inherits(FctTest, ProgramStep);

/**
 * @enum {number}
 */
FctTest.Mode = {
  CURRENT: 0,
  APPARENT_POWER: 1,
  ACTIVE_POWER: 2,
  COS_PHI: 3,
  VISUAL_CHECK: 5,
  RESIDUAL_VOLTAGE: 6,
  RPM: 7,
  SENSE_OF_ROTATION: 8,
  ANALOG_0: 9,
  ANALOG_1: 10,
  ANALOG_2: 11,
  ANALOG_3: 12,
  ANALOG_4: 13,
  ANALOG_5: 14,
  ANALOG_6: 15,
  ANALOG_7: 16,
  ANALOG_8: 17,
  ANALOG_9: 18,
  ANALOG_10: 19,
  ANALOG_11: 20,
  ANALOG_12: 21,
  ANALOG_13: 22,
  ANALOG_14: 23,
  ANALOG_15: 24,
  FI: 25
};

/**
 * @enum {number}
 */
FctTest.Execution = {
  AUTO: 0,
  HOLD_START: 1,
  STOP_BEFORE_TEST: 2,
  STOP_AFTER_TEST: 4
};

/**
 * @enum {number}
 */
FctTest.VisMode = {
  NORMAL: 0,
  CONDITIONAL: 1
};

/**
 * @enum {number}
 */
FctTest.RsvChannel = {
  L1_N: 0,
  L1_PE: 1,
  N_PE: 2,
  L2_N: 3,
  L1_L2: 4,
  L3_N: 5,
  L1_L3: 6,
  L2_L3: 7
};

/**
 * @enum {number}
 */
FctTest.Trigger = {
  START_TIME: 0,
  STARTING_SIGNAL: 1,
  MEASURED_VALUE: 2
};

/**
 * @returns {FctTest}
 */
FctTest.fromObject = function(obj)
{
  if (obj instanceof FctTest)
  {
    return obj;
  }

  return new FctTest(obj);
};

/**
 * @returns {number}
 */
FctTest.prototype.getTotalTime = function()
{
  return (this.startTime + this.duration) * 1000;
};

/**
 * @param {number} [step]
 * @returns {string}
 */
FctTest.prototype.serializeCommand = function(step)
{
  var fractionalDigits = Math.log10((SET_VALUE_BOUNDRIES[this.mode] || [0, 0, 1])[2]);

  return 'F9-' + [
    step || this.step,
    this.setValue.toFixed(fractionalDigits),
    this.upperToleranceRel,
    Math.floor(this.startTime * 1000),
    Math.floor(this.duration * 1000),
    this.execution,
    this.range,
    this.voltage,
    this.upperToleranceAbs.toFixed(fractionalDigits),
    this.lowerToleranceAbs.toFixed(fractionalDigits),
    this.correction,
    this.mode,
    this.leaveOn,
    this.uTolerance,
    this.rMin,
    this.retries,
    this.lowerToleranceRel,
    this.cancelOnFailure,
    this.visMode,
    this.goInput,
    this.noGoInput,
    this.enabled ? 0 : 1,
    this.rsvChannel,
    this.rsvNumber,
    this.multi,
    this.trigger
  ].join('_');
};
