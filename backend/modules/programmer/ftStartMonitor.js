// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var _ = require('lodash');
var step = require('h5.step');
var coap = require('h5.coap');

module.exports = function setUpFtStartMonitor(app, programmerModule)
{
  var settings = app[programmerModule.config.settingsId];
  var coapClient = null;

  app.broker.subscribe('app.started', monitorStartButtons).setLimit(1);

  function isFtEnabled()
  {
    return !!settings.get('ftEnabled')
      && !programmerModule.currentState.isInProgress()
      && programmerModule.currentState.countdown === -1;
  }

  function monitorStartButtons()
  {
    if (!isFtEnabled())
    {
      return setTimeout(monitorStartButtons, 1000);
    }

    if (coapClient === null)
    {
      coapClient = new coap.Client({
        socket4: false,
        socket6: true,
        ackTimeout: 100,
        ackRandomFactor: 1,
        maxRetransmit: 1
      });
    }

    var startResources = [
      settings.get('ftStartResource1'),
      settings.get('ftStartResource2')
    ];

    step(
      function()
      {
        for (var i = 0; i < startResources.length; ++i)
        {
          if (_.isEmpty(startResources[i]))
          {
            setImmediate(this.group(), null, false);
          }
          else
          {
            request(startResources[i], this.group());
          }
        }
      },
      function(err, states)
      {
        if (!isFtEnabled())
        {
          return setTimeout(monitorStartButtons, 1000);
        }

        if (!Array.isArray(states))
        {
          states = [];
        }

        var start = false;

        for (var i = 0; i < states.length; ++i)
        {
          if (states[i])
          {
            start = true;

            break;
          }
        }

        if (start)
        {
          app.broker.publish('programmer.startRequested');

          setTimeout(monitorStartButtons, 500);
        }
        else
        {
          setTimeout(monitorStartButtons, 100);
        }
      }
    );
  }

  function request(uri, done)
  {
    var req = coapClient.get(uri, {type: 'NON'});
    var complete = _.once(done);

    req.on('timeout', complete.bind(null, null, false));
    req.on('error', complete.bind(null, null, false));
    req.on('response', function(res)
    {
      var state = res.getCode() === coap.Message.Code.CONTENT
        && res.getPayload().toString().indexOf('ON') !== -1;

      complete(null, state);
    });
  }
};
