// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');
var step = require('h5.step');
var syncPrograms = require('./syncPrograms');
var glp2 = require('../programmer/glp2');

module.exports = function setProgramsRoutes(app, programsModule)
{
  var express = app[programsModule.config.expressId];
  var db = app[programsModule.config.sqlite3Id].db;

  express.get('/xiconf/programs', browseProgramsRoute);

  express.post('/xiconf/programs', addProgramRoute);

  express.post('/xiconf/programs;sync', syncProgramsRoute);

  express.get('/xiconf/programs/:id', readProgramRoute);

  express.put('/xiconf/programs/:id', editProgramRoute);

  express.delete('/xiconf/programs/:id', deleteProgramRoute);

  function browseProgramsRoute(req, res, next)
  {
    var where = 'deleted=0';
    var typeTerm = _.find(req.rql.selector.args, function(term)
    {
      return term.name === 'eq' && term.args[0] === 'type';
    });
    var nameRegexTerm = _.find(req.rql.selector.args, function(term)
    {
      return term.name === 'regex' && term.args[0] === 'name';
    });

    if (typeTerm && _.isString(typeTerm.args[1]) && !_.isEmpty(typeTerm.args[1]))
    {
      where += " AND type = '" + typeTerm.args[1].replace(/'/g, "''") + "'";
    }

    if (nameRegexTerm && _.isString(nameRegexTerm.args[1]) && !_.isEmpty(nameRegexTerm.args[1]))
    {
      where += " AND name LIKE '%" + nameRegexTerm.args[1].replace(/'/g, "''") + "%'";
    }

    step(
      function()
      {
        db.get("SELECT COUNT(*) AS totalCount FROM programs WHERE " + where, this.next());
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
          fields = ['_id', 'name', 'prodLines', 'type', 'updatedAt', 'steps'];
        }

        var sql = "SELECT " + fields + "\
                   FROM programs\
                   WHERE " + where + "\
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
    var program = _.pick(req.body, ['type', 'name', 'prodLines', 'steps']);

    if (!validateProgram(program))
    {
      return next(express.createHttpError('INPUT', 400));
    }

    program.deleted = 0;
    program.createdAt = program.updatedAt = Date.now();
    program._id = program.createdAt.toString(36).toUpperCase()
      + Math.round(1000 + Math.random() * 8999).toString(36).toUpperCase();

    var fieldNames = ['_id', 'createdAt', 'updatedAt', 'deleted', 'type', 'name', 'prodLines', 'steps'];
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
        return res.sendStatus(404);
      }

      row.steps = JSON.parse(row.steps);

      res.json(row);
    });
  }

  function editProgramRoute(req, res, next)
  {
    var program = _.pick(req.body, ['type', 'name', 'prodLines', 'steps']);

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
        model.prodLines = program.prodLines;
        model.steps = program.steps;

        var sql = 'UPDATE programs SET updatedAt=?, name=?, prodLines=?, steps=? WHERE _id=?';
        var params = [model.updatedAt, model.name, model.prodLines, JSON.stringify(model.steps), model._id];

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

  function syncProgramsRoute(req, res, next)
  {
    syncPrograms(app, programsModule, function(err, result)
    {
      if (err)
      {
        return next(err);
      }

      res.json(result);
    });
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

        res.sendStatus(204);

        app.broker.publish('programs.deleted', {
          model: this.model,
          user: null
        });
      }
    );
  }

  function validateProgram(program)
  {
    return (program.type === 't24vdc' || program.type === 'glp2')
      && _.isString(program.name)
      && !_.isEmpty(program.name)
      && _.isString(program.prodLines)
      && _.isArray(program.steps)
      && !_.isEmpty(program.steps)
      && _.every(program.steps, validateProgramStep.bind(null, program.type));
  }

  function validateProgramStep(programType, step)
  {
    if (!_.isObject(step))
    {
      return false;
    }

    step.enabled = !!step.enabled;

    if (step.type === 'wait')
    {
      return validateProgramWaitStep(step);
    }

    if (step.type === 'pe')
    {
      return validateProgramPeStep(programType, step);
    }

    if (step.type === 'iso')
    {
      return validateGlp2ProgramStep(glp2.IsoTest, step);
    }

    if (step.type === 'sol')
    {
      return validateProgramSolStep(step);
    }

    if (step.type === 'program')
    {
      return validateGlp2ProgramStep(glp2.FctTest, step);
    }

    if (step.type === 'fn')
    {
      return validateProgramFnStep(programType, step);
    }

    if (step.type === 'vis')
    {
      return validateGlp2ProgramStep(glp2.VisTest, step);
    }

    return false;
  }

  function validateProgramPeStep(programType, step)
  {
    if (programType === 'glp2')
    {
      return validateGlp2ProgramStep(glp2.PeTest, step);
    }

    return step.startTime >= 0
      && step.duration >= 1
      && step.voltage >= 0.1
      && step.resistanceMax >= 0.01;
  }

  function validateProgramSolStep(step)
  {
    return step.voltage >= 0.1;
  }

  function validateProgramFnStep(programType, step)
  {
    if (programType === 'glp2')
    {
      return validateGlp2ProgramStep(glp2.FctTest, step);
    }

    return step.startTime >= 0
      && step.duration >= 1
      && step.voltage >= 0.1
      && step.powerReq >= 1
      && step.powerMin <= step.powerReq
      && step.powerMax >= step.powerReq
      && step.powerMin <= step.powerMax;
  }

  function validateProgramWaitStep(step)
  {
    return (step.kind === 'manual' || step.kind === 'auto')
      && step.duration >= 0
      && step.voltage >= 0;
  }

  function validateGlp2ProgramStep(ProgramStep, step)
  {
    try
    {
      new ProgramStep(_.merge({step: 1}, step));
    }
    catch (err)
    {
      programsModule.debug("Invalid GLP2 program step: %s", err.message);

      return false;
    }

    return true;
  }
};
