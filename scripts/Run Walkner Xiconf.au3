#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=.\installer.ico
#AutoIt3Wrapper_Outfile=.\Run Walkner Xiconf.exe
#AutoIt3Wrapper_Res_Description=Aplikacja wspomagaj¹ca proces programowania sterowników LED oraz HID.
#AutoIt3Wrapper_Res_Fileversion=1.0.0.0
#AutoIt3Wrapper_Res_ProductVersion=2.0.0
#AutoIt3Wrapper_Res_LegalCopyright=Copyright © 2014 walkner.pl
#AutoIt3Wrapper_Res_Language=1045
#AutoIt3Wrapper_Res_Field=OriginalFilename|Walkner Xiconf.exe
#AutoIt3Wrapper_Res_Field=FileDescription|Plik s³u¿¹cy do uruchamiania aplikacji Walkner Xiconf.
#AutoIt3Wrapper_Res_Field=ProductName|Walkner Xiconf
#AutoIt3Wrapper_Res_Field=CompanyName|Walkner elektronika przemys³owa Zbigniew Walukiewicz
#AutoIt3Wrapper_Res_Field=HomePage|http://walkner.pl/
#AutoIt3Wrapper_Res_Field=E-mail|walkner@walkner.pl
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****

#RequireAdmin

#include ".\common.au3"
#include <TrayConstants.au3>

Global Const $ROOT_DIR = @ScriptDir
Global Const $SERVER_ADDR = "127.0.0.1"
Global Const $SERVER_PORT = 1337
Global Const $MAX_CONNECT_TRIES = 10
Global Const $CHROME_USER_DATA_DIR = $ROOT_DIR & "\data\google-chrome-profile"
Global Const $CHROME_APP = "http://localhost:1337/"
Global const $CHROME_WAIT_TIME = 60

_Singleton($SERVICE_NAME)

Opt("TrayMenuMode", 3)

TraySetState(1)
TraySetClick(16)

$exit = TrayCreateItem("Wy³¹cz aplikacjê")

While 1
  Switch TrayGetMsg()
    Case $TRAY_EVENT_PRIMARYDOUBLE
      MsgBox(0, "Chrome", "Activate!")
    Case $exit
      Exit
  EndSwitch
WEnd