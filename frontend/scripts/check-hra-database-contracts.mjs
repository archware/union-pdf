#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_SELF_SHA256 = "e0e7f6fe1badf093e0e91f31e3b8d44c054a28ca87d379ba7a45b7a0f84a1e89";
const EXPECTED = Object.freeze({
  "package_version": "0.2.1",
  "bundle_sha256": "029ecd19ada2c87c6eea086136814ff4102dfbe333e2c0920ddc003af036b83d",
  "source_manifest_sha256": "13eeb121ef37f1aa77ceb5f5a6b2f5e1018661fda78f9b20350c6f2fd7430b91",
  "lock_core_sha256": "42fdd44ef476a80de48ed33e6b0be1486b4604a449bb9bc828eec7666149a647",
  "checker_canonicalization": "sha256-git-clean-eol-v1",
  "blocking_decisions": [
    "ADR-0001",
    "ADR-0003"
  ]
});

function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeGitCleanEol(content) {
  const firstCrLf = content.indexOf(Buffer.from([0x0d, 0x0a]));
  if (firstCrLf < 0) return content;

  const normalized = Buffer.allocUnsafe(content.length);
  let writeOffset = 0;
  for (let readOffset = 0; readOffset < content.length; readOffset += 1) {
    if (
      content[readOffset] === 0x0d &&
      readOffset + 1 < content.length &&
      content[readOffset + 1] === 0x0a
    ) {
      normalized[writeOffset] = 0x0a;
      writeOffset += 1;
      readOffset += 1;
    } else {
      normalized[writeOffset] = content[readOffset];
      writeOffset += 1;
    }
  }
  return normalized.subarray(0, writeOffset);
}

function contentSha256(content) {
  return createHash('sha256').update(normalizeGitCleanEol(content)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fail(message) {
  console.error(`Contrato de base de datos inválido: ${message}`);
  process.exit(1);
}

const checkerPath = fileURLToPath(import.meta.url);
const checkerContent = await readFile(checkerPath);
const canonicalChecker = normalizeGitCleanEol(checkerContent);
const canonicalCheckerText = canonicalChecker.toString('utf8');
if (!Buffer.from(canonicalCheckerText, 'utf8').equals(canonicalChecker)) fail('el verificador no utiliza UTF-8 válido');
const normalizedChecker = canonicalCheckerText.replace(
  /const EXPECTED_SELF_SHA256 = "[0-9a-f]{64}";/,
  'const EXPECTED_SELF_SHA256 = "' + ['__HRA', 'SELF', 'SHA256__'].join('_') + '";'
);
if (contentSha256(normalizedChecker) !== EXPECTED_SELF_SHA256) fail('el verificador fue alterado');

const consumerRoot = path.resolve(path.dirname(checkerPath), '..');
const lockPath = path.join(consumerRoot, 'contracts', 'hra-database-contracts.lock.json');
let lock;
try {
  lock = JSON.parse(await readFile(lockPath, 'utf8'));
} catch (error) {
  fail(`no se pudo leer el lock: ${error.message}`);
}

const { evidence, ...lockCore } = lock;
if (!evidence || sha256Text(stableStringify(lockCore)) !== EXPECTED.lock_core_sha256) fail('el contenido contractual del lock fue alterado');
if (evidence.lock_core_sha256 !== EXPECTED.lock_core_sha256) fail('la evidencia del lock no coincide');
if (evidence.checker_canonicalization !== EXPECTED.checker_canonicalization) fail('la política de canonicalización del verificador no coincide');
if (evidence.checker_normalized_sha256 !== EXPECTED_SELF_SHA256) fail('la evidencia normalizada del verificador no coincide');
if (contentSha256(checkerContent) !== evidence.checker_sha256) fail('el hash canónico completo del verificador no coincide');
if (evidence.source_manifest_sha256 !== EXPECTED.source_manifest_sha256) fail('el hash del manifiesto fuente no coincide');
if (lockCore.package.name !== '@hra/database-contracts' || lockCore.package.version !== EXPECTED.package_version) fail('la versión del paquete no coincide');
if (lockCore.source_bundle.bundle_sha256 !== EXPECTED.bundle_sha256) fail('el bundle fijado no coincide');
if (lockCore.source_bundle.release_status !== 'blocked' || lockCore.source_bundle.deployable !== false) fail('el catálogo debe permanecer bloqueado y no desplegable');
if (JSON.stringify([...lockCore.source_bundle.blocking_decisions].sort()) !== JSON.stringify([...EXPECTED.blocking_decisions].sort())) fail('las decisiones bloqueantes no coinciden');
if (lockCore.policy.sql_copied !== false || lockCore.policy.deployment_allowed !== false) fail('la política del consumidor no puede copiar SQL ni autorizar despliegues');

console.log(`Contrato de base de datos verificado: package=${EXPECTED.package_version}; bundle=${EXPECTED.bundle_sha256}; deployable=false`);
