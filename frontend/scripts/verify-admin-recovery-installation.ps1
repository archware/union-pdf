<#
---
title: Verificación instalada del recuperador administrativo
status: active
owner: Sistemas de Información
---

#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ReleaseEvidenceDirectory,

    [Parameter(Mandatory = $true)]
    [string]$InstallDirectory,

    [Parameter(Mandatory = $true)]
    [string]$ShortcutPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RegularFile {
    param(
        [Parameter(Mandatory = $true)][string]$LiteralPath,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $item = Get-Item -LiteralPath $LiteralPath -Force
    if ($item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
        throw "$Label debe ser un archivo regular sin enlaces."
    }
    return $item.FullName
}

function Assert-ExactValue {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [AllowNull()][AllowEmptyString()]$Actual,
        [AllowNull()][AllowEmptyString()]$Expected
    )

    if ([string]$Actual -cne [string]$Expected) {
        throw "$Label no coincide. Esperado='$Expected'; actual='$Actual'."
    }
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$LiteralPath)
    return (Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-OfficialAdminRecoveryShortcutPaths {
    $shortcutName = 'Recuperar contraseña administrativa.lnk'
    $roots = @(
        [Environment]::GetFolderPath([Environment+SpecialFolder]::ApplicationData),
        [Environment]::GetFolderPath([Environment+SpecialFolder]::CommonApplicationData)
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    return @($roots | ForEach-Object {
        [IO.Path]::GetFullPath((Join-Path $_ "Microsoft\Windows\Start Menu\Programs\$shortcutName"))
    })
}

$evidence = (Resolve-Path -LiteralPath $ReleaseEvidenceDirectory).Path
$installation = (Resolve-Path -LiteralPath $InstallDirectory).Path
if (-not (Test-Path -LiteralPath $evidence -PathType Container)) {
    throw 'No existe el directorio de evidencia.'
}
if (-not (Test-Path -LiteralPath $installation -PathType Container)) {
    throw 'No existe el directorio de instalación.'
}

$manifestPath = Resolve-RegularFile -LiteralPath (Join-Path $evidence 'release-manifest.json') -Label 'El manifiesto principal'
$sumsPath = Resolve-RegularFile -LiteralPath (Join-Path $evidence 'SHA256SUMS.txt') -Label 'El inventario SHA-256'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($manifest.schema_version -ne 2 -or $manifest.productionReady -ne $false) {
    throw 'El manifiesto principal no conserva el contrato fail-closed.'
}

$binaryDeliverables = @($manifest.deliverables | Where-Object {
    $_.role -in @(
        'administrative-recovery-utility',
        'msi-installer',
        'setup-installer',
        'windows-application'
    )
})
$roles = @($binaryDeliverables | ForEach-Object { $_.role } | Sort-Object)
$requiredRoles = @(
    'administrative-recovery-utility',
    'msi-installer',
    'setup-installer',
    'windows-application'
) | Sort-Object
if (
    $binaryDeliverables.Count -ne 4 -or
    (($roles -join [char]0) -cne ($requiredRoles -join [char]0))
) {
    throw 'El manifiesto no contiene exactamente los cuatro binarios requeridos.'
}

$recoveryEntries = @($binaryDeliverables | Where-Object {
    $_.role -ceq 'administrative-recovery-utility'
})
if ($recoveryEntries.Count -ne 1) {
    throw 'El manifiesto no identifica un recuperador administrativo único.'
}
$recovery = $recoveryEntries[0]
if (
    [string]::IsNullOrWhiteSpace($recovery.path) -or
    $recovery.path -ne [IO.Path]::GetFileName($recovery.path) -or
    [string]$recovery.sha256 -notmatch '^[0-9a-f]{64}$'
) {
    throw 'La entrada del recuperador es inválida.'
}

$evidenceHelper = Resolve-RegularFile -LiteralPath (Join-Path $evidence $recovery.path) -Label 'El recuperador de evidencia'
$installedHelper = Resolve-RegularFile -LiteralPath (Join-Path $installation $recovery.path) -Label 'El recuperador instalado'
$expectedHash = [string]$recovery.sha256
Assert-ExactValue -Label 'El hash del recuperador de evidencia' -Actual (Get-Sha256 $evidenceHelper) -Expected $expectedHash
Assert-ExactValue -Label 'El hash del recuperador instalado' -Actual (Get-Sha256 $installedHelper) -Expected $expectedHash

$sums = Get-Content -LiteralPath $sumsPath -Encoding ASCII
$expectedHelperLine = "$expectedHash  $($recovery.path)"
if (@($sums | Where-Object { $_ -ceq $expectedHelperLine }).Count -ne 1) {
    throw 'SHA256SUMS.txt no vincula exactamente el recuperador esperado.'
}
$manifestHash = Get-Sha256 $manifestPath
if (@($sums | Where-Object { $_ -ceq "$manifestHash  release-manifest.json" }).Count -ne 1) {
    throw 'SHA256SUMS.txt no vincula el manifiesto principal.'
}

$versionInfo = (Get-Item -LiteralPath $installedHelper).VersionInfo
Assert-ExactValue -Label 'La versión instalada' -Actual $versionInfo.ProductVersion -Expected $recovery.version
Assert-ExactValue -Label 'El producto instalado' -Actual $versionInfo.ProductName -Expected $recovery.product_name
Assert-ExactValue -Label 'OriginalFilename instalado' -Actual $versionInfo.OriginalFilename -Expected $recovery.original_filename
Assert-ExactValue -Label 'El editor instalado' -Actual $versionInfo.CompanyName -Expected $manifest.project.publisher

$signingEntries = @($manifest.signing.artifacts | Where-Object {
    $_.artifact -ceq $recovery.path
})
if ($signingEntries.Count -ne 1) {
    throw 'La evidencia Authenticode no identifica exactamente el recuperador.'
}
$expectedSigning = $signingEntries[0]
$actualSignature = Get-AuthenticodeSignature -LiteralPath $installedHelper
Assert-ExactValue -Label 'El estado Authenticode instalado' -Actual ([string]$actualSignature.Status) -Expected $expectedSigning.signature_status
if ($manifest.signing.policy -ceq 'institutional') {
    if (
        [string]$actualSignature.Status -cne 'Valid' -or
        $null -eq $actualSignature.SignerCertificate -or
        $null -eq $actualSignature.TimeStamperCertificate
    ) {
        throw 'La instalación institucional requiere firma válida y sellado de tiempo.'
    }
    Assert-ExactValue -Label 'El firmante instalado' -Actual $actualSignature.SignerCertificate.Thumbprint -Expected $expectedSigning.signer.thumbprint
    Assert-ExactValue -Label 'El sello de tiempo instalado' -Actual $actualSignature.TimeStamperCertificate.Thumbprint -Expected $expectedSigning.timestamp.thumbprint
}

$shortcut = Resolve-RegularFile -LiteralPath $ShortcutPath -Label 'El acceso directo administrativo'
$expectedShortcutName = 'Recuperar contraseña administrativa.lnk'
$officialShortcutPaths = @(Get-OfficialAdminRecoveryShortcutPaths)
$shortcutFullPath = [IO.Path]::GetFullPath($shortcut)
$isOfficialShortcutPath = @($officialShortcutPaths | Where-Object {
    [string]::Equals($_, $shortcutFullPath, [StringComparison]::OrdinalIgnoreCase)
}).Count -eq 1
if (
    [IO.Path]::GetFileName($shortcut) -cne $expectedShortcutName -or
    [IO.Path]::GetExtension($shortcut) -cne '.lnk' -or
    -not $isOfficialShortcutPath
) {
    throw 'El acceso administrativo no corresponde al nombre y la ruta oficial de Inicio.'
}
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$shortcutTarget = (Resolve-Path -LiteralPath $link.TargetPath).Path
Assert-ExactValue -Label 'El destino del acceso directo' -Actual $shortcutTarget -Expected $installedHelper
if (-not [string]::IsNullOrWhiteSpace($link.Arguments)) {
    throw 'El acceso directo administrativo no debe inyectar argumentos.'
}

$outputParent = Split-Path -Parent $OutputPath
if ([string]::IsNullOrWhiteSpace($outputParent)) {
    $outputParent = (Get-Location).Path
}
$outputParent = (Resolve-Path -LiteralPath $outputParent).Path
$resolvedOutput = Join-Path $outputParent ([IO.Path]::GetFileName($OutputPath))
if (Test-Path -LiteralPath $resolvedOutput) {
    throw 'El recibo de verificación ya existe; no se sobrescribe evidencia.'
}

$receipt = [ordered]@{
    schema_version = 1
    result = 'pass'
    release_manifest = [ordered]@{
        filename = 'release-manifest.json'
        sha256 = $manifestHash
        version = $manifest.project.version
    }
    administrative_recovery = [ordered]@{
        filename = $recovery.path
        role = $recovery.role
        sha256 = $expectedHash
        signature_status = [string]$actualSignature.Status
    }
    installation = [ordered]@{
        helper_path = $installedHelper
        shortcut_path = $shortcut
        shortcut_target = $shortcutTarget
        arguments_empty = $true
    }
    productionReady = $false
    remaining_gate = 'independent-clean-windows-review'
}
$json = $receipt | ConvertTo-Json -Depth 8
$temporary = "$resolvedOutput.$PID.tmp"
[IO.File]::WriteAllText($temporary, "$json$([Environment]::NewLine)", (New-Object Text.UTF8Encoding($false)))
Move-Item -LiteralPath $temporary -Destination $resolvedOutput
[Console]::Out.WriteLine(($receipt | ConvertTo-Json -Depth 8 -Compress))
