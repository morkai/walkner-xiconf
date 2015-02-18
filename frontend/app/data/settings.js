define([
  '../i18n',
  '../broker',
  '../pubsub',
  '../viewport',
  '../settings/Settings'
], function(
  t,
  broker,
  pubsub,
  viewport,
  Settings
) {
  'use strict';

  var settings = new Settings(window.SETTINGS || {});
  var navbarView = null;

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

  settings.on('change:testingEnabled', toggleProgramsNavbarItem);

  broker.subscribe('navbar.afterRender', function(message)
  {
    navbarView = message.view;

    toggleProgramsNavbarItem();
  });

  function toggleProgramsNavbarItem()
  {
    if (navbarView !== null)
    {
      navbarView.$id('programs').toggle(!!settings.get('testingEnabled'));
    }
  }

  window.settings = settings;

  return settings;
});
