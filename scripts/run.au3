#AutoIt3Wrapper_UseX64=y
#AutoIt3Wrapper_Icon=.\run.ico
#AutoIt3Wrapper_Outfile=.\XiconfRun.exe
#AutoIt3Wrapper_Res_Description=Aplikacja wspomagająca proces programowania sterowników LED oraz HID.
#AutoIt3Wrapper_Res_Fileversion=1.0.0.0
#AutoIt3Wrapper_Res_ProductVersion=0.0.0
#AutoIt3Wrapper_Res_LegalCopyright=Copyright © 2015 walkner.pl
#AutoIt3Wrapper_Res_Language=1045
#AutoIt3Wrapper_Res_Field=OriginalFilename|XiconfRun.exe
#AutoIt3Wrapper_Res_Field=FileDescription|Plik uruchamiający aplikację Walkner Xiconf.
#AutoIt3Wrapper_Res_Field=ProductName|Walkner Xiconf
#AutoIt3Wrapper_Res_Field=CompanyName|Walkner elektronika przemysłowa Zbigniew Walukiewicz
#AutoIt3Wrapper_Res_Field=HomePage|http://walkner.pl/
#AutoIt3Wrapper_Res_Field=E-mail|walkner@walkner.pl

#RequireAdmin
#NoTrayIcon

#include <TrayConstants.au3>
#include ".\common.au3"

Global Const $MAX_CONNECT_TRIES = 30
Global const $CHROME_WAIT_TIME = 60

Opt("WinTitleMatchMode", 2)
Opt("TrayMenuMode", 3)
Opt("TrayOnEventMode", 1)

$lang = FileRead(@ScriptDir & "\..\data\lang.txt", 2)

Switch $lang
  Case "pl"
    $LANG_STDREDIR_SEARCHING = "Wyszukiwanie procesu aplikacji..."
    $LANG_STDREDIR_RUNNING = "Uruchamianie procesu aplikacji..."
    $LANG_STDREDIR_FAILURE = "Nie udało się uruchomić procesu aplikacji..."
    $LANG_CONFIGURING = "Konfiguracja..."
    $LANG_CONNECTING = "Łączenie z serwerem"
    $LANG_CONNECTING_FAILURE = "Nie udało się połączyć z serwerem :("
    $LANG_WINDOW_SEARCHING = "Wyszukiwanie okna aplikacji..."
    $LANG_WINDOW_OPENING = "Uruchamianie okna aplikacji..."
    $LANG_WINDOW_OPENING_FAILURE = "Nie udało się uruchomić okna aplikacji :("
    $LANG_LNK_RUN = "Uruchom"
    $LANG_LNK_UNINSTALL = "Odinstaluj"
    $LANG_LNK_DOCS = "Dokumentacja"
    $LANG_AUTOSTART_TITLE = "Automatyczne uruchamianie"
    $LANG_AUTOSTART_MESSAGE = "Dodać skrót aplikacji do autostartu?"
    $LANG_TRAY_EXIT = "Zakończ"
  Case Else
    $lang = "en"
    $LANG_STDREDIR_SEARCHING = "Searching the application process"
    $LANG_STDREDIR_RUNNING = "Starting the application process..."
    $LANG_STDREDIR_FAILURE = "Failed to start the application process :("
    $LANG_CONFIGURING = "Configuring..."
    $LANG_CONNECTING = "Connecting to the server"
    $LANG_CONNECTING_FAILURE = "Failed to connect to the server :("
    $LANG_WINDOW_SEARCHING = "Searching the application window..."
    $LANG_WINDOW_OPENING = "Starting the application window..."
    $LANG_WINDOW_OPENING_FAILURE = "Failed to start the application window :("
    $LANG_LNK_RUN = "Run"
    $LANG_LNK_UNINSTALL = "Uninstall"
    $LANG_LNK_DOCS = "Documentation"
    $LANG_AUTOSTART_TITLE = "Autostart"
    $LANG_AUTOSTART_MESSAGE = "Add the application shortcut to the startup?"
    $LANG_TRAY_EXIT = "Exit"
EndSwitch

Sleep(100)

If _Singleton("XICONF:" & $SERVER_PORT, 1) = 0 Then
  If Not WinExists($CHROME_TITLE) Then
    RunBrowser()
  EndIf

  WinActivate($CHROME_TITLE)

  Exit
Else
  WinActivate($CHROME_TITLE)
EndIf

Install()
RunAll()

TrayCreateItem($LANG_TRAY_EXIT)
TrayItemSetOnEvent(-1, "ExitProgram")
TraySetOnEvent($TRAY_EVENT_PRIMARYDOUBLE, "RunAll")
TraySetState($TRAY_ICONSTATE_SHOW)
TraySetToolTip($PRODUCT_NAME)

While 1
  Sleep(100)
WEnd

Func Install()
  RegRead($REGISTRY_KEY, "InstallLocation")

  If @error == 0 Then
    Return
  EndIf

  SplashText($LANG_CONFIGURING, True)

  InstallRegistry()
  InstallShortcuts()
EndFunc

Func InstallRegistry()
  RegWrite($REGISTRY_KEY, "DisplayName", "REG_SZ", $PRODUCT_NAME)
  RegWrite($REGISTRY_KEY, "DisplayVersion", "REG_SZ", $PRODUCT_VERSION)
  RegWrite($REGISTRY_KEY, "DisplayIcon", "REG_SZ", '"' & @ScriptFullPath & '"')
  RegWrite($REGISTRY_KEY, "Publisher", "REG_SZ", $PRODUCT_PUBLISHER)
  RegWrite($REGISTRY_KEY, "URLInfoAbout", "REG_SZ", $PRODUCT_URL)
  RegWrite($REGISTRY_KEY, "InstallLocation", "REG_SZ", '"' & @ScriptDir & '\.."')
  RegWrite($REGISTRY_KEY, "UninstallString", "REG_SZ", '"' & @ScriptDir & '"\XiconfUninstall.exe"')
  RegWrite($REGISTRY_KEY, "NoModify", "REG_DWORD", 1)
  RegWrite($REGISTRY_KEY, "NoRepair", "REG_DWORD", 1)
  RegWrite($REGISTRY_KEY, "EstimatedSize", "REG_DWORD", 163840)
EndFunc

Func InstallShortcuts()
  $startMenu = @ProgramsDir & "\Walkner\" & $PRODUCT_NAME

  FileCreateShortcut(@ScriptFullPath, @ScriptDir & "\..\" & $LANG_LNK_RUN & ".lnk")
  FileCreateShortcut(@ScriptDir & "\XiconfUninstall.exe", @ScriptDir & "\..\" & $LANG_LNK_UNINSTALL & ".lnk")

  DirCreate($startMenu)
  FileCreateShortcut(@ScriptFullPath, $startMenu & "\" & $LANG_LNK_RUN & ".lnk")
  FileCreateShortcut(@ScriptDir & "\..\docs\user-guide." & $lang & ".pdf", $startMenu & "\" & $LANG_LNK_DOCS & ".lnk")
  FileCreateShortcut(@ScriptDir & "\XiconfUninstall.exe", $startMenu & "\" & $LANG_LNK_UNINSTALL & ".lnk")
  FileCreateShortcut(@ScriptFullPath, @DesktopDir & "\" & $PRODUCT_NAME & ".lnk")

  If MsgBox(BitOr($MB_YESNO, $MB_ICONQUESTION), $LANG_AUTOSTART_TITLE, $LANG_AUTOSTART_MESSAGE) == $IDYES Then
    FileCreateShortcut(@ScriptFullPath, @StartupDir & "\" & $PRODUCT_NAME & ".lnk")
  EndIf
EndFunc

Func RunAll()
  RunStdRedir()
  RunConnectionCheck()

  $browser = RunBrowser()

  SplashOff()
  WinActivate($browser)
EndFunc

Func RunStdRedir()
  SplashText($LANG_STDREDIR_SEARCHING)

  If ProcessExists("XiconfStdRedir.exe") Then
    $stdRedirs = ProcessList("XiconfStdRedir.exe")

    For $i = 1 To $stdRedirs[0][0]
      If StringInStr(_WinAPI_GetProcessCommandLine($stdRedirs[$i][1]), "XICONF_PORT " & $SERVER_PORT) Then
        Return
      EndIF
    Next
  EndIf

  $exe = '"' & @ScriptDir & '\node.exe"'
  $log = '"' & @ScriptDir & '\..\logs\{yyMM}' & $CONFIG_FILE & '.log"'
  $dir = '"' & @ScriptDir & '\walkner-xiconf"'
  $arg = '"backend\main.js" "' & @ScriptDir & '\..\config\walkner-xiconf' & $CONFIG_FILE & '.js"'

  SplashText($LANG_STDREDIR_RUNNING)

  ProcessClose(FindNodePid())
  Run('"' & @ScriptDir & '\XiconfStdRedir.exe" --exe ' & $exe & " --log " & $log & " --dir " & $dir & " --env NODE_ENV production --env XICONF_PORT " & $SERVER_PORT & " -- " & $arg, "", @SW_HIDE)

  SplashText($LANG_STDREDIR_SEARCHING)

  ProcessWait("XiconfStdRedir.exe", 2)

  If Not ProcessExists("XiconfStdRedir.exe") Then
    ExitWithError($LANG_STDREDIR_FAILURE)
  EndIf
EndFunc

Func RunConnectionCheck()
  SplashText($LANG_CONNECTING & " 1/" & $MAX_CONNECT_TRIES & "...")

  $connectCounter = 1

  While TryToConnect() <> 0
    $connectCounter = $connectCounter + 1

    If $connectCounter = ($MAX_CONNECT_TRIES + 1) Then
      ExitWithError($LANG_CONNECTING_FAILURE)
    EndIf

    SplashText($LANG_CONNECTING & " " & $connectCounter & "/" & $MAX_CONNECT_TRIES & "...")
    Sleep(2000)
  WEnd
EndFunc

Func RunBrowser()
  SplashText($LANG_WINDOW_SEARCHING)

  $browser = WinGetHandle($CHROME_TITLE)

  If @error Then
    SplashText($LANG_WINDOW_OPENING)

    $app = "http://" & $SERVER_ADDR & ":" & $SERVER_PORT & "/"
    $chromeExeDir = FindChromeExeDir()

    Run($chromeExeDir & 'chrome.exe --lang=' & $lang & ' --app="' & $app & '"', $chromeExeDir)

    $browser = WinWait($CHROME_TITLE, "", $CHROME_WAIT_TIME)
  EndIf

  If Not IsHWnd($browser) Then
    ExitWithError($LANG_WINDOW_OPENING_FAILURE)
  EndIf

  Return $browser
EndFunc

Func FindChromeExeDir()
  $chromeExeDir = @ScriptDir & "\..\..\GoogleChromePortable\App\Chrome-bin\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  $chromeExeDir = @ScriptDir & "\..\..\ChromiumPortable\App\Chromium\32\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  $chromeExeDir = @ScriptDir & "\..\..\ChromiumPortable\App\Chromium\64\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  $chromeExeDir = EnvGet('ProgramFiles(x86)') & "\Google\Chrome\Application\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  $chromeExeDir = @ProgramFilesDir & "\Google\Chrome\Application\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  $chromeExeDir = @LocalAppDataDir & "\Google\Chrome\Application\"
  If FileExists($chromeExeDir & "chrome.exe") Then Return $chromeExeDir

  Return ""
EndFunc

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

Func ExitProgram()
  WinClose($CHROME_TITLE)
  Exit
EndFunc