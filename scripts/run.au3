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

$lang = ReadLang()

Switch $lang
  Case "pl"
    $LANG_SERVICE_STARTING = "Uruchamianie usługi " & $SERVICE_NAME & "..."
    $LANG_SERVICE_CREATING = "Tworzenie usługi " & $SERVICE_NAME & "... "
    $LANG_SERVICE_RESTARTING = "Ponowne uruchamianie usługi..."
    $LANG_SERVICE_START_FAILURE = "Nie udało się uruchomić usługi " & $SERVICE_NAME & " :("
    $LANG_CONFIGURING = "Konfiguracja..."
    $LANG_CONNECTING = "Łączenie z serwerem"
    $LANG_CONNECTING_FAILURE = "Nie udało się połączyć z serwerem :("
    $LANG_WINDOW_SEARCHING = "Wyszukiwanie okna aplikacji..."
    $LANG_WINDOW_OPENING = "Uruchamianie okna aplikacji... "
    $LANG_WINDOW_OPENING_FAILURE = "Nie udało się uruchomić okna aplikacji :("
    $LANG_LNK_RUN = "Uruchom"
    $LANG_LNK_UNINSTALL = "Odinstaluj"
    $LANG_LNK_DOCS = "Dokumentacja"
    $LANG_AUTOSTART_TITLE = "Automatyczne uruchamianie"
    $LANG_AUTOSTART_MESSAGE = "Dodać skrót aplikacji do autostartu?"
    $LANG_INPUT_USER_TITLE = "Podaj nazwę konta dla usługi"
    $LANG_INPUT_USER_LABEL = "Nazwa konta usługi:"
    $LANG_INPUT_PASS_TITLE = "Podaj hasło konta dla usługi"
    $LANG_INPUT_PASS_LABEL = "Hasło konta usługi:"
  Case Else
    $LANG_SERVICE_STARTING = "Starting the " & $SERVICE_NAME & " service..."
    $LANG_SERVICE_CREATING = "Creating the " & $SERVICE_NAME & " service... "
    $LANG_SERVICE_RESTARTING = "Starting the service... again..."
    $LANG_SERVICE_START_FAILURE = "Failed to start the " & $SERVICE_NAME & " service :("
    $LANG_CONFIGURING = "Configuring..."
    $LANG_CONNECTING = "Connecting to the server"
    $LANG_CONNECTING_FAILURE = "Failed to connect to the server :("
    $LANG_WINDOW_SEARCHING = "Searching the application window..."
    $LANG_WINDOW_OPENING = "Starting the application window... "
    $LANG_WINDOW_OPENING_FAILURE = "Failed to start the application window :("
    $LANG_LNK_RUN = "Run"
    $LANG_LNK_UNINSTALL = "Uninstall"
    $LANG_LNK_DOCS = "Documentation"
    $LANG_AUTOSTART_TITLE = "Autostart"
    $LANG_AUTOSTART_MESSAGE = "Add the application shortcut to the startup?"
    $LANG_INPUT_USER_TITLE = "Specify the service username"
    $LANG_INPUT_USER_LABEL = "Service username:"
    $LANG_INPUT_PASS_TITLE = "Specify the service password"
    $LANG_INPUT_PASS_LABEL = "Service password:"
EndSwitch

SplashText($LANG_SERVICE_STARTING)
$stdout = RunGetStdout("sc start " & $SERVICE_NAME)

If StringInStr($stdout, "1060") Then
  SplashText($LANG_CONFIGURING, True)
  CreateShortcuts()
  InstallVcRedist()
  CreateService()
  SplashText($LANG_SERVICE_RESTARTING)
  $stdout = RunGetStdout("sc start " & $SERVICE_NAME)
EndIf

If Not StringInStr($stdout, "1056") And Not StringInStr($stdout, "SERVICE_NAME: " & $SERVICE_NAME) Then
  ExitWithError($LANG_SERVICE_START_FAILURE)
EndIf

SplashText($LANG_CONNECTING & " 1/" & $MAX_CONNECT_TRIES & "...")

$connectCounter = 1

While TryToConnect() <> 0
  $connectCounter = $connectCounter + 1

  If $connectCounter = ($MAX_CONNECT_TRIES + 1) Then
    ExitWithError($LANG_CONNECTING_FAILURE)
  EndIf

  SplashText($LANG_CONNECTING & " " & $connectCounter & "/" & $MAX_CONNECT_TRIES & "...")
  Sleep(1000)
WEnd

SplashText($LANG_WINDOW_SEARCHING)

$browser = WinGetHandle("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]")

If @error Then
  SplashText($LANG_WINDOW_OPENING)

  $app = "http://" & $SERVER_ADDR & ":" & $SERVER_PORT & "/"
  $dataDir = @ScriptDir & "\data\google-chrome-profile"

  If Not FileExists($dataDir) Then
    DirCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\profile", $dataDir)
    FileCopy(@ScriptDir & "\bin\google-chrome\App\DefaultData\Local State", $dataDir & "\Local State")

    $app = $app & "#settings?tab=license"
  EndIf

  Run(@ScriptDir & '\bin\google-chrome\App\Chrome-bin\chrome.exe --lang=' & $lang & ' --user-data-dir="' & $dataDir & '" --app="' & $app & '"', @ScriptDir & "\bin\google-chrome\App\Chrome-bin")

  $browser = WinWait("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]", "", $CHROME_WAIT_TIME)
EndIf

If Not IsHWnd($browser) Then
  ExitWithError($LANG_WINDOW_OPENING_FAILURE)
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
  FileCreateShortcut(@ScriptFullPath, $startMenu & "\" & $LANG_LNK_RUN & ".lnk")
  FileCreateShortcut(@ScriptDir & "\docs\" & $SERVICE_NAME & "-user-guide.pl.pdf", $startMenu & "\" & $LANG_LNK_DOCS & ".lnk")
  FileCreateShortcut(@ScriptDir & "\bin\" & $SERVICE_NAME & "-uninstall.exe", $startMenu & "\" & $LANG_LNK_UNINSTALL & ".lnk")
  FileCreateShortcut(@ScriptFullPath, @DesktopDir & "\" & $PRODUCT_NAME & ".lnk")

  If MsgBox(BitOr($MB_YESNO, $MB_ICONQUESTION), $LANG_AUTOSTART_TITLE, $LANG_AUTOSTART_MESSAGE) == $IDYES Then
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
  SplashText($LANG_SERVICE_CREATING, True)

  $username = InputBox($LANG_INPUT_USER_TITLE, $LANG_INPUT_USER_LABEL, $SERVICE_USER, "", 325, 125)
  $password = InputBox($LANG_INPUT_PASS_TITLE, $LANG_INPUT_PASS_LABEL, $SERVICE_PASS, "", 325, 125)

  RunWait(@ScriptDir & "\bin\" & $SERVICE_NAME & '\bin\service-create.bat "' & @ScriptDir & "\config\" & $SERVICE_NAME & ".js" & '" "' & $username & '" "' & $password & '"', @ScriptDir & "\bin", @SW_HIDE)

  If $username <> "" And $password <> "" Then
    GrantDComPermissions($username)
  EndIf
EndFunc

Func GrantDComPermissions($username)
  $pid = Run(@ScriptDir & "\bin\DComPerm.exe -dl list")

  ProcessWaitClose($pid)

  $stdout = StdoutRead($pid)

  If StringRegExp($stdout, "(?i)Local.*?permitted.*?" & $username) Then
    Return
  EndIf

  RunWait(@ScriptDir & "\bin\DComPerm.exe -dl set " & $username & " permit level:ll,la")
EndFunc
