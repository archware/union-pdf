#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { confinedPath } = require('./safe-paths.cjs');

function fail(message) {
  throw new Error(message);
}

try {
  const consumerRoot = fs.realpathSync.native(path.resolve(process.argv[2] || '.'));
  const manifestPath = confinedPath(
    consumerRoot,
    'docs/atomic-provenance.json',
    'manifiesto de procedencia',
  ).absolute;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.atomicRemote !== 'archware/-Atomic-UI') {
    fail('atomicRemote debe ser la fuente canónica archware/-Atomic-UI.');
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(manifest.atomicRef || '')) {
    fail('atomicRef debe ser un commit Git completo de 40 o 64 caracteres hexadecimales.');
  }
  const packageRoot = confinedPath(
    consumerRoot,
    manifest.packageRoot || '.',
    'packageRoot',
    { allowDot: true },
  ).relative;
  process.stdout.write(
    `${JSON.stringify({
      repository: manifest.atomicRemote,
      ref: manifest.atomicRef,
      packageRoot,
    })}\n`,
  );
} catch (error) {
  console.error(`Contrato Atomic inválido: ${error.message}`);
  process.exit(1);
}
