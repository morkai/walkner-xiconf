#AutoIt3Wrapper_Icon=.\uninstall.ico
#AutoIt3Wrapper_Outfile=.\walkner-xiconf-uninstall.exe
#AutoIt3Wrapper_Res_Description=Odinstaluj aplikację Walkner Xiconf.
#AutoIt3Wrapper_Res_Fileversion=1.0.0.0
#AutoIt3Wrapper_Res_ProductVersion=0.0.0
#AutoIt3Wrapper_Res_LegalCopyright=Copyright © 2014 walkner.pl
#AutoIt3Wrapper_Res_Language=1045
#AutoIt3Wrapper_Res_Field=OriginalFilename|walkner-xiconf-uninstall.exe
#AutoIt3Wrapper_Res_Field=FileDescription|Plik usuwający aplikację Walkner Xiconf.
#AutoIt3Wrapper_Res_Field=ProductName|Walkner Xiconf
#AutoIt3Wrapper_Res_Field=CompanyName|Walkner elektronika przemysłowa Zbigniew Walukiewicz
#AutoIt3Wrapper_Res_Field=HomePage|http://walkner.pl/
#AutoIt3Wrapper_Res_Field=E-mail|walkner@walkner.pl

#RequireAdmin

#include ".\common.au3"

Global Const $ROOT_DIR = $CmdLine[0] == 2 ? @WorkingDir : (@ScriptDir & "\..")

If Not FileExists($ROOT_DIR & "\bin\" & @ScriptName) Then
  Exit
EndIf

$lang = FileRead(@ScriptDir & "\..\data\" & $SERVICE_NAME & ".lang", 2)

Switch $lang
  Case "pl"
    $LANG_UNINSTALLING_INTRO = "Usuwanie aplikacji..."
    $LANG_UNINSTALLING_TITLE = $PRODUCT_NAME & " - Usuwanie"
    $LANG_UNINSTALLING_FINISHED = "Zakończono usuwanie aplikacji " & $PRODUCT_NAME & "!"
    $LANG_UNINSTALLING_CONFIRM = "Czy na pewno chcesz usunąć aplikację " & $PRODUCT_NAME & "?"
    $LANG_UNINSTALLING_DATA = "Usunąć zapisane przez aplikację dane?"
    $LANG_CLOSING_WINDOW = "Zamykanie okna aplikacji..."
    $LANG_REMOVING_SERVICE = "Usuwanie usługi " & $SERVICE_NAME & "..."
    $LANG_REMOVING_SHORTCUTS = "Usuwanie skrótów..."
    $LANG_REMOVING_APP = "Usuwanie plików aplikacji..."
  Case Else
    $LANG_UNINSTALLING_INTRO = "Uinstalling the application..."
    $LANG_UNINSTALLING_TITLE = $PRODUCT_NAME & " - Uninstall"
    $LANG_UNINSTALLING_FINISHED = "Finished uninstalling the " & $PRODUCT_NAME & " application!"
    $LANG_UNINSTALLING_CONFIRM = "Are you sure you want to uninstall the " & $PRODUCT_NAME & " application?"
    $LANG_UNINSTALLING_DATA = "Remove all saved application data?"
    $LANG_CLOSING_WINDOW = "Closing the application window..."
    $LANG_REMOVING_SERVICE = "Removing the " & $SERVICE_NAME & " service..."
    $LANG_REMOVING_SHORTCUTS = "Removing shortcuts..."
    $LANG_REMOVING_APP = "Removing the application files..."
EndSwitch

If $CmdLine[0] == 2 Then
  SplashText($LANG_UNINSTALLING_INTRO)

  FileDelete($ROOT_DIR & "\bin\" & @ScriptName)

  $dataRemoved = $CmdLine[1] == "1"
  $hasRemainingApps = $CmdLine[2] <> "0"

  If $dataRemoved And Not $hasRemainingApps Then
    DirRemove($ROOT_DIR, 1)
  ElseIf Not $hasRemainingApps Then
    DirRemove($ROOT_DIR & "\bin", 1)
    DirRemove($ROOT_DIR & "\config", 1)
    DirRemove($ROOT_DIR & "\docs", 1)
    DirRemove($ROOT_DIR & "\logs", 1)
  EndIf

  RegDelete("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{" & $PRODUCT_GUID & "}")

  SplashOff()
  MsgBox(BitOr($MB_OK, $MB_ICONINFORMATION), $LANG_UNINSTALLING_TITLE, $LANG_UNINSTALLING_FINISHED)
  Exit
EndIf

_Singleton($SERVICE_NAME)

If MsgBox(BitOr($MB_YESNO, $MB_ICONWARNING), $LANG_UNINSTALLING_TITLE, $LANG_UNINSTALLING_CONFIRM) == $IDNO Then
  Exit 0
EndIf

SplashText($LANG_UNINSTALLING_CONFIRM)
WinClose("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]")

SplashText($LANG_REMOVING_SERVICE)
RunWait($ROOT_DIR & "\bin\" & $SERVICE_NAME & "\bin\service-remove.bat", $ROOT_DIR & "\bin", @SW_HIDE)

SplashText($LANG_REMOVING_SHORTCUTS)
FileDelete(@DesktopDir & "\" & $PRODUCT_NAME & ".lnk")
FileDelete(@StartupDir & "\Walkner Xiconf.lnk")
DirRemove(@ProgramsDir & "\Walkner\" & $PRODUCT_NAME & "", 1)

If CountFilesInDir(@ProgramsDir & "\Walkner") == 0 Then
  DirRemove(@ProgramsDir & "\Walkner", 1)
EndIf

SplashText($LANG_REMOVING_APP, True)
DirRemove($ROOT_DIR & "\bin\" & $SERVICE_NAME & "", 1)
FileDelete($ROOT_DIR & "\config\" & $SERVICE_NAME & ".js")
FileDelete($ROOT_DIR & "\docs\" & $SERVICE_NAME & "*.*")
FileDelete($ROOT_DIR & "\logs\" & $SERVICE_NAME & "*.*")
FileDelete($ROOT_DIR & "\" & $PRODUCT_NAME & ".exe")

$removeData = MsgBox(BitOr($MB_YESNO, $MB_ICONWARNING), $LANG_UNINSTALLING_TITLE, $LANG_UNINSTALLING_DATA) == $IDYES

If $removeData Then
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & ".lang")
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & ".json")
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & ".sqlite3")
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & "-workflow.txt")
  DirRemove($ROOT_DIR & "\data\" & $SERVICE_NAME & "-features", 1)
EndIf

$tempUninstaller = @TempDir & "\" & @scriptName
$installedAppCount = CountFilesInDir($ROOT_DIR & "\config")

FileCopy(@ScriptFullPath, $tempUninstaller, BitOr($FC_OVERWRITE, $FC_CREATEPATH))
SplashOff()
ShellExecute($tempUninstaller, ($removeData ? "1" : "0") & " " & $installedAppCount, $ROOT_DIR, "open", @SW_HIDE)
