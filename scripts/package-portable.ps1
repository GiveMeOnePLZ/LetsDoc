param(
  [string]$Version = "1.0.0"
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "src-tauri\target\release\letsdoc.exe"
$outputDir = Join-Path $projectRoot "release\LetsDoc-portable"
$archive = Join-Path $projectRoot "release\LetsDoc-portable-$Version-windows-x64.zip"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Desktop executable not found. Run npm run tauri:build:portable first."
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $outputDir "LetsDoc.exe") -Force
Compress-Archive -LiteralPath (Join-Path $outputDir "LetsDoc.exe") -DestinationPath $archive -Force
Write-Output "Created: $archive"
