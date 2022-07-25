!include MUI2.nsh
!define MUI_FINISHPAGE_NOAUTOCLOSE

InstallDir "$PROGRAMFILES64\ReelSteady Joiner"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_DIRECTORY

Section "VCRedist"
    SetRegView 32
    ReadRegDWORD $R0 HKLM Software\Microsoft\VisualStudio\14.0\VC\Runtimes\X64 Installed
    SetRegView 64
    IfErrors 0 msvcrt_already_installed

    File /oname=$INSTDIR\VC_redist.x64.exe "${BUILD_RESOURCES_DIR}\bin\VC_redist.x64.exe"
    ExecWait '$INSTDIR\VC_redist.x64.exe /q /norestart'

     Pop $R0
      ${If} $R0 == 3010
        ; vcredist requires a reboot
        SetRebootFlag true
      ${ElseIf} $R0 != 0
        Abort "Failed to install the Visual Studio runtime library: $R0"
      ${EndIf}

    Sleep 3000
    Delete "$INSTDIR\VC_redist.x64.exe"

    msvcrt_already_installed:
SectionEnd
