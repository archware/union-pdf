[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('ci-unsigned', 'institutional')]
    [string]$Policy,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$ExpectedPublisher = 'Hospital Regional Ayacucho',
    [string]$ExpectedVersion,
    [string]$ExpectedProductName,
    [string]$ExpectedOriginalFilename
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    throw "No existe el artefacto que se debe verificar: $Path"
}

$extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
if ($extension -notin @('.exe', '.msi')) {
    throw "Authenticode sólo admite artefactos EXE o MSI: $resolvedPath"
}

function Get-MsiProperty {
    param(
        [Parameter(Mandatory = $true)]$Database,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $query = "SELECT ``Value`` FROM ``Property`` WHERE ``Property``='$Name'"
    $view = $Database.GetType().InvokeMember(
        'OpenView',
        'InvokeMethod',
        $null,
        $Database,
        @($query)
    )
    try {
        $view.GetType().InvokeMember('Execute', 'InvokeMethod', $null, $view, $null) | Out-Null
        $record = $view.GetType().InvokeMember('Fetch', 'InvokeMethod', $null, $view, $null)
        if ($null -eq $record) {
            return $null
        }
        return $record.GetType().InvokeMember('StringData', 'GetProperty', $null, $record, 1)
    }
    finally {
        $view.GetType().InvokeMember('Close', 'InvokeMethod', $null, $view, $null) | Out-Null
    }
}

function Assert-ExpectedValue {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [AllowNull()][AllowEmptyString()][string]$Actual,
        [Parameter(Mandatory = $true)][string]$Expected
    )

    if ($Actual -cne $Expected) {
        throw "$Label no coincide. Esperado='$Expected'; actual='$Actual'."
    }
}

$metadataPublisher = $null
$metadataVersion = $null
$metadataProductName = $null
$metadataOriginalFilename = $null

if ($extension -eq '.msi') {
    $installer = New-Object -ComObject WindowsInstaller.Installer
    $database = $installer.GetType().InvokeMember(
        'OpenDatabase',
        'InvokeMethod',
        $null,
        $installer,
        @($resolvedPath, 0)
    )
    $metadataVersion = Get-MsiProperty -Database $database -Name 'ProductVersion'
    $metadataProductName = Get-MsiProperty -Database $database -Name 'ProductName'
    $metadataPublisher = Get-MsiProperty -Database $database -Name 'Manufacturer'
}
else {
    $versionInfo = (Get-Item -LiteralPath $resolvedPath).VersionInfo
    $metadataVersion = $versionInfo.ProductVersion
    $metadataProductName = $versionInfo.ProductName
    $metadataPublisher = $versionInfo.CompanyName
    $metadataOriginalFilename = $versionInfo.OriginalFilename
}

if ($ExpectedVersion) {
    Assert-ExpectedValue -Label 'La versión del artefacto' -Actual $metadataVersion -Expected $ExpectedVersion
}
if ($ExpectedProductName) {
    Assert-ExpectedValue -Label 'El nombre de producto del artefacto' -Actual $metadataProductName -Expected $ExpectedProductName
}
if ($ExpectedOriginalFilename) {
    if ($extension -ne '.exe') {
        throw 'La validaciÃ³n de OriginalFilename solo se admite para artefactos EXE.'
    }
    Assert-ExpectedValue -Label 'El nombre original del artefacto' -Actual $metadataOriginalFilename -Expected $ExpectedOriginalFilename
}
if ($ExpectedVersion -or $ExpectedProductName) {
    Assert-ExpectedValue -Label 'El editor del artefacto' -Actual $metadataPublisher -Expected $ExpectedPublisher
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedPath
$signatureStatus = [string]$signature.Status
$signer = $signature.SignerCertificate
$timeStamper = $signature.TimeStamperCertificate
$hasCodeSigningEku = $false
$publisherAuthorized = $false

if ($null -ne $signer) {
    $hasCodeSigningEku = @($signer.EnhancedKeyUsageList.ObjectId.Value) -contains '1.3.6.1.5.5.7.3.3'
    $simpleName = $signer.GetNameInfo(
        [System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName,
        $false
    )
    $escapedPublisher = [System.Text.RegularExpressions.Regex]::Escape($ExpectedPublisher)
    $publisherAuthorized = (
        $simpleName -ceq $ExpectedPublisher -or
        $signer.Subject -match "(?:^|,\s*)(?:CN|O)=$escapedPublisher(?:,|$)"
    )
}

if ($Policy -eq 'ci-unsigned') {
    if ($signatureStatus -cne 'NotSigned' -or $null -ne $signer -or $null -ne $timeStamper) {
        throw "La política ci-unsigned exige un artefacto deliberadamente sin firma; estado=$signatureStatus."
    }
}
else {
    if ($signatureStatus -cne 'Valid' -or $null -eq $signer) {
        throw "La política institutional exige una firma Authenticode válida; estado=$signatureStatus."
    }
    if (-not $hasCodeSigningEku) {
        throw 'El certificado no contiene el EKU de firma de código.'
    }
    if (-not $publisherAuthorized) {
        throw "El certificado no pertenece al editor autorizado '$ExpectedPublisher'."
    }
    if ($null -eq $timeStamper) {
        throw 'La firma institucional no contiene un sellado de tiempo verificable.'
    }
}

$metadataReport = [ordered]@{
    product_name = $metadataProductName
    version = $metadataVersion
    publisher = $metadataPublisher
}
if ($ExpectedOriginalFilename) {
    $metadataReport.original_filename = $metadataOriginalFilename
}

$report = [ordered]@{
    schema_version = 1
    artifact = [System.IO.Path]::GetFileName($resolvedPath)
    policy = $Policy
    signature_status = $signatureStatus
    metadata = $metadataReport
    signer = if ($null -eq $signer) {
        $null
    }
    else {
        [ordered]@{
            subject = $signer.Subject
            thumbprint = $signer.Thumbprint
            code_signing_eku = $hasCodeSigningEku
            publisher_authorized = $publisherAuthorized
        }
    }
    timestamp = if ($null -eq $timeStamper) {
        $null
    }
    else {
        [ordered]@{
            subject = $timeStamper.Subject
            thumbprint = $timeStamper.Thumbprint
        }
    }
}

[Console]::Out.WriteLine(($report | ConvertTo-Json -Depth 8 -Compress))
