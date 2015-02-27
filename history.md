2.6.1 @ 2015-02-27
==================

  * Fixed the history entry details page not rendering if it doesn't have a feature file.
  * Fixed Highcharts language data being set before the core i18n domain is registered.
  * Added a new setting: `testingModbusEnabled` - if disabled, then no outputs will be switched through Modbus before
    executing a program step.

2.6.0 @ 2015-02-22
==================

  * Fixed a disabled configuration file download link redirecting to the dashboard.
  * Added a language selection to the installer (English or Polish).
  * Added a new feature: tester 24V DC.
  * Added support for MultiOne Workflow v2.0.
  * Added <kbd>'s to each element with a hotkey on the Programmer page.
  * Changed the history details 'Programmer output` tab to 'Communication log'.
  * Changed the history details tabs to be hidden if they're empty.
  * Moved the MultiOne Workflow settings from the 'General settings' tab to a new 'MultiOne Workflow' tab.

2.5.0 @ 2014-10-24
==================

  * Added a new feature: programmer can be started after receiving a signal on a parallel port.
  * Added error messages from MultiOne v1.1.

2.4.0 @ 2014-09-29
==================

  * Removed the `workflowFile` configuration option.
  * Added three new configuration options: `workflowVerify`, `workflowIdentifyAlways` and `workflowMultiDevice`
    (used to create a workflow configuration file).
  * Changed a default value of the `programmerFile` setting.

2.3.0 @ 2014-07-28
==================

  * Added a new feature: programming a Fortimo Solar device through a serial port connection.

2.2.0 @ 2014-06-10
==================

  * Added a new module: imWorkin - if enabled in the settings, spawns a small utility that keeps the computer
    in an active state without user activity (no screen saver or locking).
  * Added an ability to restart the application server through the Settings page.

2.1.2 @ 2014-06-02
==================

  * Fixed the installer not adding the OpenSSL `libeay32.dll` file near the `node_modules/bin/ursaNative.node` file.
  * Fixed the installer adding an extra space to the beginning of the default service password.

2.1.1 @ 2014-05-30
==================

  * Fixed some English translation messages.
  * Removed the continue on error parameter passed to the `xcopy` during the feature file synchronization.
  * Added a page footer to the bottom right corner of the Programmer page.
  * Added a default value for the `settings.licenseEdPem` configuration option
    (contents of the `config/license.ed.public.pem` file, if it exists or `NULL`).

2.1.0 @ 2014-05-21
==================

  * Fixed the missing `app/data` frontend files.
  * Added the default feature files data directory to the repository.
  * Added new Grunt tasks: build-scripts, build-installer, build-all to automate the process of creating
    the installer executable.
  * Added two new configuration options: blockageInterval and blockageDuration (the programming process can now be
    blocked for `blockageDuration` seconds after `blockageInterval` successful programming results).

2.0.1 @ 2014-05-19
==================

  * Fixed queueing of the Order Finished Dialogs if one is already displayed and the programming process is started by
    using the barcode scanner.

2.0.0 @ 2014-05-16
==================

  * Initial release.
