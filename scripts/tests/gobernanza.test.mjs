// Pruebas unitarias de la logica de decision de la prueba de frescura y del candado de tauri.conf.json.
// Ejecutar: node --test scripts/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, cola, CODIGOS } from '../probar-compilacion.mjs';
import { hashCanonico, validarEstructura, parsearHashGuardado, ultimoHashHistorial } from '../verificar-tauri-conf.mjs';

const base = {
  codigoCompilacion: 0, exeExiste: true, exeTamano: 7000000, exeMtimeMs: 2000, inicioMs: 1000,
  exeSha: 'b', exeShaPrevio: 'a', huella: 'y', huellaPrevia: 'x', integridadOk: true,
};

test('exito: exe fresco, hash y fuentes cambiaron', () => {
  const r = evaluar(base);
  assert.equal(r.exito, true);
  assert.equal(r.codigoSalida, 0);
});

test('falla: exe anterior al inicio', () => {
  const r = evaluar({ ...base, exeMtimeMs: 500 });
  assert.equal(r.exito, false);
  assert.equal(r.codigoSalida, CODIGOS.EXE_VIEJO);
});

test('falla: exe inexistente', () => {
  const r = evaluar({ ...base, exeExiste: false, exeTamano: 0, exeMtimeMs: null, exeSha: null });
  assert.equal(r.exito, false);
  assert.equal(r.codigoSalida, CODIGOS.SIN_EXE);
});

test('falla: exe de 0 bytes', () => {
  const r = evaluar({ ...base, exeTamano: 0 });
  assert.equal(r.codigoSalida, CODIGOS.SIN_EXE);
});

test('falla: hash igual con fuentes cambiadas', () => {
  const r = evaluar({ ...base, exeSha: 'a' });
  assert.equal(r.exito, false);
  assert.equal(r.codigoSalida, CODIGOS.HASH_IGUAL);
});

test('ok: hash igual con fuentes sin cambios', () => {
  assert.equal(evaluar({ ...base, exeSha: 'a', huella: 'x' }).exito, true);
});

test('ok: hash distinto con fuentes sin cambios (informativo)', () => {
  assert.equal(evaluar({ ...base, huella: 'x' }).exito, true);
});

test('ok: sin referencia previa', () => {
  assert.equal(evaluar({ ...base, exeShaPrevio: null, huellaPrevia: null }).exito, true);
});

test('falla: compilacion con codigo != 0 aunque el exe sea fresco', () => {
  const r = evaluar({ ...base, codigoCompilacion: 101 });
  assert.equal(r.codigoSalida, CODIGOS.COMPILACION);
});

test('falla: --sin-compilar (codigoCompilacion null)', () => {
  assert.equal(evaluar({ ...base, codigoCompilacion: null }).exito, false);
});

test('falla: integridad de tauri.conf.json', () => {
  const r = evaluar({ ...base, integridadOk: false });
  assert.equal(r.codigoSalida, CODIGOS.INTEGRIDAD);
});

test('multiples fallos: se reportan todos y el codigo es el primero', () => {
  const r = evaluar({ ...base, exeMtimeMs: 1, integridadOk: false });
  assert.equal(r.chequeos.filter((c) => !c.ok).length, 2);
  assert.equal(r.codigoSalida, CODIGOS.EXE_VIEJO);
});

test('hashCanonico ignora CRLF vs LF', () => {
  assert.equal(hashCanonico('{\r\n"a":1\r\n}'), hashCanonico('{\n"a":1\n}'));
});

test('validarEstructura: valido, sin claves, JSON roto, vacio', () => {
  const ok = JSON.stringify({ package: { v: 1 }, tauri: {}, build: { distDir: '../x' } });
  assert.deepEqual(validarEstructura(ok), []);
  const v2 = JSON.stringify({ identifier: 'x', build: { frontendDist: '../x' } });
  const problemas = validarEstructura(v2);
  assert.equal(problemas.length, 3);
  assert.match(validarEstructura('{"package":')[0], /JSON invalido/);
  assert.equal(validarEstructura('').length, 1);
  assert.equal(validarEstructura('[]').length, 1);
});

test('parsearHashGuardado y ultimoHashHistorial', () => {
  const h = 'a'.repeat(64);
  assert.equal(parsearHashGuardado(`# c\n${h}  src-tauri/tauri.conf.json\n`), h);
  assert.equal(parsearHashGuardado('# solo comentario\nbasura'), null);
  const hist = `2026-01-01T00:00:00Z | ${'b'.repeat(64)} | uno\n2026-01-02T00:00:00Z | ${h} | dos\n`;
  assert.equal(ultimoHashHistorial(hist), h);
  assert.equal(ultimoHashHistorial(''), null);
});

test('cola: devuelve las ultimas n lineas no vacias y tolera CRLF', () => {
  assert.deepEqual(cola('a\r\nb\r\n\r\nc\nd\n', 2), ['c', 'd']);
  assert.deepEqual(cola('solo', 5), ['solo']);
  assert.deepEqual(cola('', 3), []);
});
