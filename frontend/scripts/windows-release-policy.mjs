import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const institutionalPublisher = 'Hospital Regional Ayacucho';
export const signingPolicies = new Set(['ci-unsigned', 'institutional']);

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const verifierScript = join(repositoryRoot, 'scripts', 'verify-authenticode.ps1');

function powershellExecutable() {
  const windowsPowerShell = process.env.SystemRoot
    ? join(
        process.env.SystemRoot,
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe',
      )
    : undefined;
  if (windowsPowerShell && existsSync(windowsPowerShell)) return windowsPowerShell;
  return process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
}

function isWindowsArtifact(path) {
  return new Set(['.exe', '.msi']).has(extname(path).toLowerCase());
}

function verifyOne(path, policy, version, productName, expectedOriginalFilename) {
  const commandArgs = [
    `-Policy '${policy}'`,
    `-Path '${path}'`,
    `-ExpectedPublisher '${institutionalPublisher}'`
  ];
  if (version) commandArgs.push(`-ExpectedVersion '${version}'`);
  if (productName) commandArgs.push(`-ExpectedProductName '${productName}'`);
  if (expectedOriginalFilename) {
    commandArgs.push(`-ExpectedOriginalFilename '${expectedOriginalFilename}'`);
  }
  
  const arguments_ = [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8; & '${verifierScript}' ${commandArgs.join(' ')}`
  ];
  const result = spawnSync(powershellExecutable(), arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Falló la política Authenticode para ${basename(path)}: ${(result.stderr || result.stdout).trim()}`,
    );
  }
  try {
    return JSON.parse(result.stdout.trim());
  } catch (error) {
    throw new Error(`El verificador Authenticode no devolvió JSON válido para ${basename(path)}.`, {
      cause: error,
    });
  }
}

export function buildSigningMetadata({
  artifacts,
  policy,
  version,
  productName,
  expectedOriginalFilename,
  artifactExpectations = {},
}) {
  if (!signingPolicies.has(policy)) {
    throw new Error(`Política de firma no reconocida: ${policy}`);
  }
  const windowsArtifacts = artifacts.filter(isWindowsArtifact);
  if (policy === 'institutional' && windowsArtifacts.length === 0) {
    throw new Error('La política institutional requiere al menos un artefacto EXE o MSI.');
  }
  const reports = windowsArtifacts
    .map((path) => {
      const expectation = artifactExpectations[basename(path)] ?? {};
      return verifyOne(
        path,
        policy,
        expectation.version ?? version,
        expectation.productName ?? productName,
        expectation.expectedOriginalFilename ?? expectedOriginalFilename,
      );
    })
    .sort((left, right) => left.artifact.localeCompare(right.artifact));
  const institutional = policy === 'institutional';
  return {
    policy,
    status: institutional ? 'signed-valid' : 'unsigned',
    expected_publisher: institutionalPublisher,
    verified: true,
    institutional_validation: institutional,
    artifacts: reports,
    reason: institutional
      ? 'La firma, el EKU, el editor y el sellado de tiempo superaron la política institucional.'
      : 'CI verifica de forma explícita que los artefactos permanecen sin firma.',
  };
}

export function buildReleaseReadiness(signing) {
  const blockers = [
    'administrative-recovery-installed-binding-pending',
    'administrative-recovery-shortcut-validation-pending',
    'clean-windows-installation-pending',
  ];
  if (!signing.institutional_validation) {
    blockers.unshift('authenticode-institutional-validation-pending');
  }
  return {
    productionReady: false,
    release_validation: {
      authenticode: signing.institutional_validation ? 'valid' : 'pending-institutional',
      administrative_recovery_installed_binding: 'pending',
      administrative_recovery_shortcut: 'pending',
      clean_windows_installation: 'pending',
      blocking_reasons: blockers,
    },
  };
}

export function verifyManifestReleasePolicy(
  manifest,
  output,
  { expectedOriginalFilename } = {},
) {
  if (manifest.productionReady !== false) {
    throw new Error('productionReady debe permanecer en false sin validación integral de instalación.');
  }
  const signing = manifest.signing;
  if (!signing || !signingPolicies.has(signing.policy) || signing.verified !== true) {
    throw new Error('El manifiesto no contiene una política Authenticode verificada.');
  }
  if (signing.expected_publisher !== institutionalPublisher) {
    throw new Error('El editor esperado del manifiesto no es el editor institucional.');
  }
  const institutional = signing.policy === 'institutional';
  if (
    signing.status !== (institutional ? 'signed-valid' : 'unsigned') ||
    signing.institutional_validation !== institutional
  ) {
    throw new Error('El estado Authenticode contradice la política declarada.');
  }
  const validation = manifest.release_validation;
  if (
    !validation ||
    validation.administrative_recovery_installed_binding !== 'pending' ||
    validation.administrative_recovery_shortcut !== 'pending' ||
    validation.clean_windows_installation !== 'pending' ||
    !Array.isArray(validation.blocking_reasons) ||
    !validation.blocking_reasons.includes('administrative-recovery-installed-binding-pending') ||
    !validation.blocking_reasons.includes('administrative-recovery-shortcut-validation-pending') ||
    !validation.blocking_reasons.includes('clean-windows-installation-pending')
  ) {
    throw new Error('La entrega no conserva el bloqueo de instalación en Windows limpio.');
  }
  const windowsEntries = manifest.deliverables
    .filter((entry) => isWindowsArtifact(entry.path));
  if (manifest.windows_binary_inventory) {
    const roles = windowsEntries.map((entry) => entry.role).sort();
    const requiredRoles = [
      'administrative-recovery-utility',
      'msi-installer',
      'setup-installer',
      'windows-application',
    ].sort();
    if (
      manifest.windows_binary_inventory.exact_artifact_count !== 4 ||
      windowsEntries.length !== 4 ||
      JSON.stringify(roles) !== JSON.stringify(requiredRoles)
    ) {
      throw new Error('El inventario Windows debe contener exactamente cuatro binarios con roles cerrados.');
    }
    const helper = windowsEntries.find(
      (entry) => entry.role === 'administrative-recovery-utility',
    );
    if (
      helper?.source_binding?.commit !== manifest.source_control?.commit ||
      helper?.source_binding?.tree !== manifest.source_control?.tree ||
      !/^[0-9a-f]{64}$/u.test(helper?.source_binding?.build_receipt_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/u.test(helper?.source_binding?.product_contract_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/u.test(helper?.source_binding?.unsigned_artifact_sha256 ?? '')
    ) {
      throw new Error('El recuperador no conserva su binding de recibo y HEAD.');
    }
  }
  const actualReports = windowsEntries
    .map((entry) => verifyOne(
      join(output, entry.path),
      signing.policy,
      entry.version ?? manifest.project.version,
      entry.product_name ?? manifest.project.product_name,
      entry.original_filename ?? expectedOriginalFilename,
    ))
    .sort((left, right) => left.artifact.localeCompare(right.artifact));
  if (JSON.stringify(actualReports) !== JSON.stringify(signing.artifacts)) {
    throw new Error('La evidencia Authenticode embebida no coincide con los artefactos entregados.');
  }
}
