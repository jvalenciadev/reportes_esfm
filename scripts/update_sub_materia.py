import openpyxl
import sqlite3
import json
import collections
import time
import os

XLSX = r'public\datos\Reporte_Deficit_Por_Materia_Oct2026.xlsx'
DB   = r'src\data\sie_materia.db'
OUT  = r'src\data\sie_materia_agrupado.json'

print("=" * 60)
print("1. ACTUALIZANDO sub_materia EN SQLITE sie_deficit_materia")
print("=" * 60)

t0 = time.time()
conn = sqlite3.connect(DB)
cur = conn.cursor()

wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb['Sheet1']

updates = []
non_empty_count = 0
empty_count = 0

for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
    row_id = i + 1
    sm = row[15] if len(row) > 15 else None
    if sm is not None:
        sm_str = str(sm).strip()
        if sm_str and sm_str.lower() != 'none':
            updates.append((sm_str, row_id))
            non_empty_count += 1
        else:
            updates.append((None, row_id))
            empty_count += 1
    else:
        updates.append((None, row_id))
        empty_count += 1

wb.close()
print(f"Total filas procesadas del Excel: {len(updates)}")
print(f"  Filas con sub_materia: {non_empty_count}")
print(f"  Filas vacías (NULL): {empty_count}")

# Ejecutar actualización en lote
cur.executemany("UPDATE sie_deficit_materia SET sub_materia = ? WHERE id = ?", updates)
conn.commit()
print(f"Actualización en SQLite completada en {time.time() - t0:.2f}s")

# Verificar en SQLite
cur.execute("SELECT COUNT(*) FROM sie_deficit_materia WHERE sub_materia IS NOT NULL AND TRIM(sub_materia) != ''")
count_db = cur.fetchone()[0]
print(f"Verificación en SQLite - filas con sub_materia: {count_db}")

cur.execute("SELECT id, materia, sub_materia, subsistema, nivel FROM sie_deficit_materia WHERE sub_materia IS NOT NULL LIMIT 5")
print("\nMuestra de filas con sub_materia en SQLite:")
for r in cur.fetchall():
    print(" ", r)

print("\n" + "=" * 60)
print("2. REGENERANDO sie_materia_agrupado.json")
print("=" * 60)

Key = collections.namedtuple('Key', ['m', 'sm', 's', 'n', 'd', 'dep'])

rows_db = cur.execute("""
    SELECT materia, COALESCE(sub_materia, ''), subsistema, nivel,
           cod_dep, departamento,
           hora_tra, hora_pla, deficit, cod_ue
    FROM sie_deficit_materia
    WHERE deficit > 0
""").fetchall()
conn.close()

agg = {}
for row in rows_db:
    mat, sm, subs, nivel, dep_id, dep_nom, carga, pla, def_, ue = row
    key = Key(
        m   = str(mat or '').upper().strip(),
        sm  = str(sm or '').strip(),
        s   = str(subs or '').upper().strip(),
        n   = str(nivel or '').upper().strip(),
        d   = int(dep_id),
        dep = str(dep_nom or '').upper().strip(),
    )
    if key not in agg:
        agg[key] = {'c': 0, 'p': 0, 'def': 0, 'u': set()}
    agg[key]['c']   += int(carga or 0)
    agg[key]['p']   += int(pla or 0)
    agg[key]['def'] += int(def_ or 0)
    agg[key]['u'].add(int(ue))

result = []
for key, val in agg.items():
    entry = {
        'm'  : key.m,
        's'  : key.s,
        'n'  : key.n,
        'd'  : key.d,
        'dep': key.dep,
        'c'  : val['c'],
        'p'  : val['p'],
        'def': val['def'],
        'u'  : list(val['u']),
    }
    if key.sm:
        entry['sm'] = key.sm
    result.append(entry)

result.sort(key=lambda x: (x['m'], x.get('sm', ''), x['s'], x['n'], x['d']))

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

print(f"sie_materia_agrupado.json generado: {len(result)} grupos.")
sm_groups = [r for r in result if 'sm' in r]
print(f"Grupos agregados con sub_materia: {len(sm_groups)}")
print("Muestra:")
for g in sm_groups[:5]:
    print(f"  {g['m']} | sm='{g['sm']}' | {g['s']} | {g['n']} | dep={g['dep']} | def={g['def']}")

