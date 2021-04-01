// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'jquery',
  'underscore',
  'js2form',
  'form2js',
  'app/time',
  'app/i18n',
  'app/broker',
  'app/viewport',
  'app/core/View',
  'app/data/currentState',
  'app/data/settings',
  '../Settings',
  'app/settings/templates/form'
], function(
  $,
  _,
  js2form,
  form2js,
  time,
  t,
  broker,
  viewport,
  View,
  currentState,
  settings,
  Settings,
  formTemplate
) {
  'use strict';

  var LICENSE_RE = new RegExp(
    '^-----BEGIN LICENSE KEY-----\\r?\\n?([a-zA-Z0-9=+\/\\r\\n]+)-----END LICENSE KEY-----$'
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
      'click #-weightRefUnitCalc': function()
      {
        var rawValue = currentState.get('weight').value * settings.get('weightRefUnit');
        var refUnit = rawValue / (parseFloat(this.$id('weightWeighedValue').val()) || 1);

        this.$id('weightRefUnit').val(Math.round(refUnit * 1000) / 1000);
      },
      'click #-weightTare': function()
      {
        var password = this.$id('password').val();

        if (!password.length)
        {
          this.$id('submit').click();

          return;
        }

        this.socket.emit('programmer.tareWeight', password);
      },
      'change input[name="bgScanner"]': 'toggleScannerCodes',
      'click .settings-save': 'onSaveClick',
      'click .settings-restart': 'onRestartClick',
      'click .settings-logs': 'onLogsClick',
      'submit': 'onSubmit',
      'change #-importClient': 'onImportClientChange',
      'click #-importSettings': 'onImportClick'
    },

    remoteTopics: {
      'programmer.barcodeScanned': function(message)
      {
        var $scannedValue = this.$id('scannedValue');

        $scannedValue[0].value = '"' + message.value + '"' + '\n' + $scannedValue[0].value;

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
      this.listenTo(currentState, 'change:weight', this.onWeightChange);
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
        hotkeyPattern: '^([A-Z\\[\\];\',./]|Space)$',
        computerName: window.COMPUTER_NAME || '',
        multiOneWorkflowVersion: settings.get('multiOneWorkflowVersion'),
        availableFeatures: Settings.AVAILABLE_FEATURES
      };
    },

    afterRender: function()
    {
      this.importSettings(settings.toJSON());
      this.changeTab(this.options.tab || this.$('.list-group-item[data-tab]').first().attr('data-tab'));
      this.onWeightChange();
      this.toggleScannerCodes();
    },

    changeTab: function(tab)
    {
      var $oldTab = this.$('.list-group-item.active');
      var $newTab = this.$('.list-group-item[data-tab="' + tab + '"]');

      if (tab === 'import')
      {
        this.loadImportTab();
      }

      $oldTab.removeClass('active');
      $newTab.addClass('active');
      this.$('.panel-body.active').removeClass('active');
      this.$id(tab).addClass('active');
    },

    loadImportTab: function()
    {
      var view = this;
      var $hidden = view.$id('import').children().addClass('hidden');
      var $spinner = $('<i class="fa fa-spinner fa-spin"></i>').appendTo(view.$id('import'));
      var fail = function() { $spinner.removeClass('fa-spin').css('color', '#E00'); };

      view.import = {
        remoteServer: null,
        prodLines: [],
        clients: []
      };

      this.$id('importFeatures').find('input[type="checkbox"]').prop('checked', false);

      view.resolveRemoteServer().fail(fail).done(function(remoteServer)
      {
        view.import.remoteServer = remoteServer;

        $.when(view.loadRemoteProdLines(), view.loadRemoteClients()).fail(fail).done(function(prodLines, clients)
        {
          view.import.prodLines = prodLines;
          view.import.clients = clients;

          $spinner.remove();
          $hidden.removeClass('hidden');

          view.prepareImportTab();
        });
      });
    },

    prepareImportTab: function()
    {
      var i;
      var l;
      var prodLines = '<option selected></option>';
      var maxProdLineId = this.import.prodLines.reduce(
        function(max, prodLine) { return Math.max(max, prodLine._id.length); },
        0
      );

      this.import.prodLines.forEach(function(prodLine)
      {
        var id = prodLine._id;

        for (i = 0, l = maxProdLineId - id.length; i < l; ++i)
        {
          id += '&nbsp;';
        }

        prodLines += '<option value="' + _.escape(prodLine._id) + '">'
          + id + ' | ' + _.escape(prodLine.description)
          + '</option>';
      });

      this.$id('importLine').html(prodLines);

      var clients = '<option selected></option>';
      var maxClientLine = this.import.clients.reduce(
        function(max, client) { return Math.max(max, client.settings.prodLine.length); },
        0
      );
      var maxClientId = this.import.clients.reduce(
        function(max, client) { return Math.max(max, client._id.length); },
        0
      );

      this.import.clients.forEach(function(client)
      {
        var label = client.settings.prodLine;

        for (i = 0, l = maxClientLine - client.settings.prodLine.length; i < l; ++i)
        {
          label += '&nbsp;';
        }

        label += ' | ' + client._id;

        for (i = 0, l = maxClientId - client._id.length; i < l; ++i)
        {
          label += '&nbsp;';
        }

        if (client.settings.licenseInfo)
        {
          label += ' | ' + settings.getLabelsFromFeatures(client.settings.licenseInfo.features).join(', ');
        }

        clients += '<option value="' + _.escape(client._id) + '">' + label + '</option>';
      });

      this.$id('importClient').html(clients);
    },

    resolveRemoteServer: function()
    {
      var deferred = $.Deferred();
      var remoteServers = [settings.get('remoteServer')]
        .concat(window.REMOTE_SERVERS, 'http://localhost/')
        .filter(function(url) { return typeof url === 'string' && url.indexOf('http') === 0; })
        .map(function(url)
        {
          if (url.charAt(url.length - 1) !== '/')
          {
            url += '/';
          }

          return url;
        });

      this.resolveNextRemoteServer(_.uniq(remoteServers), deferred);

      return deferred.promise();
    },

    resolveNextRemoteServer: function(remoteServers, deferred)
    {
      var remoteServer = remoteServers.shift();

      if (!remoteServer)
      {
        return deferred.reject();
      }

      var view = this;

      view
        .ajax({
          url: remoteServer + 'ping?' + Date.now(),
          dataType: 'text',
          timeout: 3000
        })
        .always(function(res)
        {
          if (res === 'pong')
          {
            deferred.resolve(remoteServer);
          }
          else
          {
            view.resolveNextRemoteServer(remoteServers, deferred);
          }
        });
    },

    loadRemoteProdLines: function()
    {
      var deferred = $.Deferred();
      var url = this.import.remoteServer + 'prodLines?select(description)&sort(_id)&limit(0)&deactivatedAt=null';

      this.ajax({url: url}).always(function(res)
      {
        if (res && Array.isArray(res.collection) && res.collection.length)
        {
          deferred.resolve(res.collection);
        }
        else
        {
          deferred.reject();
        }
      });

      return deferred.promise();
    },

    loadRemoteClients: function()
    {
      var deferred = $.Deferred();
      var url = this.import.remoteServer + 'xiconf/clients;settings'
        + '?select(settings.prodLine,settings.licenseInfo)&sort(settings.prodLine,-updatedAt)&limit(0)'
        + '&settings.prodLine=ne=string:';

      this.ajax({url: url}).always(function(res)
      {
        if (res && Array.isArray(res.collection) && res.collection.length)
        {
          deferred.resolve(res.collection);
        }
        else
        {
          deferred.reject();
        }
      });

      return deferred.promise();
    },

    importSettings: function(newSettings)
    {
      var licenseInfo = newSettings.licenseInfo;

      newSettings.licenseError = licenseInfo && licenseInfo.error
        ? t('settings', 'license:' + licenseInfo.error)
        : null;

      this.$id('licenseError').parent().toggleClass('has-error', !!newSettings.licenseError);

      js2form(this.el, newSettings);

      this.$id('licenseInfo-features').val(settings.getLicenseFeatures(licenseInfo ? licenseInfo.features : 0));
    },

    onImportClientChange: function()
    {
      var $features = this.$id('importFeatures').find('input[type="checkbox"]').prop('checked', false);
      var client = _.findWhere(this.import.clients, {_id: this.$id('importClient').val()});

      if (!client)
      {
        return;
      }

      var features = settings.getLabelsFromFeatures((client.settings.licenseInfo || {}).features || 0);

      features.forEach(function(feature)
      {
        $features.filter('[value="' + feature.toLowerCase() + '"]').prop('checked', true);
      });
    },

    onImportClick: function()
    {
      var view = this;
      var prodLine = view.$id('importLine').val();
      var client = view.$id('importClient').val();
      var features = view.$id('importFeatures')
        .find('input:checked')
        .get()
        .map(function(el) { return el.value.toUpperCase(); });

      if (!prodLine)
      {
        return view.$id('importLine').focus();
      }

      if (!client)
      {
        return view.$id('importClient').focus();
      }

      if (!features.length)
      {
        return view.$id('importFeatures').find('input').first().focus();
      }

      var $button = view.$id('importSettings').prop('disabled', true);
      var $icon = $button.find('.fa').removeClass('fa-download').addClass('fa-spinner fa-spin');

      var freeLicensesReq = view.ajax({url: view.import.remoteServer + 'xiconf/clients;licenses', data: {free: 1}});
      var settingsReq = view.ajax({url: view.import.remoteServer + 'xiconf/clients;settings', data: {_id: client}});
      var fail = function()
      {
        $icon.removeClass('fa-spinner fa-spin').addClass('fa-download');
        $button.prop('disabled', false);

        viewport.msg.show({
          type: 'error',
          time: 3000,
          text: t('settings', 'import:failure')
        });
      };
      var complete = function(newSettings)
      {
        view.importSettings(newSettings);

        $icon.removeClass('fa-spinner fa-spin').addClass('fa-download');
        $button.prop('disabled', false);

        view.$('a[data-tab="license"]').click();
        view.$id('submit').click();
      };

      $.when(freeLicensesReq, settingsReq).fail(fail).done(function(freeLicensesRes, settingsRes)
      {
        var freeLicense = view.resolveFreeLicense(freeLicensesRes[0].collection, features);
        var newSettings = _.extend(settingsRes[0].collection[0].settings, {
          id: '',
          title: prodLine,
          prodLine: prodLine,
          remoteServer: view.import.remoteServer,
          licenseInfo: freeLicense ? _.omit(freeLicense, 'key') : null,
          licenseKey: freeLicense ? freeLicense.key : '',
          password: ''
        });

        if (freeLicense)
        {
          return complete(newSettings);
        }

        view.ajax({
          method: 'POST',
          url: view.import.remoteServer + 'xiconf/clients;licenses',
          data: JSON.stringify({
            features: settings.getFeaturesFromLabels(features)
          })
        }).fail(fail).done(function(newLicense)
        {
          var freeLicense = view.resolveFreeLicense([newLicense], features);

          newSettings.licenseInfo = _.omit(freeLicense, 'key');
          newSettings.licenseKey = freeLicense.key;

          complete(newSettings);
        });
      });
    },

    resolveFreeLicense: function(freeLicenses, requiredFeatures)
    {
      var matchingLicenses = freeLicenses.filter(function(license)
      {
        license.featureLabels = settings.getLabelsFromFeatures(license.features);

        return _.every(requiredFeatures, function(requiredFeature)
        {
          return _.contains(license.featureLabels, requiredFeature);
        });
      });

      if (!matchingLicenses.length)
      {
        return null;
      }

      matchingLicenses.sort(function(a, b) { return a.featureLabels.length - b.featureLabels.length; });

      var freeLicense = matchingLicenses[0];

      return {
        appId: freeLicense.appId,
        appVersion: freeLicense.appVersion,
        date: time.format(freeLicense.date, 'YYYY-MM-DD'),
        uuid: freeLicense._id,
        licensee: freeLicense.licensee,
        features: freeLicense.features,
        error: null,
        key: freeLicense.key
      };
    },

    onSettingsChange: function()
    {
      this.importSettings(settings.toJSON());

      this.$id('mowVersion').text(settings.get('multiOneWorkflowVersion'));
    },

    onWeightChange: function()
    {
      var weight = currentState.get('weight');
      var currentWeight = '?';

      if (weight && weight.value >= 0)
      {
        currentWeight = weight.value.toLocaleString() + ' ' + (weight.stabilized ? 'S' : 'U');
      }

      this.$id('weightCurrentValue').val(currentWeight);
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
        var error = xhr && xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.message;

        viewport.msg.show({
          type: 'error',
          time: 2000,
          text: t.has('settings', 'msg:restart:' + error)
            ? t('settings', 'msg:restart:' + error)
            : t('settings', 'msg:restart:failure')
        });

        $inputs.attr('disabled', false);
      });

      req.done(function()
      {
        broker.subscribe('socket.connected', function()
        {
          $inputs.attr('disabled', false);
        });
      });
    },

    onLogsClick: function()
    {
      var $inputs = this.$('.panel-footer > input').attr('disabled', true);
      var req = this.ajax({
        type: 'POST',
        url: '/settings;logs',
        data: JSON.stringify({
          password: this.$id('password').val()
        })
      });

      this.$id('password').val('');

      req.fail(function(xhr)
      {
        var error = xhr && xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.message;

        viewport.msg.show({
          type: 'error',
          time: 2000,
          text: t.has('settings', 'msg:logs:' + error)
            ? t('settings', 'msg:logs:' + error)
            : t('settings', 'msg:logs:failure')
        });
      });

      req.done(function(id)
      {
        window.location.href = '/settings;logs?id=' + id;
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
    },

    toggleScannerCodes: function()
    {
      var bgScanner = this.$('input[name="bgScanner"]:checked').val();

      this.$('[data-bg-scanner]').each(function()
      {
        this.style.display = this.dataset.bgScanner === bgScanner ? '' : 'none';
      });
    }

  });
});
