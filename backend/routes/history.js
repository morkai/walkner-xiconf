var DATE_REG_EXP = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
var DATA_FILE_NAME_REGEXP = /^([0-9]{4}-[0-9]{2}-[0-9]{2})\.txt$/;
var DATA_PATH = __dirname + '/../../data';

var fs = require('fs');

app.get('/history', function(req, res, next)
{
  fs.readdir(DATA_PATH, function(err, allFiles)
  {
    if (err)
    {
      return next(err);
    }

    var files = [];

    allFiles.forEach(function(file)
    {
      var matches = file.match(DATA_FILE_NAME_REGEXP);

      if (matches !== null && matches[1])
      {
        files.push(matches[1]);
      }
    });

    return res.render('history', {
      files: files.sort().reverse()
    });
  });
});

app.get('/history/:date', function(req, res, next)
{
  var dates = req.params.date.split('+').filter(validateDate);

  if (!dates.length)
  {
    return res.send("Date parameter is required", 400);
  }

  var entries = [];

  function fetchNextEntries()
  {
    var date = dates.shift();

    if (!date)
    {
      return exportHistoryEntries(entries, req, res);
    }

    var file = DATA_PATH + '/' + date + '.txt';

    return fs.readFile(file, 'utf8', function(err, contents)
    {
      if (err)
      {
        return next(err);
      }

      entries.push.apply(
        entries,
        contents.trim().split('\n').map(JSON.parse).reverse()
      );

      return fetchNextEntries();
    });
  }

  return fetchNextEntries();
});

app.get('/history/:date/:id', function(req, res, next)
{
  var date = req.params.date;

  if (!validateDate(date))
  {
    return res.send("Invalid date parameter", 400);
  }

  var id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 0)
  {
    return res.send("Invalid ID parameter", 400);
  }

  var file = DATA_PATH + '/' + date + '.txt';

  return fs.readFile(file, 'utf8', function(err, contents)
  {
    if (err)
    {
      return next(err);
    }

    var lines = contents.trim().split('\n');

    if (typeof lines[id] !== 'string')
    {
      return res.send("History entry not found", 404);
    }

    return res.render('historyEntry', {
      historyEntry: JSON.parse(lines[id])
    });
  });
});

/**
 * @param {string} date
 * @return {Boolean}
 */
function validateDate(date)
{
  return DATE_REG_EXP.test(date);
}

/**
 * @private
 * @param {Array.<object>} entries
 * @param {object} req
 * @param {object} res
 */
function exportHistoryEntries(entries, req, res)
{
  switch (req.query.export)
  {
    case 'json':
      return res.json(entries);

    case 'csv':
    {
      res.attachment('xitanium+' + req.params.date + '.csv');

      entries.forEach(function(entry)
      {
        res.write(
          entry.dateString + ',' +
            entry.timeString + ',' +
            (entry.result ? 1 : 0) + ','
            + entry.aoc + '\r\n'
        );
      });

      return res.end();
    }

    default:
      return res.render('historyEntries', {
        dates: req.params.date,
        historyEntries: entries
      });
  }
}
