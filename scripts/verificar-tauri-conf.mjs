#!/usr/bin/env node
// Candado de integridad de src-tauri/tauri.conf.json (pdf-tool).
//
// Comprueba que el archivo:
//   1. es JSON valido y conserva las claves esenciales (package, tauri, build.distDir),
//   2. coincide con el hash canonico guardado en .agent/tauri.conf.json.sha256,
//   3. que ese hash canonico fue registrado por la via oficial (--actualizar) y no editado a mano.
//
// Uso:
//   node scripts/verificar-tauri-conf.mjs                 # verifica el archivo en disco
//   node scripts/verificar-tauri-conf.mjs --staged        # ademas verifica la version en el indice de git (pre-commit)
//   node scripts/verificar-tauri-conf.mjs --actualizar --motivo "texto >= 10 caracteres"
//                                                         # via LEGITIMA para cambiar el hash canonico
//
// Codigos de salida: 0 = integro, 1 = fallo de integridad, 2 = uso incorrecto.
// Salida ASCII a proposito (consolas Windows sin UTF-8).

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUTA_CONF = 'src-tauri/tauri.conf.json';
export const RUTA_HASH = '.agent/tauri.conf.json.sha256';
export const RUTA_HISTORIAL = '.agent/tauri.conf.historial.log';
export const CLAVES_ESENCIALES = ['package', 'tauri', 'build.distDir'];

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** SHA-256 del contenido con saltos de linea normalizados a LF (el repo usa eol=crlf en disco). */
export function hashCanonico(contenido) {
  const buf = Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido, 'utf8');
  const normalizado = Buffer.from(buf.toString('utf8').replace(/\r/g, ''), 'utf8');
  return createHash('sha256').update(normalizado).digest('hex');
}

/** Devuelve la lista de problemas de estructura (vacia si el JSON es valido y completo). */
export function validarEstructura(texto) {
  let json;
  try {
    json = JSON.parse(texto.replace(/^\uFEFF/, ''));
  } catch (e) {
    return [`JSON invalido: ${e.message}`];
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return ['la raiz no es un objeto JSON'];
  }
  const problemas = [];
  for (const clave of CLAVES_ESENCIALES) {
    let nodo = json;
    for (const parte of clave.split('.')) {
      nodo = nodo !== null && typeof nodo === 'object' ? nodo[parte] : undefined;
    }
    if (nodo === undefined || nodo === null || nodo === '') {
      problemas.push(`falta la clave esencial '${clave}'`);
    }
  }
  return problemas;
}

/** Extrae el hash canonico del contenido del archivo .sha256 (ignora comentarios '#'). */
export function parsearHashGuardado(texto) {
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const m = /^([0-9a-f]{64})\s+(\S+)/i.exec(l);
    return m ? m[1].toLowerCase() : null;
  }
  return null;
}

/** Ultimo hash registrado en el historial (formato: fecha | hash | motivo). */
export function ultimoHashHistorial(texto) {
  let ultimo = null;
  for (const linea of texto.split(/\r?\n/)) {
    const partes = linea.split('|').map((p) => p.trim());
    if (partes.length >= 3 && /^[0-9a-f]{64}$/i.test(partes[1])) ultimo = partes[1].toLowerCase();
  }
  return ultimo;
}

function git(args) {
  const r = spawnSync('git', args, { cwd: RAIZ, encoding: 'buffer' });
  return r.status === 0 ? r.stdout : null;
}

/**
 * Verifica la integridad. Devuelve { ok, lineas }.
 * @param {{staged?: boolean}} opciones
 */
export function verificar({ staged = false } = {}) {
  const lineas = [];
  let ok = true;
  const marcar = (cumple, texto) => {
    lineas.push(`${cumple ? '[OK]   ' : '[FALLO]'} ${texto}`);
    if (!cumple) ok = false;
  };

  const rutaConf = join(RAIZ, RUTA_CONF);
  const rutaHash = join(RAIZ, RUTA_HASH);
  const rutaHist = join(RAIZ, RUTA_HISTORIAL);

  // Hash canonico guardado (disco)
  let hashGuardado = null;
  if (!existsSync(rutaHash)) {
    marcar(false, `no existe el hash canonico ${RUTA_HASH}`);
  } else {
    hashGuardado = parsearHashGuardado(readFileSync(rutaHash, 'utf8'));
    marcar(hashGuardado !== null, `hash canonico legible en ${RUTA_HASH}${hashGuardado ? ` (${hashGuardado})` : ''}`);
  }

  // El hash canonico debe venir de la via oficial (historial), no de una edicion manual
  if (hashGuardado) {
    const ultimo = existsSync(rutaHist) ? ultimoHashHistorial(readFileSync(rutaHist, 'utf8')) : null;
    marcar(
      ultimo === hashGuardado,
      `hash canonico registrado en ${RUTA_HISTORIAL} por la via oficial (--actualizar)` +
        (ultimo === hashGuardado ? '' : ` (ultimo registrado: ${ultimo ?? 'ninguno'})`)
    );
  }

  // Archivo en disco
  if (!existsSync(rutaConf)) {
    marcar(false, `no existe ${RUTA_CONF}`);
  } else {
    const buf = readFileSync(rutaConf);
    const problemas = validarEstructura(buf.toString('utf8'));
    marcar(
      problemas.length === 0,
      `estructura de ${RUTA_CONF} (${buf.length} bytes) con claves ${CLAVES_ESENCIALES.join(', ')}` +
        (problemas.length ? ` -> ${problemas.join('; ')}` : '')
    );
    const real = hashCanonico(buf);
    if (hashGuardado) {
      marcar(real === hashGuardado, `hash de ${RUTA_CONF} en disco == canonico` +
        (real === hashGuardado ? '' : ` (disco: ${real} / canonico: ${hashGuardado})`));
    }
  }

  // Version en el indice de git (pre-commit)
  if (staged) {
    const blobConf = git(['show', `:${RUTA_CONF}`]);
    if (blobConf === null) {
      lineas.push(`[INFO]   ${RUTA_CONF} no esta en el indice de git; no se verifica version staged`);
    } else {
      const problemas = validarEstructura(blobConf.toString('utf8'));
      marcar(problemas.length === 0, `version STAGED de ${RUTA_CONF} conserva claves esenciales` +
        (problemas.length ? ` -> ${problemas.join('; ')}` : ''));
      const blobHash = git(['show', `:${RUTA_HASH}`]);
      const hashRef = blobHash ? parsearHashGuardado(blobHash.toString('utf8')) : hashGuardado;
      if (hashRef) {
        const real = hashCanonico(blobConf);
        marcar(real === hashRef, `hash de la version STAGED == canonico${blobHash ? ' (staged)' : ''}` +
          (real === hashRef ? '' : ` (staged: ${real} / canonico: ${hashRef})`));
      }
    }
  }

  return { ok, lineas };
}

/** Via legitima de actualizacion: valida estructura, escribe hash y registra en historial. */
export function actualizar(motivo) {
  const rutaConf = join(RAIZ, RUTA_CONF);
  if (!existsSync(rutaConf)) throw new Error(`no existe ${RUTA_CONF}`);
  const buf = readFileSync(rutaConf);
  const problemas = validarEstructura(buf.toString('utf8'));
  if (problemas.length) {
    throw new Error(`se rechaza canonizar un archivo invalido: ${problemas.join('; ')}`);
  }
  const hash = hashCanonico(buf);
  const fecha = new Date().toISOString();
  writeFileSync(
    join(RAIZ, RUTA_HASH),
    [
      '# Hash canonico de src-tauri/tauri.conf.json (SHA-256 con saltos de linea normalizados a LF).',
      '# NO editar a mano. Via legitima y unica de actualizacion (requiere autorizacion explicita del usuario):',
      '#   node scripts/verificar-tauri-conf.mjs --actualizar --motivo "razon del cambio"',
      `${hash}  ${RUTA_CONF}`,
      '',
    ].join('\n'),
    'utf8'
  );
  appendFileSync(join(RAIZ, RUTA_HISTORIAL), `${fecha} | ${hash} | ${motivo.replace(/[\r\n|]+/g, ' ')}\n`, 'utf8');
  return { hash, fecha };
}

function main(argv) {
  const staged = argv.includes('--staged');
  if (argv.includes('--actualizar')) {
    const i = argv.indexOf('--motivo');
    const motivo = i >= 0 ? (argv[i + 1] ?? '').trim() : '';
    if (motivo.length < 10) {
      console.error('Uso: --actualizar --motivo "razon del cambio legitimo (>= 10 caracteres)"');
      return 2;
    }
    try {
      const { hash, fecha } = actualizar(motivo);
      console.log(`[OK] Hash canonico actualizado: ${hash}`);
      console.log(`     Registrado en ${RUTA_HISTORIAL} (${fecha}): ${motivo}`);
      console.log(`     Incluya ${RUTA_HASH}, ${RUTA_HISTORIAL} y ${RUTA_CONF} en el MISMO commit.`);
      return 0;
    } catch (e) {
      console.error(`[FALLO] ${e.message}`);
      return 1;
    }
  }

  const { ok, lineas } = verificar({ staged });
  console.log(`--- Integridad de ${RUTA_CONF} ---`);
  for (const l of lineas) console.log(l);
  if (ok) {
    console.log('INTEGRIDAD tauri.conf.json: OK');
    return 0;
  }
  console.log('INTEGRIDAD tauri.conf.json: FALLO');
  console.log(`Accion: NO edite ${RUTA_CONF} para "arreglar" una compilacion. Restaure la version canonica con:`);
  console.log(`        git checkout HEAD -- ${RUTA_CONF}`);
  console.log('        y reporte el fallo. Solo el usuario puede autorizar un cambio legitimo (ver docs/CONTINUIDAD_AGENTES.md).');
  return 1;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
