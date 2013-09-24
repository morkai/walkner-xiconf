'use strict';

app.get('/', function(req, res)
{
  res.render('index', {
    config: {
      state: app.state,
      historyEntry: app.historyEntry
    },
    historyEntries: app.historyEntries
  });
});

require('./history');
