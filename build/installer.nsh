!include MUI2.nsh
!define MUI_FINISHPAGE_NOAUTOCLOSE

InstallDir "$PROGRAMFILES64\ReelSteady Joiner"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_DIRECTORY

Section "VCRedist"
    File /oname=$INSTDIR\VC_redist.x64.exe "${BUILD_RESOURCES_DIR}\bin\VC_redist.x64.exe"
    ExecWait '$INSTDIR\VC_redist.x64.exe /install /quiet'
    Delete "$INSTDIR\VC_redist.x64.exe"

    SetRebootFlag true
SectionEnd
