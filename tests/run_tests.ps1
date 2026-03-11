# SPL Test Runner - runs all example .spl files
$ErrorActionPreference = "Continue"
$spl = "..\FINAL\bin\spl.exe"
if (-not (Test-Path $spl)) { $spl = "..\FINAL\Release\spl.exe" }
if (-not (Test-Path $spl)) { $spl = "..\build\Release\spl.exe" }
if (-not (Test-Path $spl)) { $spl = "..\build\Debug\spl.exe" }
$examples = Get-ChildItem "..\examples\*.spl"
$passed = 0
$failed = 0
foreach ($f in $examples) {
    $out = & $spl $f.FullName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PASS $($f.Name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "FAIL $($f.Name)" -ForegroundColor Red
        Write-Host $out
        $failed++
    }
}
Write-Host "`n$passed passed, $failed failed"
