# Localfixr One-Click APK Builder
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Building Localfixr Native Android APK   " -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

if (-not $env:JAVA_HOME) {
    if (Test-Path "C:\Program Files\Android\Android Studio\jbr") {
        $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    }
}

if (-not $env:ANDROID_HOME) {
    if (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
        $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    }
}

$gradleBat = "gradle"
$discoveredGradle = Get-ChildItem "$env:USERPROFILE\.gradle\wrapper\dists\gradle-*\*\gradle-*\bin\gradle.bat" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if ($discoveredGradle -and (Test-Path $discoveredGradle)) {
    $gradleBat = $discoveredGradle
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

Push-Location $scriptDir
try {
    & $gradleBat assembleDebug
    if ($LASTEXITCODE -eq 0) {
        $outputApk = "$scriptDir\app\build\outputs\apk\debug\app-debug.apk"
        $destApk = "$rootDir\Localfixr.apk"
        Copy-Item $outputApk $destApk -Force
        Write-Host ""
        Write-Host "[SUCCESS] Build Successful!" -ForegroundColor Green
        Write-Host "[APK] Output APK: $destApk" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Build Failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
} finally {
    Pop-Location
}
