; SPL Installer - NSIS script
; Run: makensis /DBUILD_ROOT="C:/path/to/BUILD" /DOUTPUT="C:/path/to/BUILD/installer/spl_installer.exe" installer.nsi
; Or from build.ps1 which passes BUILD_ROOT and OUTPUT.

!ifndef BUILD_ROOT
  !define BUILD_ROOT "."
!endif
!ifndef OUTPUT
  !define OUTPUT "spl_installer.exe"
!endif

Unicode true
Name "SPL (Simple Programming Language)"
OutFile "${OUTPUT}"
InstallDir "C:\Program Files\SPL"
InstallDirRegKey HKLM "Software\SPL" "InstallPath"
RequestExecutionLevel admin

Page directory
Page instfiles

Section "SPL"
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\SPL" "InstallPath" "$INSTDIR"

  ; Bin: spl.exe and IDE (all files from BUILD/bin)
  SetOutPath "$INSTDIR\bin"
  File /r "${BUILD_ROOT}\bin\*.*"

  ; Lib (for import("lib/spl/...") when SPL_LIB=$INSTDIR)
  SetOutPath "$INSTDIR\lib"
  IfFileExists "${BUILD_ROOT}\lib\*.*" 0 +2
  File /r "${BUILD_ROOT}\lib\*.*"

  ; Modules (.spl files)
  SetOutPath "$INSTDIR\modules"
  IfFileExists "${BUILD_ROOT}\modules\*.*" 0 +2
  File /r "${BUILD_ROOT}\modules\*.*"

  ; Examples
  SetOutPath "$INSTDIR\examples"
  IfFileExists "${BUILD_ROOT}\examples\*.*" 0 +2
  File /r "${BUILD_ROOT}\examples\*.*"

  ; Docs
  SetOutPath "$INSTDIR\docs"
  IfFileExists "${BUILD_ROOT}\docs\*.*" 0 +2
  File /r "${BUILD_ROOT}\docs\*.*"

  ; Add bin to system PATH (all users)
  ExecWait 'cmd /c setx PATH "%PATH%;$INSTDIR\bin" /M'

  ; Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\SPL"
  IfFileExists "$INSTDIR\bin\spl-ide.exe" 0 +2
  CreateShortCut "$SMPROGRAMS\SPL\SPL IDE.lnk" "$INSTDIR\bin\spl-ide.exe" "" "$INSTDIR\bin\spl-ide.exe" 0
  CreateShortCut "$SMPROGRAMS\SPL\Uninstall SPL.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
  IfFileExists "$INSTDIR\docs\GETTING_STARTED.md" 0 +2
  CreateShortCut "$SMPROGRAMS\SPL\SPL Documentation.lnk" "$INSTDIR\docs\GETTING_STARTED.md" "" "" 0
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR\bin"
  RMDir /r "$INSTDIR\lib"
  RMDir /r "$INSTDIR\modules"
  RMDir /r "$INSTDIR\examples"
  RMDir /r "$INSTDIR\docs"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "Software\SPL"
  ; Remove from PATH (simplified: we don't remove our bin from PATH here; user can edit env if needed)
  RMDir /r "$SMPROGRAMS\SPL"
SectionEnd
