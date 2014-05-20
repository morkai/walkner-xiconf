define([
  '../i18n',
  '../pubsub',
  '../viewport',
  '../settings/Settings'
], function(
  t,
  pubsub,
  viewport,
  Settings
) {
  'use strict';

  var settings = new Settings(window.SETTINGS || {});

  pubsub.subscribe('settings.changed', function(changes)
  {
    settings.set(changes);

    viewport.msg.show({
      type: 'info',
      time: 2500,
      text: t('settings', 'msg:success')
    });
  });

  settings.on('change:hotkeys', function()
  {
    settings.initHotkeys();
  });

  window.settings = settings;

  return settings;
});
