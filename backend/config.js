/**
 * Port on which the HTTP server should listen for requests.
 *
 * @type {number}
 */
exports.httpPort = 1337;

/**
 * Password required to reload the programs through a browser.
 *
 * @type {string}
 */
exports.reloadPassword = '7331';

/**
 * Path to an XSLX file with 12NC to AOC values.
 *
 * If specified, this file will be read and parsed when the application server
 * first starts.
 *
 * Overrides the `csvProgramsFilePath` setting.
 *
 * @type {string}
 */
exports.xlsxProgramsFilePath = '\\\\AdaM\\Xiconf\\lista etykiet graficznych.xlsx';

/**
 * XLSX options used to parse the programs file.
 *
 * Available options are:
 *
 *   - `sheetId` - a numeric ID of the worksheet with the programs data.
 *   - `ncColumn` - a column with the 12NC data (A-Z).
 *   - `labelColumn` - a column with the label data (A-Z). The AOC value will
 *     be extracted from the cells in this column by using the specified
 *     `aocRegExp`.
 *   - `labelRegExp` - a regular expression used to extract a label text
 *     from the label column. The first capture group will be used as the label
 *     text.
 *   - `aocRegExp` - a regular expression used to extract an AOC value from
 *     the label text. The first capture group will be used as the AOC value.
 *
 * @type {object}
 */
exports.xlsxOptions = {
  sheetId: 1,
  ncColumn: 'A',
  labelColumn: 'B',
  labelRegExp: /^LABEL\s+"(.*?)"$/i,
  aocRegExp: /\s+IN\s+([0-9]+)/i
};

/**
 * Path to a CSV file with 12NC to AOC values.
 *
 * If specified, this file will be read and parsed when the application server
 * first starts and then when its contents has been modified.
 *
 * Has no effect if the `xlsxProgramsFilePath` setting is specified.
 *
 * @type {string}
 */
exports.csvProgramsFilePath = __dirname + '/../data/programs.csv';

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
  exports.programmerPath + '/memorybank.xml'
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
