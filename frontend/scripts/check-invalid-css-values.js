#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const invalidNumericToken = /\d+(?:\.\d+)?var\s*\(/g;
const failures = [];

function filesBelow(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) return filesBelow(current);
    return /\.(?:css|scss|ts)$/.test(entry.name) ? [current] : [];
  });
}

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

for (const file of filesBelow(sourceRoot)) {
  const source = withoutComments(fs.readFileSync(file, 'utf8'));
  for (const match of source.matchAll(invalidNumericToken)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    failures.push(
      `${path.relative(projectRoot, file).replaceAll('\\', '/')}:${line} contiene ${match[0]}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    [
      'Se detectaron valores CSS dañados por sustituciones mecánicas:',
      ...failures.map((item) => `- ${item}`),
    ].join('\n'),
  );
  process.exit(1);
}

console.log('Valores CSS verificados: no existen fragmentos numéricos adyacentes a var().');
