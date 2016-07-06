// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'form2js',
  'js2form',
  'app/viewport',
  '../View'
], function(
  _,
  form2js,
  js2form,
  viewport,
  View
) {
  'use strict';

  return View.extend({

    events: {
      'submit': 'submitForm'
    },

    $errorMessage: null,

    initialize: function()
    {
      this.$errorMessage = null;

      this.listenTo(this.model, 'change', function()
      {
        if (this.isRendered())
        {
          js2form(this.el, this.serializeToForm());
        }
      });
    },

    destroy: function()
    {
      this.hideErrorMessage();
    },

    serialize: function()
    {
      return {
        editMode: !!this.options.editMode,
        idPrefix: this.idPrefix,
        formMethod: this.options.formMethod,
        formAction: this.options.formAction,
        formActionText: this.options.formActionText,
        panelTitleText: this.options.panelTitleText,
        model: this.model.toJSON()
      };
    },

    afterRender: function()
    {
      js2form(this.el, this.serializeToForm());
    },

    serializeToForm: function()
    {
      return this.model.toJSON();
    },

    serializeForm: function(formData)
    {
      return formData;
    },

    submitForm: function()
    {
      this.hideErrorMessage();

      if (!this.el.checkValidity())
      {
        return false;
      }

      var formData = this.serializeForm(form2js(this.el));

      if (!this.checkValidity(formData))
      {
        return false;
      }

      var $submitEl = this.$('[type="submit"]').attr('disabled', true);

      var req = this.promised(this.model.save(formData, {
        wait: true
      }));

      var view = this;

      req.done(function()
      {
        if (typeof view.options.done === 'function')
        {
          view.options.done(true);
        }
        else
        {
          view.broker.publish('router.navigate', {
            url: view.model.genClientUrl(),
            trigger: true
          });
        }
      });

      req.fail(this.handleFailure.bind(this));

      req.always(function()
      {
        $submitEl.attr('disabled', false);
      });

      return false;
    },

    hideErrorMessage: function()
    {
      if (this.$errorMessage !== null)
      {
        viewport.msg.hide(this.$errorMessage);

        this.$errorMessage = null;
      }
    },

    checkValidity: function(formData)
    {
      return !!formData;
    },

    handleFailure: function()
    {
      this.$errorMessage = viewport.msg.show({
        type: 'error',
        text: this.options.failureText
      });
    }

  });
});
