// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'app/i18n',
  'app/user',
  'app/time',
  'app/viewport',
  'app/core/View',
  'app/data/hotkeys',
  'app/data/settings',
  'app/xiconfPrograms/XiconfProgramCollection',
  'app/xiconfPrograms/views/XiconfProgramStepsView',
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
  settings,
  XiconfProgramCollection,
  XiconfProgramStepsView,
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
      this.programStepsView = new XiconfProgramStepsView({
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

      $steps.find('.xiconfPrograms-step:last-child').css('border-bottom-width', scrollHeight > stepsHeight ? '' : '0');
    },

    resize: function(width, height)
    {
      if (height === undefined)
      {
        height = parseInt(this.el.style.height, 10);
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

      var supportsT24vdc = settings.supportsFeature('t24vdc') && settings.get('testingEnabled');
      var supportsGlp2 = settings.supportsFeature('glp2') && settings.get('glp2Enabled');
      var type = '';

      if (supportsT24vdc && !supportsGlp2)
      {
        type = '&type=t24vdc';
      }

      if (!supportsT24vdc && supportsGlp2)
      {
        type = '&type=glp2';
      }

      var currentProgram = this.model.get('program');

      this.programPickerView = new ProgramPickerView({
        prodLineId: settings.get('prodLine'),
        currentProgramId: currentProgram ? currentProgram._id : null,
        collection: new XiconfProgramCollection(null, {
          rqlQuery: 'sort(name)&prodLine=' + encodeURIComponent(settings.get('prodLine')) + type
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
        this.$id('name')
          .removeClass('hidden')
          .find('a')
          .text(program.name)
          .attr('href', '#xiconf/programs/' + program._id);
        this.$id('steps').removeClass('hidden');
      }

      this.resize();
    }

  });
});
