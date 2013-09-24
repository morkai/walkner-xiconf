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
 * Path to the feature configuration file.
 *
 * `${nc}` token will be replaced with the chosen 12NC code.
 *
 * @type {string}
 */
exports.featureFilePattern = 'C:/Features/${nc}.xml';

/**
 * Path to the workflow configuration file.
 *
 * @type {string}
 */
exports.workflowFile = 'C:/workflow.xml';

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
