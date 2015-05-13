#NoTrayIcon

#include <Constants.au3>
#include <Misc.au3>
#include <MsgBoxConstants.au3>
#include <WinAPIProc.au3>

$serverPort = 1337
$configFile = ""

For $i = 1 To $CmdLine[0] Step 2
  $key = $CmdLine[$i]
  $val = $CmdLine[0] >= $i + 1 ? $CmdLine[$i + 1] : "";

  Switch $key
    Case "--port"
      $val = Int($val, 1)

      If $val >= 80 Then
        $serverPort = $val
      EndIf

    Case "--config"
      If StringLen($val) > 0 Then
        $configFile = "." & $val
      EndIf
  EndSwitch
Next

Global Const $PRODUCT_GUID = "00000000-0000-0000-0000-000000000000"
Global Const $PRODUCT_NAME = "Walkner Xiconf"
Global Const $PRODUCT_VERSION = "0.0.0"
Global Const $PRODUCT_PUBLISHER = "Walkner elektronika przemysłowa Zbigniew Walukiewicz"
Global Const $PRODUCT_URL = "http://walkner.pl/"
Global Const $SERVER_ADDR = "127.0.0.1"
Global Const $SERVER_PORT = $serverPort
Global Const $CONFIG_FILE = $configFile
Global Const $DEFAULT_LANG = "en"
Global Const $REGISTRY_KEY = "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{" & $PRODUCT_GUID & "}"
Global Const $CHROME_TITLE = "[REGEXPCLASS:^Chrome_; REGEXPTITLE:(walkner-xiconf|< Walkner Xiconf \[" & $SERVER_PORT & "\])]"

Func ExitWithError($error)
  SplashOff()
  MsgBox(BitOr($MB_OK, $MB_ICONERROR, $MB_TOPMOST), $PRODUCT_NAME, $error)
  Exit 1
EndFunc

Func SplashText($text, $notOnTop = False)
  SplashTextOn($PRODUCT_NAME, $text, 325, 75, -1, -1, BitOr($DLG_TEXTVCENTER, $notOnTop ? $DLG_NOTONTOP : 0))
EndFunc

Func RemoveEmptyDir($dir)
  If CountFilesInDir($dir) == 0 Then
    DirRemove($dir, 1)
  EndIf
EndFunc

Func CountFilesInDir($dir)
  $dirSize = DirGetSize($dir, 3)

  Return IsArray($dirSize) ? ($dirSize[1] + $dirSize[2]) : -1
EndFunc

Func FindNodePid()
  $nodes = ProcessList("node.exe")

  For $i = 1 To $nodes[0][0]
    If StringInStr(_WinAPI_GetProcessCommandLine($nodes[$i][1]), "walkner-xiconf") Then
      Return $nodes[$i][1]
    EndIF
  Next

  Return 0
EndFunc
