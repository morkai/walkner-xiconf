#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=.\installer.ico
#AutoIt3Wrapper_Outfile=.\Walkner Xiconf.exe
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

Global Const $SERVER_ADDR = "127.0.0.1"
Global Const $SERVER_PORT = 1337
Global Const $MAX_CONNECT_TRIES = 10
Global Const $CHROME_USER_DATA_DIR = @ScriptDir & "\data\google-chrome-profile"
Global Const $CHROME_APP = "http://localhost:1337/"
Global const $CHROME_WAIT_TIME = 60
Global Const $CONFIG_FILE = @ScriptDir & "\config\walkner-xiconf.js"
Global Const $SERVICE_USER = "CODE1\plr05639"
Global Const $SERVICE_PASS = "Lato2009"

_Singleton($SERVICE_NAME)

SplashText("Uruchamianie us³ugi " & $SERVICE_NAME & "...")
$stdout = RunGetStdout("sc start " & $SERVICE_NAME)

If StringInStr($stdout, "1060") Then
  SplashText("Konfiguracja...", True)
  CreateShortcuts()
  InstallVcRedist()
  CreateService()
  SplashText("Ponowne uruchamianie us³ugi...")
  $stdout = RunGetStdout("sc start " & $SERVICE_NAME)
EndIf

If Not StringInStr($stdout, "1056") And Not StringInStr($stdout, "SERVICE_NAME: " & $SERVICE_NAME) Then
  ExitWithError("Nie uda³o siê uruchomiæ us³ugi " & $SERVICE_NAME & " :(")
EndIf

SplashText("£¹czenie z serwerem 1/" & $MAX_CONNECT_TRIES & "...")

$connectCounter = 1

While TryToConnect() <> 0
  $connectCounter = $connectCounter + 1

  If $connectCounter = ($MAX_CONNECT_TRIES + 1) Then
    ExitWithError("Nie uda³o siê po³¹czyæ z serwerem :(")
  EndIf

  SplashText("£¹czenie z serwerem " & $connectCounter & "/" & $MAX_CONNECT_TRIES & "...")
  Sleep(1000)
WEnd

SplashText("Wyszukiwanie okna aplikacji...")

$browser = WinGetHandle("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]")

If @error Then
  SplashText("Uruchamianie okna aplikacji... ")

  $app = $CHROME_APP

  If Not FileExists($CHROME_USER_DATA_DIR) Then
    DirCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\profile", $CHROME_USER_DATA_DIR)
    FileCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\Local State", $CHROME_USER_DATA_DIR & "\Local State")

    $app = $app & "#settings?tab=license"
  EndIf

  Run(@ScriptDir & '\bin\google-chrome\App\Chrome-bin\chrome.exe --user-data-dir="' & $CHROME_USER_DATA_DIR & '" --app="' & $app & '"', @ScriptDir & "\bin\google-chrome\App\Chrome-bin")

  $browser = WinWait("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]", "", $CHROME_WAIT_TIME)
EndIf

If Not IsHWnd($browser) Then
  ExitWithError("Nie uda³o siê uruchomiæ okna aplikacji :(")
EndIf

SplashOff()
WinActivate($browser)

Func TryToConnect()
  TCPStartup()

  $socket = TCPConnect($SERVER_ADDR, $SERVER_PORT)
  $error = @error

  If Not $error Then
    TCPCloseSocket($socket)
  EndIf

  TCPShutdown()

  Return $error
EndFunc

Func CreateShortcuts()
  $key = "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{" & $PRODUCT_GUID & "}"

  RegWrite($key, "DisplayName", "REG_SZ", $PRODUCT_NAME)
  RegWrite($key, "DisplayVersion", "REG_SZ", $PRODUCT_VERSION)
  RegWrite($key, "DisplayIcon", "REG_SZ", '"' & @ScriptFullPath & '"')
  RegWrite($key, "Publisher", "REG_SZ", $PRODUCT_PUBLISHER)
  RegWrite($key, "URLInfoAbout", "REG_SZ", $PRODUCT_URL)
  RegWrite($key, "InstallLocation", "REG_SZ", '"' & @ScriptDir & '"')
  RegWrite($key, "UninstallString", "REG_SZ", '"' & @ScriptDir & "\bin\" & $SERVICE_NAME & '-uninstall.exe"')
  RegWrite($key, "NoModify", "REG_DWORD", 1)
  RegWrite($key, "NoRepair", "REG_DWORD", 1)
  RegWrite($key, "EstimatedSize", "REG_DWORD", 163840)

  $startMenu = @ProgramsDir & "\Walkner\" & $PRODUCT_NAME

  DirCreate($startMenu)
  FileCreateShortcut(@ScriptFullPath, $startMenu & "\Uruchom.lnk")
  FileCreateShortcut(@ScriptDir & "\docs\walkner-xiconf-user-guide.pl.pdf", $startMenu & "\Dokumentacja.lnk")
  FileCreateShortcut(@ScriptDir & "\bin\" & $SERVICE_NAME & "-uninstall.exe", $startMenu & "\Odinstaluj.lnk")
  FileCreateShortcut(@ScriptFullPath, @DesktopDir & "\" & $PRODUCT_NAME & ".lnk")

  If MsgBox(BitOr($MB_YESNO, $MB_ICONQUESTION), "Automatyczne uruchamianie", "Dodaæ skrót aplikacji do autostartu?") == $IDYES Then
    FileCreateShortcut(@ScriptFullPath, @StartupDir & "\Walkner Xiconf.lnk")
  EndIf
EndFunc

Func InstallVcRedist()
  $x32Installed = RegRead("HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\VisualStudio\10.0\VC\VCRedist\x86", "Installed") == "1"
  $x64Installed = RegRead("HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\VisualStudio\10.0\VC\VCRedist\x86", "Installed") == "1"

  If Not $x32Installed Or Not $x64Installed Then
    $exitCode = ShellExecuteWait(@ScriptDir & "\bin\vcredist_x86.exe", "/q /norestart")
    If $exitCode == 0 Then
      FileDelete(@ScriptDir & "\bin\vcredist_x86.exe")
    EndIf
  EndIf
EndFunc

Func CreateService()
  SplashText("Tworzenie us³ugi " & $SERVICE_NAME & "... ", True)

  $username = InputBox("Podaj nazwê konta dla us³ugi", "Nazwa konta us³ugi:", $SERVICE_USER, "", 325, 125)
  $password = InputBox("Podaj has³o konta dla us³ugi", "Has³o konta us³ugi:", $SERVICE_PASS, "", 325, 125)

  RunWait(@ScriptDir & "\bin\" & $SERVICE_NAME & '\bin\service-create.bat "' & $CONFIG_FILE & '" "' & $username & '" "' & $password & '"', @ScriptDir & "\bin", @SW_HIDE)
EndFunc
