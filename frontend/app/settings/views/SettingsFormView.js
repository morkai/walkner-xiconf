// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
  var ASCII = {
    0: 'NUL',
    1: 'SOH',
    2: 'STX',
    3: 'ETX',
    4: 'EOT',
    5: 'ENQ',
    6: 'ACK',
    7: 'BEL',
    8: 'BS',
    9: 'TAB',
    11: 'VT',
    12: 'FF',
    14: 'SO',
    15: 'SI',
    16: 'DLE',
    17: 'DC1',
    18: 'DC2',
    19: 'DC3',
    20: 'DC4',
    21: 'NAK',
    22: 'SYN',
    23: 'ETB',
    24: 'CAN',
    25: 'EM',
    26: 'SUB',
    27: 'ESC',
    28: 'FS',
    29: 'GS',
    30: 'RS',
    31: 'US'
  };

  return View.extend({

    template: formTemplate,

    events: {
      'click a[data-tab]': function(e)
      {
        e.preventDefault();

        var tab = e.target.dataset.tab;

        this.broker.publish('router.navigate', {
          url: '/settings?tab=' + tab,
          trigger: false,
          replace: true
        });

        this.changeTab(tab);
      },
      'paste #-serviceTagLabelCode': function(e)
      {
        e.preventDefault();

        var rawLabelCode = e.originalEvent.clipboardData.getData('text/plain');
        var labelCode = '';

        for (var i = 0; i < rawLabelCode.length; ++i)
        {
          var ascii = ASCII[rawLabelCode.charCodeAt(i)];

          if (ascii === undefined)
          {
            labelCode += rawLabelCode.charAt(i);
          }
          else
          {
            labelCode += '<' + ascii + '>';
          }
        }

        this.$id('serviceTagLabelCode').val(labelCode);
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

    remoteTopics: {
      'programmer.barcodeScanned': function(message)
      {
        if (!message.scannerId
          || parseInt(message.scannerId, 10) <= 255
          || !document.activeElement
          || document.activeElement.name !== 'bgScannerFilter')
        {
          return;
        }

        var serialNumbers = {};

        this.$id('bgScannerFilter').val().split(/[^0-9A-Z]/).forEach(function(serialNumber)
        {
          if (/^[0-9A-Z]{4,}$/.test(serialNumber))
          {
            serialNumbers[serialNumber] = 1;
          }
        });

        serialNumbers[message.scannerId] = 1;

        this.$id('bgScannerFilter').val(Object.keys(serialNumbers).join(' '));
      }
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
        hotkeyPattern: '^([A-Z\\[\\]\\;\',./]|Space)$',
        computerName: window.COMPUTER_NAME || '',
        multiOneWorkflowVersion: settings.get('multiOneWorkflowVersion')
      };
    },

    afterRender: function()
    {
      this.importSettings(settings.toJSON());
      this.changeTab(this.options.tab || this.$('.list-group-item[data-tab]').first().attr('data-tab'));
    },

    changeTab: function(tab)
    {
      var $oldTab = this.$('.list-group-item.active');
      var $newTab = this.$('.list-group-item[data-tab="' + tab + '"]');

      $oldTab.removeClass('active');
      $newTab.addClass('active');
      this.$('.panel-body.active').removeClass('active');
      this.$id(tab).addClass('active');
    },

    importSettings: function(newSettings)
    {
      var licenseInfo = newSettings.licenseInfo;

      newSettings.licenseError = licenseInfo && licenseInfo.error
        ? t('settings', 'license:' + licenseInfo.error)
        : null;

      this.$id('licenseError').parent().toggleClass('has-error', !!newSettings.licenseError);

      js2form(this.el, newSettings);

      this.$id('licenseInfo-features').val(settings.getLicenseFeatures());
    },

    onSettingsChange: function()
    {
      this.importSettings(settings.toJSON());

      this.$id('mowVersion').text(settings.get('multiOneWorkflowVersion'));
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

      this.$('input[type=checkbox]').each(function()
      {
        formData[this.name] = formData[this.name] === this.value ? 1 : 0;
      });

      var $inputs = this.$('.panel-footer input').attr('disabled', true);
      var newSettings = new Settings();
      var view = this;
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
