/**
 * Path to the ConfigProgrammer.exe.
 *
 * @type {String}
 */
exports.cmd = 'C:\\Program Files (x86)\\Philips\\Xitanium outdoor config\\ConfigProgrammer.exe';

/**
 * Additional arguments passed to the ConfigProgrammer.exe.
 *
 * @type {Array.<string>}
 */
exports.args = [
  '-a',
  '255',
  '-d',
  'C:\\Program Files (x86)\\Philips\\Xitanium outdoor config\\memorybank.xml'
];

/**
 * Number of ms after which the ConfigProgrammer.exe will be killed if it does not
 * complete operation.
 *
 * @type {Number}
 */
exports.timeout = 60 * 1000;
