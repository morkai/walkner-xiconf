// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var url = require('url');
var _ = require('lodash');
var request = require('request');
var step = require('h5.step');

module.exports = function syncPrograms(app, programsModule, done)
{
  if (!_.isFunction(done))
  {
    done = function() {};
  }

  var db = app[programsModule.config.sqlite3Id].db;
  var settings = app[programsModule.config.settingsId];

  if (programsModule.syncing)
  {
    return done(null, {type: 'warning', text: 'inProgress'});
  }

  if (!settings.supportsFeature('wmes') || (!settings.supportsFeature('t24vdc') && !settings.supportsFeature('glp2')))
  {
    return done(null, {type: 'error', text: 'invalidLicense'});
  }

  var remoteServerUrl = url.parse(settings.get('remoteServer'));

  if (!remoteServerUrl.host)
  {
    return done(null, {type: 'error', text: 'noServer'});
  }

  programsModule.scheduleSync();

  programsModule.syncing = true;

  done(null, {type: 'info', text: 'started'});

  step(
    function fetchProgramsStep()
    {
      db.all("SELECT * FROM programs", this.next());
    },
    function sendProgramsStep(err, programs)
    {
      if (err)
      {
        return this.skip(err);
      }

      remoteServerUrl.pathname = '/xiconf/programs;sync';

      var options = {
        url: url.format(remoteServerUrl),
        json: programs,
        qs: {
          uuid: settings.get('licenseInfo').uuid
        }
      };
      var next = this.next();

      request.post(options, function(err, res, body)
      {
        if (err)
        {
          return next(err);
        }

        if (res.statusCode >= 400)
        {
          if (body && _.isObject(body.error))
          {
            body = body.error.message;
          }
          else
          {
            body = JSON.stringify(body);
          }

          return next(new Error("remote server returned a " + res.statusCode + " response: " + body));
        }

        if (!_.isObject(body) || !_.isArray(body.created) || !_.isArray(body.updated) || !_.isArray(body.deleted))
        {
          return next(new Error("remote server returned an invalid response: " + JSON.stringify(body)));
        }

        return next(null, body);
      });
    },
    function applyChangesStep(err, changes)
    {
      if (err)
      {
        return this.skip(err);
      }

      var i;
      var sql;

      for (i = 0; i < changes.created.length; ++i)
      {
        sql = "INSERT INTO programs(createdAt, updatedAt, deleted, type, name, steps, prodLines, _id)"
          + " VALUES(?, ?, ?, ?, ?, ?, ?, ?)";

        db.run(sql, createQueryParams(changes.created[i]), this.parallel());
      }

      for (i = 0; i < changes.updated.length; ++i)
      {
        sql = "UPDATE programs SET createdAt=?, updatedAt=?, deleted=?, type=?, name=?, steps=?, prodLines=?"
          + "WHERE _id=?";

        db.run(sql, createQueryParams(changes.updated[i]), this.parallel());
      }

      for (i = 0; i < changes.deleted.length; ++i)
      {
        sql = "UPDATE programs SET createdAt=?, updatedAt=?, deleted=?, type=?, name=?, steps=?, prodLines=?"
          + "WHERE _id=?";

        db.run(sql, createQueryParams(changes.deleted[i]), this.parallel());
      }

      this.changes = changes;
    },
    function(err)
    {
      if (err)
      {
        programsModule.error("Failed to sync programs: %s", err.message);
      }
      else
      {
        programsModule.info("Synced programs!");

        var i;
        var changes = this.changes;

        for (i = 0; i < changes.created.length; ++i)
        {
          app.broker.publish('xiconfPrograms.added', {
            model: changes.created[i],
            user: null
          });
        }

        for (i = 0; i < changes.updated.length; ++i)
        {
          app.broker.publish('xiconfPrograms.edited', {
            model: changes.updated[i],
            user: null
          });
        }

        for (i = 0; i < changes.deleted.length; ++i)
        {
          app.broker.publish('xiconfPrograms.deleted', {
            model: changes.deleted[i],
            user: null
          });
        }
      }

      programsModule.syncing = false;

      programsModule.scheduleSync();
    }
  );
};

function createQueryParams(program)
{
  return [
    Date.parse(program.createdAt),
    Date.parse(program.updatedAt),
    program.deleted ? 1 : 0,
    program.type,
    program.name,
    JSON.stringify(program.steps),
    program.prodLines || '',
    program._id
  ];
}
