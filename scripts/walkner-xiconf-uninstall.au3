#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Icon=.\uninstaller.ico
#AutoIt3Wrapper_Outfile=.\walkner-xiconf-uninstall.exe
#AutoIt3Wrapper_Res_Description=Odinstaluj aplikacjê Walkner Xiconf.
#AutoIt3Wrapper_Res_Fileversion=1.0.0.0
#AutoIt3Wrapper_Res_ProductVersion=2.0.0
#AutoIt3Wrapper_Res_LegalCopyright=Copyright © 2014 walkner.pl
#AutoIt3Wrapper_Res_Language=1045
#AutoIt3Wrapper_Res_Field=OriginalFilename|Walkner Xiconf.exe
#AutoIt3Wrapper_Res_Field=FileDescription|Plik s³u¿¹cy do usuwania aplikacji Walkner Xiconf
#AutoIt3Wrapper_Res_Field=ProductName|Walkner Xiconf
#AutoIt3Wrapper_Res_Field=CompanyName|Walkner elektronika przemys³owa Zbigniew Walukiewicz
#AutoIt3Wrapper_Res_Field=HomePage|http://walkner.pl/
#AutoIt3Wrapper_Res_Field=E-mail|walkner@walkner.pl
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****

#RequireAdmin

#include ".\common.au3"

Global Const $ROOT_DIR = $CmdLine[0] == 2 ? @WorkingDir : (@ScriptDir & "\..")

If Not FileExists($ROOT_DIR & "\bin\" & @ScriptName) Then
  Exit
EndIf

If $CmdLine[0] == 2 Then
  SplashText("Usuwanie aplikacji...")

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

  RegDelete("HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{" & $PRODUCT_GUID & "}")

  SplashOff()
  MsgBox(BitOr($MB_OK, $MB_ICONINFORMATION), $PRODUCT_NAME & " - Usuwanie", "Zakoñczono usuwanie aplikacji " & $PRODUCT_NAME & "!")
  Exit
EndIf

_Singleton($SERVICE_NAME)

If MsgBox(BitOr($MB_YESNO, $MB_ICONWARNING), $PRODUCT_NAME & " - Usuwanie", "Czy na pewno chcesz usun¹æ aplikacjê " & $PRODUCT_NAME & "?") == $IDNO Then
  Exit 0
EndIf

SplashText("Zamykanie okna aplikacji...")
WinClose("[REGEXPCLASS:(.*Chrome.*); REGEXPTITLE:(.*" & $PRODUCT_NAME & ".*)]")

SplashText("Usuwanie us³ugi " & $SERVICE_NAME & "...")
RunWait($ROOT_DIR & "\bin\" & $SERVICE_NAME & "\bin\service-remove.bat", $ROOT_DIR & "\bin", @SW_HIDE)

SplashText("Usuwanie skrótów...")
FileDelete(@DesktopDir & "\" & $PRODUCT_NAME & ".lnk")
FileDelete(@StartupDir & "\Walkner Xiconf.lnk")
DirRemove(@ProgramsDir & "\Walkner\" & $PRODUCT_NAME & "", 1)

If CountFilesInDir(@ProgramsDir & "\Walkner") == 0 Then
  DirRemove(@ProgramsDir & "\Walkner", 1)
EndIf

SplashText("Usuwanie aplikacji...", True)
DirRemove($ROOT_DIR & "\bin\" & $SERVICE_NAME & "", 1)
FileDelete($ROOT_DIR & "\config\" & $SERVICE_NAME & ".js")
FileDelete($ROOT_DIR & "\docs\" & $SERVICE_NAME & "*.*")
FileDelete($ROOT_DIR & "\logs\" & $SERVICE_NAME & "*.*")
FileDelete($ROOT_DIR & "\" & $PRODUCT_NAME & ".exe")

$removeData = MsgBox(BitOr($MB_YESNO, $MB_ICONWARNING), $PRODUCT_NAME & " - Usuwanie", "Usun¹æ zapisane przez aplikacjê dane?") == $IDYES

If $removeData Then
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & ".json")
  FileDelete($ROOT_DIR & "\data\" & $SERVICE_NAME & ".sqlite3")
  DirRemove($ROOT_DIR & "\data\" & $SERVICE_NAME & "-features", 1)
EndIf

$tempUninstaller = @TempDir & "\" & @scriptName
$installedAppCount = CountFilesInDir($ROOT_DIR & "\config")

FileCopy(@ScriptFullPath, $tempUninstaller, BitOr($FC_OVERWRITE, $FC_CREATEPATH))
SplashOff()
ShellExecute($tempUninstaller, ($removeData ? "1" : "0") & " " & $installedAppCount, $ROOT_DIR, "open", @SW_HIDE)

