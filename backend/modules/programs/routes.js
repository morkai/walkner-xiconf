// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');
var step = require('h5.step');

module.exports = function setProgramsRoutes(app, programsModule)
{
  var express = app[programsModule.config.expressId];
  var db = app[programsModule.config.sqlite3Id].db;

  express.get('/programs', browseProgramsRoute);

  express.post('/programs', addProgramRoute);

  express.get('/programs/:id', readProgramRoute);

  express.put('/programs/:id', editProgramRoute);

  express.delete('/programs/:id', deleteProgramRoute);

  function browseProgramsRoute(req, res, next)
  {
    var where = '';
    var nameRegexTerm = _.find(req.rql.selector.args, function(term)
    {
      return term.name === 'regex' && term.args[0] === 'name';
    });

    if (nameRegexTerm && _.isString(nameRegexTerm.args[1]) && !_.isEmpty(nameRegexTerm.args[1]))
    {
      where = " AND name LIKE '%" + nameRegexTerm.args[1].replace(/'/g, "''") + "%'";
    }

    step(
      function()
      {
        db.get("SELECT COUNT(*) AS totalCount FROM programs WHERE deleted=0" + where, this.next());
      },
      function(err, row)
      {
        if (err)
        {
          return this.skip(err);
        }

        this.totalCount = row.totalCount;

        if (row.totalCount === 0)
        {
          return this.skip(null, []);
        }
      },
      function()
      {
        var fields = Object.keys(req.rql.fields).filter(function(field) { return /^[a-z0-9_]+$/i.test(field); });

        if (!fields.length)
        {
          fields = ['_id', 'name', 'type', 'updatedAt'];
        }

        var sql = "SELECT " + fields + "\
                   FROM programs\
                   WHERE deleted=0" + where + "\
                   ORDER BY name ASC\
                   LIMIT " + req.rql.limit + " OFFSET " + req.rql.skip;

        db.all(sql, this.next());
      },
      function(err, rows)
      {
        if (err)
        {
          return next(err);
        }

        if (req.rql.fields.steps)
        {
          rows = rows.map(function(row)
          {
            row.steps = JSON.parse(row);

            return row;
          });
        }

        res.send({
          totalCount: this.totalCount,
          collection: rows
        });
      }
    );
  }

  function addProgramRoute(req, res, next)
  {
    var program = _.pick(req.body, ['type', 'name', 'steps']);

    if (!validateProgram(program))
    {
      return next(express.createHttpError('INPUT', 400));
    }

    program.deleted = 0;
    program.createdAt = program.updatedAt = Date.now();
    program._id = program.createdAt.toString(36).toUpperCase()
      + Math.round(1000 + Math.random() * 8999).toString(36).toUpperCase();

    var fieldNames = ['_id', 'createdAt', 'updatedAt', 'deleted', 'type', 'name', 'steps'];
    var params = {};

    _.forEach(fieldNames, function(fieldName)
    {
      params['$' + fieldName] = program[fieldName];
    });

    params.$steps = JSON.stringify(params.$steps);

    var sql = 'INSERT INTO programs (' + fieldNames + ') VALUES(' + _.keys(params) + ')';

    db.run(sql, params, function(err)
    {
      if (err)
      {
        return next(err);
      }

      res.status(201).json(program);

      app.broker.publish('programs.added', {
        model: program,
        user: null
      });
    });
  }

  function readProgramRoute(req, res, next)
  {
    var sql = "SELECT * FROM programs WHERE _id=? LIMIT 1";

    db.get(sql, [req.params.id], function(err, row)
    {
      if (err)
      {
        return next(err);
      }

      if (!row)
      {
        return res.send(404);
      }

      row.steps = JSON.parse(row.steps);

      res.json(row);
    });
  }

  function editProgramRoute(req, res, next)
  {
    var program = _.pick(req.body, ['type', 'name', 'steps']);

    if (!validateProgram(program))
    {
      return next(express.createHttpError('INPUT', 400));
    }

    step(
      function()
      {
        var sql = "SELECT * FROM programs WHERE _id=? LIMIT 1";

        db.get(sql, [req.params.id], this.next());
      },
      function(err, row)
      {
        if (err)
        {
          return this.skip(err);
        }

        if (!row)
        {
          return this.skip(express.createHttpError('NOT_FOUND', 404));
        }

        this.model = row;
      },
      function()
      {
        var model = this.model;

        model.updatedAt = Date.now();
        model.name = program.name;
        model.steps = program.steps;

        var sql = 'UPDATE programs SET updatedAt=?, name=?, steps=? WHERE _id=?';
        var params = [model.updatedAt, model.name, JSON.stringify(model.steps), model._id];

        db.run(sql, params, this.next());
      },
      function(err)
      {
        if (err)
        {
          return next(err);
        }

        res.send(this.model);

        app.broker.publish('programs.edited', {
          model: this.model,
          user: null
        });
      }
    );
  }

  function deleteProgramRoute(req, res, next)
  {
    step(
      function()
      {
        var sql = "SELECT * FROM programs WHERE _id=? LIMIT 1";

        db.get(sql, [req.params.id], this.next());
      },
      function(err, row)
      {
        if (err)
        {
          return this.skip(err);
        }

        if (!row)
        {
          return this.skip(express.createHttpError('NOT_FOUND', 404));
        }

        row.steps = JSON.parse(row.steps);

        this.model = row;
      },
      function()
      {
        var sql = "UPDATE programs SET deleted=1, updatedAt=? WHERE _id=?";

        db.run(sql, [Date.now(), req.params.id], this.next());
      },
      function(err)
      {
        if (err)
        {
          return next(err);
        }

        res.send(204);

        app.broker.publish('programs.deleted', {
          model: this.model,
          user: null
        });
      }
    );
  }

  function validateProgram(program)
  {
    return program.type === 't24vdc'
      && _.isString(program.name)
      && !_.isEmpty(program.name)
      && _.isArray(program.steps)
      && !_.isEmpty(program.steps)
      && _.every(program.steps, validateProgramStep);
  }

  function validateProgramStep(step)
  {
    if (!_.isObject(step))
    {
      return false;
    }

    step.enabled = !!step.enabled;

    if (step.type === 'pe')
    {
      return validateProgramPeStep(step);
    }

    if (step.type === 'sol')
    {
      return validateProgramSolStep(step);
    }

    if (step.type === 'fn')
    {
      return validateProgramFnStep(step);
    }

    return false;
  }

  function validateProgramPeStep(step)
  {
    return step.startTime >= 0
      && step.duration >= 1
      && step.voltage >= 0.1
      && step.resistanceMax >= 0.01;
  }

  function validateProgramSolStep(step)
  {
    return step.voltage >= 0.1;
  }

  function validateProgramFnStep(step)
  {
    return step.startTime >= 0
      && step.duration >= 1
      && step.voltage >= 0.1
      && step.powerReq >= 1
      && step.powerMin <= step.powerReq
      && step.powerMax >= step.powerReq
      && step.powerMin <= step.powerMax;
  }
};
