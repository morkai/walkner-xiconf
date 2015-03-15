// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'app/i18n',
  'app/user',
  'app/time',
  'app/viewport',
  'app/core/View',
  'app/data/hotkeys',
  'app/programs/ProgramCollection',
  'app/programs/views/ProgramStepsView',
  './ProgramPickerView',
  'app/dashboard/templates/program'
], function(
  _,
  t,
  user,
  time,
  viewport,
  View,
  hotkeys,
  ProgramCollection,
  ProgramStepsView,
  ProgramPickerView,
  template
) {
  'use strict';

  return View.extend({

    template: template,

    localTopics: {
      'hotkeys.setProgram': function()
      {
        this.$id('pick').click();
      },
      'viewport.dialog.hidden': function()
      {
        if (this.programPickerView !== null)
        {
          hotkeys.start();

          this.programPickerView = null;
        }
      }
    },

    events: {
      'click #-pick, #-change': function(e)
      {
        e.currentTarget.blur();

        this.showProgramPicker();

        return false;
      }
    },

    initialize: function()
    {
      this.programPickerView = null;
      this.programStepsView = new ProgramStepsView({
        model: this.model
      });

      this.setView('.dashboard-program-steps', this.programStepsView);

      this.listenTo(this.model, 'change:inProgress change:workMode', this.toggleControls);
      this.listenTo(this.model, 'change:program', this.onProgramChange);
      this.listenTo(this.programStepsView, 'afterRender', this.toggleLastStepsBorder);
    },

    destroy: function()
    {
      this.programPickerView = null;
      this.programStepsView = null;
    },

    afterRender: function()
    {
      this.toggleControls();
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        program: this.model.get('program')
      };
    },

    toggleControls: function()
    {
      var disabled = !this.model.isTestingMode() || this.model.isInProgress() || !user.isLocal();

      this.$id('pick').attr('disabled', disabled);
      this.$id('change').attr('disabled', disabled);

      this.hideProgramPicker();
    },

    toggleLastStepsBorder: function()
    {
      var $steps = this.$id('steps');
      var scrollHeight = this.$id('container').prop('scrollHeight');
      var stepsHeight = $steps.outerHeight();

      $steps.find('.programs-step:last-child').css('border-bottom-width', scrollHeight > stepsHeight ? '' : '0');
    },

    resize: function(width, height)
    {
      if (height === undefined)
      {
        height = parseInt(this.el.style.height);
      }
      else
      {
        this.el.style.height = height + 'px';
      }

      var $name = this.$id('name');
      var containerHeight = height;

      if (!$name.hasClass('hidden'))
      {
        containerHeight -= this.$id('name').outerHeight(true);
      }

      this.$id('container').css('height', containerHeight + 'px');

      this.toggleLastStepsBorder();
    },

    showProgramPicker: function()
    {
      if (this.programPickerView !== null)
      {
        return;
      }

      hotkeys.stop();

      this.programPickerView = new ProgramPickerView({
        collection: new ProgramCollection(null, {
          rqlQuery: 'select(_id,name)&sort(name)'
        })
      });

      viewport.showDialog(this.programPickerView, t('dashboard', 'program:picker:title'));
    },

    hideProgramPicker: function()
    {
      if (this.programPickerView !== null)
      {
        viewport.closeDialog();
      }
    },

    onProgramChange: function()
    {
      var program = this.model.get('program');

      if (program === null)
      {
        this.$id('name').addClass('hidden');
        this.$id('steps').addClass('hidden');
        this.$id('pick').removeClass('hidden');
      }
      else
      {
        this.hideProgramPicker();
        this.$id('pick').addClass('hidden');
        this.$id('name').removeClass('hidden').find('span').text(program.name);
        this.$id('steps').removeClass('hidden');
      }

      this.resize();
    }

  });
});
