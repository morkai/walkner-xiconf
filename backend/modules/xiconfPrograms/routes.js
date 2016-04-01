// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var _ = require('lodash');
var step = require('h5.step');
var syncPrograms = require('./syncPrograms');
var glp2 = require('../programmer/glp2');

module.exports = function setProgramsRoutes(app, programsModule)
{
  var express = app[programsModule.config.expressId];
  var db = app[programsModule.config.sqlite3Id].db;

  var cachedFilteredPrograms = null;

  app.broker.subscribe('xiconfPrograms.*', function() { cachedFilteredPrograms = null; });
  app.broker.subscribe('settings.changed', function(changes)
  {
    if (changes.prodLine !== undefined
      || changes.testingEnabled !== undefined
      || changes.glp2Enabled !== undefined)
    {
      cachedFilteredPrograms = null;
    }
  });

  express.get('/xiconf/programs', browseProgramsRoute);

  express.post('/xiconf/programs', addProgramRoute);

  express.post('/xiconf/programs;sync', syncProgramsRoute);

  express.get('/xiconf/programs/:id', readProgramRoute);

  express.put('/xiconf/programs/:id', editProgramRoute);

  express.delete('/xiconf/programs/:id', deleteProgramRoute);

  function browseProgramsRoute(req, res, next)
  {
    var prodLineId = req.query.prodLine || '';

    if (prodLineId && cachedFilteredPrograms !== null)
    {
      return res.type('json').send(cachedFilteredPrograms);
    }

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

        if (prodLineId)
        {
          return res.type('json').send(cacheAndFilterPrograms(prodLineId, rows));
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

      app.broker.publish('xiconfPrograms.added', {
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

        app.broker.publish('xiconfPrograms.edited', {
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

        app.broker.publish('xiconfPrograms.deleted', {
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

  function cacheAndFilterPrograms(prodLineId, programs)
  {
    var filteredPrograms = [];

    for (var i = 0; i < programs.length; ++i)
    {
      var program = programs[i];

      if (!filterProgramByProdLine(prodLineId, program))
      {
        continue;
      }

      program.steps = prepareSteps(program.steps);
      program.name$s = prepareSearchName(program.name);
      program.name$f = program.name$s.join('');

      filteredPrograms.push(program);
    }

    cachedFilteredPrograms = JSON.stringify({
      totalCount: filteredPrograms.length,
      collection: filteredPrograms.sort(sortProgramByName)
    });

    return cachedFilteredPrograms;
  }

  function prepareSteps(steps)
  {
    return JSON.parse(steps).map(function(step)
    {
      return _.pick(step, 'kind', 'type', 'duration');
    });
  }

  function prepareSearchName(name)
  {
    return name.trim().toLowerCase().split(/(-?\d*\.?\d+)/g).map(function(part)
    {
      var num = parseFloat(part);

      return isNaN(num) ? part : num;
    });
  }

  function filterProgramByProdLine(prodLineId, program)
  {
    if (_.isEmpty(program.prodLines))
    {
      return true;
    }

    var patterns = program.prodLines.split(';');

    for (var i = 0; i < patterns.length; ++i)
    {
      var pattern = new RegExp('^' + patterns[i].trim().replace(/\*/g, '.*?') + '$', 'i');

      if (pattern.test(prodLineId))
      {
        return true;
      }
    }

    return false;
  }

  function sortProgramByName(a, b)
  {
    a = a.name$s;
    b = b.name$s;

    for (var i = 0, l = Math.min(a.length, b.length); i < l; ++i)
    {
      if (a[i] < b[i])
      {
        return -1;
      }
      else if (a[i] > b[i])
      {
        return 1;
      }
    }

    return 0;
  }
};
