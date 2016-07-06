// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var CHR = require('./util').CHR;

/**
 * @enum {string}
 */
exports.TestEvaluation = {
  SUCCESS: 'IO',
  FAILURE: 'NIO'
};

/**
 * @enum {number}
 */
exports.ResponseType = {
  ACTUAL_VALUES: CHR.IST,
  SELF_TESTS_ACTUAL_VALUES: CHR.SEL,
  ORDER_DATA_DEMAND: CHR.AUF,
  INTERIM_ACTUAL_VALUES: CHR.SAMP,
  DEVICE_OPTIONS: CHR.OPT
};

/**
 * @enum {number}
 */
exports.FaultStatus = {
  SAFETY_CONTACT_INTERRUPTED: 1,
  FUSE_DEFECTIVE: 2,
  NO_TEST_STEP_DEFINED: 3,
  VOLTAGE_SUBSTITUTE_LEAKAGE_CURRENT_NOT_OK: 4,
  SHORT_CIRCUIT_AT_TEST_OBJECT: 5,
  ERROR_AT_VOLTAGE_CONTROL: 6,
  DATA_ERROR: 7,
  BELOW_MINIMUM_CURRENT_AT_LKC: 8,
  CANCELLED: 9,
  BELOW_MIN_VOLTAGE_HV: 10,
  MAX_VOLTAGE_HV_EXCEEDED: 11,
  BELOW_MIN_CURRENT_HV: 12,
  COMMUNICATION_ERROR_AT_HV_ELECTRONICS: 13,
  HV_VOLTAGE_CHECK_FAILED: 14,
  TEST_PROGRAM_DOES_NOT_EXIST: 15,
  ADJUSTING_ERROR_AT_HV_TEST: 16,
  U_MAX_FUSE_OF_LEAKAGE_CURRENT_TEST_EN60601_HAS_TRIGGERED: 17,
  TEST_OBJECT_STILL_UNDER_VOLTAGE: 18,
  MAINS_PLUG_TWISTED: 19,
  PE_OF_MAINS_LEAD_IS_MISSING: 20,
  LPT1_PRINTER_ERROR: 21,
  KEY_SWITCH_HV_DISABLED: 22,
  THERMO_SWITCH_OF_HV_HAS_TRIGGERED: 23,
  UNIT_IS_NOT_OPERATIONAL: 24,
  MAX_PRIMARY_CURRENT_OF_HV_TEST: 25,
  MISSING_OR_INCORRECT_EXTERNAL_FCT_VOLTAGE_PHASE: 26,
  PROTECTION_COVER_CLOSING_ERROR: 27,
  NO_TEST_OBJECT: 28,
  TEST_SEQUENCE_ERROR: 29,
  TEMPERATURE_REGULATION_TEST_ERROR: 30,
  FI_REFERENCE_TEST_ERROR: 31
};

/**
 * @enum {number}
 */
exports.OnOff = {
  OFF: 0,
  ON: 1
};

/**
 * @enum {number}
 */
exports.TransmittingMode = {
  COMPLETE_TESTS: 0,
  SINGLE_TESTS: 1
};

/**
 * @enum {number}
 */
exports.GoSwitchAtVisualCheck = {
  START: 0,
  FOOT: 1,
  PROBE: 2,
  E1: 3,
  E2: 4
};

/**
 * @enum {number}
 */
exports.PeDisplay = {
  OHM: 0,
  VOLT: 1
};

/**
 * @enum {number}
 */
exports.PeSetValues = {
  NORMAL: 0,
  PROBE: 1
};

/**
 * @enum {number}
 */
exports.StartSafetySwitch = {
  OFF: 0,
  HV: 1,
  LV: 2,
  HV_LV: 3
};

/**
 * @enum {number}
 */
exports.CnfFunction = {
  OFF: 0,
  PE_TOUCH: 1,
  LN_TOUCH: 2,
  BUZZER: 3
};

/**
 * @enum {number}
 */
exports.SelfTest = {
  POWER_ON: 0,
  DATE_CHANGE: 1,
  OFF: 2
};

/**
 * @enum {number}
 */
exports.HvProcess = {
  STOP_BEFORE_TEST: 0,
  AUTOMATIC: 1
};

/**
 * @enum {number}
 */
exports.AddProtocolNumber = {
  NEVER: 0,
  ADD_GO: 1,
  ADD_NO_GO: 2,
  ALWAYS: 3
};

/**
 * @enum {number}
 */
exports.RemoteControl = {
  OFF: 0,
  PARTIAL: 1,
  FULL: 2
};

/**
 * @enum {number}
 */
exports.OrderInputs = {
  OFF: 0,
  LOAD: 1,
  SEND: 2
};

/**
 * @enum {number}
 */
exports.TestStepDisplay = {
  SET_VALUES: 0,
  DEFINITIONS: 1,
  CONNECTIONS: 2
};

/**
 * @enum {number}
 */
exports.ActualValueData = {
  STANDARD_PROTOCOL: 0,
  EXTRA_RESULTS: 1,
  WITH_DEFINITIONS: 2
};
