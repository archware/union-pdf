[CmdletBinding()]
param(
    [string]$ScanPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')

function Resolve-ConfinedPath {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $candidate = if ([System.IO.Path]::IsPathRooted($Path)) {
        [System.IO.Path]::GetFullPath($Path)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $projectRoot $Path))
    }
    $prefix = $projectRoot + [System.IO.Path]::DirectorySeparatorChar
    if ($candidate -ne $projectRoot -and
        -not $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label debe permanecer dentro del repositorio."
    }

    $current = $projectRoot
    if ($candidate -ne $projectRoot) {
        $relative = $candidate.Substring($prefix.Length)
        foreach ($segment in $relative.Split(@('\', '/'), [System.StringSplitOptions]::RemoveEmptyEntries)) {
            $current = Join-Path $current $segment
            if ((Test-Path -LiteralPath $current) -and
                ((Get-Item -LiteralPath $current -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
                throw "$Label no puede atravesar enlaces simbolicos ni junctions."
            }
        }
    }
    return $candidate
}

function Get-NormalizedRelativePath {
    param([Parameter(Mandatory = $true)][string]$AbsolutePath)

    $prefix = $projectRoot + [System.IO.Path]::DirectorySeparatorChar
    if ($AbsolutePath -eq $projectRoot) {
        return '.'
    }
    return $AbsolutePath.Substring($prefix.Length).Replace('\', '/')
}

$scanRoot = if ([string]::IsNullOrWhiteSpace($ScanPath)) {
    $projectRoot
} else {
    Resolve-ConfinedPath -Path $ScanPath -Label 'La ruta de escaneo'
}

if (-not (Test-Path -LiteralPath $scanRoot -PathType Container)) {
    throw 'La ruta de escaneo debe ser un directorio existente.'
}

$files = [System.Collections.Generic.List[string]]::new()
if ($scanRoot -eq $projectRoot) {
    $trackedAndUnignored = @(& git -C $projectRoot ls-files -co --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudo enumerar el arbol de trabajo para buscar secretos.'
    }
    foreach ($relativePath in $trackedAndUnignored) {
        $absolutePath = Resolve-ConfinedPath -Path $relativePath -Label 'El archivo escaneado'
        if (Test-Path -LiteralPath $absolutePath -PathType Leaf) {
            $files.Add($absolutePath)
        }
    }
} else {
    foreach ($file in Get-ChildItem -LiteralPath $scanRoot -File -Recurse -Force) {
        $files.Add((Resolve-ConfinedPath -Path $file.FullName -Label 'El archivo escaneado'))
    }
}

$findings = [System.Collections.Generic.List[string]]::new()
$textExtensions = @(
    '.bat', '.cmd', '.conf', '.config', '.env', '.example', '.go', '.html',
    '.ini', '.js', '.json', '.md', '.mjs', '.pem', '.ps1', '.py', '.sql', '.toml',
    '.ts', '.txt', '.xml', '.yaml', '.yml'
)
$privateExtensions = @('.der', '.jks', '.key', '.keystore', '.p12', '.pfx', '.ppk')
$contentRules = @(
    @{ Name = 'clave privada'; Pattern = '-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----' },
    @{ Name = 'token AWS'; Pattern = '\b(?:AKIA|ASIA)[A-Z0-9]{16}\b' },
    @{ Name = 'token GitHub'; Pattern = '\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b' },
    @{ Name = 'token Slack'; Pattern = '\bxox[baprs]-[A-Za-z0-9-]{20,}\b' },
    @{ Name = 'webhook Slack'; Pattern = 'https://hooks\.slack\.com/services/[A-Za-z0-9/_-]{20,}' },
    @{ Name = 'webhook Discord'; Pattern = 'https://(?:discord(?:app)?\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+' },
    @{ Name = 'clave API Google'; Pattern = '\bAIza[0-9A-Za-z_-]{35}\b' },
    @{ Name = 'credencial en URL'; Pattern = '(?i)\b(?:https?|sqlserver|postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^:\s/]+:[^@\s/]+@' },
    @{ Name = 'secreto en URL'; Pattern = '(?i)https?://[^\s]+[?&](?:access_token|api[_-]?key|sig(?:nature)?|secret|token)=[^&\s]{8,}' },
    @{ Name = 'clave de cuenta Azure'; Pattern = '(?i)\bAccountKey=[A-Za-z0-9+/]{40,}={0,2}\b' },
    @{ Name = 'secreto asignado'; Pattern = '(?i)\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*[''"]([^''"]{8,})[''"]'; Capture = 1 }
)
$placeholderPattern = '^(?:<[^>]+>|\$\{[^}]+\}|change[_-]?me|example|placeholder|replace[_-]?me|your[_-].*|not[_-]?set)$'

foreach ($absolutePath in $files) {
    $normalizedPath = Get-NormalizedRelativePath -AbsolutePath $absolutePath
    $fileName = [System.IO.Path]::GetFileName($absolutePath)
    $extension = [System.IO.Path]::GetExtension($fileName).ToLowerInvariant()
    $isTestFixture = $normalizedPath -match '(?i)(^|/)(?:test|tests|spec|specs)/fixtures/'

    if ($fileName -match '^\.env(?:\..+)?$' -and $fileName -ne '.env.example') {
        $findings.Add("$normalizedPath`: archivo de entorno no permitido")
        continue
    }
    if ($privateExtensions -contains $extension -or $fileName -match '^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$') {
        $findings.Add("$normalizedPath`: material criptografico privado no permitido")
        continue
    }
    if ($textExtensions -notcontains $extension) {
        continue
    }

    $lineNumber = 0
    foreach ($line in [System.IO.File]::ReadLines($absolutePath)) {
        $lineNumber++
        $hasFixtureMarker = $line -match 'secret-scan:\s*allow-test-fixture'
        if ($hasFixtureMarker -and -not $isTestFixture) {
            $findings.Add("$normalizedPath`:$lineNumber`: excepcion fuera de una fixture de prueba")
            continue
        }
        if ($hasFixtureMarker -and $isTestFixture) {
            continue
        }
        foreach ($rule in $contentRules) {
            if ($line -match $rule.Pattern) {
                if ($rule.ContainsKey('Capture') -and $matches[$rule.Capture] -match $placeholderPattern) {
                    continue
                }
                $findings.Add("$normalizedPath`:$lineNumber`: $($rule.Name)")
            }
        }
    }
}

if ($findings.Count -gt 0) {
    foreach ($finding in $findings) {
        [Console]::Error.WriteLine("[SecretScan] $finding")
    }
    exit 1
}

Write-Host "[SecretScan] No se detectaron secretos de alta confianza en $($files.Count) archivos."
