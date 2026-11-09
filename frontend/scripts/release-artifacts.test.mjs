import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  applicationArtifactName,
  artifactContract,
} from './release-artifacts.mjs';
import { selectWindowsArtifactNames } from './stage-windows-release.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const script = join(repositoryRoot, 'scripts', 'release-artifacts.mjs');
const authenticodeScript = join(repositoryRoot, 'scripts', 'verify-authenticode.ps1');
const secretScanScript = join(repositoryRoot, 'scripts', 'secret_scan.ps1');
const powershell = process.platform === 'win32'
  ? join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  : 'pwsh';

function execute(...arguments_) {
  const result = spawnSync(process.execPath, [script, ...arguments_], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function executeFailure(...arguments_) {
  const result = spawnSync(process.execPath, [script, ...arguments_], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, result.stdout);
  return result.stderr;
}

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('importar el generador de evidencia no ejecuta su CLI', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `await import(${JSON.stringify(pathToFileURL(script).href)}); process.stdout.write('import-ok');`,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, 'import-ok');
  assert.equal(result.stderr, '');
});

test('la metadata de entrega es determinista y verificable', () => {
  mkdirSync(join(repositoryRoot, 'src-tauri', 'target'), { recursive: true });
  const temporaryRoot = mkdtempSync(
    join(repositoryRoot, 'src-tauri', 'target', 'release-test-'),
  );
  const first = join(temporaryRoot, 'first');
  const second = join(temporaryRoot, 'second');
  try {
    execute('--output', first);
    execute('--verify', '--output', first);
    execute('--output', second);

    for (const name of ['sbom.cdx.json', 'release-manifest.json', 'SHA256SUMS.txt']) {
      assert.equal(digest(join(first, name)), digest(join(second, name)), name);
    }
    const sbom = JSON.parse(readFileSync(join(first, 'sbom.cdx.json'), 'utf8'));
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.specVersion, '1.6');
    assert.ok(sbom.components.some((component) => component.purl.startsWith('pkg:npm/')));
    assert.ok(sbom.components.some((component) => component.purl.startsWith('pkg:cargo/')));
    const manifest = JSON.parse(readFileSync(join(first, 'release-manifest.json'), 'utf8'));
    assert.equal(manifest.productionReady, false);
    assert.equal(manifest.release_channel, 'beta');
    assert.equal(manifest.project.release_channel, 'beta');
    assert.equal(manifest.signing.policy, 'ci-unsigned');
    assert.equal(manifest.signing.status, 'unsigned');
    assert.deepEqual(manifest.signing.artifacts, []);
    assert.ok(
      manifest.release_validation.blocking_reasons.includes(
        'authenticode-institutional-validation-pending',
      ),
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('la aplicación se promueve con nombre descriptivo Beta sin cambiar el basename Cargo', () => {
  const version = '1.6.1';
  const name = applicationArtifactName(version);
  assert.equal(name, 'HRA-Modulo-Operativo-Tauri-Aplicacion-1.6.1-Beta.exe');
  assert.deepEqual(
    artifactContract(name, version, 'HRA Modulo Operativo Tauri Beta', {
      artifactName:
        'HRA-Modulo-Operativo-Tauri-Recuperacion-Administrativa-1.6.1-Beta.exe',
    }),
    {
      original_filename: 'tauri-angular-app.exe',
      product_name: 'HRA Modulo Operativo Tauri Beta',
      release_channel: 'beta',
      role: 'windows-application',
      version,
    },
  );
});

test('la entrega incorpora un artefacto y valida su hash embebido', () => {
  mkdirSync(join(repositoryRoot, 'src-tauri', 'target'), { recursive: true });
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'release-artifact-'));
  const artifact = join(temporaryRoot, 'base-tauri.bin');
  const output = join(temporaryRoot, 'evidence');
  try {
    writeFileSync(artifact, 'artefacto de prueba\n', 'utf8');
    execute('--output', output, '--artifact', artifact);
    execute('--verify', '--output', output);
    const manifest = JSON.parse(
      readFileSync(join(output, 'release-manifest.json'), 'utf8'),
    );
    const staged = manifest.deliverables.find((entry) => entry.path === 'base-tauri.bin');
    assert.equal(staged.sha256, digest(join(output, 'base-tauri.bin')));
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('la salida destructiva queda restringida a src-tauri/target', () => {
  const stderr = executeFailure('--output', join(repositoryRoot, 'src'));
  assert.match(stderr, /subdirectorio de src-tauri\/target/);
});

test('la verificación rechaza rutas que escapan de la salida', () => {
  mkdirSync(join(repositoryRoot, 'src-tauri', 'target'), { recursive: true });
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'release-traversal-'));
  try {
    execute('--output', temporaryRoot);
    const sums = join(temporaryRoot, 'SHA256SUMS.txt');
    writeFileSync(
      sums,
      `${'0'.repeat(64)}  ../package.json\n`,
      'ascii',
    );
    const stderr = executeFailure('--verify', '--output', temporaryRoot);
    assert.match(stderr, /ruta fuera de la salida/);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('una generación fallida conserva intacta la entrega anterior', () => {
  mkdirSync(join(repositoryRoot, 'src-tauri', 'target'), { recursive: true });
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'release-rollback-'));
  const output = join(temporaryRoot, 'evidence');
  const marker = join(output, 'entrega-anterior.txt');
  try {
    mkdirSync(output);
    writeFileSync(marker, 'vigente\n', 'utf8');
    executeFailure(
      '--output',
      output,
      '--artifact',
      join(temporaryRoot, 'artefacto-ausente.exe'),
    );
    assert.equal(readFileSync(marker, 'utf8'), 'vigente\n');
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('la salida rechaza enlaces simbólicos y junctions', (context) => {
  mkdirSync(join(repositoryRoot, 'src-tauri', 'target'), { recursive: true });
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'release-link-'));
  const actual = join(temporaryRoot, 'actual');
  const linked = join(temporaryRoot, 'linked');
  try {
    mkdirSync(actual);
    try {
      symlinkSync(actual, linked, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error?.code === 'EPERM') {
        context.skip('El entorno no permite crear un enlace de prueba.');
        return;
      }
      throw error;
    }
    const stderr = executeFailure('--output', join(linked, 'evidence'));
    assert.match(stderr, /enlaces simbólicos ni junctions/);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('el descubrimiento cerrado selecciona sólo instaladores de la versión vigente', () => {
  const config = JSON.parse(
    readFileSync(join(repositoryRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const recoveryProduct = JSON.parse(
    readFileSync(join(repositoryRoot, 'admin-recovery.product.json'), 'utf8'),
  );
  const inventory = {
    release: ['tauri-angular-app.exe'],
    helper: [recoveryProduct.artifactName],
    msi: [
      `${config.productName}_${config.version}_x64_en-US.msi`,
      `${config.productName}_0.0.1_x64_en-US.msi`,
    ],
    nsis: [
      `${config.productName}_${config.version}_x64-setup.exe`,
      `${config.productName}_0.0.1_x64-setup.exe`,
    ],
  };
  const discovered = selectWindowsArtifactNames(config, inventory, recoveryProduct);
  assert.deepEqual(
    [discovered.executable, discovered.helper, discovered.msi, discovered.nsis],
    [
      'tauri-angular-app.exe',
      recoveryProduct.artifactName,
      `${config.productName}_${config.version}_x64_en-US.msi`,
      `${config.productName}_${config.version}_x64-setup.exe`,
    ],
  );
  inventory.msi.push(`${config.productName}_${config.version}_x64_es-PE.msi`);
  assert.throws(
    () => selectWindowsArtifactNames(config, inventory, recoveryProduct),
    /exactamente un artefacto de la versión vigente/,
  );
});

test('la política institucional rechaza de forma cerrada un ejecutable sin firma', (context) => {
  if (process.platform !== 'win32') {
    context.skip('Authenticode sólo se valida en Windows.');
    return;
  }
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'auth-policy-'));
  const artifact = join(temporaryRoot, 'unsigned.exe');
  try {
    const compile = spawnSync(
      powershell,
      [
        '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-Command',
        `Add-Type -TypeDefinition 'public static class Program { public static void Main() {} }' -Language CSharp -OutputAssembly '${artifact.replaceAll("'", "''")}' -OutputType ConsoleApplication`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(compile.status, 0, compile.stderr);
    const common = [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', authenticodeScript, '-Path', artifact,
    ];
    const ci = spawnSync(powershell, [...common, '-Policy', 'ci-unsigned'], { encoding: 'utf8' });
    assert.equal(ci.status, 0, ci.stderr);
    assert.equal(JSON.parse(ci.stdout).signature_status, 'NotSigned');
    const institutional = spawnSync(
      powershell,
      [...common, '-Policy', 'institutional'],
      { encoding: 'utf8' },
    );
    assert.notEqual(institutional.status, 0);
    assert.match(institutional.stderr, /firma Authenticode.+estado=NotSigned/s);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('el manifiesto no puede declarar productionReady sin validación integral', () => {
  const temporaryRoot = mkdtempSync(join(repositoryRoot, 'src-tauri', 'target', 'readiness-'));
  try {
    execute('--output', temporaryRoot);
    const manifestPath = join(temporaryRoot, 'release-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.productionReady = true;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    const sumsPath = join(temporaryRoot, 'SHA256SUMS.txt');
    const sums = readFileSync(sumsPath, 'ascii').replace(
      /^[0-9a-f]{64}  release-manifest\.json$/m,
      `${digest(manifestPath)}  release-manifest.json`,
    );
    writeFileSync(sumsPath, sums, 'ascii');
    assert.match(
      executeFailure('--verify', '--output', temporaryRoot),
      /productionReady debe permanecer en false/,
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('el escáner rechaza una clave privada fuera de la allowlist exacta', (context) => {
  if (process.platform !== 'win32') {
    context.skip('El escáner de CI utiliza PowerShell en Windows.');
    return;
  }
  const fixture = join(repositoryRoot, `secret-scan-negative-${process.pid}.pem`);
  try {
    const privateKeyFixture = ['-----BEGIN ', 'PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n'].join('');
    writeFileSync(fixture, privateKeyFixture);
    const result = spawnSync(
      powershell,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', secretScanScript],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /clave privada/);
  } finally {
    rmSync(fixture, { force: true });
  }
});

test('la compuerta instalada vincula hash y acceso directo sin ejecutar el recuperador', () => {
  const verifier = readFileSync(
    join(repositoryRoot, 'scripts', 'verify-admin-recovery-installation.ps1'),
    'utf8',
  );
  assert.match(verifier, /Get-FileHash/u);
  assert.match(verifier, /CreateShortcut/u);
  assert.match(verifier, /administrative-recovery-utility/u);
  assert.match(verifier, /Recuperar contraseña administrativa\.lnk/u);
  assert.match(verifier, /ApplicationData/u);
  assert.match(verifier, /CommonApplicationData/u);
  assert.match(verifier, /Microsoft\\Windows\\Start Menu\\Programs/u);
  assert.match(verifier, /OrdinalIgnoreCase/u);
  assert.doesNotMatch(verifier, /Start-Process|Invoke-Expression/u);
  const releaseContract = readFileSync(script, 'utf8');
  for (const role of [
    'administrative-recovery-utility',
    'msi-installer',
    'setup-installer',
    'windows-application',
  ]) {
    assert.match(releaseContract, new RegExp(role, 'u'));
  }
  assert.match(releaseContract, /source_binding/u);
});
