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
    'Prefer': 'return=minimal'
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'public', 'datos', 'Reporte_Deficit_Por_Materia_Oct2026.xlsx')

TEXT_GRADO_MAP = {
    'PRIMERO': 1, 'SEGUNDO': 2, 'TERCERO': 3,
    'CUARTO': 4, 'QUINTO': 5, 'SEXTO': 6
}

def post_batch(batch, batch_num, total_batches, retries=4):
    url = f"{SUPABASE_URL}/rest/v1/sie_deficit_materia"
    payload = json.dumps(batch).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=HEADERS, method='POST')

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status in (200, 201, 204):
                    return True, len(batch)
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', errors='ignore')
            if attempt == retries - 1:
                print(f"\n[Error {e.code}] Batch {batch_num}/{total_batches}: {err[:150]}")
                return False, 0
            time.sleep(1 + attempt * 2)
        except Exception as ex:
            if attempt == retries - 1:
                print(f"\n[Excepción] Batch {batch_num}/{total_batches}: {ex}")
                return False, 0
            time.sleep(1 + attempt * 2)
    return False, 0

def main():
    print("=" * 70)
    print("MIGRACIÓN MASIVA: Reporte_Deficit_Por_Materia_Oct2026.xlsx -> Supabase")
    print("=" * 70)

    if not os.path.exists(EXCEL_PATH):
        print(f"Error: no se encontró el archivo {EXCEL_PATH}")
        sys.exit(1)

    print(f"Cargando archivo Excel: {EXCEL_PATH}...")
    start_time = time.time()
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb.active

    records = []
    print("Parseando filas...")
    for i, r in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if r[0] is None:
            continue

        g_raw = r[9]
        g_val = None
        if g_raw is not None and str(g_raw).strip():
            s_g = str(g_raw).strip().upper()
            if s_g in TEXT_GRADO_MAP:
                g_val = TEXT_GRADO_MAP[s_g]
            else:
                try:
                    g_val = int(s_g)
                except ValueError:
                    g_val = None

        records.append({
            'cod_dep': int(r[0]),
            'departamento': str(r[1] or '').strip()[:50],
            'cod_dis': int(r[2]),
            'distrito': str(r[3] or '').strip()[:100],
            'area': str(r[4] or '').strip()[:10],
            'cod_ue': int(str(r[5]).strip()),
            'ue': str(r[6] or '').strip()[:255],
            'subsistema': str(r[7] or '').strip()[:100],
            'nivel': str(r[8] or '').strip()[:150],
            'grado': g_val,
            'paralelo': str(r[10] or '').strip()[:10] if r[10] else None,
            'materia': str(r[11] or '').strip()[:255],
            'hora_tra': int(r[12] or 0),
            'hora_pla': int(r[13] or 0)
        })

    wb.close()
    total_records = len(records)
    print(f"Total registros listos para insertar: {total_records:,} (tiempo parseo: {time.time() - start_time:.1f}s)")

    batch_size = 1000
    batches = [records[i:i + batch_size] for i in range(0, total_records, batch_size)]
    total_batches = len(batches)
    print(f"Dividido en {total_batches} lotes de hasta {batch_size} registros.")

    uploaded_rows = 0
    failed_batches = 0
    t_upload = time.time()

    # Ejecución con 6 hilos concurrentes
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(post_batch, batch, idx + 1, total_batches): idx
            for idx, batch in enumerate(batches)
        }

        completed = 0
        for future in as_completed(futures):
            completed += 1
            ok, count = future.result()
            if ok:
                uploaded_rows += count
            else:
                failed_batches += 1

            if completed % 10 == 0 or completed == total_batches:
                pct = (completed / total_batches) * 100
                elapsed = time.time() - t_upload
                rate = uploaded_rows / elapsed if elapsed > 0 else 0
                print(f"Progreso: {completed}/{total_batches} lotes ({pct:.1f}%) | {uploaded_rows:,} filas | {rate:.0f} filas/seg")

    total_time = time.time() - start_time
    print("=" * 70)
    print(f"MIGRACIÓN COMPLETADA en {total_time:.1f} segundos")
    print(f"Total filas subidas a Supabase: {uploaded_rows:,} / {total_records:,}")
    if failed_batches > 0:
        print(f"Lotes fallidos: {failed_batches}")
    print("=" * 70)

if __name__ == '__main__':
    main()

