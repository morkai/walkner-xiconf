var config = require('../config');

app.get('/programs', function(req, res)
{
  var file = config.xlsxProgramsFilePath && config.xlsxProgramsFilePath.length
    ? config.xlsxProgramsFilePath
    : config.csvProgramsFilePath;

  res.render('programs', {
    file: file,
    programs: getProgramsArray(app.programs)
  });
});

app.post('/programs;reload', function(req, res, next)
{
  if (req.body.password !== config.reloadPassword)
  {
    return res.send(403);
  }

  app.reloadPrograms(function(err, programs)
  {
    if (err)
    {
      return next(err);
    }

    return res.json(getProgramsArray(programs));
  });
});

/**
 * @private
 * @param {object.<string, object>} programsObj
 * @returns {Array.<object>}
 */
function getProgramsArray(programsObj)
{
  var programs = [];

  Object.keys(programsObj).forEach(function(nc)
  {
    programs.push(programsObj[nc]);
  });

  return programs;
}
