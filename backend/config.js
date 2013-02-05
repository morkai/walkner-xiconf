/**
 * Path to a CSV file with 12NC to AOC values.
 *
 * This file will be read and parsed when the application server first starts
 * and then when its contents has been modified.
 *
 * @type {string}
 */
exports.programsFilePath = __dirname + '/../data/programs.csv';

/**
 * CSV options used to parse the programs file.
 *
 * Available options are:
 *
 *   - `columns` - an array of columns as they appear in the CSV file. Should
 *     at least include: `nc`, `label` and `aoc`.
 *   - `delimiter` - a character to use as the field delimiter.
 *   - `quote` - a character to use for the value quoting.
 *   - `escape` - a character to use for escaping special characters.
 *   - `trim` - whether to ignore leading and trailing whitespace characters.
 *
 * @type {object}
 */
exports.csvOptions = {
  columns: ['nc', 'label', 'aoc'],
  delimiter: ';',
  quote: '"',
  escape: '"',
  trim: true
};

/**
 * Path to where the config.xml file should be generated.
 *
 * @type {string}
 */
exports.configFilePath = __dirname + '/../data/config.xml';

/**
 * Path to a directory with the `ConfigProgrammer.exe`.
 *
 * @type {string}
 */
exports.programmerPath = 'C:/Program Files (x86)/Philips/Xitanium outdoor config';

/**
 * Additional arguments passed to the `ConfigProgrammer.exe`.
 *
 * @type {Array.<string>}
 */
exports.programmerArgs = [
  '-a',
  '255',
  '-d',
  exports.path + '/memorybank.xml'
];

/**
 * Number of ms after which the ConfigProgrammer.exe will be killed if it
 * doesn't exit.
 *
 * @type {number}
 */
exports.timeout = 60 * 1000;

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
