'use strict';

var csv = require('csv');
var config = require('../config');

app.get('/history', function(req, res, next)
{
  var query = "SELECT DISTINCT "
    + "strftime('%Y-%m-%d', startedAt / 1000, 'unixepoch', 'localtime') "
    + "AS date FROM history";

  app.db.all(query, function(err, rows)
  {
    if (err)
    {
      return next(err);
    }

    res.render('history', {
      days: rows.map(function(row)
      {
        return row.date;
      })
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

    var query = "SELECT rowid AS id, startedAt, nc, error FROM history "
      + "WHERE startedAt BETWEEN ? AND ?";
    var data = [
      new Date(date + ' 00:00:00').getTime(),
      new Date(date + ' 23:59:59').getTime()
    ];

    app.db.all(query, data, function(err, rows)
    {
      if (err)
      {
        return next(err);
      }

      entries.push.apply(
        entries,
        rows.map(function(row)
        {
          app.applyDateTimeStrings(row, row.startedAt);

          return row;
        })
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

  var query = "SELECT *, rowid AS id FROM history WHERE rowid=?";

  app.db.all(query, [id], function(err, rows)
  {
    if (err)
    {
      return next(err);
    }

    if (rows.length === 0)
    {
      return res.send(404);
    }

    var row = rows[0];

    var startedAt = {time: row.startedAt};
    var finishedAt = {time: row.finishedAt};

    app.applyDateTimeStrings(startedAt, row.startedAt);
    app.applyDateTimeStrings(finishedAt, row.finishedAt);

    row.startedAt = startedAt;
    row.finishedAt = finishedAt;

    if (typeof row.workflow !== 'string')
    {
      row.workflow = '-';
    }

    if (typeof row.feature !== 'string')
    {
      row.feature = '-';
    }

    return res.render('historyEntry', {
      historyEntry: row
    });
  });
});

/**
 * @private
 * @param {string} date
 * @return {Boolean}
 */
function validateDate(date)
{
  return (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).test(date);
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
    res.attachment('xitanium+' + req.params.date + '.csv');

    return csv()
      .from.array(entries)
      .transform(function(entry)
      {
        return [
          entry.nc,
          entry.dateString,
          entry.timeString,
          entry.error ? '0': '1',
          entry.error ? entry.error : ''
        ];
      })
      .to(res, {
        delimiter: config.csvOptions.delimiter,
        quote: config.csvOptions.quote,
        escape: config.csvOptions.escape,
        rowDelimiter: 'windows',
        header: true,
        columns: ['nc', 'date', 'time', 'result', 'error']
      });

  default:
    return res.render('historyEntries', {
      dates: req.params.date,
      historyEntries: entries
    });
  }
}
