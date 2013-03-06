var fs = require('fs');
var WritableStreamBuffer = require('stream-buffers').WritableStreamBuffer;
var unzip = require('unzip');
var xml2js = require('xml2js');
var config = require('./config');

var cachedProgramsFile = __dirname + '/../data/programs.json';
var sharedStringsPath = 'xl/sharedStrings.xml';
var sheetPath = 'xl/worksheets/sheet' + config.xlsxOptions.sheetId + '.xml';
var sharedStringsEntry = null;
var sheetEntry = null;

/**
 * @param {function(Error, object)} done
 */
exports.parse = function(done)
{
  fs.createReadStream(config.xlsxProgramsFilePath)
    .pipe(unzip.Parse())
    .on('entry', onEntry)
    .on('end', function()
    {
      if (sharedStringsEntry && sheetEntry)
      {
        parse(sheetEntry, sharedStringsEntry, function(err, programs)
        {
          if (!err)
          {
            fs.writeFile(cachedProgramsFile, JSON.stringify(programs));
          }

          return done(err, programs);
        });
      }
      else
      {
        app.log(
          "Failed to parse the programs XLSX file: "
            + "sheetN.xml or sharedStrings.xml file is missing!"
        );

        loadCachedPrograms(done);
      }

      sharedStringsEntry = null;
      sheetEntry = null;
    });
};

/**
 * @private
 * @param {function(Error, object)} done
 */
function loadCachedPrograms(done)
{
  fs.readFile(cachedProgramsFile, function(err, json)
  {
    if (err)
    {
      return done(err);
    }

    try
    {
      return done(null, JSON.stringify(json));
    }
    catch (err)
    {
      return done(err);
    }
  });
}

/**
 * @private
 * @param {object} entry
 */
function onEntry(entry)
{
  var path = entry.path;

  if (path === sharedStringsPath)
  {
    sharedStringsEntry = entry;
  }
  else if (path === sheetPath)
  {
    sheetEntry = entry;
  }
}

/**
 * @private
 * @param {object} sheetEntry
 * @param {object} sharedStringsEntry
 * @param {function(Error, object)} done
 */
function parse(sheetEntry, sharedStringsEntry, done)
{
  parseSharedStrings(sharedStringsEntry, function(err, sharedStrings)
  {
    if (err)
    {
      console.error(err.message);

      return;
    }

    parseSheet(sheetEntry, sharedStrings, done);
  });
}

/**
 * @private
 * @param {string} sharedStringsEntry
 * @param {function(Error, Array.<string>)} done
 */
function parseSharedStrings(sharedStringsEntry, done)
{
  var stream = new WritableStreamBuffer();

  stream.on('close', function()
  {
    var xml = stream.getContentsAsString('utf8');
    var options = {
      ignoreAttrs: true,
      explicitArray: false
    };

    xml2js.parseString(xml, options, function(err, rawSharedStrings)
    {
      if (err)
      {
        return done(err);
      }

      return done(null, prepareSharedStrings(rawSharedStrings));
    });
  });

  sharedStringsEntry.pipe(stream);
}

/**
 * @private
 * @param {object} rawSharedStrings
 * @returns {Array.<string>}
 */
function prepareSharedStrings(rawSharedStrings)
{
  var sharedStrings = [];

  if (!rawSharedStrings.sst || !rawSharedStrings.sst.si)
  {
    return sharedStrings;
  }

  rawSharedStrings.sst.si.forEach(function(rawSharedString)
  {
    var str = '';

    if (rawSharedString.t)
    {
      str = rawSharedString.t;
    }
    else if (rawSharedString.r)
    {
      var parts = Array.isArray(rawSharedString.r)
        ? rawSharedString.r
        : [rawSharedString.r];

      parts.forEach(function(part) { str += part.t; });
    }

    sharedStrings.push(str.trim());
  });

  return sharedStrings;
}

/**
 * @private
 * @param {object} sheetEntry
 * @param {Array.<string>} sharedStrings
 * @param {function(Error, object)} done
 */
function parseSheet(sheetEntry, sharedStrings, done)
{
  var stream = new WritableStreamBuffer();

  stream.on('close', function()
  {
    var xml = stream.getContentsAsString('utf8');
    var options = {

    };

    xml2js.parseString(xml, options, function(err, rawSheet)
    {
      if (err)
      {
        return done(err);
      }

      if (!rawSheet
        || !rawSheet.worksheet
        || !rawSheet.worksheet.sheetData
        || !rawSheet.worksheet.sheetData[0]
        || !rawSheet.worksheet.sheetData[0].row)
      {
        return done(new Error("Invalid sheetN.xml file!"));
      }

      var rows = rawSheet.worksheet.sheetData[0].row;
      var programs = {};

      rows.forEach(function(row)
      {
        var nc = extractNc(row, sharedStrings);

        if (nc === null)
        {
          return;
        }

        var label = extractLabel(row, sharedStrings);

        if (label === null)
        {
          return;
        }

        var aoc = extractAoc(label);

        if (aoc === null)
        {
          return;
        }

        programs[nc] = {
          nc: nc,
          label: label,
          aoc: aoc
        };
      });

      return done(null, programs);
    });
  });

  sheetEntry.pipe(stream);
}

/**
 * @private
 * @param {object} row
 * @param {Array.<string>} sharedStrings
 * @returns {string|null}
 */
function extractNc(row, sharedStrings)
{
  for (var column = 0, l = row.c.length; column < l; ++column)
  {
    var cell = row.c[column];

    if (cell.$.r[0] === config.xlsxOptions.ncColumn)
    {
      return String(convertCellValue(cell, sharedStrings)).trim();
    }
  }

  return null;
}

/**
 * @private
 * @param {object} row
 * @param {Array.<string>} sharedStrings
 * @returns {string|null}
 */
function extractLabel(row, sharedStrings)
{
  for (var column = 0, l = row.c.length; column < l; ++column)
  {
    var cell = row.c[column];

    if (cell.$.r[0] === config.xlsxOptions.labelColumn)
    {
      var label = String(convertCellValue(cell, sharedStrings)).trim();
      var matches = label.match(config.xlsxOptions.labelRegExp);

      if (matches !== null)
      {
        label = matches[1].trim();
      }

      return label;
    }
  }

  return null;
}

/**
 * @private
 * @param {string} label
 * @returns {number|null}
 */
function extractAoc(label)
{
  var matches = label.match(config.xlsxOptions.aocRegExp);

  return matches ? +matches[1] : null;
}

/**
 * @private
 * @param {object} cell
 * @param {Array.<string>} sharedStrings
 * @returns {string}
 */
function convertCellValue(cell, sharedStrings)
{
  if (!Array.isArray(cell.v) || cell.v.length === 0)
  {
    return '';
  }

  if (cell.$.t === 's')
  {
    var idx = parseInt(cell.v[0], 10);

    if (idx >= sharedStrings.length)
    {
      return '';
    }

    return sharedStrings[idx];
  }

  return cell.v[0];
}
