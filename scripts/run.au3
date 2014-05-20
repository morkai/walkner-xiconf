#AutoIt3Wrapper_Icon=.\run.ico
#AutoIt3Wrapper_Outfile=.\Walkner Xiconf.exe
#AutoIt3Wrapper_Res_Description=Aplikacja wspomagająca proces programowania sterowników LED oraz HID.
#AutoIt3Wrapper_Res_Fileversion=1.0.0.0
#AutoIt3Wrapper_Res_ProductVersion=0.0.0
#AutoIt3Wrapper_Res_LegalCopyright=Copyright © 2014 walkner.pl
#AutoIt3Wrapper_Res_Language=1045
#AutoIt3Wrapper_Res_Field=OriginalFilename|Walkner Xiconf.exe
#AutoIt3Wrapper_Res_Field=FileDescription|Plik uruchamiający aplikację Walkner Xiconf.
#AutoIt3Wrapper_Res_Field=ProductName|Walkner Xiconf
#AutoIt3Wrapper_Res_Field=CompanyName|Walkner elektronika przemysłowa Zbigniew Walukiewicz
#AutoIt3Wrapper_Res_Field=HomePage|http://walkner.pl/
#AutoIt3Wrapper_Res_Field=E-mail|walkner@walkner.pl

#RequireAdmin

#include ".\common.au3"

Global Const $MAX_CONNECT_TRIES = 10
Global const $CHROME_WAIT_TIME = 60

_Singleton($SERVICE_NAME)

SplashText("Uruchamianie usługi " & $SERVICE_NAME & "...")
$stdout = RunGetStdout("sc start " & $SERVICE_NAME)

If StringInStr($stdout, "1060") Then
  SplashText("Konfiguracja...", True)
  CreateShortcuts()
  InstallVcRedist()
  CreateService()
  SplashText("Ponowne uruchamianie usługi...")
  $stdout = RunGetStdout("sc start " & $SERVICE_NAME)
EndIf

If Not StringInStr($stdout, "1056") And Not StringInStr($stdout, "SERVICE_NAME: " & $SERVICE_NAME) Then
  ExitWithError("Nie udało się uruchomić usługi " & $SERVICE_NAME & " :(")
EndIf

SplashText("Łączenie z serwerem 1/" & $MAX_CONNECT_TRIES & "...")

$connectCounter = 1

While TryToConnect() <> 0
  $connectCounter = $connectCounter + 1

  If $connectCounter = ($MAX_CONNECT_TRIES + 1) Then
    ExitWithError("Nie udało się połączyć z serwerem :(")
  EndIf

  SplashText("Łączenie z serwerem " & $connectCounter & "/" & $MAX_CONNECT_TRIES & "...")
  Sleep(1000)
WEnd

SplashText("Wyszukiwanie okna aplikacji...")

$browser = WinGetHandle("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]")

If @error Then
  SplashText("Uruchamianie okna aplikacji... ")

  $app = "http://" & $SERVER_ADDR & ":" & $SERVER_PORT & "/"
  $dataDir = @ScriptDir & "\data\google-chrome-profile"

  If Not FileExists($dataDir) Then
    DirCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\profile", $dataDir)
    FileCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\Local State", $dataDir & "\Local State")

    $app = $app & "#settings?tab=license"
  EndIf

  Run(@ScriptDir & '\bin\google-chrome\App\Chrome-bin\chrome.exe --user-data-dir="' & $dataDir & '" --app="' & $app & '"', @ScriptDir & "\bin\google-chrome\App\Chrome-bin")

  $browser = WinWait("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]", "", $CHROME_WAIT_TIME)
EndIf

If Not IsHWnd($browser) Then
  ExitWithError("Nie udało się uruchomić okna aplikacji :(")
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
  $key = "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{" & $PRODUCT_GUID & "}"

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
  FileCreateShortcut(@ScriptDir & "\docs\" & $SERVICE_NAME & "-user-guide.pl.pdf", $startMenu & "\Dokumentacja.lnk")
  FileCreateShortcut(@ScriptDir & "\bin\" & $SERVICE_NAME & "-uninstall.exe", $startMenu & "\Odinstaluj.lnk")
  FileCreateShortcut(@ScriptFullPath, @DesktopDir & "\" & $PRODUCT_NAME & ".lnk")

  If MsgBox(BitOr($MB_YESNO, $MB_ICONQUESTION), "Automatyczne uruchamianie", "Dodać skrót aplikacji do autostartu?") == $IDYES Then
    FileCreateShortcut(@ScriptFullPath, @StartupDir & "\" & $PRODUCT_NAME & ".lnk")
  EndIf
EndFunc

Func InstallVcRedist()
  $x32Installed = RegRead("HKLM\SOFTWARE\Microsoft\VisualStudio\10.0\VC\VCRedist\x86", "Installed") == "1"
  $x64Installed = RegRead("HKLM\SOFTWARE\Wow6432Node\Microsoft\VisualStudio\10.0\VC\VCRedist\x86", "Installed") == "1"

  If Not $x32Installed Or Not $x64Installed Then
    $exitCode = ShellExecuteWait(@ScriptDir & "\bin\vcredist_x86.exe", "/q /norestart")
    If $exitCode == 0 Then
      FileDelete(@ScriptDir & "\bin\vcredist_x86.exe")
    EndIf
  EndIf
EndFunc

Func CreateService()
  SplashText("Tworzenie usługi " & $SERVICE_NAME & "... ", True)

  $username = InputBox("Podaj nazwę konta dla usługi", "Nazwa konta usługi:", $SERVICE_USER, "", 325, 125)
  $password = InputBox("Podaj hasło konta dla usługi", "Hasło konta usługi:", $SERVICE_PASS, "", 325, 125)

  RunWait(@ScriptDir & "\bin\" & $SERVICE_NAME & '\bin\service-create.bat "' & @ScriptDir & "\config\" & $SERVICE_NAME & ".js" & '" "' & $username & '" "' & $password & '"', @ScriptDir & "\bin", @SW_HIDE)
EndFunc
