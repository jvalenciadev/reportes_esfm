#!/opt/homebrew/bin/python3
import os
import sys
import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
import openpyxl

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', 'https://dwretdtwyqsltylvnvld.supabase.co')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq')

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'public', 'datos', 'sich subir.xlsx')

DEPT_MAP = {
    'CHUQUISACA': 1, 'LA PAZ': 2, 'COCHABAMBA': 3,
    'ORURO': 4, 'POTOSI': 5, 'TARIJA': 6,
    'SANTA CRUZ': 7, 'BENI': 8, 'PANDO': 9
}

DEPT_NAMES = {
    1: 'Chuquisaca', 2: 'La Paz', 3: 'Cochabamba',
    4: 'Oruro', 5: 'Potosí', 6: 'Tarija',
    7: 'Santa Cruz', 8: 'Beni', 9: 'Pando'
}

def post_batch(table, rows, retries=3):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method='POST')
    
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.status in (200, 201, 204)
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8')
            if attempt == retries - 1:
                print(f"\n[Error {e.code}] en {table}: {err[:150]}")
                return False
            time.sleep(1 + attempt)
        except Exception as ex:
            if attempt == retries - 1:
                print(f"\n[Excepcion] en {table}: {ex}")
                return False
            time.sleep(1 + attempt)
    return False

def check_table_ready(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1"
    req = urllib.request.Request(url, headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False

def main():
    print("=== MIGRACIÓN SIE UNIDADES EDUCATIVAS A SUPABASE ===")
    
    if not check_table_ready('unidad_educativa'):
        print("\n❌ La tabla 'unidad_educativa' NO EXISTE en Supabase todavía.")
        sys.exit(1)
        
    print("✅ Tablas detectadas en Supabase (unidad_educativa y sie_unidad_educativa activas).")
    print(f"Leyendo Excel: {EXCEL_PATH}...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb.active

    ues_dict = {}
    detalles = []

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or not any(row):
            continue
        raw_dept = str(row[0]).strip().upper() if row[0] else ''
        dept_id = DEPT_MAP.get(raw_dept, 0)
        dept_name = DEPT_NAMES.get(dept_id, raw_dept)
        ue_nombre = str(row[1]).strip() if row[1] else ''
        dependencia = str(row[2]).strip().upper() if row[2] else 'FISCAL'
        try:
            cod_ue = int(row[3])
        except Exception:
            continue
        subsistema = str(row[4]).strip() if row[4] else ''
        nivel = str(row[5]).strip() if row[5] else ''
        est = int(row[6]) if row[6] else 0
        par = int(row[7]) if row[7] else 0
        carga = int(row[8]) if row[8] else 0
        plan = int(row[9]) if row[9] else 0

        if cod_ue not in ues_dict:
            ues_dict[cod_ue] = {
                'cod_ue': cod_ue,
                'unidad_educativa': ue_nombre,
                'departamento_id': dept_id,
                'departamento': dept_name,
                'dependencia': dependencia
            }

        detalles.append({
            'cod_ue': cod_ue,
            'departamento_id': dept_id,
            'departamento': dept_name,
            'unidad_educativa': ue_nombre,
            'dependencia': dependencia,
            'subsistema': subsistema,
            'nivel': nivel,
            'nro_estudiantes': est,
            'total_paralelos': par,
            'carga_horaria': carga,
            'horas_planilla': plan
        })

    # Paso 1: Subir catálogo maestro unidad_educativa en paralelo
    print(f"\n1. Subiendo catálogo de {len(ues_dict)} Unidades Educativas...")
    ue_list = list(ues_dict.values())
    batch_size = 500
    batches_ue = [ue_list[i:i + batch_size] for i in range(0, len(ue_list), batch_size)]
    
    total_ue_uploaded = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(post_batch, 'unidad_educativa', b): len(b) for b in batches_ue}
        for future in as_completed(futures):
            count = futures[future]
            if future.result():
                total_ue_uploaded += count
                pct = (total_ue_uploaded / len(ue_list)) * 100
                print(f"\r   Progreso UEs: {total_ue_uploaded}/{len(ue_list)} ({pct:.1f}%)", end='', flush=True)

    print(f"\n✅ Catálogo completado: {total_ue_uploaded} Unidades Educativas registradas.")

    # Paso 2: Subir detalle sie_unidad_educativa en paralelo
    print(f"\n2. Subiendo {len(detalles)} registros de carga horaria (Lotes de 500)...")
    batches_det = [detalles[i:i + batch_size] for i in range(0, len(detalles), batch_size)]
    
    total_det_uploaded = 0
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(post_batch, 'sie_unidad_educativa', b): len(b) for b in batches_det}
        for future in as_completed(futures):
            count = futures[future]
            if future.result():
                total_det_uploaded += count
                elapsed = time.time() - start_time
                pct = (total_det_uploaded / len(detalles)) * 100
                rate = total_det_uploaded / elapsed if elapsed > 0 else 0
                print(f"\r   Progreso Detalle: {total_det_uploaded:,}/{len(detalles):,} ({pct:.1f}%) - {rate:.0f} reg/s", end='', flush=True)

    elapsed_total = time.time() - start_time
    print(f"\n🎉 ¡MIGRACIÓN COMPLETADA! Total registros subidos: {total_det_uploaded:,} en {elapsed_total:.1f}s")

if __name__ == '__main__':
    main()
