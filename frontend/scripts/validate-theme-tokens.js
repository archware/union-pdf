const fs = require('fs');
const path = require('path');

const tokenPath = path.join(
  __dirname,
  '..',
  'src',
  'styles',
  'themes',
  '_tokens-semantic.css',
);
const source = fs.readFileSync(tokenPath, 'utf8');
const match = source.match(/TEMA OSCURO ESTÁNDAR[\s\S]*?\{([\s\S]*?)\n\}/);

if (!match) {
  console.error('[ThemeCheck] No se encontró el bloque exacto de brand-dark.');
  process.exit(1);
}

const expected = {
  '--surface-ground': '#121212',
  '--surface-background': '#1e1e1e',
  '--surface-section': '#252525',
  '--surface-overlay': 'rgba(0, 0, 0, 0.8)',
  '--surface-elevated': '#2d2d2d',
  '--surface-sunken': '#181818',
  '--shadow-color': '0 0% 0%',
};

const mismatches = Object.entries(expected).flatMap(([token, value]) => {
  const pattern = new RegExp(`${token}\\s*:\\s*([^;]+);`);
  const actual = match[1].match(pattern)?.[1]?.trim();
  return actual === value ? [] : [`${token}: esperado ${value}, obtenido ${actual ?? 'ausente'}`];
});

if (mismatches.length > 0) {
  console.error(`[ThemeCheck] El tema oscuro dejó de ser negro neutral:\n${mismatches.join('\n')}`);
  process.exit(1);
}

console.log(  '[ThemeCheck] Superficies dark negras, neutrales y aisladas verificadas.',);
