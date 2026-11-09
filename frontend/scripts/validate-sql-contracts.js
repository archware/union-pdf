const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const queryPath = path.join(
  root,
  'src-tauri',
  'src',
  'infrastructure',
  'db',
  'queries.rs',
);

const contracts = [
  {
    constant: 'DASHBOARD_STATS',
    procedure: 'USP_SEL_DASHBOARD_STATS_ID11',
    parameters: ['I_MES', 'I_ANIO'],
  },
  {
    constant: 'PACIENTES',
    procedure: 'USP_SEL_GRILLA_NOMINAL_ID11',
    parameters: [
      'I_PAGE_NUMBER',
      'I_PAGE_SIZE',
      'V_SEARCH',
      'V_FILTER_ESTADO',
      'V_SORT_COLUMN',
      'V_SORT_DIRECTION',
      'I_MES',
      'I_ANIO',
      'V_FILTER_METODO',
      'V_FILTER_ESTADO_TA',
    ],
    requiredSqlFragments: ['@returnValue', 'AS TotalRecords'],
  },
  {
    constant: 'DESCARTADOS',
    procedure: 'USP_SEL_DESCARTADOS_ID11',
    parameters: ['I_MES', 'I_ANIO', 'V_SEARCH', 'I_PAGE_NUMBER', 'I_PAGE_SIZE'],
    requiredSqlFragments: ['AS TotalRecords'],
  },
  {
    constant: 'UNIVERSO_EVALUADO_SIS240',
    procedure: 'USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11',
    parameters: ['I_MES', 'I_ANIO'],
  },
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (!fs.existsSync(queryPath)) {
  fail(`No existe el archivo de consultas: ${path.relative(root, queryPath)}.`);
} else {
  const queries = fs.readFileSync(queryPath, 'utf8');
  const declaredConstants = [
    ...queries.matchAll(/pub const\s+([A-Z0-9_]+):\s*&str\s*=\s*r#"/g),
  ].map((match) => match[1]);
  const expectedConstants = contracts.map((contract) => contract.constant);

  for (const constant of declaredConstants) {
    if (!expectedConstants.includes(constant)) {
      fail(`La consulta Rust ${constant} no tiene un contrato SQL validado.`);
    }
  }

  for (const contract of contracts) {
    const queryPattern = new RegExp(
      `pub const\\s+${escapeRegex(contract.constant)}:\\s*&str\\s*=\\s*r#"([\\s\\S]*?)"#;`,
    );
    const query = queries.match(queryPattern)?.[1];
    if (!query) {
      fail(`No se encontró la constante Rust ${contract.constant}.`);
      continue;
    }

    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const expectedCall = `EXEC ind.${contract.procedure}`;
    if (!normalizedQuery.startsWith(expectedCall)) {
      fail(`${contract.constant} debe iniciar con ${expectedCall}.`);
    }
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE|MERGE|FROM|JOIN|WHERE|TRUNCATE|DROP|ALTER)\b/i.test(query)) {
      fail(`${contract.constant} contiene SQL directo fuera de una llamada EXEC.`);
    }

    contract.parameters.forEach((parameter, index) => {
      const bindingPattern = new RegExp(
        `@${escapeRegex(parameter)}\\s*=\\s*@P${index + 1}\\b`,
        'i',
      );
      if (!bindingPattern.test(query)) {
        fail(
          `${contract.constant} debe enlazar @${parameter} con @P${index + 1}.`,
        );
      }
    });

    const placeholders = [...query.matchAll(/@P(\d+)\b/g)].map((match) =>
      Number(match[1]),
    );
    const expectedPlaceholders = contract.parameters.map((_, index) => index + 1);
    if (JSON.stringify(placeholders) !== JSON.stringify(expectedPlaceholders)) {
      fail(
        `${contract.constant} usa placeholders no secuenciales: ${placeholders.join(', ') || 'ninguno'}.`,
      );
    }

    const sqlPath = path.join(
      root,
      'database',
      'sps',
      `${contract.procedure}.sql`,
    );
    if (!fs.existsSync(sqlPath)) {
      fail(`No existe el procedimiento versionado database/sps/${contract.procedure}.sql.`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const alterPattern = new RegExp(
      `ALTER\\s+PROCEDURE\\s+ind\\.${escapeRegex(contract.procedure)}\\b`,
      'i',
    );
    if (!alterPattern.test(sql)) {
      fail(`${contract.procedure}.sql no declara ALTER PROCEDURE para el contrato esperado.`);
    }
    for (const parameter of contract.parameters) {
      if (!new RegExp(`@${escapeRegex(parameter)}\\b`, 'i').test(sql)) {
        fail(`${contract.procedure}.sql no declara @${parameter}.`);
      }
    }
    for (const fragment of contract.requiredSqlFragments || []) {
      if (!sql.toLowerCase().includes(fragment.toLowerCase())) {
        fail(`${contract.procedure}.sql no contiene el contrato requerido: ${fragment}.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('[SQLContractCheck] Validación rechazada:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `[SQLContractCheck] ${contracts.length} contratos validados localmente sin conectarse ni modificar SQL Server.`,
);
