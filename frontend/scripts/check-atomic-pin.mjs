// Ejecuta la compuerta de procedencia Atomic contra un checkout integro del
// atomicRef que declara docs/atomic-provenance.json (DESVIACION-20261018-001).
//
// No sustituye ni debilita check:atomic: usa la misma compuerta, sin editar el
// manifiesto, y solo cambia la fuente (variable ATOMIC_UI_ROOT, soportada por
// la propia compuerta). El repositorio original -Atomic-UI solo se lee: el
// checkout se hace en un clon aparte bajo el directorio temporal.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consumerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(consumerRoot, 'docs', 'atomic-provenance.json'), 'utf8'),
);
const ref = String(manifest.atomicRef || '');
if (!/^[0-9a-f]{40}$/.test(ref)) {
  console.error(`atomicRef invalido en el manifiesto: "${ref}".`);
  process.exit(2);
}

const origen = isAbsolute(manifest.atomicRepository)
  ? manifest.atomicRepository
  : resolve(consumerRoot, manifest.atomicRepository);
const destino =
  process.env.ATOMIC_PIN_DIR || join(tmpdir(), `atomic-pin-${ref.slice(0, 7)}`);

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function checkoutVigente() {
  if (!existsSync(join(destino, '.git'))) return false;
  const head = git(['rev-parse', 'HEAD'], destino);
  const sucio = git(['status', '--porcelain'], destino);
  return head.ok && head.out === ref && sucio.ok && sucio.out === '';
}

if (!checkoutVigente()) {
  if (existsSync(destino)) {
    console.error(
      `El directorio ${destino} existe pero no es un checkout limpio de ${ref}. ` +
        'Borralo o define ATOMIC_PIN_DIR con otra ruta.',
    );
    process.exit(2);
  }
  console.log(`Clonando ${origen} -> ${destino} (solo lectura sobre el original)...`);
  const clon = git(['clone', '--no-checkout', '--quiet', origen, destino], consumerRoot);
  if (!clon.ok) {
    console.error(`No se pudo clonar la fuente Atomic: ${clon.err}`);
    process.exit(2);
  }
  const co = git(['checkout', '--quiet', '--detach', ref], destino);
  if (!co.ok) {
    console.error(`El atomicRef ${ref} no existe en la fuente Atomic: ${co.err}`);
    process.exit(2);
  }
}

console.log(`check:atomic contra el pin ${ref} en ${destino}`);
const prueba = spawnSync(
  process.execPath,
  [join('scripts', 'check-atomic-provenance.mjs')],
  {
    cwd: consumerRoot,
    stdio: 'inherit',
    env: { ...process.env, ATOMIC_UI_ROOT: destino },
  },
);
process.exit(prueba.status ?? 1);
