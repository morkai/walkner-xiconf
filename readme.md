# Walkner Xiconf

LED driver programming and testing application.

## Requirements

### node.js

Node.js is a server side software system designed for writing scalable
Internet applications in JavaScript.

  * __Version__: 8
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

Go to the project directory and install the dependencies:

```
cd walkner-xiconf/
npm install
```

Create the `walkner-xiconf/data/` directory and give it write permissions.

## Configuration

Configuration settings can be changed by going to http://127.0.0.1:1337/#settings
(default password x!c0nf) and in the `config/frontend.js` file.

## Start

Start the application server in `development` or `production` environment:

  * under Linux:

    ```
    NODE_ENV=development node walkner-xiconf/backend/main.js ../config/frontend.js
    ```

  * under Windows:

    ```
    SET NODE_ENV=development
    node walkner-xiconf/backend/main.js ../config/frontend.js
    ```

Application should be available on a port defined in the `config/frontend.js` file
(`1337` by default). Point your Internet browser to http://127.0.0.1:1337/.

## License

This project is released under the [CC BY-NC-SA 4.0](https://raw.github.com/morkai/walkner-xiconf/master/license.md).

Copyright (c) 2016, Łukasz Walukiewicz (lukasz@miracle.systems)
