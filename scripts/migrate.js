// Script de migración v2 — usa extract_data.py como fuente de datos limpia (UTF-8)
// Soporta tabla esfm como catálogo y corrección de tildes

const { ProxyAgent, setGlobalDispatcher, fetch } = require('undici');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

setGlobalDispatcher(new ProxyAgent('http://10.20.30.2:3128'));

const SUPABASE_URL = 'https://dwretdtwyqsltylvnvld.supabase.co';
const SUPABASE_KEY = 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function supabaseInsert(table, rows) {
  if (!rows || rows.length === 0) return { ok: true };
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `${res.status}: ${body.substring(0, 300)}` };
  }
  return { ok: true };
}

async function supabaseCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, {
    headers: { ...headers, 'Prefer': 'count=exact' }
  });
  return res.headers.get('content-range')?.split('/')[1] ?? '?';
}

async function supabaseDeleteAll(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=gt.0`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers
  });
  return res.ok;
}

async function insertInChunks(table, rows, chunkSize = 300) {
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await supabaseInsert(table, chunk);
    if (!res.ok) {
      console.error(`\n  ❌ ERROR en ${table} [chunk ${Math.floor(i / chunkSize) + 1}]: ${res.error}`);
      return false;
    }
    total += chunk.length;
    process.stdout.write(`\r  ${table}: ${total}/${rows.length} ...`);
  }
  process.stdout.write(`\r  ${table}: ${rows.length}/${rows.length} ✓\n`);
  return true;
}

async function main() {
  console.log('\n=== ESFM Admisión — Migración v2 (UTF-8 corregido) ===\n');

  // [0] Verificar conexión
  console.log('[0] Verificando conexión...');
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  if (testRes.status === 200 || testRes.status === 401) {
    console.log(`    OK (status ${testRes.status})\n`);
  } else {
    console.error('    Error de conexión. Abortando.');
    process.exit(1);
  }

  // [1] Extraer datos con Python (UTF-8 directo a archivo)
  console.log('[1] Extrayendo datos limpios de los archivos Excel...');
  const dataFile = path.join(__dirname, '_data_out.json');
  const pyScript = path.join(__dirname, 'extract_data.py');

  execSync(`python "${pyScript}" --out "${dataFile}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'inherit'] // stderr va a consola
  });

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const tableNames = Object.keys(data).filter(k => !k.startsWith('_'));
  tableNames.forEach(t => console.log(`  ${t}: ${data[t].length} registros`));

  // [2] Catálogos
  const departamentos = [
    { id: 1, nombre: 'Chuquisaca', codigo: 'CH' },
    { id: 2, nombre: 'La Paz', codigo: 'LP' },
    { id: 3, nombre: 'Cochabamba', codigo: 'CB' },
    { id: 4, nombre: 'Oruro', codigo: 'OR' },
    { id: 5, nombre: 'Potosí', codigo: 'PT' },
    { id: 6, nombre: 'Tarija', codigo: 'TJ' },
    { id: 7, nombre: 'Santa Cruz', codigo: 'SC' },
    { id: 8, nombre: 'Beni', codigo: 'BN' },
    { id: 9, nombre: 'Pando', codigo: 'PD' }
  ];

  console.log('\n[2] Subiendo catálogos...');
  await insertInChunks('departamentos', departamentos, 50);
  await insertInChunks('especialidades', data.especialidades, 50);
  await insertInChunks('esfm', data.esfm, 50);

  console.log('\n[3] Limpiando tablas de datos previas...');
  const dataTableNames = [
    'inscritos_esfm',
    'sie_total_estudiantes',
    'ine_matricula',
    'discapacidad_seie',
    'ine_poblacion',
    'ine_proyeccion_edad',
    'matricula_rural_urbana'
  ];
  for (const t of dataTableNames) {
    await supabaseDeleteAll(t);
  }

  console.log('\n[4] Subiendo tablas de datos limpias...');
  const tables = [
    ['discapacidad_seie', data.discapacidad_seie],
    ['ine_matricula', data.ine_matricula],
    ['ine_poblacion', data.ine_poblacion],
    ['ine_proyeccion_edad', data.ine_proyeccion_edad],
    ['inscritos_esfm', data.inscritos_esfm],
    ['matricula_rural_urbana', data.matricula_rural_urbana],
    ['sie_total_estudiantes', data.sie_total_estudiantes],
  ];

  let allOk = true;
  for (const [table, rows] of tables) {
    const ok = await insertInChunks(table, rows, 300);
    if (!ok) allOk = false;
  }

  console.log('\n[5] Verificando conteos finales en Supabase...');
  const allTables = ['departamentos', 'especialidades', 'esfm', ...tables.map(t => t[0])];
  for (const t of allTables) {
    const count = await supabaseCount(t);
    console.log(`  ${t}: ${count} registros`);
  }

  console.log(allOk ? '\n✅ Migración completada sin errores.\n' : '\n⚠️  Migración completada con errores. Revisa los mensajes anteriores.\n');
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
