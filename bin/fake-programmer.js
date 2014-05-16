'use strict';

setTimeout(
  function() { process.exit(Math.random() > 0.8 ? 0xFFFF : 0); },
  Math.round(Math.random() * 2500)
);
