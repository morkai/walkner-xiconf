var config = require('../config');

app.get('/', function(req, res)
{
  res.render('index', {
    config: config,
    historyEntries: app.historyEntries,
    programming: app.programming
  });
});

require('./program');
require('./history');
