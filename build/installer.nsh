RequestExecutionLevel admin

!include MUI2.nsh

Function .OnInstSuccess
    File /oname=$INSTDIR\VC_redist.x64.exe "${BUILD_RESOURCES_DIR}\bin\VC_redist.x64.exe"
    ExecWait '$INSTDIR\VC_redist.x64.exe /install /quiet'
    Delete "$INSTDIR\VC_redist.x64.exe"
FunctionEnd
