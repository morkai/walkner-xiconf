@echo off
nssm stop walkner-xiconf
nssm remove walkner-xiconf confirm
nssm install walkner-xiconf "%CD%\node.exe" "backend\main.js" "%1"
nssm set walkner-xiconf AppDirectory "%~dp0.."
nssm set walkner-xiconf AppEnvironmentExtra "NODE_ENV=production"
nssm set walkner-xiconf AppStdout "%CD%\..\logs\walkner-xiconf.log"
nssm set walkner-xiconf AppStderr "%CD%\..\logs\walkner-xiconf.log"
nssm set walkner-xiconf Description "Aplikacja wspomagajaca proces programowania sterownikow LED oraz HID."
nssm set walkner-xiconf DisplayName "Walkner Xiconf"
nssm set walkner-xiconf Start SERVICE_AUTO_START
nssm set walkner-xiconf AppRotateFiles 1
nssm set walkner-xiconf AppRotateBytes 5242880

if not "%2"=="" (
  ntrights +r SeServiceLogonRight -u "%2"

  if not "%3"=="" (
    sc config walkner-xiconf obj= "%2" password= "%3"
  ) else (
    sc config walkner-xiconf obj= "%2"
  )
)
