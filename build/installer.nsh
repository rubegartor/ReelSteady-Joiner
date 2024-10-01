!include MUI2.nsh
!define MUI_FINISHPAGE_NOAUTOCLOSE

InstallDir "$PROGRAMFILES64\ReelSteady Joiner"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_DIRECTORY

Section "VCRedist"
    ;https://gist.github.com/opentechnologist/0fa93f92d4c42535bb8cbe539e36c080
    nsisdl::download "https://aka.ms/vs/17/release/VC_redist.x64.exe" "$INSTDIR\vc_redist.x64.exe"
    Pop $0
    StrCmp $0 "success" +2
    MessageBox MB_OK "Download failed: $0"

    ExecWait '$INSTDIR\vc_redist.x64.exe /install /quiet /norestart'
    Delete "$INSTDIR\vc_redist.x64.exe"

    SetRebootFlag true
SectionEnd
