
app.io.sockets.on('connection', function(socket)
{
  socket.on('program', function(nc, cb)
  {
    app.program(nc, function(err)
    {
      cb && cb(err ? {message: err.message} : null);
    });
  });
});
