'use strict';

/**
 * Port on which the HTTP server should listen for requests.
 *
 * @type {number}
 */
exports.httpPort = 1337;

/**
 * Path to the programmer binary file.
 *
 * @type {string}
 */
exports.programmerFile = 'C:/Program Files (x86)/Philips MultiOne Workflow prototype 0.2/MultiOneWorkflow.exe';

/**
 * Path to the feature configuration files.
 *
 * @type {string}
 */
exports.featureFilePath = __dirname + '/../data';

/**
 * Path to the feature configuration fallback files.
 *
 * Will be used only if the reading the file from `featureFilePath` fails.
 *
 * **WARNING**: This directory and everything in it will be deleted after
 * `syncDelay` seconds after a start of the server.
 *
 * @type {string}
 */
exports.fallbackFilePath = 'C:/features';

/**
 * Number of seconds after a start of the program before files from
 * `syncPath` are copied to `fallbackFilePath`.
 *
 * `-1` disables this feature.
 *
 * @type {number}
 */
exports.syncDelay = 5 * 60;

/**
 * Path from which the feature files will be copied to `fallbackFilePath`
 * after `syncDelay`.
 *
 * @type {string}
 */
exports.syncPath = exports.featureFilePath;

/**
 * Path to the workflow configuration file.
 *
 * @type {string}
 */
exports.workflowFile = __dirname + '/../data/workflow.xml';

/**
 * The programming interface.
 *
 * Possible values:
 *
 *  - d - DALI
 *  - z - ZigBee
 *  - i - IP
 *
 * @type {number}
 */
exports.interface = 'd';

/**
 * The log verbosity level of the programmer.
 *
 * Possible values:
 *
 *  - info  – show info, error and fatal messages
 *  - error – show error and fatal messages
 *  - fatal – show fatal messages only
 *
 * @type {string}
 */
exports.logVerbosity = 'info';

/**
 * CSV options used when exporting the history.
 *
 * Available options are:
 *
 *   - `delimiter` - a character to use as the field delimiter.
 *   - `quote` - a character to use for the value quoting.
 *   - `escape` - a character to use for escaping special characters.
 *   - `trim` - whether to ignore leading and trailing whitespace characters.
 *
 * @type {object}
 */
exports.csvOptions = {
  delimiter: ';',
  quote: '"',
  escape: '"',
  trim: true
};
