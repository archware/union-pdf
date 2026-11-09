#!/usr/bin/env node
// Prueba de frescura obligatoria de la compilacion (pdf-tool).
//
// Registra la hora de inicio, ejecuta la compilacion canonica (scripts/verificar-todo.*) y despues
// imprime hora actual, hora de modificacion del .exe, tamano, SHA-256 y codigos de salida.
// FALLA (exit != 0) si:
//   - la compilacion canonica devuelve un codigo distinto de 0                       -> exit 1
//   - el .exe no existe o pesa 0 bytes                                               -> exit 2
//   - el .exe es ANTERIOR al inicio de la compilacion (no se regenero)               -> exit 3
//   - el hash del .exe no cambio pero las fuentes SI cambiaron desde la prueba previa -> exit 4
//   - tauri.conf.json no supera el candado de integridad                             -> exit 5
// Si hay varios fallos se imprimen todos y el codigo de salida es el del primero de la lista.
//
// El agente SOLO puede declarar "compilo" pegando el bloque literal entre
// "===== INICIO PRUEBA DE FRESCURA" y "===== FIN PRUEBA DE FRESCURA".
//
// Uso:
//   node scripts/probar-compilacion.mjs                 (o scripts/probar-compilacion.ps1 / .sh)
//   node scripts/probar-compilacion.mjs --sin-compilar  (diagnostico: NO compila; evalua el .exe tal como esta.
//                                                        Fallara salvo que el .exe haya sido regenerado tras el inicio.)
//   node scripts/probar-compilacion.mjs --verboso       (vuelca TODA la salida de la compilacion al terminal; por defecto
//                                                        va a src-tauri/target/probar-compilacion.compilacion.log y en el
//                                                        terminal solo se ve el bloque de frescura, o sus ultimas 40 lineas si falla)
//
// Estado entre ejecuciones: src-tauri/target/probar-compilacion.estado.json (ignorado por git).
// Solo se actualiza cuando el resultado global es EXITO.
// Salida ASCII a proposito (consolas Windows sin UTF-8).

import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificar as verificarTauriConf } from './verificar-tauri-conf.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_TARGET = join(RAIZ, 'src-tauri', 'target');
const ESTADO = join(DIR_TARGET, 'probar-compilacion.estado.json');
const ULTIMA_SALIDA = join(DIR_TARGET, 'probar-compilacion.ultima-salida.txt');
const LOG_COMPILACION = join(DIR_TARGET, 'probar-compilacion.compilacion.log');

const ENTRADAS_FUENTE = [
  'frontend/src',
  'frontend/package.json',
  'frontend/package-lock.json',
  'frontend/angular.json',
  'frontend/tsconfig.json',
  'frontend/tsconfig.app.json',
  'src-tauri/src',
  'src-tauri/icons',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  'src-tauri/build.rs',
  'src-tauri/tauri.conf.json',
  'Cargo.toml',
  'Cargo.lock',
  '.cargo/config.toml',
];
const EXCLUIDOS = new Set(['node_modules', 'dist', 'target', '.angular', '.git']);

export const CODIGOS = { EXITO: 0, COMPILACION: 1, SIN_EXE: 2, EXE_VIEJO: 3, HASH_IGUAL: 4, INTEGRIDAD: 5 };

/**
 * Decision pura (sin E/S). Devuelve { chequeos: [{ok, codigo, texto}], exito, codigoSalida }.
 * @param {object} d
 * @param {number|null} d.codigoCompilacion  null si no se ejecuto (--sin-compilar)
 * @param {boolean} d.exeExiste
 * @param {number} d.exeTamano
 * @param {number|null} d.exeMtimeMs
 * @param {number} d.inicioMs
 * @param {string|null} d.exeSha
 * @param {string|null} d.exeShaPrevio
 * @param {string|null} d.huella
 * @param {string|null} d.huellaPrevia
 * @param {boolean} d.integridadOk
 */
export function evaluar(d) {
  const chequeos = [];
  const anotar = (ok, codigo, texto) => chequeos.push({ ok, codigo, texto });

  if (d.codigoCompilacion === null) {
    anotar(false, CODIGOS.COMPILACION, 'la compilacion canonica NO se ejecuto (--sin-compilar): no hay prueba de compilacion');
  } else {
    anotar(d.codigoCompilacion === 0, CODIGOS.COMPILACION, `compilacion canonica con codigo de salida ${d.codigoCompilacion}`);
  }

  anotar(d.exeExiste && d.exeTamano > 0, CODIGOS.SIN_EXE,
    d.exeExiste ? `el .exe existe y pesa ${d.exeTamano} bytes` : 'el .exe NO existe');

  if (d.exeExiste && d.exeMtimeMs !== null) {
    const fresco = d.exeMtimeMs >= d.inicioMs;
    anotar(fresco, CODIGOS.EXE_VIEJO,
      fresco ? 'el .exe es POSTERIOR al inicio de la compilacion'
             : `el .exe es ANTERIOR al inicio de la compilacion por ${((d.inicioMs - d.exeMtimeMs) / 1000).toFixed(1)} s (no se regenero)`);
  } else {
    anotar(false, CODIGOS.EXE_VIEJO, 'no se puede evaluar la frescura: no hay .exe');
  }

  if (d.exeSha && d.exeShaPrevio && d.huella && d.huellaPrevia) {
    const mismoHash = d.exeSha === d.exeShaPrevio;
    const mismasFuentes = d.huella === d.huellaPrevia;
    if (mismoHash && !mismasFuentes) {
      anotar(false, CODIGOS.HASH_IGUAL, 'el hash del .exe NO cambio pese a que las fuentes SI cambiaron desde la prueba previa');
    } else if (mismoHash) {
      anotar(true, CODIGOS.HASH_IGUAL, 'hash del .exe igual al previo y fuentes sin cambios (compilacion reproducible)');
    } else if (mismasFuentes) {
      anotar(true, CODIGOS.HASH_IGUAL, 'hash del .exe distinto al previo con fuentes sin cambios (el enlazado no es bit a bit reproducible; informativo)');
    } else {
      anotar(true, CODIGOS.HASH_IGUAL, 'hash del .exe cambio y las fuentes cambiaron (coherente)');
    }
  } else {
    anotar(true, CODIGOS.HASH_IGUAL, 'sin referencia previa de hash/fuentes: no se compara (primera prueba o estado borrado)');
  }

  anotar(d.integridadOk, CODIGOS.INTEGRIDAD, 'integridad de src-tauri/tauri.conf.json (hash canonico y claves esenciales)');

  const primerFallo = chequeos.find((c) => !c.ok);
  return { chequeos, exito: !primerFallo, codigoSalida: primerFallo ? primerFallo.codigo : 0 };
}

function sha256Archivo(ruta) {
  return createHash('sha256').update(readFileSync(ruta)).digest('hex');
}

function listarArchivos(ruta, salida) {
  if (!existsSync(ruta)) return;
  const st = statSync(ruta);
  if (st.isFile()) {
    salida.push(ruta);
  } else if (st.isDirectory()) {
    for (const nombre of readdirSync(ruta).sort()) {
      if (!EXCLUIDOS.has(nombre)) listarArchivos(join(ruta, nombre), salida);
    }
  }
}

/** Huella SHA-256 del conjunto de fuentes que determinan el binario. */
export function huellaFuentes() {
  const archivos = [];
  for (const e of ENTRADAS_FUENTE) listarArchivos(join(RAIZ, e), archivos);
  const h = createHash('sha256');
  const rels = archivos.map((a) => ({ a, rel: relative(RAIZ, a).split(sep).join('/') })).sort((x, y) => (x.rel < y.rel ? -1 : 1));
  for (const { a, rel } of rels) h.update(`${rel}\0${sha256Archivo(a)}\n`);
  return { huella: h.digest('hex'), cantidad: rels.length };
}

function localIso(ms) {
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  const off = -d.getTimezoneOffset();
  const signo = off >= 0 ? '+' : '-';
  const o = Math.abs(off);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}${signo}${p(Math.floor(o / 60))}:${p(o % 60)}`;
}

function localizarExe() {
  const dir = join(RAIZ, 'src-tauri', 'target', 'release');
  for (const n of ['union-pdf.exe', 'union-pdf', 'pdf-tool.exe', 'pdf-tool']) {
    if (existsSync(join(dir, n))) return join(dir, n);
  }
  return join(dir, platform() === 'win32' ? 'union-pdf.exe' : 'union-pdf');
}

function leerEstado() {
  try {
    return JSON.parse(readFileSync(ESTADO, 'utf8'));
  } catch {
    return null;
  }
}

/** Ultimas `n` lineas no vacias de un texto (pura, sin E/S). */
export function cola(texto, n) {
  return String(texto).split(/\r?\n/).filter((l) => l.trim() !== '').slice(-n);
}

/**
 * Ejecuta la compilacion canonica.
 * - Por defecto la salida completa (miles de lineas de Vitest/Cargo) va a LOG_COMPILACION y NO al terminal:
 *   asi el bloque de frescura es lo unico visible y no queda enterrado ni truncado por el terminal.
 * - `--verboso` restaura el volcado completo al terminal (stdio heredado).
 */
function compilar(verboso) {
  const [cmd, args] = platform() === 'win32'
    ? ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(RAIZ, 'scripts', 'verificar-todo.ps1')]]
    : ['bash', [join(RAIZ, 'scripts', 'verificar-todo.sh')]];
  if (verboso) return spawnSync(cmd, args, { stdio: 'inherit', cwd: RAIZ });
  mkdirSync(DIR_TARGET, { recursive: true });
  const fd = openSync(LOG_COMPILACION, 'w');
  try {
    return spawnSync(cmd, args, { stdio: ['ignore', fd, fd], cwd: RAIZ });
  } finally {
    closeSync(fd);
  }
}

function main(argv) {
  const sinCompilar = argv.includes('--sin-compilar');
  const verboso = argv.includes('--verboso');
  const previo = leerEstado();
  const huellaAntes = huellaFuentes();

  const inicioMs = Date.now();
  let codigoCompilacion = null;
  if (!sinCompilar) {
    if (!verboso) {
      console.log(`Compilando (tarda unos 2 minutos). La salida completa se guarda en: ${LOG_COMPILACION}`);
      console.log('No repita este comando: al terminar se imprime UNA sola vez el bloque de frescura.');
    }
    const r = compilar(verboso);
    codigoCompilacion = r.status ?? (r.error ? 127 : 1);
  }
  const finMs = Date.now();

  const exe = localizarExe();
  const exeExiste = existsSync(exe);
  const st = exeExiste ? statSync(exe) : null;
  const exeSha = exeExiste ? sha256Archivo(exe) : null;
  const huellaDespues = huellaFuentes();
  const integridad = verificarTauriConf();

  const ev = evaluar({
    codigoCompilacion,
    exeExiste,
    exeTamano: st ? st.size : 0,
    exeMtimeMs: st ? st.mtimeMs : null,
    inicioMs,
    exeSha,
    exeShaPrevio: previo?.exe_sha256 ?? null,
    huella: huellaDespues.huella,
    huellaPrevia: previo?.huella_fuentes ?? null,
    integridadOk: integridad.ok,
  });

  const ahora = Date.now();
  const tz = -new Date().getTimezoneOffset();
  const salida = [];
  salida.push('===== INICIO PRUEBA DE FRESCURA (scripts/probar-compilacion) =====');
  salida.push(`modo                       : ${sinCompilar ? 'DIAGNOSTICO --sin-compilar (no se compilo)' : 'compilacion canonica (verificar-todo)'}`);
  salida.push(`host                       : ${process.env.COMPUTERNAME || process.env.HOSTNAME || 'desconocido'} (${platform()})`);
  salida.push(`zona_horaria               : UTC${tz >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(tz) / 60)).padStart(2, '0')}:${String(Math.abs(tz) % 60).padStart(2, '0')}`);
  salida.push(`inicio_compilacion         : ${localIso(inicioMs)}`);
  salida.push(`fin_compilacion            : ${localIso(finMs)}`);
  salida.push(`hora_actual                : ${localIso(ahora)}`);
  salida.push(`exe_ruta                   : ${exe}`);
  salida.push(`exe_existe                 : ${exeExiste ? 'si' : 'NO'}`);
  salida.push(`exe_modificado             : ${st ? localIso(st.mtimeMs) : 'n/a'}`);
  salida.push(`exe_tamano_bytes           : ${st ? st.size : 'n/a'}`);
  salida.push(`exe_sha256                 : ${exeSha ?? 'n/a'}`);
  salida.push(`exe_sha256_previo          : ${previo?.exe_sha256 ?? 'n/a (sin prueba previa)'}`);
  salida.push(`huella_fuentes             : ${huellaDespues.huella} (${huellaDespues.cantidad} archivos)`);
  salida.push(`huella_fuentes_previa      : ${previo?.huella_fuentes ?? 'n/a (sin prueba previa)'}`);
  salida.push(`huella_fuentes_pre_compil. : ${huellaAntes.huella}${huellaAntes.huella === huellaDespues.huella ? '' : ' (CAMBIO durante la compilacion)'}`);
  salida.push(`codigo_salida_compilacion  : ${codigoCompilacion === null ? 'NO_EJECUTADA' : codigoCompilacion}`);
  salida.push('chequeos:');
  for (const c of ev.chequeos) salida.push(`  [${c.ok ? 'OK' : 'FALLO'}] ${c.texto}`);
  for (const l of integridad.lineas.filter((x) => x.startsWith('[FALLO]'))) salida.push(`      ${l}`);
  salida.push(`RESULTADO                  : ${ev.exito ? 'EXITO' : 'FALLO'}`);
  salida.push(`codigo_salida_prueba       : ${ev.codigoSalida}`);
  if (!ev.exito) {
    salida.push('INSTRUCCION: reporte FALLO con esta salida literal. No explique ni racionalice discrepancias de fechas/hash.');
  }
  salida.push('===== FIN PRUEBA DE FRESCURA =====');

  const texto = salida.join('\n');
  if (!ev.exito && !sinCompilar && !verboso && existsSync(LOG_COMPILACION)) {
    console.log(`\n----- ultimas 40 lineas de la compilacion (log completo: ${LOG_COMPILACION}) -----`);
    console.log(cola(readFileSync(LOG_COMPILACION, 'utf8'), 40).join('\n'));
  }
  console.log(`\n${texto}`);
  try {
    mkdirSync(DIR_TARGET, { recursive: true });
    writeFileSync(ULTIMA_SALIDA, `${texto}\n`, 'utf8');
    if (ev.exito && !sinCompilar) {
      writeFileSync(ESTADO, JSON.stringify({
        fecha: localIso(ahora), exe_sha256: exeSha, huella_fuentes: huellaDespues.huella,
        exe_modificado: localIso(st.mtimeMs), exe_tamano_bytes: st.size,
      }, null, 2), 'utf8');
    }
  } catch (e) {
    console.error(`aviso: no se pudo guardar el estado: ${e.message}`);
  }
  return ev.codigoSalida;
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
