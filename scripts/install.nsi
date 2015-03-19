Unicode true
Name "Walkner Xiconf v${PRODUCT_VERSION}"
InstallDir "C:\walkner\xiconf"
OutFile "${__FILEDIR__}\..\build\walkner-xiconf-v${PRODUCT_VERSION}.exe"
AllowRootDirInstall false
SetCompressor /SOLID /FINAL lzma
RequestExecutionLevel admin

!include "MUI2.nsh"

!define REG_UNINST_KEY "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{${PRODUCT_GUID}}"

!define MUI_CUSTOMFUNCTION_GUIINIT onGuiInit
!define MUI_ABORTWARNING

!define MUI_LANGDLL_ALLLANGUAGES
!define MUI_LANGDLL_ALWAYSSHOW

!define MUI_FINISHPAGE_NOREBOOTSUPPORT
!define MUI_FINISHPAGE_RUN "$INSTDIR\bin\XiconfRun.exe"
!define MUI_FINISHPAGE_RUN_TEXT "$(RUN_TEXT)"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${__FILEDIR__}\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Polish"

LangString ALREADY_INSTALLED ${LANG_ENGLISH} "The appliaction is already installed.$\r$\n$\r$\nBefore continuing, you must uninstall the currently installed version!"
LangString RUN_TEXT ${LANG_ENGLISH} "Run the application"

LangString ALREADY_INSTALLED ${LANG_POLISH} "Aplikacja jest już zainstalowana.$\r$\n$\r$\nPrzed kontynuacją musisz usunąć aktualnie zainstalowaną wersję!"
LangString RUN_TEXT ${LANG_POLISH} "Uruchom aplikację"

!insertmacro MUI_RESERVEFILE_LANGDLL

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function .onInstSuccess
  FileOpen $0 "$INSTDIR\data\lang.txt" w

  StrCmp $LANGUAGE ${LANG_ENGLISH} 0 +2
    FileWrite $0 "en"
  StrCmp $LANGUAGE ${LANG_POLISH} 0 +2
    FileWrite $0 "pl"

  FileClose $0
FunctionEnd

Function onGuiInit
  SetRegView 64
  ReadRegStr $0 HKLM "${REG_UNINST_KEY}" "DisplayVersion"
  SetRegView 32
  ReadRegStr $1 HKLM "${REG_UNINST_KEY}" "DisplayVersion"

  ${If} "$0" != ""
  ${OrIf} "$1" != ""
    MessageBox MB_OK|MB_ICONSTOP "$(ALREADY_INSTALLED)" /SD IDOK
    Abort
  ${EndIf}
FunctionEnd

Section
  SetOutPath "$INSTDIR"
  File /r "${__FILEDIR__}\..\build\installer\*.*"
SectionEnd
