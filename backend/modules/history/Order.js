// Part of <http://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

module.exports = Order;

function Order(startedAt, no, quantity)
{
  this._id = (startedAt + Math.round(Math.random() * 9999999)).toString(36).toUpperCase();
  this.no = no;
  this.quantity = quantity;
  this.successCounter = 0;
  this.failureCounter = 0;
  this.startedAt = startedAt;
  this.finishedAt = null;
  this.duration  = null;
}

Order.prototype.toJSON = function()
{
  return {
    _id: this._id,
    no: this.no,
    quantity: this.quantity,
    successCounter: this.successCounter,
    failureCounter: this.failureCounter,
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
    duration: this.duration
  };
};

Order.prototype.isSameOrder = function(no, quantity)
{
  return this.no === no && this.quantity === quantity;
};

Order.prototype.save = function(db, broker, done)
{
  var order = this.toJSON();

  db.run("\
    REPLACE INTO orders (\
      _id, no, quantity, successCounter, failureCounter, startedAt, finishedAt, duration\
    ) VALUES (\
      $_id, $no, $quantity, $successCounter, $failureCounter, $startedAt, $finishedAt, $duration\
    )\
    ", {
      $_id: this._id,
      $no: this.no,
      $quantity: this.quantity,
      $successCounter: this.successCounter,
      $failureCounter: this.failureCounter,
      $startedAt: this.startedAt,
      $finishedAt: this.finishedAt,
      $duration: this.duration
    },
    function(err)
    {
      if (err)
      {
        return done(err);
      }

      broker.publish('history.orderUpdated', order);

      return done();
    }
  );
};
