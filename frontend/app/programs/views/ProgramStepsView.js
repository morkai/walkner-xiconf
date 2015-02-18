// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'app/time',
  'app/core/View',
  'app/programs/templates/steps'
], function(
  _,
  time,
  View,
  template
) {
  'use strict';

  return View.extend({

    template: template,

    initialize: function()
    {
      this.listenTo(this.model, 'change:program change:steps', _.debounce(this.render.bind(this), 1));
      this.listenTo(this.model, 'progress', this.updateProgress);
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        steps: this.serializeSteps()
      };
    },

    serializeSteps: function()
    {
      var program = this.model.get('program');

      if (!program)
      {
        return [];
      }

      return program.steps.map(this.serializeStep, this).filter(function(step) { return step !== null; });
    },

    serializeStep: function(step, i)
    {
      if (!step.enabled)
      {
        return null;
      }

      var stepProgress = (this.model.get('steps') || [])[i];
      var viewData = {
        index: i,
        type: step.type,
        progressBarWidth: '0%',
        stepClassName: 'is-idle',
        progressBarClassName: 'progress-bar-default',
        value: '',
        unit: null,
        minValue: null,
        maxValue: null
      };

      if (stepProgress)
      {
        viewData.value = this.prepareStepValue(stepProgress.value);
        viewData.progressBarWidth = stepProgress.progress + '%';
        viewData.stepClassName = 'is-' + stepProgress.status;
        viewData.progressBarClassName = this.getProgressBarClassName(stepProgress.status);
      }

      switch (step.type)
      {
        case 'pe':
          viewData.unit = 'Ω';
          viewData.maxValue = step.resistanceMax.toLocaleString();
          viewData.totalTime = time.toString(step.startTime + step.duration);
          viewData.voltage = step.voltage.toLocaleString();
          viewData.resistanceMax = viewData.maxValue;
          break;

        case 'sol':
          viewData.unit = 'V';
          viewData.voltage = step.voltage.toLocaleString();
          break;

        case 'fn':
          viewData.unit = 'W';
          viewData.minValue = step.powerMin.toLocaleString();
          viewData.maxValue = step.powerMax.toLocaleString();
          viewData.totalTime = time.toString(step.startTime + step.duration);
          viewData.voltage = step.voltage.toLocaleString();
          viewData.powerReq = step.powerReq.toLocaleString();
          viewData.powerMin = viewData.minValue;
          viewData.powerMax = viewData.maxValue;
          break;
      }

      return viewData;
    },

    getProgressBarClassName: function(status)
    {
      var progressBarClassName = status === 'success'
        ? 'progress-bar-success'
        : status === 'failure' ? 'progress-bar-danger' : '';

      if (status === 'active')
      {
        progressBarClassName += ' progress-bar-striped active';
      }

      return progressBarClassName;
    },

    updateProgress: function(stepIndex, changes)
    {
      var $step = this.$('.programs-step[data-index="' + stepIndex + '"]');
      var $progressBar = $step.find('.progress-bar');

      if (changes.progress !== undefined)
      {
        $progressBar.css('width', changes.progress + '%');
      }

      if (changes.status !== undefined)
      {
        $step.prop('className', 'programs-step is-' + changes.status);
        $progressBar.prop('className', 'progress-bar ' + this.getProgressBarClassName(changes.status));
      }

      if (changes.value !== undefined)
      {
        $step.find('.programs-step-value').text(this.prepareStepValue(changes.value));
      }
    },

    prepareStepValue: function(rawValue)
    {
      if (!rawValue)
      {
        return '0';
      }

      if (rawValue > 9999)
      {
        rawValue = 9999;
      }

      return rawValue.toLocaleString().replace(/\s+/g, '').substr(0, 4).replace(/(\.|,)$/, '');
    }

  });
});
