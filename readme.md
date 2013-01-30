# Xitanium Config Programmer Overlay

TODO

## Requirements

### node.js

Node.js is a server side software system designed for writing scalable
Internet applications in JavaScript.

  * __Version__: 0.8.x
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

## Configuration

TODO

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
[CC BY-NC 3.0](https://raw.github.com/morkai/walkner-xiconf/master/license.md).
