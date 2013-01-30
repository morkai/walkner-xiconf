var http = require('http');
var express = require('express');

var app = express();

http.createServer(app).listen(1337, '127.0.0.1');

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(__dirname + '/../frontend'));

app.configure('development', function()
{
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.configure('production', function()
{
  app.use(express.errorHandler());
});

app.get('/', function(req, res)
{
  res.render('index');
});

app.post('/program', function(req, res)
{
  setTimeout(
    function()
    {
      res.send(Math.round(Math.random()) ? 400 : 204);
    },
    Math.floor(Math.random() * 5000) + 500
  );
});
