2.1.0 @ 2014-05-21
==================

  * Fixed the missing `app/data` frontend files.
  * Added the default feature files data directory to the repository.
  * Added new Grunt tasks: build-scripts, build-installer, build-all
    to automate the process of creating the installer executable.
  * Added two new configuration options: blockageInterval and blockageDuration
    (the programming process can now be blocked for `blockageDuration` seconds
    after `blockageInterval` successful programming results).

2.0.1 @ 2014-05-19
==================

  * Fixed queueing of the Order Finished Dialogs if one is already displayed
    and the programming process is started by using the barcode scanner.

2.0.0 @ 2014-05-16
==================

  * Initial release.
