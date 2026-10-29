"""
Genera el script SQL para migrar ine_proyeccion_edad con el campo departamento_id.
Uso: python scripts/migrate_ine_proyeccion_edad_v2.py
Salida: scripts/ine_proyeccion_edad_v2.sql  (ejecutar en Supabase SQL Editor)
        src/data/fallbackData.json           (actualizado con los nuevos datos)
"""
import os, json, openpyxl

EXCEL = os.path.join('public', 'datos', '-INE PROYECCION POR EDAD 2024-2034.xlsx')
SQL_OUT = os.path.join('scripts', 'ine_proyeccion_edad_v2.sql')
JSON_OUT = os.path.join('src', 'data', 'fallbackData.json')

# Mapa nombre -> id (según tabla departamentos de Supabase)
DEPT_ID = {
    'chuquisaca': 1,
    'la paz':     2,
    'cochabamba': 3,
    'oruro':      4,
    'potosi':     5,
    'potosí':     5,
    'tarija':     6,
    'santa cruz': 7,
    'beni':       8,
    'pando':      9,
}

print(f"Leyendo {EXCEL}...")
wb = openpyxl.load_workbook(EXCEL, data_only=True)
sh = wb.active

rows = []
skipped = 0
for r in range(2, sh.max_row + 1):
    edad_val = sh.cell(r, 1).value
    cant_val = sh.cell(r, 2).value
    anio_val = sh.cell(r, 3).value
    dept_val = sh.cell(r, 4).value

    if edad_val is None or cant_val is None or anio_val is None:
        skipped += 1
        continue

    edad = int(edad_val)
    cant = int(cant_val)
    anio = int(anio_val)
    dept_name = str(dept_val).strip() if dept_val else ''
    dept_id = DEPT_ID.get(dept_name.lower())

    if dept_id is None:
        print(f"  ADVERTENCIA: departamento no reconocido '{dept_name}' en fila {r}")
        skipped += 1
        continue

    rows.append({'edad': edad, 'cantidad': cant, 'anio': anio, 'departamento_id': dept_id, '_dept_name': dept_name})

print(f"Total filas válidas: {len(rows)} | Saltadas: {skipped}")

# Resumen por departamento
from collections import Counter
by_dept = Counter(r['_dept_name'] for r in rows)
for dept, n in sorted(by_dept.items()):
    print(f"  {dept}: {n} filas")

# Generar SQL de migración
print(f"\nGenerando {SQL_OUT}...")
sql_lines = [
    "-- ========================================================",
    "-- MIGRACIÓN: ine_proyeccion_edad → añadir departamento_id",
    "-- Ejecutar en Supabase SQL Editor (una sola vez)",
    "-- ========================================================",
    "",
    "-- PASO 1: Añadir columna departamento_id (FK a departamentos)",
    "ALTER TABLE public.ine_proyeccion_edad",
    "  ADD COLUMN IF NOT EXISTS departamento_id INT REFERENCES public.departamentos(id);",
    "",
    "-- PASO 2: Limpiar datos anteriores (eran de un solo departamento)",
    "TRUNCATE TABLE public.ine_proyeccion_edad RESTART IDENTITY;",
    "",
    "-- PASO 3: Insertar todos los datos correctos por departamento",
    "-- Total: {} filas · 9 departamentos · años 2024-2034".format(len(rows)),
]

# Insertar en bloques de 500
CHUNK = 500
for i in range(0, len(rows), CHUNK):
    chunk = rows[i:i + CHUNK]
    vals = ',\n'.join(
        f"({r['edad']}, {r['cantidad']}, {r['anio']}, {r['departamento_id']})"
        for r in chunk
    )
    sql_lines.append(f"INSERT INTO public.ine_proyeccion_edad (edad, cantidad, anio, departamento_id) VALUES")
    sql_lines.append(vals + ";")
    sql_lines.append("")

sql_lines.append("-- PASO 4: Crear índice compuesto para búsquedas rápidas")
sql_lines.append("CREATE INDEX IF NOT EXISTS idx_ine_proy_edad_anio_dept")
sql_lines.append("  ON public.ine_proyeccion_edad (anio, departamento_id, edad);")
sql_lines.append("")
sql_lines.append("-- Verificación")
sql_lines.append("SELECT departamento_id, anio, COUNT(*) FROM public.ine_proyeccion_edad GROUP BY 1,2 ORDER BY 1,2;")

with open(SQL_OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))
print(f"  SQL escrito: {SQL_OUT}")

# Actualizar fallbackData.json
print(f"\nActualizando {JSON_OUT}...")
with open(JSON_OUT, 'r', encoding='utf-8') as f:
    fb = json.load(f)

fb['ine_proyeccion_edad'] = [
    {'id': idx + 1, 'edad': r['edad'], 'cantidad': r['cantidad'],
     'anio': r['anio'], 'departamento_id': r['departamento_id']}
    for idx, r in enumerate(rows)
]

with open(JSON_OUT, 'w', encoding='utf-8') as f:
    json.dump(fb, f, ensure_ascii=False, separators=(',', ':'))

print(f"  fallbackData.json actualizado con {len(rows)} registros de ine_proyeccion_edad.")
print("\nLISTO.")
print("  1. Ejecuta el SQL en Supabase: scripts/ine_proyeccion_edad_v2.sql")
print("  2. Haz git push para redesplegar en Vercel.")

