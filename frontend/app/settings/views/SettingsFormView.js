// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'jquery',
  'underscore',
  'js2form',
  'form2js',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/data/settings',
  '../Settings',
  'app/settings/templates/form'
], function(
  $,
  _,
  js2form,
  form2js,
  t,
  viewport,
  View,
  settings,
  Settings,
  formTemplate
) {
  'use strict';

  var LICENSE_RE = new RegExp(
    '^-----BEGIN LICENSE KEY-----\r?\n?' +
    '([a-zA-Z0-9=+\/\r\n]+)' +
    '-----END LICENSE KEY-----$'
  );

  return View.extend({

    template: formTemplate,

    events: {
      'click .nav-tabs a': function(e)
      {
        e.preventDefault();

        var tab = this.$(e.target).tab('show').parent().attr('data-tab');

        this.broker.publish('router.navigate', {
          url: '/settings?tab=' + tab,
          trigger: false,
          replace: true
        });
      },
      'click .settings-export': function()
      {
        var password = this.$id('password').val();

        window.location.href = '/settings;export?password=' + password;
      },
      'click .settings-save': 'onSaveClick',
      'click .settings-restart': 'onRestartClick',
      'submit': 'onSubmit'
    },

    initialize: function()
    {
      this.idPrefix = _.uniqueId('settingsForm');
      this.onDragEnter = this.onDragEnter.bind(this);
      this.onDragLeave = this.onDragLeave.bind(this);
      this.onDragOver = this.onDragOver.bind(this);
      this.onDrop = this.onDrop.bind(this);

      document.addEventListener('dragenter', this.onDragEnter, false);
      document.addEventListener('dragleave', this.onDragLeave, false);
      document.addEventListener('dragover', this.onDragOver, false);
      document.addEventListener('drop', this.onDrop, false);

      this.listenTo(settings, 'change', this.onSettingsChange);
    },

    destroy: function()
    {
      document.removeEventListener('dragenter', this.onDragEnter, false);
      document.removeEventListener('dragleave', this.onDragLeave, false);
      document.removeEventListener('dragover', this.onDragOver, false);
      document.removeEventListener('drop', this.onDrop, false);
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        hotkeyPattern: '^([A-Z\\[\\]\\;\',./]|Space)$'
      };
    },

    afterRender: function()
    {
      this.importSettings(settings.toJSON());

      this.$('.nav-tabs > li[data-tab="' + (this.options.tab || 'log') + '"] > a').tab('show');
    },

    importSettings: function(newSettings)
    {
      var licenseInfo = newSettings.licenseInfo;

      newSettings.licenseError = licenseInfo && licenseInfo.error
        ? t('settings', 'license:' + licenseInfo.error)
        : null;

      this.$id('licenseError').parent().toggleClass('has-error', !!newSettings.licenseError);

      js2form(this.el, newSettings);
    },

    onSettingsChange: function()
    {
      this.importSettings(settings.toJSON());
    },

    onRestartClick: function()
    {
      var $inputs = this.$('.panel-footer > input').attr('disabled', true);
      var req = this.ajax({
        type: 'POST',
        url: '/settings;restart',
        data: JSON.stringify({
          password: this.$id('password').val()
        })
      });

      this.$id('password').val('');

      req.fail(function(xhr)
      {
        if (!xhr || !xhr.responseJSON || !xhr.responseJSON.error)
        {
          return;
        }

        var error = xhr.responseJSON.error.message;

        viewport.msg.show({
          type: 'error',
          time: 2000,
          text: t.has('settings', 'msg:restart:' + error)
            ? t('settings', 'msg:restart:' + error)
            : t('settings', 'msg:restart:failure')
        });
      });

      req.always(function()
      {
        $inputs.attr('disabled', false);
      });
    },

    onSaveClick: function()
    {
      if (this.el.checkValidity())
      {
        return;
      }

      for (var i = 0, l = this.el.elements.length; i < l; ++i)
      {
        var el = this.el.elements[i];

        if (!el.validity.valid)
        {
          var $tab = this.$('a[href="#' + this.$(el).closest('.tab-pane').attr('id') + '"]');

          if (!$tab.parent().hasClass('active'))
          {
            $tab.click();
          }

          break;
        }
      }
    },

    onSubmit: function(e)
    {
      e.preventDefault();

      var formData = form2js(this.el, null, false);

      if (formData.password1 !== formData.password2)
      {
        this.$id('password1').focus().select();

        return viewport.msg.show({
          type: 'error',
          time: 2000,
          text: t('settings', 'msg:passwords')
        });
      }

      var $inputs = this.$('.panel-footer input').attr('disabled', true);
      var view = this;
      var newSettings = new Settings();
      var req = this.promised(newSettings.save(formData, {wait: true}));

      req.done(function()
      {
        view.$id('password').val('');
        view.$id('licenseKey').val('');
      });

      req.fail(function(xhr)
      {
        if (!xhr || !xhr.responseJSON || !xhr.responseJSON.error)
        {
          return;
        }

        var error = xhr.responseJSON.error.message;

        viewport.msg.show({
          type: 'error',
          time: 2000,
          text: t.has('settings', 'msg:' + error)
            ? t('settings', 'msg:' + error)
            : t('settings', 'msg:failure')
        });
      });

      req.always(function(xhr)
      {
        $inputs
          .attr('disabled', false)
          .filter('input[name="password"]').val('');

        if (!xhr || !xhr.responseJSON || !xhr.responseJSON.error)
        {
          return;
        }

        var error = xhr.responseJSON.error.message;

        if (error && error.message === 'PASSWORD')
        {
          $inputs.filter('input[name="password"]').focus();
        }
      });
    },

    onDragEnter: function(e)
    {
      e.preventDefault();
      e.stopPropagation();
    },

    onDragLeave: function(e)
    {
      e.preventDefault();
      e.stopPropagation();
    },

    onDragOver: function(e)
    {
      e.preventDefault();
      e.stopPropagation();
    },

    onDrop: function(e)
    {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer.files.length)
      {
        return viewport.msg.show({
          type: 'warning',
          time: 3000,
          text: t('settings', 'msg:filesOnly')
        });
      }

      var file = _.find(e.dataTransfer.files, function(file)
      {
        return file.type === 'text/plain';
      });

      if (!file)
      {
        return viewport.msg.show({
          type: 'warning',
          time: 3000,
          text: t('settings', 'msg:textOnly')
        });
      }

      var reader = new FileReader();
      var view = this;

      reader.onload = function(e)
      {
        var contents = e.target.result.trim();

        if (LICENSE_RE.test(contents))
        {
          return view.importLicenseKeyFile(contents);
        }

        view.importSettingsFile(contents);
      };

      reader.onerror = function()
      {
        viewport.msg.show({
          type: 'error',
          time: 3000,
          text: t('settings', 'msg:readFailure')
        });
      };

      reader.readAsText(file);
    },

    importLicenseKeyFile: function(licenseKey)
    {
      this.$id('licenseKey').val(licenseKey);

      var $licenseTab = this.$id('tab-license');

      if (!$licenseTab.parent().hasClass('active'))
      {
        $licenseTab.click();
      }
    },

    importSettingsFile: function(contents)
    {
      var newSettings;

      try
      {
        newSettings = JSON.parse(contents);
      }
      catch (err)
      {
        return viewport.msg.show({
          type: 'error',
          time: 3000,
          text: t('settings', 'msg:invalidFile')
        });
      }

      this.importSettings(_.extend(settings.toJSON(), newSettings));

      viewport.msg.show({
        type: 'success',
        time: 1500,
        text: t('settings', 'msg:importSuccess')
      });
    }

  });
});
