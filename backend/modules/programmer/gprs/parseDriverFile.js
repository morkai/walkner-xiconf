// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

'use strict';

var xml2js = require('xml2js');
var InvalidOptionError = require('./InvalidOptionError');

var featureHandlers = {

  CLO: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      if (itemValue.ItemName[0] === 'Enabled')
      {
        driverData.cloEnabled = itemValue.Data[0].Rows[0].SerializeDataRow[0].Values[0].anyType[0]._ === 'true';
      }
      else if (itemValue.ItemName[0] === 'Values')
      {
        driverData.cloProfile = [];

        var columns = {
          hours: 0,
          percentage: 1
        };

        itemValue.Data[0].Columns[0].SerializeDataColumn.forEach(function(column, i)
        {
          if (column.Name[0] === 'CLOTime')
          {
            columns.hours = i;
          }
          else if (column.Name[0] === 'CLOPerc')
          {
            columns.percentage = i;
          }
        });

        itemValue.Data[0].Rows[0].SerializeDataRow.forEach(function(value)
        {
          var values = value.Values[0].anyType;

          driverData.cloProfile.push({
            hours: parseInt(values[columns.hours]._, 10) * 500,
            percentage: parseInt(values[columns.percentage]._, 10)
          });
        });
      }
    });
  },

  AOC: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      if (itemValue.ItemName[0] === 'Value')
      {
        driverData.current = parseInt(itemValue.Data[0].Rows[0].SerializeDataRow[0].Values[0].anyType[0]._, 10);
      }
    });
  },

  StartFadeUpTime: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      if (itemValue.ItemName[0] === 'StartUpFadeTimeLevel')
      {
        driverData.startupDelay = parseInt(itemValue.Data[0].Rows[0].SerializeDataRow[0].Values[0].anyType[0]._, 10);
      }
    });
  },

  MTPOutdoor: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      var values = itemValue.Data[0].Rows[0].SerializeDataRow[0].Values;

      if (itemValue.ItemName[0] === 'Values')
      {
        var columns = {
          warningTemperature: 0,
          maxTemperature: 1,
          minDimLevel: 1
        };

        itemValue.Data[0].Columns[0].SerializeDataColumn.forEach(function(column, i)
        {
          if (column.Name[0] === 'HighTempPerc')
          {
            columns.warningTemperature = i;
          }
          else if (column.Name[0] === 'DimStart')
          {
            columns.maxTemperature = i;
          }
          else if (column.Name[0] === 'DimStop')
          {
            columns.minDimLevel = i;
          }
        });

        values = values[0].anyType;

        driverData.warningTemperature = parseInt(values[columns.warningTemperature]._, 10);
        driverData.maxTemperature = parseInt(values[columns.maxTemperature]._, 10);
        driverData.minDimLevel = parseInt(values[columns.minDimLevel]._, 10);
      }
      else if (itemValue.ItemName[0] === 'Enabled')
      {
        if (values[0].anyType[0]._ === 'false')
        {
          driverData.ntcSelection = 0;
        }
      }
      else if (itemValue.ItemName[0] === 'SelectedResistance' && driverData.ntcSelection !== 0)
      {
        driverData.ntcSelection = parseInt(values[0].anyType[0]._, 10) + 1;
      }
    });
  },

  InterfaceSelection: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      if (itemValue.ItemName[0] === 'SelectedInterface')
      {
        driverData.dynaDimmerEnabled =
          parseInt(itemValue.Data[0].Rows[0].SerializeDataRow[0].Values[0].anyType[0]._, 10) === 2;
      }
    });
  },

  DynadimmerLED: function(driverData, itemValues)
  {
    itemValues.forEach(function(itemValue)
    {
      var data = itemValue.Data[0];

      if (itemValue.ItemName[0] === 'Scenes')
      {
        driverData.dynaDimmerProfile = {};

        var columns = {
          startHour: 0,
          startMinute: 1,
          percentage: 3
        };

        data.Columns[0].SerializeDataColumn.forEach(function(column, i)
        {
          if (column.Name[0] === 'Hour')
          {
            columns.startHour = i;
          }
          else if (column.Name[0] === 'Minute')
          {
            columns.startMinute = i;
          }
          else if (column.Name[0] === 'DimLevel')
          {
            columns.percentage = i;
          }
        });

        data.Rows[0].SerializeDataRow.forEach(function(row, i)
        {
          var values = row.Values[0].anyType;

          driverData.dynaDimmerProfile['level' + (i + 1)] = {
            startHour: parseInt(values[columns.startHour]._, 10),
            startMinute: parseInt(values[columns.startMinute]._, 10),
            percentage: parseInt(values[columns.percentage]._, 10)
          };
        });
      }
      else if (itemValue.ItemName[0] === 'MidnightLine')
      {
        driverData.midPointShift = parseInt(data.Rows[0].SerializeDataRow[0].Values[0].anyType[0]._, 10);
      }
    });
  }

};

function tryHandleFeature(driverData, featureName, itemValues)
{
  try
  {
    featureHandlers[featureName](driverData, itemValues);
  }
  catch (err)
  {
    err.code = 'GPRS:PARSING_DRIVER_FILE_FAILURE';
    err.message = '[' + featureName + '] ' + err.message;

    throw err;
  }
}

function validateCloProfile(profile)
{
  if (!Array.isArray(profile) || profile.length !== 16)
  {
    return false;
  }

  for (var i = 0; i < 16; ++i)
  {
    if (isNaN(profile[i].hours) || isNaN(profile[i].percentage))
    {
      return false;
    }
  }

  return true;
}

function validateDynaDimmerProfile(profile)
{
  return profile
    && Object.keys(profile).length === 5
    && validateDynaDimmerProfileLevel(1, profile)
    && validateDynaDimmerProfileLevel(2, profile)
    && validateDynaDimmerProfileLevel(3, profile)
    && validateDynaDimmerProfileLevel(4, profile)
    && validateDynaDimmerProfileLevel(5, profile);
}

function validateDynaDimmerProfileLevel(level, profile)
{
  var data = profile['level' + level];

  return data && !isNaN(data.startHour) && !isNaN(data.startMinute) && !isNaN(data.percentage);
}

function parseDriverXml(xml)
{
  if (!xml
    || !xml.SaveData
    || !xml.SaveData.Features
    || !xml.SaveData.Features[0]
    || !xml.SaveData.Features[0].FeatureData)
  {
    throw 'GPRS:PARSING_DRIVER_FILE_FAILURE';
  }

  var driverData = {
    cloEnabled: false,
    cloProfile: null,
    current: null,
    startupDelay: 1000,
    ntcSelection: 0,
    warningTemperature: null,
    maxTemperature: null,
    minDimLevel: null,
    dynaDimmerEnabled: false,
    dynaDimmerProfile: null,
    midPointShift: 38
  };

  var allFeatureData = xml.SaveData.Features[0].FeatureData;

  for (var i = 0, l = allFeatureData.length; i < l; ++i)
  {
    var featureData = allFeatureData[i];

    if (featureData.FeatureName
      && featureHandlers[featureData.FeatureName[0]]
      && featureData.ItemValues
      && featureData.ItemValues[0]
      && featureData.ItemValues[0].FeatureItemData)
    {
      tryHandleFeature(driverData, featureData.FeatureName[0], featureData.ItemValues[0].FeatureItemData);
    }
  }

  if (!driverData.cloEnabled)
  {
    driverData.cloProfile = [
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0},
      {hours: 0, percentage: 0}
    ];
  }
  else if (!validateCloProfile(driverData.cloProfile))
  {
    throw new InvalidOptionError('CLO.Values => cloProfile');
  }

  if (typeof driverData.current !== 'number')
  {
    throw new InvalidOptionError('AOC.Value => current', driverData.current);
  }

  if (typeof driverData.warningTemperature !== 'number')
  {
    throw new InvalidOptionError(
      'MTPOutdoor.HighTempPerc => moduleThermalProtection.warningTemperature',
      driverData.current
    );
  }

  if (typeof driverData.maxTemperature !== 'number')
  {
    throw new InvalidOptionError(
      'MTPOutdoor.DimStart => moduleThermalProtection.maxTemperature',
      driverData.maxTemperature
    );
  }

  if (typeof driverData.minDimLevel !== 'number')
  {
    throw new InvalidOptionError(
      'MTPOutdoor.DimStop => moduleThermalProtection.minDimLevel',
      driverData.minDimLevel
    );
  }

  if (!driverData.dynaDimmerEnabled)
  {
    driverData.dynaDimmerProfile = {
      level1: {startHour: 0, startMinute: 0, percentage: 0},
      level2: {startHour: 0, startMinute: 0, percentage: 0},
      level3: {startHour: 0, startMinute: 0, percentage: 0},
      level4: {startHour: 0, startMinute: 0, percentage: 0},
      level5: {startHour: 0, startMinute: 0, percentage: 0}
    };
  }
  else if (!validateDynaDimmerProfile(driverData.dynaDimmerProfile))
  {
    throw new InvalidOptionError('DynadimmerLED.Scenes => olc.dynaDimmerProfile');
  }

  if (typeof driverData.midPointShift !== 'number')
  {
    throw new InvalidOptionError('DynadimmerLED.MidnightLine => olc.midPointShift', driverData.midPointShift);
  }

  return driverData;
}

module.exports = function parseDriverFile(driverFileContents, done)
{
  xml2js.parseString(driverFileContents, function(err, xml)
  {
    if (err)
    {
      err.code = 'GPRS:PARSING_DRIVER_FILE_FAILURE';

      return done(err);
    }

    try
    {
      return done(null, parseDriverXml(xml));
    }
    catch (err)
    {
      return done(err);
    }
  });
};
