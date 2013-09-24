# Xitanium Config Programmer Overlay

## Requirements

### node.js

Node.js is a server side software system designed for writing scalable
Internet applications in JavaScript.

  * __Version__: 0.10.x
  * __Website__: http://nodejs.org/
  * __Download__: http://nodejs.org/download/
  * __Installation guide__: https://github.com/joyent/node/wiki/Installation

## Installation

Clone the repository:

```
git clone git://github.com/morkai/walkner-xiconf.git
```

or [download](https://github.com/morkai/walkner-xiconf/zipball/master)
and extract it.

Go to the project's directory and install the dependencies:

```
cd walkner-xiconf/
npm install
```

Give write permissions to `walkner-xiconf/data/` directory.

## Configuration

Configuration settings can be changed in the `backend/config.js` file.

  * `httpPort` - port on which the HTTP server should listen for requests.

  * `programmerFile` - path to the programmer binary file.

  * `featureFilePattern` - path to the feature configuration file.

  * `workflowFile` - path to the workflow configuration file.

  * `interface` - programming interface.

  * `logVerbosity` - log verbosity level of the programmer.

  * `csvOptions` - CSV options used to parse the programs file.

## Start

Start the application server in `development` or `production` environment:

  * under *nix:

    ```
    NODE_ENV=development node walkner-xiconf/backend/server.js
    ```

  * under Windows:

    ```
    SET NODE_ENV=development
    node walkner-xiconf/backend/server.js
    ```

Application should be available on a port defined in `backend/server.js` file
(`1337` by default). Point the Internet browser to http://127.0.0.1:1337/.

## License

This project is released under the
[NPOSL-3.0](https://raw.github.com/morkai/walkner-xiconf/master/license.md).
