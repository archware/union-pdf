// Archivo generado por @hra/desktop-contracts; no debe editarse manualmente.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'contracts', 'hra-desktop-contracts.lock.json');
const expected = Object.freeze({
  lock_schema_version: 3,
  package_name: "@hra/desktop-contracts",
  package_version: "0.4.2",
  bundle_sha256: "0073842768ffcd8cfbb33659ad5156aea93d42394a74077a1712feeae49897e1",
  content_hash_policy: "sha256-git-clean-eol-v1",
  consumer: "tauri",
  generated_files: Object.freeze([{"path":"contracts/generated/rust/contracts.rs","source_path":"generated/rust/contracts.rs","sha256":"454963e6025a8ce70abd9734c98e4febb1b13283e701871349d2bdc165ea9d25"},{"path":"contracts/generated/typescript/contracts.ts","source_path":"generated/typescript/contracts.ts","sha256":"1d561f0c3e00b12da60e25841879c5982044d1a23f81bab52d3c5978f80a7006"}]),
  runtime_adoption: "active",
  runtime_adoption_evidence: {"schema_version":2,"content_hash_policy":"sha256-git-clean-eol-v1","capabilities":["administracion","compatibilidadV1","conexion","respuestaSistema"],"descriptor_path":"contracts/runtime-adoption.evidence.json","descriptor_sha256":"bc1fe816c145fc835aa9c9da91e292438ae8137b999fe83f6c04a82677b13738","models":[{"model":"AdminSessionV1","production_files":[{"path":"src-tauri/src/lib.rs","sha256":"343bcb270a289bd3440edaa62b34a6d3745bd8a8cd4c732047e899120f32b007"},{"path":"src-tauri/src/security.rs","sha256":"e3ce332e518d82cb60acc1fd6bd330bbb66a24c8f8dc79a0a9a26fbcb5d66ce3"},{"path":"src-tauri/src/interfaces/tauri_cmds.rs","sha256":"17900a6b869f53cec4a81a829da5f8032f1f8f9b6737715f3d27e4a442a1af10"},{"path":"src/app/dashboard/desktop-contracts.ts","sha256":"975e4072f8be2daa0200e08beb692cab489bddae77a31eec2629e6e6f8333694"},{"path":"src/app/dashboard/dashboard.component.ts","sha256":"39b1b3ce3aa6c6fc24603fc668ced2da601eb9e673d56ba5b41e79e9d37eee29"}],"test_files":[{"path":"src-tauri/src/contract_adoption_tests.rs","sha256":"03f9dad11bd3213e20dd061687a9447f8ac60c9209033a851b0a3a81e7a739a8"},{"path":"src/app/dashboard/desktop-contracts.spec.ts","sha256":"fcf6bc5b3f299d0fd0ed6cbdc3c91f73542c660c0152425aaac1fdbea2dd55df"},{"path":"src/app/dashboard/dashboard.component.spec.ts","sha256":"7b4f1bc5d7d0aff39bb0cd705d437dc3dbc5a930ccd3809ed923569c958af229"}]},{"model":"ConnectionProfileV1","production_files":[{"path":"src-tauri/src/lib.rs","sha256":"343bcb270a289bd3440edaa62b34a6d3745bd8a8cd4c732047e899120f32b007"},{"path":"src-tauri/src/interfaces/tauri_cmds.rs","sha256":"17900a6b869f53cec4a81a829da5f8032f1f8f9b6737715f3d27e4a442a1af10"},{"path":"src/app/dashboard/desktop-contracts.ts","sha256":"975e4072f8be2daa0200e08beb692cab489bddae77a31eec2629e6e6f8333694"},{"path":"src/app/dashboard/dashboard.component.ts","sha256":"39b1b3ce3aa6c6fc24603fc668ced2da601eb9e673d56ba5b41e79e9d37eee29"}],"test_files":[{"path":"src-tauri/src/contract_adoption_tests.rs","sha256":"03f9dad11bd3213e20dd061687a9447f8ac60c9209033a851b0a3a81e7a739a8"},{"path":"src/app/dashboard/desktop-contracts.spec.ts","sha256":"fcf6bc5b3f299d0fd0ed6cbdc3c91f73542c660c0152425aaac1fdbea2dd55df"},{"path":"src/app/dashboard/dashboard.component.spec.ts","sha256":"7b4f1bc5d7d0aff39bb0cd705d437dc3dbc5a930ccd3809ed923569c958af229"}]},{"model":"RespuestaSistemaV1","production_files":[{"path":"src-tauri/src/lib.rs","sha256":"343bcb270a289bd3440edaa62b34a6d3745bd8a8cd4c732047e899120f32b007"},{"path":"src-tauri/src/contract_bridge.rs","sha256":"e42f486e115d65f1518a12c3c6a88698c45e74958563cddd3f123855ed61871e"},{"path":"src-tauri/src/interfaces/tauri_cmds.rs","sha256":"17900a6b869f53cec4a81a829da5f8032f1f8f9b6737715f3d27e4a442a1af10"},{"path":"src/app/core/desktop-facade.service.ts","sha256":"33925eab6b0e51f06a94fef3203cb6b28f6563bcc4b664d0efbb277678d7b6fe"},{"path":"src/app/dashboard/desktop-contracts.ts","sha256":"975e4072f8be2daa0200e08beb692cab489bddae77a31eec2629e6e6f8333694"}],"test_files":[{"path":"src-tauri/src/contract_adoption_tests.rs","sha256":"03f9dad11bd3213e20dd061687a9447f8ac60c9209033a851b0a3a81e7a739a8"},{"path":"src/app/core/desktop-facade.service.spec.ts","sha256":"2f0702c4045a8888b9cb79183c260dd739840521a5788e8e52b9c037848d78be"},{"path":"src/app/dashboard/desktop-contracts.spec.ts","sha256":"fcf6bc5b3f299d0fd0ed6cbdc3c91f73542c660c0152425aaac1fdbea2dd55df"}]},{"model":"ResultEnvelopeV1","production_files":[{"path":"src-tauri/src/lib.rs","sha256":"343bcb270a289bd3440edaa62b34a6d3745bd8a8cd4c732047e899120f32b007"},{"path":"src-tauri/src/contract_bridge.rs","sha256":"e42f486e115d65f1518a12c3c6a88698c45e74958563cddd3f123855ed61871e"},{"path":"src/app/dashboard/desktop-contracts.ts","sha256":"975e4072f8be2daa0200e08beb692cab489bddae77a31eec2629e6e6f8333694"}],"test_files":[{"path":"src-tauri/src/contract_adoption_tests.rs","sha256":"03f9dad11bd3213e20dd061687a9447f8ac60c9209033a851b0a3a81e7a739a8"},{"path":"src/app/dashboard/desktop-contracts.spec.ts","sha256":"fcf6bc5b3f299d0fd0ed6cbdc3c91f73542c660c0152425aaac1fdbea2dd55df"},{"path":"src/app/dashboard/dashboard.component.spec.ts","sha256":"7b4f1bc5d7d0aff39bb0cd705d437dc3dbc5a930ccd3809ed923569c958af229"}]}]}
});

function fail(code, detail) {
  console.error(`[${code}] ${detail}`);
  process.exitCode = 1;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function equalDocuments(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
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

function verifyFileHash(relativePath, expectedHash, code) {
  try {
    const content = readFileSync(join(root, relativePath));
    const hash = contentSha256(content);
    if (hash !== expectedHash) fail(code, relativePath);
    return content;
  } catch (error) {
    fail('CONTRACT_EVIDENCE_UNREADABLE',
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

let lock;
try {
  lock = JSON.parse(readFileSync(lockPath, 'utf8'));
} catch (error) {
  fail('CONTRACT_LOCK_UNREADABLE', error instanceof Error ? error.message : String(error));
}

if (lock) {
  for (const field of [
    'lock_schema_version',
    'package_name',
    'package_version',
    'bundle_sha256',
    'content_hash_policy',
    'consumer'
  ]) {
    if (lock[field] !== expected[field]) fail('CONTRACT_LOCK_IDENTITY_MISMATCH', field);
  }
  if (lock.runtime_adoption !== expected.runtime_adoption) {
    fail('CONTRACT_LOCK_RUNTIME_STATE_INVALID', 'runtime_adoption');
  }
  if (!equalDocuments(lock.runtime_adoption_evidence ?? null, expected.runtime_adoption_evidence)) {
    fail('CONTRACT_LOCK_RUNTIME_EVIDENCE_MISMATCH', 'runtime_adoption_evidence');
  }
  if (!Array.isArray(lock.generated_files)) {
    fail('CONTRACT_LOCK_FILES_INVALID', 'generated_files');
  } else {
    const actualPaths = lock.generated_files.map((entry) => entry.path).sort();
    const requiredPaths = expected.generated_files.map((entry) => entry.path).sort();
    if (JSON.stringify(actualPaths) !== JSON.stringify(requiredPaths)) {
      fail('CONTRACT_LOCK_FILE_SET_MISMATCH', actualPaths.join(', '));
    }
    for (const expectedFile of expected.generated_files) {
      const entry = lock.generated_files.find((candidate) => candidate.path === expectedFile.path);
      if (!entry) continue;
      if (entry.source_path !== expectedFile.source_path || entry.sha256 !== expectedFile.sha256) {
        fail('CONTRACT_LOCK_FILE_IDENTITY_MISMATCH', expectedFile.path);
        continue;
      }
      verifyFileHash(expectedFile.path, expectedFile.sha256, 'CONTRACT_GENERATED_HASH_MISMATCH');
    }
  }

  if (expected.runtime_adoption === 'active' && expected.runtime_adoption_evidence) {
    verifyFileHash(
      expected.runtime_adoption_evidence.descriptor_path,
      expected.runtime_adoption_evidence.descriptor_sha256,
      'CONTRACT_ADOPTION_DESCRIPTOR_HASH_MISMATCH'
    );
    for (const modelEvidence of expected.runtime_adoption_evidence.models) {
      for (const evidence of [...modelEvidence.production_files, ...modelEvidence.test_files]) {
        const content = verifyFileHash(
          evidence.path,
          evidence.sha256,
          'CONTRACT_ADOPTION_FILE_HASH_MISMATCH'
        );
        if (content && !content.toString('utf8').includes(modelEvidence.model)) {
          fail('CONTRACT_ADOPTION_MODEL_REFERENCE_MISSING',
            `${modelEvidence.model}: ${evidence.path}`);
        }
      }
    }
  }
}

if (!process.exitCode) {
  console.log(`[CONTRACT_GATE_OK] ${expected.package_name}@${expected.package_version}; ${expected.bundle_sha256}.`);
}
