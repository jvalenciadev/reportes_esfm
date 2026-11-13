import openpyxl
import urllib.request
import urllib.parse
import json
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = 'https://dwretdtwyqsltylvnvld.supabase.co'
SUPABASE_KEY = 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq'
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

XLSX = r'public\datos\Reporte_Deficit_Por_Materia_Oct2026.xlsx'

print("=" * 60)
print("ACTUALIZACIÓN SUPABASE: sub_materia en sie_deficit_materia")
print("=" * 60)

# 1. Descargar filas candidatas de Supabase
print("[1/3] Descargando filas de Técnica Tecnológica de Supabase...")
t0 = time.time()
supabase_rows = []
offset = 0
page_size = 1000

while True:
    q = urllib.parse.urlencode({
        'or': '(materia.eq.TÉCNICA TECNOLÓGICA,materia.eq.TÉCNICA TECNOLÓGICA GENERAL,materia.eq.TÉCNICA TECNOLÓGICA ESPECIALIZADA)',
        'select': 'id,cod_ue,materia,subsistema,nivel,grado,paralelo,hora_tra,hora_pla,sub_materia',
        'order': 'id.asc',
        'limit': page_size,
        'offset': offset
    })
    url = f"{SUPABASE_URL}/rest/v1/sie_deficit_materia?{q}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        batch = json.loads(resp.read().decode())
        supabase_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

print(f"Descargadas {len(supabase_rows):,} filas de Supabase en {time.time() - t0:.2f}s")

# Indexar Supabase por clave completa
supa_index = defaultdict(list)
supa_by_id = {}
for r in supabase_rows:
    supa_by_id[r['id']] = r
    g_str = str(r['grado']) if r['grado'] is not None else ''
    p_str = str(r['paralelo'] or '').strip().upper()
    key = (
        int(r['cod_ue']),
        str(r['materia'] or '').strip().upper(),
        str(r['subsistema'] or '').strip().upper(),
        str(r['nivel'] or '').strip().upper(),
        g_str,
        p_str,
        int(r['hora_tra'] or 0),
        int(r['hora_pla'] or 0)
    )
    supa_index[key].append(r['id'])

# 2. Leer Excel y detectar diferencias
print("\n[2/3] Comparando con Excel...")
TEXT_GRADO_MAP = {
    'PRIMERO': '1', 'SEGUNDO': '2', 'TERCERO': '3',
    'CUARTO': '4', 'QUINTO': '5', 'SEXTO': '6'
}

wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb['Sheet1']

available_ids = {k: list(v) for k, v in supa_index.items()}
to_update = defaultdict(list) # sm_str -> [ids]
already_correct = 0

for row in ws.iter_rows(min_row=2, values_only=True):
    sm = row[15] if len(row) > 15 else None
    sm_str = str(sm).strip() if sm is not None and str(sm).strip() and str(sm).lower() != 'none' else None

    g_raw = str(row[9] or '').strip().upper()
    g_str = TEXT_GRADO_MAP.get(g_raw, g_raw)
    p_str = str(row[10] or '').strip().upper()

    key = (
        int(str(row[5]).strip()),
        str(row[11] or '').strip().upper(),
        str(row[7] or '').strip().upper(),
        str(row[8] or '').strip().upper(),
        g_str,
        p_str,
        int(row[12] or 0),
        int(row[13] or 0)
    )

    ids = available_ids.get(key)
    if ids and len(ids) > 0:
        assigned_id = ids.pop(0)
        curr_supa_sm = supa_by_id[assigned_id].get('sub_materia')
        curr_supa_str = str(curr_supa_sm).strip() if curr_supa_sm else None
        
        if sm_str != curr_supa_str:
            to_update[sm_str].append(assigned_id)
        else:
            already_correct += 1

wb.close()
total_diff = sum(len(v) for v in to_update.values())
print(f"Filas con sub_materia ya idéntica en Supabase: {already_correct:,}")
print(f"Filas que requieren actualización (cambio o borrado): {total_diff:,}")

if total_diff == 0:
    print("Supabase ya se encuentra 100% sincronizado con el Excel.")
else:
    # 3. Aplicar actualizaciones
    print(f"\n[3/3] Aplicando {total_diff:,} actualizaciones en Supabase...")
    patch_tasks = []
    CHUNK = 80
    for sm_val, id_list in to_update.items():
        for i in range(0, len(id_list), CHUNK):
            chunk = id_list[i:i + CHUNK]
            patch_tasks.append((sm_val, chunk))

    def execute_patch(task):
        sm_val, ids = task
        id_in_str = ','.join(str(x) for x in ids)
        url = f"{SUPABASE_URL}/rest/v1/sie_deficit_materia?id=in.({id_in_str})"
        payload = json.dumps({'sub_materia': sm_val}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers=headers, method='PATCH')
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status in (200, 204):
                        return True, len(ids)
            except Exception as e:
                if attempt == 3:
                    print(f"Error PATCH: {e}")
                    return False, 0
                time.sleep(1 + attempt)
        return False, 0

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(execute_patch, t): t for t in patch_tasks}
        completed = 0
        updated_rows = 0
        for f in as_completed(futures):
            completed += 1
            ok, count = f.result()
            if ok:
                updated_rows += count
            if completed % 10 == 0 or completed == len(patch_tasks):
                print(f"  Progreso: {completed}/{len(patch_tasks)} lotes | {updated_rows:,} filas")

    print(f"Actualización completada: {updated_rows:,} / {total_diff:,} filas modificadas en Supabase.")

print("=" * 60)
print("SINCRONIZACIÓN COMPLETA")
print("=" * 60)
