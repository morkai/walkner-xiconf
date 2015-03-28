/*jshint maxlen:false*/

'use strict';

var chunks = '\
INFO	Philips MultiOne Workflow version 1.1.3.18406\r\n\
INFO	OS: Microsoft Windows 7 Enterprise. Computer name: QQ000CZC3484Q2F. Application path: C:\\Program Files (x86)\\Philips MultiOne Workflow\\MultiOneWorkflow.exe. Running as administrator: yes. Format: Polski (Polska) [pl-PL], date format: yyyy-MM-dd, right to left: no, decimal separator: [,].\r\n\
INFO	On warnings: halt\r\n\
INFO	Using Write without Verify.\r\n\
INFO	Multiple device configuring: Enabled\r\n\
INFO	Starting: Prepare system activity (PrepareSystem).\r\n\
INFO	Connected to the MultiOne interface\r\n\
INFO	Success: Prepare system activity (PrepareSystem).\r\n\
INFO	Starting: Select feature file activity (SelectFeatureFile).\r\n\
INFO	Opening features file\r\n\
INFO	Success: Select feature file activity (SelectFeatureFile).\r\n\
INFO	Starting: Initialize communication activity (InitializeCommunication).\r\n\
INFO	Success: Initialize communication activity (InitializeCommunication).\r\n\
INFO	Starting: Identify device activity (IdentifyDevice).\r\n\
INFO	Discovering (single)...\r\n\
INFO	Discovery done; loading devices...\r\n\
INFO	Success: Identify device activity (IdentifyDevice).\r\n\
INFO	Starting: Convert feature data activity (ConvertFeatureData).\r\n\
INFO	Success: Convert feature data activity (ConvertFeatureData).\r\n\
INFO	Starting: Check if features match file activity (CheckIfFeaturesMatchFile).\r\n\
INFO	Success: Check if features match file activity (CheckIfFeaturesMatchFile).\r\n\
INFO	Starting: Write feature data activity (WriteFeatureData).\r\n\
INFO	Read device: 0: Xitanium 75W 0.12-0.4A 215V TD 230V 1.5; write device: Broadcast:  ; features: TouchAndDim v1, AOC v1\r\n\
INFO	Initializing communication...\r\n\
INFO	Writing TouchAndDim...\r\n\
INFO	Writing AOC...\r\n\
INFO	Features written\r\n\
INFO	Resetting short address...\r\n\
INFO	Short address reset\r\n\
INFO	Success: Write feature data activity (WriteFeatureData).\r\n\
INFO	Starting: Finalize communication activity (FinalizeCommunication).\r\n\
INFO	Success: Finalize communication activity (FinalizeCommunication).\r\n\
INFO	Starting: Stop activity (Stop).\r\n\
INFO	Success: Stop activity (Stop).\r\n\
INFO	End'.split('\r\n');

function next(i)
{
  if (i === chunks.length)
  {
    return process.exit(Math.random() > 0.9 ? 0xFFFF : 0);
  }

  var chunk = chunks[i];

  console.log(chunk);

  var start = chunk.indexOf('Start') !== -1;
  var delay = 0;

  if (start)
  {
    delay = 100 + Math.random() * 200;
  }
  else
  {
    delay = 50 + Math.random() * 100;
  }

  setTimeout(next, Math.round(delay), i + 1);
}

next(0);
