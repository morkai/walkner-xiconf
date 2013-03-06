var csv = require('csv');
var config = require('./config');

/**
 * @param {function(Error, object)} done
 */
exports.parse = function(done)
{
  var programs = {};

  csv().from.path(config.csvProgramsFilePath, config.csvOptions)
    .on('error', function(err)
    {
      if (done)
      {
        done(err);
        done = null;
      }
    })
    .on('record', function(row)
    {
      programs[row.nc] = row;
    })
    .on('end', function()
    {
      if (done)
      {
        done(null, programs);
        done = null;
      }
    });
};
