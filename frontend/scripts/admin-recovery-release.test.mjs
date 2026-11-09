import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  assertAdminRecoveryOutputPath,
  buildHelperManifest,
  buildReceipt,
  buildSbomFromMetadata,
  canonicalJson,
  cargoLockChecksums,
  cargoBuildArguments,
  cargoMetadataArguments,
  helperArtifactName,
  inspectHelperCargoLock,
  inspectPeBuffer,
  loadProductManifest,
  parseArguments,
  sanitizedCargoEnvironment,
  validateBuildEnvironment,
  validateHelperManifest,
  validateNoLocalIdentityDisclosure,
  validateReceiptStructure,
  validateSbomCargoHashes,
  validateSourceDateEpoch,
} from './admin-recovery-release.mjs';
import {
  parseArguments as parseBundleArguments,
  validateBundleSourceIdentity,
  validateDistributionConfiguration,
  validateReviewBinding,
  validarTransformacionAuthenticode,
  verifySignedSource,
} from './admin-recovery-bundle-source.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');

function fakePe() {
  const content = Buffer.alloc(0x400);
  content.writeUInt16LE(0x5a4d, 0);
  content.writeUInt32LE(0x80, 0x3c);
  content.writeUInt32LE(0x00004550, 0x80);
  content.writeUInt16LE(0x8664, 0x84);
  content.writeUInt16LE(3, 0x86);
  content.writeUInt16LE(0x00f0, 0x94);
  content.writeUInt16LE(0x0002, 0x96);
  content.writeUInt16LE(0x020b, 0x98);
  content.writeUInt16LE(2, 0xdc);
  content.writeUInt32LE(16, 0x104);
  content.write('.rsrc\0\0\0', 0x188, 'ascii');
  content.writeUInt32LE(0x200, 0x190);
  content.writeUInt32LE(0x1000, 0x194);
  content.writeUInt32LE(0x200, 0x198);
  content.writeUInt32LE(0x200, 0x19c);
  return content;
}

function crearTransformacionAuthenticodeFicticia(artefactoSinFirma = fakePe()) {
  const desplazamientoCertificado =
    Math.ceil(artefactoSinFirma.byteLength / 8) * 8;
  const tamanoCertificado = 16;
  const artefactoFirmado = Buffer.alloc(
    desplazamientoCertificado + tamanoCertificado,
  );
  artefactoSinFirma.copy(artefactoFirmado);
  artefactoFirmado.writeUInt32LE(0x12345678, 0xd8);
  artefactoFirmado.writeUInt32LE(desplazamientoCertificado, 0x128);
  artefactoFirmado.writeUInt32LE(tamanoCertificado, 0x12c);
  artefactoFirmado.writeUInt32LE(
    tamanoCertificado,
    desplazamientoCertificado,
  );
  artefactoFirmado.writeUInt16LE(0x0200, desplazamientoCertificado + 4);
  artefactoFirmado.writeUInt16LE(0x0002, desplazamientoCertificado + 6);
  artefactoFirmado.fill(0x5a, desplazamientoCertificado + 8);
  return artefactoFirmado;
}

function fakePeWithDebugType(type) {
  const content = fakePe();
  content.writeUInt32LE(0x1000, 0x138);
  content.writeUInt32LE(28, 0x13c);
  content.writeUInt32LE(type, 0x20c);
  return content;
}

function sourceIdentity() {
  return {
    commit: '1'.repeat(40),
    tree: '2'.repeat(40),
    object_format: 'sha1',
    commit_epoch: 1786665600,
    source_date_epoch: 1786665600,
    clean: true,
  };
}

function unsignedEvidence() {
  const artifact = helperArtifactName('1.6.1');
  return {
    policy: 'ci-unsigned',
    status: 'unsigned',
    expected_publisher: 'Hospital Regional Ayacucho',
    verified: true,
    institutional_validation: false,
    artifacts: [
      {
        schema_version: 1,
        artifact,
        policy: 'ci-unsigned',
        signature_status: 'NotSigned',
        metadata: {
          product_name:
            'HRA - Módulo operativo Tauri - Recuperación administrativa (Beta)',
          version: '1.6.1',
          original_filename: artifact,
          publisher: 'Hospital Regional Ayacucho',
        },
        signer: null,
        timestamp: null,
      },
    ],
    reason: 'fixture',
  };
}

function validReceipt() {
  const artifactContent = fakePe();
  const artifactSha256 = createHash('sha256').update(artifactContent).digest('hex');
  return buildReceipt({
    version: '1.6.1',
    identity: sourceIdentity(),
    artifactName: helperArtifactName('1.6.1'),
    artifactContent,
    pe: inspectPeBuffer(artifactContent),
    signing: unsignedEvidence(),
    toolchain: {
      active_toolchain: 'stable-x86_64-pc-windows-msvc (default)',
      rustc_verbose: ['rustc 1.90.0 (fixture)'],
      cargo_version: 'cargo 1.90.0 (fixture)',
      host: 'x86_64-pc-windows-msvc',
      resolution_policy: {
        provider: 'rustup-active-toolchain',
        absolute_paths_recorded: false,
        executables_pinned_by_sha256: true,
      },
      executables: {
        rustc: {
          name: 'rustc.exe',
          version: 'rustc 1.90.0 (fixture)',
          sha256: '6'.repeat(64),
        },
        cargo: {
          name: 'cargo.exe',
          version: 'cargo 1.90.0 (fixture)',
          sha256: '7'.repeat(64),
        },
      },
    },
    sourceInputs: [{ path: 'fixture', sha256: '3'.repeat(64) }],
    reproducibility: {
      independent_builds: 2,
      clean_target_root: true,
      target_directories: [
        'src-tauri/target/admin-recovery/cargo-target/independent-a',
        'src-tauri/target/admin-recovery/cargo-target/independent-b',
      ],
      bit_for_bit: true,
      sha256: [artifactSha256, artifactSha256],
    },
  });
}

function cargoMetadataFixture() {
  const root = 'path+file:///C:/Users/operador/repo#hra-tauri-admin-recovery@1.6.1';
  const argon2 = 'registry+https://example.invalid/argon2@0.5.3';
  const winresource = 'registry+https://example.invalid/winresource@0.1.31';
  return {
    packages: [
      {
        id: root,
        name: 'hra-tauri-admin-recovery',
        version: '1.6.1',
        checksum: null,
      },
      {
        id: argon2,
        name: 'argon2',
        version: '0.5.3',
        checksum: '8'.repeat(64),
      },
      {
        id: winresource,
        name: 'winresource',
        version: '0.1.31',
        checksum: '9'.repeat(64),
      },
    ],
    resolve: {
      nodes: [
        {
          id: root,
          deps: [
            { name: 'argon2', pkg: argon2, dep_kinds: [{ kind: null }] },
            { name: 'winresource', pkg: winresource, dep_kinds: [{ kind: 'build' }] },
          ],
        },
        { id: argon2, deps: [] },
        { id: winresource, deps: [] },
      ],
    },
  };
}

function cargoLockFixture() {
  return `version = 4

[[package]]
name = "argon2"
version = "0.5.3"
source = "registry+https://example.invalid"
checksum = "${'a'.repeat(64)}"

[[package]]
name = "winresource"
version = "0.1.31"
source = "registry+https://example.invalid"
checksum = "${'b'.repeat(64)}"
`;
}

function reviewBindingFixture() {
  const product = loadProductManifest('1.6.1');
  const receipt = validReceipt();
  const artifactBytes = fakePe();
  const receiptText = canonicalJson(receipt);
  const receiptSha256 = createHash('sha256').update(receiptText).digest('hex');
  const deliverables = [
    {
      path: receipt.artifact.path,
      sha256: receipt.artifact.sha256,
      type: receipt.artifact.media_type,
    },
    {
      path: 'build-receipt.json',
      sha256: receiptSha256,
      type: 'application/json',
    },
  ];
  const manifest = buildHelperManifest({
    receipt,
    deliverables,
    signing: receipt.signing,
  });
  return {
    artifactBytes,
    currentIdentity: sourceIdentity(),
    manifest,
    manifestText: canonicalJson(manifest),
    product,
    receipt,
    receiptText,
  };
}

function bindReceiptToManifest(manifest, receipt) {
  const receiptText = canonicalJson(receipt);
  const receiptSha256 = createHash('sha256').update(receiptText).digest('hex');
  manifest.build_receipt.sha256 = receiptSha256;
  manifest.deliverables.find(entry => entry.path === 'build-receipt.json').sha256 =
    receiptSha256;
  return receiptText;
}

test('el binding de revisión enlaza manifiesto, recibo y helper físicos', () => {
  const fixture = reviewBindingFixture();
  assert.deepEqual(validateReviewBinding(fixture), {
    build_receipt: {
      path: 'build-receipt.json',
      sha256: createHash('sha256').update(fixture.receiptText).digest('hex'),
    },
    source_control: fixture.currentIdentity,
    unsigned_artifact: {
      sha256: fixture.receipt.artifact.sha256,
    },
  });
});

test('el binding rechaza un hash declarado del recibo manipulado', () => {
  const fixture = reviewBindingFixture();
  fixture.manifest.build_receipt.sha256 = '0'.repeat(64);
  fixture.manifestText = canonicalJson(fixture.manifest);
  assert.throws(
    () => validateReviewBinding(fixture),
    /manifiesto, el recibo y el helper físico.*no son consistentes/i,
  );
});

test('el binding rechaza identidad Git manipulada en el recibo aunque se reselle su hash', () => {
  const fixture = reviewBindingFixture();
  fixture.receipt.source_control.tree = 'a'.repeat(40);
  fixture.receiptText = bindReceiptToManifest(fixture.manifest, fixture.receipt);
  fixture.manifestText = canonicalJson(fixture.manifest);
  assert.throws(
    () => validateReviewBinding(fixture),
    /HEAD limpio vigente/,
  );
});

test('el binding rechaza bytes manipulados del helper físico', () => {
  const fixture = reviewBindingFixture();
  fixture.artifactBytes = Buffer.from(fixture.artifactBytes);
  fixture.artifactBytes[0x200] ^= 1;
  assert.throws(
    () => validateReviewBinding(fixture),
    /manifiesto, el recibo y el helper físico.*no son consistentes/i,
  );
});

test('el binding rechaza nombre, tamaño o hash del artefacto manipulados en el recibo', () => {
  for (const mutate of [
    receipt => { receipt.artifact.path = 'helper-alterno.exe'; },
    receipt => { receipt.artifact.size += 1; },
    receipt => { receipt.artifact.sha256 = 'f'.repeat(64); },
  ]) {
    const fixture = reviewBindingFixture();
    mutate(fixture.receipt);
    fixture.receiptText = bindReceiptToManifest(fixture.manifest, fixture.receipt);
    fixture.manifestText = canonicalJson(fixture.manifest);
    assert.throws(
      () => validateReviewBinding(fixture),
      /huella de artefacto valida|manifiesto, el recibo y el helper físico.*no son consistentes/i,
    );
  }
});

test('el binding rechaza divergencias entre manifiesto y recibo aunque ambos sean canónicos', () => {
  const fixture = reviewBindingFixture();
  fixture.manifest.source_inputs = [
    { path: 'fixture-alterado', sha256: '3'.repeat(64) },
  ];
  fixture.manifestText = canonicalJson(fixture.manifest);
  assert.throws(
    () => validateReviewBinding(fixture),
    /manifiesto, el recibo y el helper físico.*no son consistentes/i,
  );
});

test('la accion de build queda cerrada al crate auxiliar Rust y excluye paquetes', () => {
  assert.deepEqual(cargoBuildArguments(), [
    'build',
    '--locked',
    '--offline',
    '--release',
    '--manifest-path',
    'src-tauri/admin-recovery/Cargo.toml',
    '--bin',
    'configure_admin_password',
  ]);
  assert.doesNotMatch(
    cargoBuildArguments().join(' '),
    /tauri\s+build|\b(?:bundle|installer|msi|nsis)\b/i,
  );
  assert.deepEqual(cargoMetadataArguments(), [
    'metadata',
    '--locked',
    '--offline',
    '--filter-platform',
    'x86_64-pc-windows-msvc',
    '--manifest-path',
    'src-tauri/admin-recovery/Cargo.toml',
    '--format-version',
    '1',
  ]);
  assert.equal(parseArguments(['build']).action, 'build');
  assert.throws(
    () => parseArguments(['build', '--output', 'src-tauri/target/admin-recovery/otro']),
    /no admite una ruta/,
  );
});

test('el SBOM CycloneDX conserva relaciones exactas y PURL portables', () => {
  const receipt = validReceipt();
  const lock = cargoLockFixture();
  const sbom = buildSbomFromMetadata(receipt, cargoMetadataFixture(), lock);
  const rootRef = 'pkg:cargo/hra-tauri-admin-recovery@1.6.1';
  assert.equal(sbom.metadata.component['bom-ref'], rootRef);
  assert.deepEqual(
    sbom.components.map(component => component.name),
    ['argon2', 'winresource'],
  );
  assert.equal(sbom.dependencies.length, 3);
  assert.deepEqual(
    sbom.dependencies.find(entry => entry.ref === rootRef).dependsOn,
    ['pkg:cargo/argon2@0.5.3', 'pkg:cargo/winresource@0.1.31'],
  );
  assert.deepEqual(sbom.components[0].hashes, [
    { alg: 'SHA-256', content: 'a'.repeat(64) },
  ]);
  assert.deepEqual(sbom.components[1].hashes, [
    { alg: 'SHA-256', content: 'b'.repeat(64) },
  ]);
  assert.equal(cargoLockChecksums(lock).size, 2);
  assert.equal(validateSbomCargoHashes(sbom, lock), true);
  const tampered = structuredClone(sbom);
  tampered.components[0].hashes[0].content = 'c'.repeat(64);
  assert.throws(
    () => validateSbomCargoHashes(tampered, lock),
    /checksum Cargo\.lock/u,
  );
  assert.doesNotMatch(JSON.stringify(sbom), /C:\\Users|operador/i);

  const incomplete = cargoMetadataFixture();
  incomplete.resolve.nodes = incomplete.resolve.nodes.slice(0, 2);
  assert.throws(
    () => buildSbomFromMetadata(receipt, incomplete),
    /paquete fuera de frontera/,
  );
});

test('el entorno auxiliar rechaza overrides y conserva solo variables permitidas', () => {
  for (const name of [
    'RUSTFLAGS',
    'CARGO_ENCODED_RUSTFLAGS',
    'RUSTC',
    'RUSTC_WRAPPER',
    'RUSTC_WORKSPACE_WRAPPER',
    'RUSTUP_TOOLCHAIN',
    'CARGO_BUILD_RUSTC',
    'CARGO_BUILD_RUSTC_WRAPPER',
    'CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER',
    'CARGO_BUILD_TARGET',
    'CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER',
    'CARGO_PROFILE_RELEASE_LTO',
  ]) {
    assert.throws(
      () => validateBuildEnvironment({ [name]: 'malicioso' }),
      /overrides de compilación prohibidos/,
    );
  }
  const environment = sanitizedCargoEnvironment(
    {
      PATH: 'C:\\Windows',
      USERPROFILE: 'C:\\Users\\fixture',
      CARGO_HOME: 'C:\\no-heredado',
      VARIABLE_AJENA: 'no-heredada',
    },
    {
      sourceDateEpoch: 1786665600,
      targetDirectory: 'C:\\target-a',
      rustcPath: 'C:\\Users\\fixture\\.rustup\\toolchains\\stable\\bin\\rustc.exe',
    },
  );
  assert.equal(environment.PATH, 'C:\\Windows');
  assert.equal(environment.CARGO_NET_OFFLINE, 'true');
  assert.equal(
    environment.CARGO_ENCODED_RUSTFLAGS.split('\u001f')[0],
    '-Cdebuginfo=0',
  );
  assert.deepEqual(
    environment.CARGO_ENCODED_RUSTFLAGS.split('\u001f').slice(0, 4),
    ['-Cdebuginfo=0', '-Cstrip=symbols', '-Clink-arg=/Brepro', '-Clink-arg=/DEBUG:NONE'],
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=C:\\Users\\fixture=\/user-profile/,
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=C:\\Users\\fixture\\\.cargo=\/cargo-home/,
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=C:\\target-a=\/cargo-target/,
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=.*base_tauri_angular=\/source-tree/,
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=C:\\Users\\fixture\\\.rustup\\toolchains\\stable=\/rust-toolchain/,
  );
  assert.match(
    environment.CARGO_ENCODED_RUSTFLAGS,
    /--remap-path-prefix=C:\\Users\\fixture\\\.rustup=\/rustup-home/,
  );
  assert.equal(environment.CARGO_TARGET_DIR, 'C:\\target-a');
  assert.equal(
    environment.RUSTC,
    'C:\\Users\\fixture\\.rustup\\toolchains\\stable\\bin\\rustc.exe',
  );
  assert.equal(environment.CARGO_HOME, undefined);
  assert.equal(environment.VARIABLE_AJENA, undefined);
  assert.throws(
    () => sanitizedCargoEnvironment(
      { PATH: 'C:\\Windows' },
      {
        sourceDateEpoch: 1786665600,
        targetDirectory: 'C:\\target-a',
        rustcPath: 'C:\\toolchain\\rustc.exe',
      },
    ),
    /prefijos locales seguros/,
  );
});

test('el lock auxiliar rechaza dependencias de aplicacion, SQL o WebView', () => {
  const lock = readFileSync(
    resolve(repositoryRoot, 'src-tauri', 'admin-recovery', 'Cargo.lock'),
    'utf8',
  );
  const boundary = inspectHelperCargoLock(lock);
  assert.equal(boundary.application_crate_dependency, false);
  assert.deepEqual(boundary.forbidden_components, []);
  assert.ok(boundary.component_count > 0);
  assert.throws(
    () => inspectHelperCargoLock(`${lock}\n[[package]]\nname = "wry"\nversion = "0.1.0"\n`),
    /dependencias ajenas.*wry/,
  );
});

test('el manifiesto raíz contiene exactamente diez claves y la distribución falla cerrada', () => {
  const product = loadProductManifest('1.6.1');
  assert.deepEqual(Object.keys(product).sort(), [
    'applicationId',
    'artifactName',
    'artifactRole',
    'cliFallback',
    'credentialTarget',
    'defaultInvocation',
    'filename',
    'interfaceMode',
    'mutexName',
    'productVersion',
    'schemaVersion',
    'sha256',
  ]);
  assert.deepEqual(product.credentialTarget, {
    account: 'admin-password-hash-argon2id-v1',
    service: 'pe.gob.hra.modulo-operativo',
  });
  assert.equal(validateDistributionConfiguration(product), true);
  assert.deepEqual(parseBundleArguments(['--verify-signed-source']), {
    action: 'verify',
  });
  assert.throws(() => parseBundleArguments([]), /Uso/u);
  assert.throws(() => verifySignedSource(), /no existe/u);
});

test('la fuente firmada del bundle exige HEAD, arbol, epoch y limpieza exactos', () => {
  const current = sourceIdentity();
  assert.deepEqual(validateBundleSourceIdentity(structuredClone(current), current), current);

  for (const mutation of [
    { commit: 'a'.repeat(40) },
    { tree: 'b'.repeat(40) },
    { commit_epoch: current.commit_epoch + 1 },
    { source_date_epoch: current.source_date_epoch + 1 },
    { clean: false },
    { extra: true },
  ]) {
    assert.throws(
      () => validateBundleSourceIdentity({ ...current, ...mutation }, current),
      /HEAD limpio vigente/u,
    );
  }
});

test('la fuente institucional admite únicamente la transformación Authenticode del PE Rust revisado', () => {
  const octetosArtefactoSinFirma = fakePe();
  const octetosArtefactoFirmado = crearTransformacionAuthenticodeFicticia(
    octetosArtefactoSinFirma,
  );
  const vinculo = validarTransformacionAuthenticode({
    octetosArtefactoSinFirma,
    octetosArtefactoFirmado,
  });

  assert.deepEqual(vinculo, {
    algorithm: 'pe-authenticode-certificate-table-v1',
    certificate_table: {
      offset: octetosArtefactoSinFirma.byteLength,
      size: 16,
    },
    signed_artifact_sha256: createHash('sha256')
      .update(octetosArtefactoFirmado)
      .digest('hex'),
    unsigned_artifact_sha256: createHash('sha256')
      .update(octetosArtefactoSinFirma)
      .digest('hex'),
  });
});

test('la transformación Authenticode rechaza un PE de otro producto aunque tenga certificado anexado', () => {
  const octetosArtefactoSinFirma = fakePe();
  const artefactoAjeno = Buffer.from(octetosArtefactoSinFirma);
  artefactoAjeno[0x200] ^= 1;
  const octetosArtefactoFirmado =
    crearTransformacionAuthenticodeFicticia(artefactoAjeno);

  assert.throws(
    () => validarTransformacionAuthenticode({
      octetosArtefactoSinFirma,
      octetosArtefactoFirmado,
    }),
    /cambios ajenos a Authenticode/u,
  );
});

test('la transformación Authenticode rechaza copias sin firma y tablas de certificado inválidas', () => {
  const octetosArtefactoSinFirma = fakePe();
  assert.throws(
    () => validarTransformacionAuthenticode({
      octetosArtefactoSinFirma,
      octetosArtefactoFirmado: Buffer.from(octetosArtefactoSinFirma),
    }),
    /firma Authenticode no fue anexada/u,
  );

  const octetosArtefactoFirmado = crearTransformacionAuthenticodeFicticia(
    octetosArtefactoSinFirma,
  );
  octetosArtefactoFirmado.writeUInt16LE(
    0x0001,
    octetosArtefactoSinFirma.byteLength + 6,
  );
  assert.throws(
    () => validarTransformacionAuthenticode({
      octetosArtefactoSinFirma,
      octetosArtefactoFirmado,
    }),
    /WIN_CERTIFICATE inválida/u,
  );
});

test('las salidas permanecen dentro de la raiz auxiliar ignorada', () => {
  assert.match(
    assertAdminRecoveryOutputPath(
      resolve(repositoryRoot, 'src-tauri', 'target', 'admin-recovery', 'fixture'),
    ),
    /admin-recovery[\\/]fixture$/,
  );
  assert.throws(
    () => assertAdminRecoveryOutputPath(resolve(repositoryRoot, 'src-tauri', 'target')),
    /subdirectorio de src-tauri\/target\/admin-recovery/,
  );
  assert.throws(
    () => assertAdminRecoveryOutputPath(resolve(repositoryRoot, 'src')),
    /subdirectorio de src-tauri\/target\/admin-recovery/,
  );
});

test('SOURCE_DATE_EPOCH debe coincidir con el commit', () => {
  assert.equal(validateSourceDateEpoch('1786665600', 1786665600), 1786665600);
  for (const value of [undefined, '', '0', '-1', '1.5', '1786665601']) {
    assert.throws(
      () => validateSourceDateEpoch(value, 1786665600),
      /SOURCE_DATE_EPOCH/,
    );
  }
});

test('la inspeccion PE acepta exclusivamente PE32+ AMD64 ejecutable', () => {
  assert.deepEqual(inspectPeBuffer(fakePe()), {
    format: 'PE32+',
    machine: 'AMD64',
    machine_code: '0x8664',
    subsystem: 'WINDOWS_GUI',
    subsystem_code: 2,
    sections: 3,
    executable_image: true,
    codeview_debug_entries: 0,
    coff_symbol_count: 0,
    debug_directory_size: 0,
    debug_directory_types: [],
    imports: [],
    forbidden_imports: [],
    local_build_paths_absent: true,
    resource_section: '.rsrc',
    symbols_stripped: true,
  });
  assert.deepEqual(inspectPeBuffer(fakePeWithDebugType(13)).debug_directory_types, [13]);
  assert.throws(
    () => inspectPeBuffer(fakePeWithDebugType(2)),
    /depuraci\u00f3n no permitidos: 2/,
  );
  assert.throws(
    () => inspectPeBuffer(fakePeWithDebugType(12)),
    /depuraci\u00f3n no permitidos: 12/,
  );
  const coffSymbols = fakePe();
  coffSymbols.writeUInt32LE(0x300, 0x8c);
  coffSymbols.writeUInt32LE(1, 0x90);
  assert.throws(() => inspectPeBuffer(coffSymbols), /s\u00edmbolos COFF/);
  const x86 = fakePe();
  x86.writeUInt16LE(0x014c, 0x84);
  assert.throws(() => inspectPeBuffer(x86), /PE32\+ AMD64/);
  const noExecutable = fakePe();
  noExecutable.writeUInt16LE(0, 0x96);
  assert.throws(() => inspectPeBuffer(noExecutable), /ejecutable valido/);
  const networkImport = fakePe();
  networkImport.writeUInt32LE(0x1000, 0x110);
  networkImport.writeUInt32LE(40, 0x114);
  networkImport.writeUInt32LE(0x200, 0x190);
  networkImport.writeUInt32LE(0x1000, 0x194);
  networkImport.writeUInt32LE(0x200, 0x198);
  networkImport.writeUInt32LE(0x200, 0x19c);
  networkImport.writeUInt32LE(0x1040, 0x20c);
  networkImport.write('ws2_32.dll\0', 0x240, 'ascii');
  assert.throws(
    () => inspectPeBuffer(networkImport),
    /superficie ajena.*ws2_32\.dll/,
  );
  assert.throws(() => inspectPeBuffer(Buffer.alloc(0x200)), /firma DOS MZ/);
  const localPathPe = Buffer.concat([
    fakePe(),
    Buffer.from(
      'C:\\Users\\operador\\.cargo\\registry\\crate.rs',
      'ascii',
    ),
  ]);
  assert.throws(
    () => inspectPeBuffer(localPathPe),
    /ruta local o identidad/,
  );
});

test('el recibo vincula commit, arbol, epoch y SHA-256 sin ampliar el build', () => {
  const receipt = validReceipt();
  assert.doesNotThrow(() => validateReceiptStructure(receipt));
  assert.equal(receipt.project.version, '1.6.1');
  assert.equal(receipt.source_control.tree, '2'.repeat(40));
  assert.equal(receipt.source_control.source_date_epoch, 1786665600);
  assert.match(receipt.artifact.sha256, /^[0-9a-f]{64}$/);
  assert.equal(receipt.build.excludes_application_binary, true);
  assert.equal(receipt.build.excludes_installers, true);
  assert.equal(receipt.build.reproducibility.independent_builds, 2);
  assert.equal(receipt.build.reproducibility.clean_target_root, true);
  assert.equal(receipt.build.reproducibility.bit_for_bit, true);
  assert.equal(receipt.interface_mode, 'native-win32-gui');
  assert.equal(receipt.default_invocation, 'gui');
  assert.equal(receipt.cli_fallback, true);
  assert.equal(
    receipt.product_contract.artifact_role,
    'administrative-recovery-utility',
  );

  const expanded = structuredClone(receipt);
  expanded.build.command = ['cargo', 'tauri', 'build'];
  assert.throws(() => validateReceiptStructure(expanded), /frontera cerrada/);

  const tampered = structuredClone(receipt);
  tampered.artifact.sha256 = 'x'.repeat(64);
  assert.throws(() => validateReceiptStructure(tampered), /huella de artefacto/);

  const mismatchedOriginalFilename = structuredClone(receipt);
  mismatchedOriginalFilename.signing.artifacts[0].metadata.original_filename =
    'configure_admin_password.exe';
  assert.throws(
    () => validateReceiptStructure(mismatchedOriginalFilename),
    /validacion PE y de version esperada/,
  );

  const localPath = structuredClone(receipt);
  localPath.toolchain.executables.rustc.name = 'C:\\Users\\operador\\rustc.exe';
  assert.throws(
    () => validateReceiptStructure(localPath),
    /frontera cerrada|ruta local/,
  );
});

test('la evidencia no divulga rutas locales ni identidad del operador', () => {
  assert.equal(
    validateNoLocalIdentityDisclosure(
      { executable: 'rustc.exe', source: 'rustup-active-toolchain' },
      'fixture',
    ),
    true,
  );
  for (const disclosure of [
    'C:\\Users\\operador\\.rustup\\rustc.exe',
    '\\\\servidor\\perfil\\cargo.exe',
    '/home/operador/.cargo/bin/cargo',
    'USERPROFILE',
    'USERNAME',
  ]) {
    assert.throws(
      () => validateNoLocalIdentityDisclosure({ value: disclosure }, 'fixture'),
      /ruta local o identidad/,
    );
  }
});

test('el manifiesto mantiene el helper fuera de IPC, datos y produccion', () => {
  const receipt = validReceipt();
  const deliverables = [
    {
      path: 'admin-recovery.product.json',
      sha256: '8'.repeat(64),
      type: 'application/json',
    },
    {
      path: receipt.artifact.path,
      sha256: receipt.artifact.sha256,
      type: 'application/vnd.microsoft.portable-executable',
    },
    { path: 'build-receipt.json', sha256: '4'.repeat(64), type: 'application/json' },
    {
      path: 'sbom.cdx.json',
      sha256: '5'.repeat(64),
      type: 'application/vnd.cyclonedx+json',
    },
  ];
  const manifest = buildHelperManifest({
    receipt,
    deliverables,
    signing: unsignedEvidence(),
  });
  assert.doesNotThrow(() => validateHelperManifest(manifest));
  assert.equal(manifest.productionReady, false);
  assert.equal(manifest.release_channel, 'beta');
  assert.equal(manifest.project.release_channel, 'beta');
  assert.equal(manifest.interface_mode, 'native-win32-gui');
  assert.equal(manifest.default_invocation, 'gui');
  assert.equal(manifest.cli_fallback, true);
  assert.equal(manifest.distribution.invocation, receipt.artifact.path);
  assert.equal(manifest.distribution.artifact_role, 'administrative-recovery-utility');
  assert.equal(manifest.security_boundary.interactive_terminal_required, false);
  assert.equal(manifest.security_boundary.cli_interactive_terminal_required, true);
  assert.equal(manifest.security_boundary.ipc_exposed, false);
  assert.equal(manifest.security_boundary.database_access, false);
  assert.equal(manifest.security_boundary.kafka_access, false);
  assert.equal(manifest.security_boundary.nexus_access, false);
  assert.ok(
    manifest.release_validation.blocking_reasons.includes(
      'authenticode-institutional-validation-pending',
    ),
  );

  const unsafe = structuredClone(manifest);
  unsafe.productionReady = true;
  assert.throws(() => validateHelperManifest(unsafe), /productionReady=false/);
});

test('el recurso PE pertenece al crate minimo sin alterar el build normal de Tauri', () => {
  const applicationBuild = readFileSync(
    resolve(repositoryRoot, 'src-tauri', 'build.rs'),
    'utf8',
  );
  const helperBuild = readFileSync(
    resolve(repositoryRoot, 'src-tauri', 'admin-recovery', 'build.rs'),
    'utf8',
  );
  const helperManifest = readFileSync(
    resolve(repositoryRoot, 'src-tauri', 'admin-recovery', 'Cargo.toml'),
    'utf8',
  );
  assert.equal(applicationBuild.trim(), 'fn main() {\n    tauri_build::build();\n}');
  assert.match(helperBuild, /requestedExecutionLevel level="asInvoker"/);
  assert.match(helperBuild, /WindowsResource::new\(\)/);
  assert.match(helperBuild, /admin-recovery\.product\.json/);
  assert.match(helperBuild, /OriginalFilename", &original_filename/);
  assert.doesNotMatch(helperBuild, /OriginalFilename", "configure_admin_password\.exe/);
  assert.match(helperManifest, /name = "hra-tauri-admin-recovery"/);
  assert.doesNotMatch(
    helperManifest,
    /tauri-angular-app|tiberius|bb8|webview|\bwry\b/i,
  );
});
