// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var _ = require('lodash');
var step = require('h5.step');
var glp2 = require('./glp2');
var gprs = require('./gprs');
var programMowDriver = require('./programMowDriver');
var programSolDriver = require('./programSolDriver');

module.exports = function programAndTestGlp2(app, programmerModule, programmerType, done)
{
  var settings = app[programmerModule.config.settingsId];
  var currentState = programmerModule.currentState;
  var glp2Manager = programmerModule.glp2Manager;

  programmerModule.log('TESTING_STARTED', {program: currentState.program.name});

  if (!settings.supportsFeature('glp2'))
  {
    return done('GLP2:FEATURE_DISABLED');
  }

  var broker = app.broker.sandbox();
  var startTestAttempts = 0;
  var output = [];
  var prevTxBuffer = new Buffer(0);
  var prevRxNak = false;

  glp2Manager.on('tx', onTx);
  glp2Manager.on('rx', onRx);

  step(
    function resetTesterStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      programmerModule.log('GLP2:RESETTING_TESTER');

      glp2Manager.reset(1, this.next());
    },
    function handleResetTesterResponseStep(err)
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      if (err)
      {
        err.code = 'GLP2:RESETTING_TESTER_FAILURE';

        return this.done(done, err);
      }
    },
    function checkTesterReadinessStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      if (!glp2Manager.isReady())
      {
        return this.skip('GLP2:TESTER_NOT_READY');
      }
    },
    function executeProgramStepsStep()
    {
      if (programmerModule.cancelled)
      {
        return this.skip();
      }

      var steps = [];

      _.forEach(currentState.program.steps, function(step, i)
      {
        if (step.enabled)
        {
          steps.push(createExecuteProgramStepStep(step, i));
        }
      });

      steps.push(this.next());

      step(steps);
    },
    function finalizeStep(err)
    {
      broker.destroy();

      glp2Manager.removeListener('tx', onTx);
      glp2Manager.removeListener('rx', onRx);

      if (!_.isEmpty(output))
      {
        programmerModule.changeState({output: output.join('\n')});
      }

      setImmediate(done, err);
    }
  );

  function onTx(buffer)
  {
    output.push('[GLP2] TX: ' + glp2.prettifyBuffer(buffer));

    prevTxBuffer = buffer;
  }

  function onRx(buffer)
  {
    output.push('[GLP2] RX: ' + glp2.prettifyBuffer(buffer));

    if (buffer.length === 1
      && buffer[0] === glp2.CHR.NAK
      && prevTxBuffer.length === 3
      && prevTxBuffer[0] === glp2.CHR.STX
      && prevTxBuffer[2] === glp2.CHR.ACK)
    {
      if (prevRxNak)
      {
        output.pop();
        output.pop();
      }

      prevRxNak = true;
    }
    else
    {
      prevRxNak = false;
    }
  }

  function createExecuteProgramStepStep(step, stepIndex)
  {
    if (step.type === 'wait')
    {
      return createExecuteWaitStepStep(step, stepIndex);
    }

    if (step.type === 'pe')
    {
      return createExecutePeStepStep(step, stepIndex);
    }

    if (step.type === 'iso')
    {
      return createExecuteIsoStepStep(step, stepIndex);
    }

    if (step.type === 'program')
    {
      return createExecuteProgrammingStepStep(step, stepIndex);
    }

    if (step.type === 'fn')
    {
      return createExecuteFnStepStep(step, stepIndex);
    }

    if (step.type === 'vis')
    {
      return createExecuteVisStepStep(step, stepIndex);
    }

    return function() {};
  }

  function createFinalizeProgramStepStep(stepIndex, done)
  {
    return function finalizeProgramStepStep(err)
    {
      if (this.successTimer)
      {
        clearTimeout(this.successTimer);
        this.successTimer = null;
      }

      if (this.cancelSub)
      {
        this.cancelSub.cancel();
        this.cancelSub = null;
      }

      if (programmerModule.cancelled)
      {
        err = 'CANCELLED';
      }

      if (err)
      {
        if (stepIndex >= 0)
        {
          programmerModule.updateStepProgress(stepIndex, {
            status: 'failure'
          });
        }

        return done(err);
      }

      if (stepIndex >= 0)
      {
        programmerModule.updateStepProgress(stepIndex, {
          status: 'success',
          progress: 100
        });
      }

      var finalizeResponse = this.finalizeResponse;

      if (finalizeResponse)
      {
        this.finalizeResponse = null;
      }

      setImmediate(done, null, finalizeResponse);
    };
  }

  function createExecuteWaitStepStep(programStep, stepIndex, waitingForContinue)
  {
    return function executeWaitStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      if (stepIndex >= 0)
      {
        programmerModule.log('TESTING_EXECUTING_STEP', {
          type: programStep.type,
          index: stepIndex
        });

        programmerModule.updateStepProgress(stepIndex, {
          status: 'active',
          progress: 0,
          value: -1
        });
      }

      var nextProgramStep = this.next();
      var finalizeResponse = null;

      step(
        createEmptyActualValuesStep(),
        function()
        {
          var nextStep = this.next();
          var successTimer = null;
          var progressTimer = null;
          var waitingSub;
          var cancelSub;

          if (programStep.kind === 'auto')
          {
            var totalTime = programStep.duration * 1000;
            var startTime = Date.now();

            this.successTimer = successTimer = setTimeout(nextStep, totalTime);
            this.progressTimer = progressTimer = setInterval(function()
            {
              programmerModule.updateStepProgress(stepIndex, {
                progress: (Date.now() - startTime) * 100 / totalTime
              });
            }, 250);
          }
          else
          {
            if (stepIndex >= 0)
            {
              programmerModule.updateStepProgress(stepIndex, {
                progress: 50
              });
            }

            programmerModule.changeState({waitingForContinue: waitingForContinue || 'test'});

            this.waitingSub = waitingSub = broker.subscribe('programmer.stateChanged', function(changes)
            {
              if (changes.waitingForContinue === null)
              {
                waitingSub.cancel();
                waitingSub = null;

                cancelSub.cancel();
                cancelSub = null;

                setImmediate(nextStep);
              }
            });

            this.cancelMonitor = getActualValues(function(err, res)
            {
              if (err)
              {
                return nextStep(err);
              }

              finalizeResponse = res;

              programmerModule.changeState({waitingForContinue: null});
            });
          }

          cancelSub = this.cancelSub = broker.subscribe('programmer.cancelled', function()
          {
            if (successTimer !== null)
            {
              clearTimeout(successTimer);
              clearInterval(progressTimer);
            }

            nextStep();
          });
        },
        function(err)
        {
          if (this.cancelMonitor)
          {
            this.cancelMonitor();
            this.cancelMonitor = null;
          }

          if (this.progressTimer)
          {
            clearTimeout(this.progressTimer);
            this.progressTimer = null;
          }

          if (this.waitingSub)
          {
            this.waitingSub.cancel();
            this.waitingSub = null;
          }

          if (err)
          {
            return this.skip(err);
          }

          this.finalizeResponse = finalizeResponse;
        },
        createFinalizeProgramStepStep(stepIndex, nextProgramStep)
      );
    };
  }

  function createExecutePeStepStep(programStep, stepIndex)
  {
    return function executePeStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {
        type: programStep.type,
        index: stepIndex
      });

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0
      });

      executeTestStep(glp2.PeTest.fromObject(programStep), stepIndex, this.next());
    };
  }

  function createExecuteIsoStepStep(programStep, stepIndex)
  {
    return function executeIsoStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {
        type: programStep.type,
        index: stepIndex
      });

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0
      });

      executeTestStep(glp2.IsoTest.fromObject(programStep), stepIndex, this.next());
    };
  }

  function createExecuteProgrammingStepStep(programStep, stepIndex)
  {
    function onProgrammingProgress(progress)
    {
      programmerModule.updateStepProgress(stepIndex, {progress: progress});
    }

    return function executeProgrammingStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {
        type: programStep.type,
        index: stepIndex
      });

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0,
        value: -1
      });

      var reset = true;
      var programmingStep = new glp2.FctTest({
        label: programStep.label,
        setValue: 0,
        upperToleranceRel: 100,
        startTime: 60,
        duration: 120,
        execution: glp2.FctTest.Execution.AUTO,
        range: 0,
        voltage: 230,
        lowerToleranceAbs: 0,
        upperToleranceAbs: 0,
        correction: false,
        mode: glp2.FctTest.Mode.VISUAL_CHECK,
        leaveOn: false,
        uTolerance: 100,
        retries: 0,
        lowerToleranceRel: 100,
        cancelOnFailure: true,
        visMode: glp2.FctTest.VisMode.NORMAL,
        goInput: 0,
        noGoInput: 0,
        enabled: true,
        rsvChannel: glp2.FctTest.RsvChannel.L1_N,
        rsvNumber: 1,
        multi: false,
        trigger: glp2.FctTest.Trigger.START_TIME
      });

      step(
        createEmptyActualValuesStep(),
        createSetTestProgramStep(programmingStep),
        createStartTestStep(),
        function delayProgrammingStep(err)
        {
          if (programmerModule.cancelled || err)
          {
            return this.skip(err);
          }

          var nextStep = this.next();
          var nextStepTimer = setTimeout(nextStep, settings.get('glp2ProgrammingDelay') || 0);

          this.cancelSub = broker.subscribe('programmer.cancelled', function()
          {
            clearTimeout(nextStepTimer);
            nextStep();
          });
        },
        function programStep()
        {
          if (programmerModule.cancelled)
          {
            return this.skip();
          }

          if (this.cancelSub)
          {
            this.cancelSub.cancel();
            this.cancelSub = null;
          }

          var nextStep = this.next();

          if (programmerType === null)
          {
            return setImmediate(nextStep, 'GLP2:PROGRAM_NOT_RECOGNIZED');
          }

          this.outputSub = broker.subscribe('programmer.stateChanged', function(changes)
          {
            if (changes.output === undefined)
            {
              return;
            }

            if (_.isString(changes.output) && changes.output.length)
            {
              output.push(changes.output.trim());
            }

            // Reset only after GPRS programming, because it also has a verification step.
            if (programmerType !== 'gprs')
            {
              return;
            }

            reset = false;

            glp2Manager.reset(function(err)
            {
              if (err)
              {
                programmerModule.error("[GLP2] Failed to reset after programming: %s", err.message);
              }
            });
          });

          if (programmerType === 'gprs')
          {
            return gprs.program(app, programmerModule, onProgrammingProgress, nextStep);
          }

          if (programmerType === 'sol')
          {
            return programSolDriver(app, programmerModule, null, onProgrammingProgress, nextStep);
          }

          if (programmerType === 'mow')
          {
            this.sub = programMowDriver(app, programmerModule, onProgrammingProgress, nextStep);

            return;
          }
        },
        function cleaUpProgramStep(err)
        {
          if (this.outputSub)
          {
            this.outputSub.cancel();
            this.outputSub = null;
          }

          if (programmerModule.cancelled || err)
          {
            return this.skip(err);
          }

          if (reset)
          {
            glp2Manager.reset(this.next());
          }
        },
        createFinalizeProgramStepStep(stepIndex, this.next())
      );
    };
  }

  function createExecuteFnStepStep(programStep, stepIndex)
  {
    return function executeFnStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {
        type: programStep.type,
        index: stepIndex
      });

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0
      });

      executeTestStep(glp2.FctTest.fromObject(programStep), stepIndex, this.next());
    };
  }

  function createExecuteVisStepStep(programStep, stepIndex)
  {
    return function executeVisStepStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      programmerModule.log('TESTING_EXECUTING_STEP', {
        type: programStep.type,
        index: stepIndex
      });

      programmerModule.updateStepProgress(stepIndex, {
        status: 'active',
        progress: 0,
        value: -1
      });

      step(
        createEmptyActualValuesStep(),
        createSetTestProgramStep(glp2.VisTest.fromObject(programStep)),
        createStartTestStep(true),
        function executeVisStep()
        {
          var nextStep = this.next();
          var ackTimer = null;
          var progressTimer = null;
          var waitingSub = null;
          var ackStartTime = programStep.duration * 1000;
          var totalTime = 0;
          var startTime = Date.now();

          if (programStep.maxDuration)
          {
            totalTime = programStep.maxDuration * 1000;
          }
          else if (programStep.duration)
          {
            totalTime = programStep.duration * 2 * 1000;
          }

          this.ackTimer = ackTimer = setTimeout(function()
          {
            programmerModule.changeState({
              waitingForContinue: 'vis'
            });
          }, ackStartTime);

          this.progressTimer = progressTimer = setInterval(function()
          {
            programmerModule.updateStepProgress(stepIndex, {
              progress: (Date.now() - startTime) * 100 / totalTime
            });
          }, 250);

          this.waitingSub = waitingSub = broker.subscribe('programmer.stateChanged', function(changes)
          {
            if (changes.waitingForContinue !== null)
            {
              return;
            }

            clearTimeout(ackTimer);
            clearInterval(progressTimer);
            waitingSub.cancel();

            glp2Manager.ackVisTest(true, function(err)
            {
              if (err)
              {
                nextStep(err);
              }
            });
          });

          this.cancelMonitor = getActualValues(function(err, res)
          {
            if (programmerModule.cancelled || err)
            {
              return nextStep(err);
            }

            clearTimeout(ackTimer);
            clearInterval(progressTimer);
            waitingSub.cancel();

            programmerModule.changeState({waitingForContinue: null});

            handleActualValuesResponse(programStep, stepIndex, res, nextStep);
          });

          this.cancelSub = broker.subscribe('programmer.cancelled', nextStep);
        },
        function cleanUpVisStep(err)
        {
          if (this.cancelMonitor)
          {
            this.cancelMonitor();
            this.cancelMonitor = null;
          }

          if (this.ackTimer)
          {
            clearTimeout(this.ackTimer);
            this.ackTimer = null;
          }

          if (this.progressTimer)
          {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
          }

          if (this.waitingSub)
          {
            this.waitingSub.cancel();
            this.waitingSub = null;
          }

          if (err)
          {
            return this.skip(err);
          }
        },
        createFinalizeProgramStepStep(stepIndex, this.next())
      );
    };
  }

  function executeTestStep(programStep, stepIndex, done)
  {
    step(
      createEmptyActualValuesStep(),
      createSetTestProgramStep(programStep),
      createStartTestStep(),
      createMonitorActualValuesStep(programStep, stepIndex),
      createFinalizeProgramStepStep(stepIndex, done)
    );
  }

  function createSetTestProgramStep(programStep)
  {
    return function setTestProgramStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      glp2Manager.setTestProgram(currentState.program.name, programStep, this.next());
    };
  }

  function createStartTestStep(autostart)
  {
    return function startTestStep(err)
    {
      ++startTestAttempts;

      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      if (autostart || startTestAttempts > 1)
      {
        return glp2Manager.startTest(this.next());
      }

      step(
        createExecuteWaitStepStep({kind: 'manual'}, -1, 'glp2'),
        this.next()
      );
    };
  }

  function createEmptyActualValuesStep()
  {
    return function emptyActualValuesStep(err)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      emptyActualValues(this.next());
    };
  }

  function createMonitorActualValuesStep(programStep, stepIndex)
  {
    return function monitorActualValuesStep(err, res)
    {
      if (programmerModule.cancelled || err)
      {
        return this.skip(err);
      }

      if (res)
      {
        handleGetActualValuesResponse(programStep, stepIndex, res, this.next());
      }
      else
      {
        monitorActualValues(programStep, stepIndex, this.next());
      }
    };
  }

  function emptyActualValues(done)
  {
    glp2Manager.getActualValues(function(err, res)
    {
      if (programmerModule.cancelled || err)
      {
        return done(err);
      }

      if (res)
      {
        return setImmediate(emptyActualValues, done);
      }

      return setImmediate(done);
    });
  }

  function monitorActualValues(programStep, stepIndex, done)
  {
    getActualValues(function(err, res)
    {
      if (err)
      {
        return done(err);
      }

      return handleGetActualValuesResponse(programStep, stepIndex, res, done);
    });
  }

  function getActualValues(done)
  {
    var cancelled = false;

    glp2Manager.getActualValues(function(err, res)
    {
      if (cancelled)
      {
        return;
      }

      if (programmerModule.cancelled || err)
      {
        return done(err);
      }

      if (!res)
      {
        return setImmediate(getActualValues, done);
      }

      return setImmediate(done, null, res);
    });

    return function() { cancelled = true; };
  }

  function handleGetActualValuesResponse(programStep, stepIndex, res, done)
  {
    if (programmerModule.cancelled)
    {
      return done();
    }

    if (res.type === glp2.ResponseType.INTERIM_ACTUAL_VALUES)
    {
      return handleInterimActualValuesResponse(programStep, stepIndex, res, done);
    }

    if (res.type === glp2.ResponseType.ACTUAL_VALUES)
    {
      return handleActualValuesResponse(programStep, stepIndex, res, done);
    }

    return done('GLP2:UNEXPECTED_RESPONSE');
  }

  function handleInterimActualValuesResponse(programStep, stepIndex, res, done)
  {
    programmerModule.updateStepProgress(stepIndex, {
      value: res.value1,
      unit: res.unit1,
      progress: Math.round((res.time / programStep.getTotalTime()) * 100)
    });

    setImmediate(monitorActualValues, programStep, stepIndex, done);
  }

  function handleActualValuesResponse(programStep, stepIndex, res, done)
  {
    if (res.faultStatus)
    {
      programmerModule.updateStepProgress(stepIndex, {
        status: 'failure'
      });

      return setImmediate(done, 'GLP2:FAULT:' + res.faultStatus);
    }

    var testResult = res.steps[0];

    if (!testResult)
    {
      // No test results and completed? Operator cancelled the test using the tester's panel.
      if (res.completed)
      {
        return setImmediate(done, 'GLP2:FAULT:' + glp2.FaultStatus.CANCELLED);
      }

      return setImmediate(done);
    }

    if (testResult.evaluation)
    {
      programmerModule.updateStepProgress(stepIndex, {
        status: 'success',
        progress: 100
      });

      return setImmediate(done);
    }

    programmerModule.updateStepProgress(stepIndex, {
      status: 'failure'
    });

    var testStepFailureErr;

    if (testResult.actualValue > testResult.setValue)
    {
      programmerModule.log('GLP2:TEST_STEP_FAILURE', {
        setValue: testResult.setValue,
        actualValue: testResult.actualValue
      });

      testStepFailureErr = new Error(
        "Expected set value: `" + testResult.setValue2 + "`, got actual value: `" + testResult.actualValue2 + "`."
      );
      testStepFailureErr.code = 'GLP2:TEST_STEP_FAILURE';

      return setImmediate(done, testStepFailureErr);
    }
    else if (testResult.actualValue2 > testResult.setValue2)
    {
      programmerModule.log('GLP2:TEST_STEP_FAILURE', {
        setValue: testResult.setValue2,
        actualValue: testResult.actualValue2
      });

      testStepFailureErr = new Error(
        "Expected set value: `" + testResult.setValue2 + "`, got actual value: `" + testResult.actualValue2 + "`."
      );
      testStepFailureErr.code = 'GLP2:TEST_STEP_FAILURE';

      return setImmediate(done, testStepFailureErr);
    }

    setImmediate(done, 'GLP2:TEST_STEP_FAILURE');
  }
};
