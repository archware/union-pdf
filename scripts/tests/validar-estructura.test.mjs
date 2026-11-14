// Regresiones del contrato estructural y diagnosticos ASCII; sin ejecutar el CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEstructura } from '../verificar-tauri-conf.mjs';

const valido = { package: {}, tauri: {}, build: { distDir: '../dist' } };
const diagnosticos = (valor) => validarEstructura(JSON.stringify(valor));

test('validarEstructura rechaza tipos incorrectos en objetos y distDir', () => {
  for (const clave of ['package', 'tauri', 'build']) {
    for (const valor of [false, true, 0, 7, 'texto', [], ['x']]) {
      assert.ok(diagnosticos({ ...valido, [clave]: valor }).length > 0, `${clave}: ${JSON.stringify(valor)}`);
    }
  }
  for (const valor of [false, true, 0, 7, [], {}, '', ' \t\r\n']) {
    assert.ok(diagnosticos({ ...valido, build: { distDir: valor } }).length > 0, `distDir: ${JSON.stringify(valor)}`);
  }
});

test('validarEstructura acumula tres problemas independientes', () => {
  const errores = diagnosticos({ package: false, tauri: [], build: { distDir: false } });
  assert.equal(errores.length, 3);
  for (const clave of ['package', 'tauri', 'build.distDir']) {
    assert.ok(errores.some((error) => error.includes(`'${clave}'`)));
  }
});

test('validarEstructura conserva objetos vacios, BOM, rutas y Unicode valido', () => {
  for (const distDir of ['../dist', '/opt/app', 'C:\\app\\dist', 'https://example.invalid/app', '  ../dist  ', '../espa\u00f1ol']) {
    const texto = JSON.stringify({ ...valido, build: { distDir }, extra: false });
    assert.deepEqual(validarEstructura(texto), []);
    assert.deepEqual(validarEstructura('\uFEFF' + texto), []);
  }
});

test('validarEstructura conserva mensajes de claves ausentes', () => {
  assert.deepEqual(diagnosticos({}), [
    "falta la clave esencial 'package'",
    "falta la clave esencial 'tauri'",
    "falta la clave esencial 'build.distDir'",
  ]);
});

test('validarEstructura conserva el formato del error JSON ya ASCII', () => {
  for (const texto of ['', '{broken', '{"nombre":"a",}']) {
    let mensaje;
    try { JSON.parse(texto); } catch (error) { mensaje = error.message; }
    assert.equal(typeof mensaje, 'string');
    assert.match(mensaje, /^[\x00-\x7f]*$/);
    assert.deepEqual(validarEstructura(texto), [`JSON invalido: ${mensaje}`]);
  }
});

test('validarEstructura devuelve diagnosticos ASCII ante JSON invalido Unicode', () => {
  for (const texto of ['\u00e9', '{"nombre":\u00e9}', '\u6f22\u5b57', '\ud83d\ude00', '\ud800']) {
    const errores = validarEstructura(texto);
    assert.equal(errores.length, 1);
    assert.match(errores[0], /^JSON invalido: /);
    assert.match(errores[0], /^[\x00-\x7f]*$/);
  }
  assert.ok(validarEstructura('\u00e9')[0].includes('\\u00e9'));
});
