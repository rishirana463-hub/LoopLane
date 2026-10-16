param(
  [string]$JdkPath = $env:JAVA_HOME,
  [string]$SdkPath = $env:ANDROID_HOME,
  [string]$KeystorePath = (Join-Path $env:USERPROFILE '.codex/private/looplane-android/looplane-upload.keystore'),
  [string]$CredentialsPath = (Join-Path $env:USERPROFILE '.codex/private/looplane-android/credentials.json'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../outputs/android')
)
$ErrorActionPreference = 'Stop'
if (-not $JdkPath) { $JdkPath = 'C:/Program Files/Eclipse Adoptium/jdk-17.0.18.8-hotspot' }
if (-not $SdkPath) { $SdkPath = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
foreach ($requiredPath in @($JdkPath, $SdkPath, $KeystorePath, $CredentialsPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) { throw "Required local path is missing: $requiredPath" }
}
$env:JAVA_HOME = $JdkPath
$env:ANDROID_HOME = $SdkPath
try {
  $sdkProperty = $SdkPath.Replace('\', '/')
  Set-Content -LiteralPath (Join-Path $PSScriptRoot 'local.properties') -Value "sdk.dir=$sdkProperty" -Encoding ascii
  Push-Location $PSScriptRoot
  try {
    & ./gradlew.bat --no-daemon --console=plain assembleRelease bundleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
  } finally { Pop-Location }
  New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
  $manifest = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'twa-manifest.json') | ConvertFrom-Json
  $bundle = Join-Path $OutputDirectory "Looplane-$($manifest.appVersionName).aab"
  $apk = Join-Path $OutputDirectory "Looplane-$($manifest.appVersionName).apk"
  $unsignedBundle = Join-Path $PSScriptRoot 'app/build/outputs/bundle/release/app-release.aab'
  $unsignedApk = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release-unsigned.apk'
  $buildTools = Join-Path $SdkPath 'build-tools/36.0.0'
  $signingConfig = Get-Content -Raw -LiteralPath $CredentialsPath | ConvertFrom-Json
  $env:LOOPLANE_SIGNING_PASSWORD = $signingConfig.password
  $keyAlias = $signingConfig.alias
  & (Join-Path $JdkPath 'bin/jarsigner.exe') -keystore $KeystorePath -storepass:env LOOPLANE_SIGNING_PASSWORD -keypass:env LOOPLANE_SIGNING_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 -signedjar $bundle $unsignedBundle $keyAlias
  if ($LASTEXITCODE -ne 0) { throw 'App bundle signing failed.' }
  $alignedApk = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release-aligned.apk'
  & (Join-Path $buildTools 'zipalign.exe') -f -p 4 $unsignedApk $alignedApk
  if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }
  & (Join-Path $buildTools 'apksigner.bat') sign --ks $KeystorePath --ks-key-alias $keyAlias --ks-pass env:LOOPLANE_SIGNING_PASSWORD --key-pass env:LOOPLANE_SIGNING_PASSWORD --out $apk $alignedApk
  if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
  & (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $apk
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  & (Join-Path $JdkPath 'bin/jarsigner.exe') -verify $bundle
  if ($LASTEXITCODE -ne 0) { throw 'App bundle signature verification failed.' }
  Get-FileHash -Algorithm SHA256 -LiteralPath $bundle, $apk | Format-Table -AutoSize
} finally {
  Remove-Item Env:LOOPLANE_SIGNING_PASSWORD -ErrorAction SilentlyContinue
  $signingConfig = $null
}
