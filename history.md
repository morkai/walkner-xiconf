2.24.5 @ 2018-10-24
===================

  * Added UI locking functionality.

2.24.4 @ 2018-09-27
===================

  * Changed the allowed HID ID length from 13 to up to 20.

2.24.3 @ 2018-08-31
===================

  * Changed the maximum allowed order quantity from 999 to 9999.

2.24.2 @ 2017-11-02
===================

  * Changed the default value of the Barcode scanner mode to be client-side.
  * Changed the hotkey handling to not treat a keypress as a hotkey if there
    is another keypress event in 150 ms.

2.24.1 @ 2017-08-31
===================

  * Fixed a NULL-reference error while sending a program to the GLP2 tester.
  * Changed the weight scale calibration instructions to be simpler.
  * Changed the settings import to first check the current remote server.
  * Changed the settings import to timeout each server check after 3s.

2.24.0 @ 2017-06-27
===================

  * Changed Node.js to v8.1.2 x64 and updated all dependencies.
  * Changed the default path to the MultiOne feature files.
  * Changed the single local socket check to be enabled only if the background scanner
    is enabled.
  * Added support for importing settings from the remote server.
  * Added weight scale calibration instructions.

2.23.4 @ 2017-05-24
===================
  
  * Fixed the connection to the scales not being recreated after destruction
    if there was no established connection to begin with.
  * Changed the MOW version and CoreScanner availability check to be disabled
    on non-Windows.
  * Added support for saving and reading of settings from the remote server.

2.23.3 @ 2017-03-31
===================

  * Changed the weighing barcode handling to allow spaces in the component's 12NC.

2.23.2 @ 2017-03-05
===================

  * Changed the local barcode scanner handler to include all printable characters.
    Now the scan is complete after receiving at least two characters followed by ENTER
    (to avoid conflicts with hotkeys).
  * Changed the weighing to stop the process if there is no connection to the scale.
  * Added support for min and max component weights received from the remote server.

2.23.1 @ 2017-03-05
===================

  * Added support for a new model of a scale.

2.23.0 @ 2017-02-08
===================

  * Changed the component weighing to allow multiple predefined weights
    for the same component.

2.22.1 @ 2017-01-31
===================

  * Changed the MultiOne Workflow version checking to be rerun constantly
    if the previous check failed.

2.22.0 @ 2017-01-16
===================

  * Added support for MultiOne Workflow 3.3.
  * Added support for running the app on the UP board.

2.21.0 @ 2016-11-06
===================

  * Added a new option: WEIGHT - component weight checking.

2.20.5 @ 2016-09-23
===================

  * Fixed display errors in the scanned LED board list on the history
    details page.
  * Changed the starting work mode selection process to take into
    account the currently enabled options.
  * Added a new LED board recognition pattern.

2.20.4 @ 2016-09-01
===================

  * Fixed??

2.20.3 @ 2016-09-01
===================

  * Fixed?

2.20.2 @ 2016-09-01
===================

  * Fixed a circular `require()` bug in handling GLP2 fault status when
    run in production with the require cache.
  * Changed the recently added LED board recognition pattern to be
    a little more generic.

2.20.1 @ 2016-07-13
===================

  * Added a new LED board recognition pattern.

2.20.0 @ 2016-07-06
===================

  * Changed Node.js to v6.2.2 x64 and updated all dependencies.
  * Added a new option: HID - HID lamp checking (similar to LED boards).

2.19.0 @ 2016-04-15
===================

  * Changed Node.js to v5.10.1 x64 and updated all dependencies.
  * Changed the require cache to also include the source code to speed up the app startup.
  * Changed the default remote server URL to not include the `6080` port.
  * Added a new LED board recognition pattern.
  * Added more logging messages.
  * Added an ability to download the latest logs file.

2.18.4 @ 2016-02-01
===================

  * Changed the recently added LED board matching pattern to also allow `[0-9]` where `[A-Z]` is allowed.

2.18.3 @ 2015-12-23
===================

  * Changed the recently added LED board matching pattern to handle an edge case.

2.18.2 @ 2015-12-21
===================

  * Fixed the recent history results not having their 'cancelled' flag updated.
  * Added success & failure messages to the 'Toggle result' action.

2.18.1 @ 2015-12-21
===================

  * Fixed a crash when scanning a LED board with the local serial number checking enabled.
  * Fixed the current result being cleared before it has been saved in the database.

2.18.0 @ 2015-12-20
===================

  * Changed the program synchronization to also occur 30s after a program is updated on the remote server.
  * Changed the timeouts of the initial CoreScanner service check and the MOW version check from 5s to 10s.
  * Added recording of invalid LED board scans: the remote server is notified about LED boards with an invalid 12NC.
  * Added a new LED board recognition pattern.
  * Added a result toggling functionality: a successful result with a ServiceTag can be cancelled (and restored) so
    that it isn't counted in the remote order.
  * Added a new setting: Force the latest order - if enabled, then the latest remote order is always automatically
    selected and can't be changed by the operator.

2.17.3 @ 2015-11-30
===================

  * Fixed a crash when working on a GPRS order with a GPRS license and the programming is disabled.
  * Changed the initial setting of the input and work modes to use default values if reading the values from
    a file fails.

2.17.2 @ 2015-11-19
===================

  * Changed a default value of the `workflowDaliFactoryNew` setting to `1` (enabled).
  * Changed the remote coordinator to not attempt to retry a request after receiving an error response from the server.
    Requests are resend only on connection errors.
  * Changed the last log message to a generic one if the order has LED boards but nothing was done.
  * Added 'No programming. Testing active.' and 'No program. Testing active.' to messages displayed in the 12NC input
    on the Programmer page.

2.17.1 @ 2015-11-17
===================

  * Fixed the `workflowDaliFactoryNew` setting not being saved.
  * Fixed a crash when sending a retry of a failed remote command request.

2.17.0 @ 2015-11-17
===================

  * Added support for MultiOne Workflow 2.3.

2.16.4 @ 2015-11-13
===================

  * Changed the check/generate/acquire Service Tag commands to use plain HTTP instead of socket.io to have better
    control in case of timeouts.
  * Changed the history export to export at most 100 entries at once.
  * Changed the last history export time to be the current time minus 3 days (instead of the beginning of time),
    if the last export time file has been corrupted.
  * Changed the reading and writing of some configuration files to use a safer method to minimize a possibility
    of corrupting the files.

2.16.3 @ 2015-10-27
===================

  * Fixed a crash.

2.16.2 @ 2015-10-27
===================

  * Fixed a possible race condition while saving the last mode file.
  * Changed the select order action to also clear the currently selected program.
  * Changed the 'empty' order programming request to end with an error and not succeed.
  * Changed the way quantity is displayed in the Frame Tester mode. When there is no FT item yet, then the order's total
    quantity is displayed (instead of order's total quantity remaining, calculated from all other order items).

2.16.1 @ 2015-09-25
===================

  * Fixed the start button being disabled if the frame testing is disabled.

2.16.0 @ 2015-09-24
===================

  * Fixed the error messages on the Programmer page always using the generic failure text.
  * Changed the multiple local clients warning from a message to a modal dialog.
  * Added various improvements when running on Linux.
  * Added a new setting: Frame test active for product names matching the following patterns - frame testing will be
    inactive for orders with names not matching the specified patterns.

2.15.0 @ 2015-08-23
===================

  * Fixed the 'Second lamp URL' setting's label not being clickable.
  * Changed the default settings of the installer.
  * Changed the tabs on the Settings page from horizontal to vertical.
  * Changed the Programmer page to respond to browser windows with a width of 1024px or less.
  * Changed the start action to require a selection of the program if we're in the testing mode.
  * Changed the Program name displayed on the History pages to get its value from the selected program instead
    of the used feature file name.
  * Changed messages on the Programmer page to be bigger.
  * Added a new option: FT (Frame Tester).
  * Added a new column to the history results list: Program steps.
  * Added an ability to identify as a local user from a remote location by specifying a secret key
    in the `LOCAL` query parameter.
  * Added a blockage of all actions requiring a local access if there are multiple local clients connected
    simultaneously.
  * Added a new setting: LED board serial number checking - determines a method of checking for uniqueness
    of the LED board serial numbers within the successful order results.

2.14.0 @ 2015-07-30
===================

  * Added a new option: FL (Fluorescent Lamps).

2.13.8 @ 2015-07-15
===================

  * Fixed a crash that may happen while fetching LEDs from the last failed result.

2.13.7 @ 2015-07-12
===================

  * Fixed the cached programs not being refiltered if the 24V DC Tester or the GLP2 Tester settings are changed.
  * Changed the Service Tag acquisition so that the current program ID and name are sent to the remote server.
    The remote server uses this data to create a new order item of type `test`.
  * Changed the work mode to always be `testing` if the GLP2 Tester is enabled. If the GLP2 Tester is enabled
    and the 24V DC Tester is disabled, then the Toggle work mode button is hidden. If both testers are enabled,
    then the Toggle work mode button is visible, but disabled.

2.13.6 @ 2015-06-29
===================

  * Fixed the Program picker's directional hotkeys not working correctly if the programs list is filtered.
  * Added a safe-guard to the GLP2 manager so that it tries to reopen the serial port connection after the first open
    call fails and the close event is not fired (which happens when the application starts before the serial port
    is plugged in).
  * Added a new Waiting for continue message after a GLP2 Programming step finishes and the tester's software version
    is below 4.6. It appears that a remote acknowledgement of a Visual FCT test (using the `&sprio` command) doesn't
    work in versions <4.6. The operator has to use a button on a probe to confirm the test.

2.13.5 @ 2015-06-26
===================

  * Changed a number of fractional digits for the GLP2 Functional test's Power modes from 0 to 1.
  * Changed the Program picker view:
    * changed the program selection hotkeys to always require holding down the ALT key,
    * changed the filtering so that all words are matched separately in any order against the program name
      (but all must still exist),
    * improved keyboard navigation (handlers for F, Home, End and directional arrows),
    * added a 300 ms delay before the filtering is started if there is more than 20 programs.
  * Added an additional GLP2 test steps execution mode: all in one - all test steps are uploaded at once and started
    only once (instead of each test step being uploaded and started separately). Execution mode can be changed
    in the settings.

2.13.4 @ 2015-06-25
===================

  * Fixed the Program picker view not being resized to fit the window height on the first render.
  * Fixed values of the Production lines properties being ignored while synchronizing programs with the remote server.
  * Fixed the GLP2 Functional test's lower and upper bounds being incorrectly calculated for display.
  * Changed the GLP2 programming process to skip the Programming step if no program 12NC was specified.
  * Changed the current program name on the Programmer page to be a link to the program's details page.
  * Changed the Program picker view to fetch program data already filtered and sorted by the server and not do it
    client-side every time.

2.13.3 @ 2015-06-24
===================

  * Fixed the Functional test's Apparent power being mistakenly displayed as Active power (and vice versa)
    in the Program steps view.
  * Fixed a crash if a program was picked by clicking on the program type or program steps (and not program name).
  * Fixed the Functional test that is sent to the GLP2 tester having absolute tolerance parameters specified
    in a wrong order.
  * Fixed the GLP2 tester's response parsing resulting in the Invalid response error, because of additional spaces
    that are sent by the tester if the response is split into multiple parts.

2.13.2 @ 2015-06-22
===================

  * Fixed not being able to sync programs with the remote server if the current license has WMES and GLP2 options,
    but doesn't have the T24VDC option.
  * Fixed the Program picker on the Programmer page not fitting the window's height.
  * Removed the fade effect from the modals.
  * Added a new property to programs: Production lines - a semicolon separated list of production line ID patterns used
    on the Programmer page to show programs matching the current client's production line ID setting.
  * Added type and steps of each program on the Program picker's list.
  * Added an ability to quickly pick a program from the Program picker's list using 1-9 (or ALT+1-9) hotkeys.

2.13.1 @ 2015-06-21
===================

  * Fixed a crash if the programming process is cancelled during a Visual check test.
  * Fixed a Visual check test not failing if not acknowledged in the allowed time.

2.13.0 @ 2015-06-21
===================

  * Fixed a hotkey of the 12NC field not being visible on the Programmer page.
  * Added license features to the License settings tab.
  * Added a new option: GLP2.

2.12.1 @ 2015-06-11
===================

  * Fixed a path to the `lodash` module in the custom config file.
  * Fixed the installer missing the `gprs-input.json` file.
  * Fixed a few GPRS error messages incorrectly using the `{error}` variable resulting in the History details page not
    rendering.
  * Changed the remote coordinator to reset the remote connection flag before recreating the connection.
  * Changed the item quantity validation to not stop the programming process if any LED item is invalid and LED scanning
    is disabled.

2.12.0 @ 2015-05-31
===================

  * Added a new option: GPRS (functionality of the walkner-icpo project).

2.11.5 @ 2015-05-25
===================

  * Changed the barcode scanner ID from a number to a string, so the 1D scanners with A-Z0-9 serial numbers
    are recognized.
  * Added an HTTP port to data that is being sent to the remote server during connection to the production line.
    That port is then used to properly redirect the user from the Client list page to the application.

2.11.4 @ 2015-05-24
===================

  * Added a second config file that can be used to run another instance of the application.
  * Added a new setting: Barcode scanner filter - a list of barcode scanner serial numbers that the application should
    accept.

2.11.3 @ 2015-05-22
===================

  * Fixed the last two update packages.

2.11.2 @ 2015-05-21
===================

  * Changed the recently added LED board barcode pattern (the 12NC can now follow any non-numeric character).
  * Added a new setting: Barcode scanner 'LED board scanning done' beep - a sound the barcode scanner should play after
    all LED boards were scanned successfully.

2.11.1 @ 2015-05-19
===================

  * Changed the serial numbers on the LED boards list to display maximum of 8 characters. If a serial number is longer,
    then only the first 3 characters, followed by a `~` character, followed by the last 4 characters are displayed. Full
    serial number is displayed in a tooltip (on mouse hover).
  * Added additional checks to try to prevent corruption of the settings file, because of multiple server processes
    being started.
  * Added another pattern to the LED board barcode recognition.

2.11.0 @ 2015-05-17
===================

  * Removed the automatic current remote data availability checks from the remote coordinator. If somehow the current
    remote data is empty when it shouldn't be, the operator can force reconnection with the remote server by clicking
    the connection indicator on the Programmer page.
  * Changed the remote coordinator so that it attempts to connect to the remote server even if the production line ID
    setting is not specified.
  * Changed the Toggle input mode action to be available from non-local computer if the input mode change password
    protection setting is turned on.
  * Changed a failure to acquire a Service Tag in the local input mode to not stop the programming process if
    the Service Tag in Local mode setting is set to Optional.
  * Changed the Quantity field on the Programmer page in the remote input mode to show:
    * the program item's quantity, if the LED board scanning is disabled and a program 12NC is selected,
    * or the sum of LED items' quantities, if the programming is disabled and the order contains any LED board items,
    * or the order's quantity (this value was always shown previously).
  * Changed the `ImWorking.exe` utility to send `F15` key instead of `ALT+1`.
  * Added a flag indicating whether a CoreScanner drivers service is available to data that is being sent to the remote
    server during connection to the production line. That flag is displayed on the remote server's clients list.
  * Added a new setting: Programming on/off - if set to off, then the programming is not performed (as if the order
    didn't have any program 12NCs - only LED boards). This allows multiple work stations to split work:
    one is programming, and the other is checking the LED boards.
  * Added support for running multiple instances of the application on a different HTTP port and with a different
    config file by adding `--config` and `--port` parameters to the `XiconfRun.exe` shortcut.

2.10.3 @ 2015-04-17
===================

  * Fixed the `serialport` package crashing the server.
  * Fixed the last scanned LED board starting the next process and being included in the list as the first LED board
    if that LED board was scanned quickly multiple times.
  * Removed the debug messages generated by the remote export process to clean up the log.

2.10.2 @ 2015-04-15
===================

  * Fixed the update being installed while programming is in progress.
  * Changed the Barcode scanner beeping setting to Barcode scanner bad beep.
  * Added a new setting: Barcode scanner good beep - determines a beep sound the background barcode scanner should play
    when the LED board check succeeds.

2.10.1 @ 2015-04-14
===================

  * Changed the module start timeout from 5s to 10s.
  * Changed the MultiOne Workflow version read timeout from 1337ms to 5s.
  * Changed the history export to reset the `UNKNOWN_LICENSE` and `DUPLICATE_LICENSE` errors if the export succeeded.
  * Changed the remote connection coordinator to also send the current license error when connecting to the remote
    server.
  * Added a new setting: Barcode scanner beeping - determines a beep sound the background barcode scanner should play
    when the LED board check fails.

2.10.0 @ 2015-04-13
===================

  * Fixed the program steps on the selected program list having an extra left and bottom border.
  * Fixed a bug that caused incorrect hotkey labels for hotkeys that appear on the screen more than twice.
  * Removed update checking after the application start. Updates can now only be started from the remote server.
  * Added a 3s delay between scans of the same LED board.
  * Added an automatic addition of the scanned LED boards from the last failed programming result for the same order.
    This feature kicks in if after 2 seconds of waiting for LEDs, no LED is scanned.
  * Added an action to reset all scanned LED boards at once.
  * Added an ability to configure the application from the remote server.

2.9.1 @ 2015-04-13
==================

  * Removed the remote serial number uniqueness check.

2.9.0 @ 2015-04-13
==================

  * Fixed the in progress serial number checks not being properly cancelled when the same LED board was scanned again.
  * Removed remaining references to the Source Code Pro font.
  * Changed Node.js to v0.12.2 x64 and updated all dependencies.
  * Changed the module start timeout from 3s to 6s.
  * Changed the process start validation on the Programmer page to always require order number and quantity in
    the remote input mode.
  * Changed the LED boards barcode scanning to recognize more formats. Previously, only `/=[0-9]{8}=[0-9]{12}/` was
    accepted. Now, `/.[0-9]{12}.[0-9]{5,11}/` or `/.[0-9]{5,11}.[0-9]{12}/`.
  * Changed the Quantity field on the Programmer page to show at most 1 decimal place if the current quantity is not
    an integer.
  * Changed the programs to have a dynamic definition of steps (multiple steps of the same type can be used and in any
    order).
  * Added an ability to pick the current order and 12NC using the background barcode scanner.
  * Added an ability to wait for a user action to continue the process after all LEDs were scanned successfully.
  * Added a new setting: `solResetDelay` - a number of milliseconds to wait after the device reset before continuing
    (previously hardcoded to 1000ms).
  * Added a new program step type: `wait` - waits until the specified time passes (auto) or for a user action (manual)
    before continuing the process.
  * Added an ability to restart the application from the remote server.
  * Added an ability to update the application from the remote server.

2.8.3 @ 2015-04-01
==================

  * Fixed a crash during the start of the settings module.
  * Removed the Google Chrome Portable and vcredist_x86.exe from the installer.

2.8.2 @ 2015-03-31
==================

  * Changed the application runner to try to connect to the server 30 times (up from 10) and to wait 2s between tries
    (up from 1s).
  * Changed the connection indicator on the Programmer page, so that it can be clicked when not connected to the remote
    server. Clicking the connection indicator now destroys the current connection and attempts to establish a new one.

2.8.1 @ 2015-03-30
==================

  * Fixed `null` serial numbers being sent during Service Tag acquisition resulting in the request being rejected with
    an `INPUT` error.
  * Changed the LED boards list, so that the recently updated item is scrolled into view.
  * Changed the 12NC requirement validation, so that the process can be started without 12NC if there are only LED
    boards to check or a program without a Fortimo Solar programming step.
  * Changed the way the LED boards only and multiple 12NC information is conveyed to the user from different
    background colors to different background colors AND messages.
  * Added remote order's quantities validation as the first step of the programming process.

2.8.0 @ 2015-03-28
==================

  * Fixed the remote coordinator not connecting to the specified production line if the installation ID setting
    was empty.
  * Changed the way the application is started and reorganized the installation's file structure. Previously, a Windows
    service was created and run as a non-admin user which caused permission problems. Now, the application is started
    by an AutoIt script that stays in the tray.
  * Changed the way a selection of the 12NC works. Instead of a dropdown list, a modal dialog is displayed with a list
    of the programs, a password field and a helpful message containing a name of the production line's leader.
  * Changed the default feature file searching timeouts by x2.
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
  * Added a value of the `Production line ID` setting to every programming result.
  * Added an ability to switch between multiple recent orders in the remote input mode.
  * Added a new option: LED boards checking.

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
