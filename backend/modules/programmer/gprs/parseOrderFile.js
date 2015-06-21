// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

'use strict';

var InvalidOptionError = require('./InvalidOptionError');

module.exports = function parseOrderFile(orderFileContents)
{
  var lines = orderFileContents.split(/(\r\n|\n|\r)+/);
  var rawOrderData = {};

  for (var i = 0, l = lines.length; i < l; ++i)
  {
    var line = lines[i];
    var colonPos = line.indexOf(':');

    if (colonPos === -1)
    {
      continue;
    }

    var property = line.substr(0, colonPos).trim().toLowerCase();

    if (property === '')
    {
      continue;
    }

    rawOrderData[property] = line.substr(colonPos + 1).trim();
  }

  var orderData = {
    productDefinition: null,
    configurationDesignation: null,
    productName: null,
    productionLocation: null,
    systemPower: null,
    productClass: null,
    luminousFlux: null,
    colorRenderingIndex: null,
    optics: null,
    salesOrder: {
      orderNumber: null,
      orderLineNumber: null,
      orderLineQty: null
    },
    lightColor: null,
    ambientTemperatureRating: null
  };

  if (rawOrderData['material number'])
  {
    orderData.productDefinition = rawOrderData['material number'].trim();
  }

  if (!orderData.productDefinition)
  {
    throw new InvalidOptionError(
      'material number => productDefinition',
      rawOrderData['material number']
    );
  }

  if (rawOrderData['commercial designation'])
  {
    orderData.configurationDesignation = rawOrderData['commercial designation'].trim();
  }

  if (!orderData.configurationDesignation)
  {
    throw new InvalidOptionError(
      'commercial designation => configurationDesignation',
      rawOrderData['commercial designation']
    );
  }

  var matches = orderData.configurationDesignation.match(/(?:GRN|ECO)([0-9]+)[-\s]*\/[-\s]*([0-9]{3})/);

  if (matches === null)
  {
    throw new InvalidOptionError(
      'commercial designation => configurationDesignation',
      orderData.configurationDesignation
    );
  }

  var lampType = matches[0];

  orderData.luminousFlux = parseInt(matches[1], 10) * 100;
  orderData.colorRenderingIndex = parseInt(matches[2][0], 10) * 10;
  orderData.lightColor = parseInt(matches[2].substr(1), 10) * 100;

  matches = orderData.configurationDesignation.match(/(I+V?I*)\s+([A-Z0-9]+)/);

  if (matches === null)
  {
    var lampTypePos = orderData.configurationDesignation.indexOf(lampType);
    var parts = orderData.configurationDesignation.substr(lampTypePos + lampType.length).trim().split(/\s+/);

    orderData.productClass = 'I';
    orderData.optics = parts[0];
  }
  else
  {
    orderData.productClass = matches[1];
    orderData.optics = matches[2];
  }

  if (rawOrderData['product family name'])
  {
    orderData.productName = rawOrderData['product family name'].trim();
  }

  if (!orderData.productName)
  {
    throw new InvalidOptionError(
      'product family name => productName',
      rawOrderData['product family name']
    );
  }

  if (rawOrderData['country of origin/ made in'])
  {
    orderData.productionLocation = rawOrderData['country of origin/ made in'].trim();
  }

  if (!orderData.productionLocation)
  {
    throw new InvalidOptionError(
      'country of origin/ made in => productionLocation',
      rawOrderData['country of origin/ made in']
    );
  }

  if (rawOrderData['special designation'])
  {
    orderData.systemPower = parseFloat(rawOrderData['special designation'].trim().replace(',', '.'));
  }

  if (orderData.systemPower === null || isNaN(orderData.systemPower))
  {
    throw new InvalidOptionError(
      'special designation => systemPower',
      rawOrderData['special designation']
    );
  }

  orderData.salesOrder.orderNumber = parseInt(rawOrderData['sales order number'], 10);

  if (isNaN(orderData.salesOrder.orderNumber))
  {
    throw new InvalidOptionError(
      'sales order number => salesOrder.orderNumber',
      rawOrderData['sales order number']
    );
  }

  orderData.salesOrder.orderLineNumber = parseInt(rawOrderData['sales order item number'], 10);

  if (isNaN(orderData.salesOrder.orderLineNumber))
  {
    throw new InvalidOptionError(
      'sales order item number => salesOrder.orderLineNumber',
      rawOrderData['sales order item number']
    );
  }

  orderData.salesOrder.orderLineQty = parseInt(rawOrderData['production order quantity'], 10);

  if (isNaN(orderData.salesOrder.orderLineQty))
  {
    throw new InvalidOptionError(
      'production order quantity => salesOrder.orderLineQty',
      rawOrderData['production order quantity']
    );
  }

  orderData.ambientTemperatureRating = parseInt((rawOrderData.temperature || '').replace(/[^0-9]/g, ''), 10);

  if (isNaN(orderData.ambientTemperatureRating))
  {
    throw new InvalidOptionError(
      'temperature => ambientTemperatureRating',
      rawOrderData.temperature
    );
  }

  return orderData;
};
