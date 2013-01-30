/**
 * Path to a directory with the ConfigProgrammer.exe.
 *
 * @type {string}
 */
exports.path = 'C:/Program Files (x86)/Philips/Xitanium outdoor config';

/**
 * Additional arguments passed to the ConfigProgrammer.exe.
 *
 * @type {Array.<string>}
 */
exports.args = [
  '-a',
  '255',
  '-d',
  exports.path + '/memorybank.xml'
];

/**
 * Number of ms after which the ConfigProgrammer.exe will be killed if it does not
 * complete operation.
 *
 * @type {number}
 */
exports.timeout = 60 * 1000;

/**
 * Minimum AOC value.
 *
 * @type {number}
 */
exports.minAoc = 0;

/**
 * Maximum AOC value.
 *
 * @type {number}
 */
exports.maxAoc = 2500;

/**
 * String that the ConfigProgrammer.exe has to output to consider the
 * programming process successful.
 *
 * @type {string}
 */
exports.successString = 'Verification succes!';

/**
 * String that the ConfigProgrammer.exe has to output to consider the
 * programming process failed.
 *
 * @type {string}
 */
exports.failureString = 'Write FAILED!';
