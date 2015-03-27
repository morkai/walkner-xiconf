2.8.0 @ 2015-03-28
==================

  * Fixed the remote coordinator not connecting to the specified production line if the installation ID setting
    was empty.
  * Changed the way the application is started and reorganized the installation's file structure. Previously, a Windows
    service was created and run as a non-admin user which caused permission problems. Now, the application is started
    by an AutoIt script that stays in the tray.
  * Added automatic creation of `Generic / Text Only` printers on the same ports as `ZDesigner GK420t` printers
    if the Service Tag printer name is set to `ServiceTagPrinterZPL`.
  * Added a current remote data watchdog: every 30-90 seconds the remote coordinator reconnects to the production line
    if it has a connection to the remote server and the current remote data is empty.
  * Added an ability to manually reconnect to the production line by clicking on the green connection indicator. This
    action can only be performed once per 5 seconds.
  * Added the installed MultiOne Workflow version under the supported version in the MultiOne Workflow settings tab.
  * Added a Service Tag column to the recent results list on the Programmer page. Clicking on a Service Tag opens up
    the Print Service Tag label dialog.
  * Added an ability to acquire Service Tags in the Local mode. The 'Service Tags in Local mode` setting can be set to
    disabled, optional or required.
  * Added a simple cache mechanism to the feature file searching. If the 12NC of the current process is the same as
    the one in the previous, successful result, then a feature file path from that last result is used.

2.7.2 @ 2015-03-18
==================

  * Fixed a crash on progress update when handling a result of the find a feature file in a second path step.
  * Changed the hotkey execution so that hotkeys can be scanned from barcodes using the background scanner mode.
  * Changed the default Start/Cancel hotkey from `Space` to `P`.
  * Changed the behaviour of the 12NC field in the local input mode so that its value is remembered and the field is
    disabled. The current state must be reset if one wants to use a different 12NC.
  * Changed the installation ID setting to be optional and always prefixed with the computer's name.

2.7.1 @ 2015-03-17
==================

  * Fixed the installer not bundling the `spool.exe` file.
  * Fixed the remote coordinator connecting to the local socket.io server if the remote server setting was not set.
  * Fixed the connection status indicator staying green after losing connection to the local server.
  * Fixed the uninstaller not running in a language selected during the installation.
  * Changed the Service Tag insertion into the ZPL label template so that it works with the Code128 barcode
    in auto mode.
  * Changed the multiple Service Tag label printing to be a serial process and not a parallel one.
  * Changed the minimum sync interval from 10 minutes to 1 minute, but the minimum interval after a failed sync
    is 5 minutes.
  * Changed the default install directory from `C:\walkner` to `C:\walkner\xiconf`.
  * Added an automatic DCOM permission granting for the custom Windows service user so that he can run the MotoBarScan.

2.7.0 @ 2015-03-15
==================

  * Changed a border width of elements on the Programmer screen from 2px to 1px.
  * Added an overall progress bar to the middle of the Programmer screen.
  * Replaced the Manual/Auto modes with Local/Remote. The Local mode is the same as the Manual mode. The Remote mode
    works by talking to the remote server. The remote server provides the current order data and generates Service Tags.
    Multiple instances can work on the same order at the same time.
  * Added an ability to switch the barcode scanning to a background process. Multiple scanners can be used at the same
    time. Works only with the Motorola scanners.
  * Added an ability to protect the input mode change with a password.
  * Added an ability to print Service Tags using a ZPL or DPL printer.
  * Added labels specifying the enabled program steps to the Name column on the Programs list screen.

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
