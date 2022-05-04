!include "MUI2.nsh"

Function .OnInstSuccess
   File /oname=$PLUGINSDIR\VC_redist.x64.exe "${BUILD_RESOURCES_DIR}\VC_redist.x64.exe"
   Exec '"${BUILD_RESOURCES_DIR}\VC_redist.x64.exe"'
FunctionEnd
