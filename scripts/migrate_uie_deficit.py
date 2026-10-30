import openpyxl
import json
import os
import urllib.request
import urllib.error
import time

DEPT_MAP = {
    'chuquisaca': 1,
    'la paz': 2,
    'cochabamba': 3,
    'oruro': 4,
    'potosi': 5,
    'potosí': 5,
    'tarija': 6,
    'santa cruz': 7,
    'beni': 8,
    'pando': 9,
}

DEPT_NAMES = {
    1: 'Chuquisaca',
    2: 'La Paz',
    3: 'Cochabamba',
    4: 'Oruro',
    5: 'Potosí',
    6: 'Tarija',
    7: 'Santa Cruz',
    8: 'Beni',
    9: 'Pando',
}

def clean_str(val):
    if val is None:
        return ''
    return str(val).strip()

def parse_int(val):
    if val is None:
        return 0
    try:
        return int(float(str(val).strip().replace(',', '.')))
    except Exception:
        return 0

def escape_sql(val):
    if val is None:
        return "''"
    s = str(val).replace("'", "''")
    return f"'{s}'"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
excel_path = os.path.join(BASE_DIR, 'public', 'datos', '- UIE UNIDAD EDUCATIVA DEFICIT.xlsx')

print(f'1. Leyendo Excel: {excel_path}...')
wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active

records = []
for r_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    gestion = parse_int(row[0])
    raw_dept = clean_str(row[1])
    dept_id = DEPT_MAP.get(raw_dept.lower(), 0)
    dept_name = DEPT_NAMES.get(dept_id, raw_dept)
    dependencia = clean_str(row[2])
    subsistema = clean_str(row[3])
    nivel = clean_str(row[4])
    cargo = clean_str(row[5])
    horas_trabajadas = parse_int(row[6])
    horas_planilla = parse_int(row[7])
    deficit_horas = horas_trabajadas - horas_planilla

    records.append({
        'gestion': gestion,
        'departamento_id': dept_id,
        'departamento': dept_name,
        'dependencia': dependencia,
        'subsistema': subsistema,
        'nivel': nivel,
        'cargo': cargo,
        'horas_trabajadas': horas_trabajadas,
        'horas_planilla': horas_planilla,
        'deficit_horas': deficit_horas,
    })

total = len(records)
print(f'   Total registros procesados: {total}')

# 2. Generar scripts/uie_deficit_horas.sql (con inserts de 1000 en 1000)
sql_path = os.path.join(BASE_DIR, 'scripts', 'uie_deficit_horas.sql')
print(f'2. Generando script SQL por lotes de 1000: {sql_path}...')

batch_size = 1000
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write('''-- ==============================================================================
-- TABLA: UIE DEFICIT DE HORAS / CARGA HORARIA VS PLANILLA (2021 - 2025)
-- 17,274 registros organizados en lotes de 1000 para Supabase SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.uie_deficit_horas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gestion INT NOT NULL,
    departamento_id INT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    departamento VARCHAR(50) NOT NULL,
    dependencia VARCHAR(50) NOT NULL,
    subsistema VARCHAR(100) NOT NULL,
    nivel VARCHAR(150) NOT NULL,
    cargo VARCHAR(150) NOT NULL,
    horas_trabajadas INT NOT NULL,
    horas_planilla INT NOT NULL,
    deficit_horas INT NOT NULL
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_uie_deficit_gestion_dept ON public.uie_deficit_horas(gestion, departamento_id);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_subsistema ON public.uie_deficit_horas(subsistema, nivel);
CREATE INDEX IF NOT EXISTS idx_uie_deficit_dependencia ON public.uie_deficit_horas(dependencia);

-- RLS y permisos
ALTER TABLE public.uie_deficit_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all" ON public.uie_deficit_horas;
CREATE POLICY "allow_anon_all" ON public.uie_deficit_horas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Limpieza previa para idempotencia
TRUNCATE TABLE public.uie_deficit_horas RESTART IDENTITY CASCADE;

''')

    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size
        f.write(f'-- LOTE {batch_num} de {total_batches} ({len(chunk)} registros: del {i+1} al {i+len(chunk)})\n')
        f.write('INSERT INTO public.uie_deficit_horas (gestion, departamento_id, departamento, dependencia, subsistema, nivel, cargo, horas_trabajadas, horas_planilla, deficit_horas) VALUES\n')
        values_lines = []
        for r in chunk:
            line = f"  ({r['gestion']}, {r['departamento_id']}, {escape_sql(r['departamento'])}, {escape_sql(r['dependencia'])}, {escape_sql(r['subsistema'])}, {escape_sql(r['nivel'])}, {escape_sql(r['cargo'])}, {r['horas_trabajadas']}, {r['horas_planilla']}, {r['deficit_horas']})"
            values_lines.append(line)
        f.write(',\n'.join(values_lines))
        f.write(';\n\n')

print(f'   Archivo SQL generado exitosamente ({os.path.getsize(sql_path):,} bytes).')

# 3. Intentar subir por REST API en lotes de 1000
SUPABASE_URL = 'https://dwretdtwyqsltylvnvld.supabase.co'
SUPABASE_KEY = 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print('3. Verificando disponibilidad de tabla en Supabase REST API...')
check_url = f'{SUPABASE_URL}/rest/v1/uie_deficit_horas?select=id&limit=1'
req_check = urllib.request.Request(check_url, headers=headers)

table_ready = False
try:
    with urllib.request.urlopen(req_check) as resp:
        print('   Tabla public.uie_deficit_horas DETECTADA en Supabase.')
        table_ready = True
except urllib.error.HTTPError as e:
    if e.code == 404:
        print('   AVISO: La tabla aún no existe en Supabase (HTTP 404).')
        print('   Se requiere ejecutar el DDL en Supabase SQL Editor una sola vez.')
    else:
        print(f'   Respuesta inesperada al verificar tabla: HTTP {e.code}')
except Exception as e:
    print(f'   Error de conexión: {e}')

if table_ready:
    print(f'4. Iniciando migración de {total} filas en lotes de {batch_size} a Supabase...')
    inserted = 0
    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size
        
        url_post = f'{SUPABASE_URL}/rest/v1/uie_deficit_horas'
        payload = json.dumps(chunk).encode('utf-8')
        req_post = urllib.request.Request(url_post, data=payload, headers=headers, method='POST')
        
        success = False
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req_post) as resp:
                    if resp.status in (200, 201, 204):
                        inserted += len(chunk)
                        print(f'   [Lote {batch_num}/{total_batches}] {len(chunk)} registros insertados ({inserted}/{total}).')
                        success = True
                        break
            except Exception as ex:
                print(f'   Error en lote {batch_num} (intento {attempt+1}): {ex}')
                time.sleep(1)
        if not success:
            print(f'   FALLO crítico en lote {batch_num}. Deteniendo.')
            break
    print(f'Migración finalizada: {inserted} de {total} registros migrados.')

