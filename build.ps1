<#
.SYNOPSIS
    SPL automated build and packaging – BUILD directory, spl.exe, spl-ide.exe, installer.
.DESCRIPTION
    Cleans and recreates BUILD/, compiles SPL interpreter and IDE, copies runtime files,
    and produces BUILD/installer/spl_installer.exe. Does not delete anything outside the project.
.PARAMETER SkipIDE
    Do not build or copy the IDE.
.PARAMETER SkipInstaller
    Do not build the NSIS installer (requires NSIS/makensis).
.PARAMETER NoGame
    Build SPL without Raylib (no g2d/game).
.EXAMPLE
    .\build.ps1
    Full build: BUILD/bin, modules, examples, docs, installer.
#>
[CmdletBinding()]
param(
    [switch]$SkipIDE,
    [switch]$SkipInstaller,
    [switch]$NoGame
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$BuildOut = [System.IO.Path]::GetFullPath((Join-Path $Root "BUILD"))
$BuildDir = [System.IO.Path]::GetFullPath((Join-Path $Root "build"))
$IdeRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "spl-ide"))
$IdeDist = [System.IO.Path]::GetFullPath((Join-Path $IdeRoot "dist\spl-ide-win32-x64"))

# ---------- Step 0: Clean BUILD only (project-local) ----------
Write-Host "=== SPL Build & Package ===" -ForegroundColor Cyan
Write-Host "[0] Cleaning BUILD (project-local only)..." -ForegroundColor Yellow
if (Test-Path $BuildOut) {
    Remove-Item $BuildOut -Recurse -Force
    Write-Host "  Removed existing BUILD\" -ForegroundColor Gray
}
New-Item -ItemType Directory -Force -Path $BuildOut | Out-Null
$binDir = Join-Path $BuildOut "bin"
$modDir = Join-Path $BuildOut "modules"
$exDir = Join-Path $BuildOut "examples"
$docDir = Join-Path $BuildOut "docs"
$instDir = Join-Path $BuildOut "installer"
foreach ($d in $binDir, $modDir, $exDir, $docDir, $instDir) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}
Write-Host "  OK: BUILD\bin, modules, examples, docs, installer" -ForegroundColor Green
Write-Host ""

# ---------- Step 1: CMake configure (if needed) ----------
$needConfigure = -not (Test-Path "$BuildDir\CMakeCache.txt")
if ($needConfigure) {
    Write-Host "[1] Configuring CMake..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
    $cmakeArgs = @("-B", $BuildDir, "-DCMAKE_BUILD_TYPE=Release")
    if (-not $NoGame) {
        $cmakeArgs += "-DSPL_BUILD_GAME=ON"
        if ($env:CMAKE_TOOLCHAIN_FILE) { $cmakeArgs += "-DCMAKE_TOOLCHAIN_FILE=$env:CMAKE_TOOLCHAIN_FILE" }
    } else {
        $cmakeArgs += "-DSPL_BUILD_GAME=OFF"
    }
    & cmake @cmakeArgs
    if ($LASTEXITCODE -ne 0) { throw "CMake configure failed" }
    Write-Host "  OK: Configured" -ForegroundColor Green
} else {
    Write-Host "[1] Using existing CMake config (build\)" -ForegroundColor Gray
}
Write-Host ""

# ---------- Step 2: Build SPL interpreter ----------
Write-Host "[2] Building SPL interpreter (Release)..." -ForegroundColor Yellow
Get-Process -Name spl,spl_repl,spl_game -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300
Push-Location $BuildDir
try {
    & cmake --build . --config Release
    if ($LASTEXITCODE -ne 0) { throw "SPL compilation failed" }
} finally {
    Pop-Location
}
$splExe = Join-Path $BuildDir "Release\spl.exe"
if (-not (Test-Path $splExe)) { throw "spl.exe not found after build at $splExe" }
Copy-Item $splExe $binDir -Force
Write-Host "  OK: spl.exe -> BUILD\bin\" -ForegroundColor Green
$raylibDll = Join-Path $BuildDir "Release\raylib.dll"
if (Test-Path $raylibDll) {
    Copy-Item $raylibDll $binDir -Force
    Write-Host "  OK: raylib.dll -> BUILD\bin\" -ForegroundColor Green
}
Write-Host ""

# ---------- Step 3: Build IDE (Electron) ----------
if (-not $SkipIDE) {
    Write-Host "[3] Building SPL IDE (Electron)..." -ForegroundColor Yellow
    if (-not (Test-Path (Join-Path $IdeRoot "package.json"))) {
        Write-Host "  (spl-ide not found; skipping)" -ForegroundColor Gray
    } else {
        $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source
        if (-not $npm) { $npm = "npm" }
        Push-Location $IdeRoot
        try {
            if (-not (Test-Path (Join-Path $IdeRoot "node_modules"))) {
                & $npm install
                if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            }
            # Build unpacked dir for BUILD/bin (electron-builder --win --dir)
            & npx electron-builder --win --dir
            if ($LASTEXITCODE -ne 0) { throw "IDE build failed" }
        } finally {
            Pop-Location
        }
        if (Test-Path $IdeDist) {
            Copy-Item -Path (Join-Path $IdeDist "*") -Destination $binDir -Recurse -Force
            Write-Host "  OK: spl-ide.exe and IDE files -> BUILD\bin\" -ForegroundColor Green
        } else {
            Write-Host "  WARN: IDE output not found at $IdeDist" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "[3] Skipping IDE (SkipIDE)" -ForegroundColor Gray
    Write-Host ""
}

# ---------- Step 4: Copy modules (lib/spl) and lib for SPL_LIB ----------
Write-Host "[4] Copying modules and lib..." -ForegroundColor Yellow
$libSpl = Join-Path $Root "lib\spl"
$buildLib = Join-Path $BuildOut "lib\spl"
if (Test-Path $libSpl) {
    New-Item -ItemType Directory -Force -Path (Join-Path $BuildOut "lib") | Out-Null
    if (Test-Path $buildLib) { Remove-Item $buildLib -Recurse -Force }
    Copy-Item $libSpl $buildLib -Recurse -Force
    Write-Host "  OK: lib\spl\ -> BUILD\lib\spl\" -ForegroundColor Green
}
if (Test-Path $libSpl) {
    Get-ChildItem -Path $libSpl -File -Filter "*.spl" | ForEach-Object { Copy-Item $_.FullName $modDir -Force }
    Write-Host "  OK: modules\ (*.spl)" -ForegroundColor Green
}
Write-Host ""

# ---------- Step 5: Copy examples and docs ----------
Write-Host "[5] Copying examples and docs..." -ForegroundColor Yellow
$examplesSrc = Join-Path $Root "examples"
$docsSrc = Join-Path $Root "docs"
if (Test-Path $examplesSrc) {
    Get-ChildItem -Path $examplesSrc -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($examplesSrc.Length).TrimStart("\")
        $dest = Join-Path $exDir $rel
        $destDir = [System.IO.Path]::GetDirectoryName($dest)
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Copy-Item $_.FullName $dest -Force
    }
    Write-Host "  OK: examples\" -ForegroundColor Green
}
if (Test-Path $docsSrc) {
    Get-ChildItem -Path $docsSrc -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($docsSrc.Length).TrimStart("\")
        $dest = Join-Path $docDir $rel
        $destDir = [System.IO.Path]::GetDirectoryName($dest)
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Copy-Item $_.FullName $dest -Force
    }
    Write-Host "  OK: docs\" -ForegroundColor Green
}
Write-Host ""

# ---------- Step 6: Create installer (NSIS) ----------
if (-not $SkipInstaller) {
    Write-Host "[6] Building installer (NSIS)..." -ForegroundColor Yellow
    $nsiPath = Join-Path $Root "installer.nsi"
    if (-not (Test-Path $nsiPath)) {
        Write-Host "  WARN: installer.nsi not found; skipping installer" -ForegroundColor Yellow
    } else {
        $makensis = (Get-Command makensis -ErrorAction SilentlyContinue).Source
        if (-not $makensis) {
            $makensis = "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
            if (-not (Test-Path $makensis)) { $makensis = "$env:ProgramFiles\NSIS\makensis.exe" }
        }
        if (Test-Path $makensis) {
            $outPath = (Join-Path $instDir "spl_installer.exe") -replace '\\', '/'
            & $makensis "/DBUILD_ROOT=$($BuildOut -replace '\\','/')" "/DOUTPUT=$outPath" $nsiPath
            if ($LASTEXITCODE -ne 0) { Write-Host "  WARN: makensis failed" -ForegroundColor Yellow }
            elseif (Test-Path (Join-Path $instDir "spl_installer.exe")) {
                Write-Host "  OK: BUILD\installer\spl_installer.exe" -ForegroundColor Green
            }
        } else {
            Write-Host "  WARN: NSIS (makensis) not found. Install NSIS or use -SkipInstaller" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "[6] Skipping installer (SkipInstaller)" -ForegroundColor Gray
    Write-Host ""
}

# ---------- README in BUILD ----------
@"
SPL Build Output
================
  bin\spl.exe         - SPL interpreter
  bin\spl-ide.exe    - SPL IDE (if built)
  lib\spl\           - Standard library (set SPL_LIB to this BUILD folder for imports)
  modules\           - .spl module files
  examples\          - Example scripts
  docs\              - Documentation
  installer\         - spl_installer.exe (if NSIS was used)

Run from this folder (or set SPL_LIB to this folder):
  .\bin\spl.exe .\examples\hello_world.spl
"@ | Set-Content (Join-Path $BuildOut "README.txt") -Encoding UTF8

Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host "  BUILD\bin\spl.exe" -ForegroundColor Gray
if (-not $SkipIDE) { Write-Host "  BUILD\bin\spl-ide.exe" -ForegroundColor Gray }
Write-Host "  BUILD\modules\, BUILD\examples\, BUILD\docs\" -ForegroundColor Gray
if (-not $SkipInstaller -and (Test-Path (Join-Path $instDir "spl_installer.exe"))) {
    Write-Host "  BUILD\installer\spl_installer.exe" -ForegroundColor Gray
}
Write-Host ""
