"""
build_historial_db.py
Ingesta -UIEhistorial2024-2026.xlsx → SQLite historial.db
Genera 3 reportes:
  1. Salientes/Entrantes de planilla 2024→2025 por departamento
  2. Impertinencias por departamento (2026)
  3. Maestros sin cargo (2025)

Run: python3 scripts/build_historial_db.py
"""

import sqlite3
import openpyxl
import json
from pathlib import Path

EXCEL = Path("public/datos/-UIEhistorial2024-2026.xlsx")
DB    = Path("src/data/historial.db")

def clean(val):
    if val is None:
        return ""
    return str(val).strip()

def clean_int(val):
    try:
        return int(val)
    except:
        return None

# ─── Load workbook ────────────────────────────────────────────────────────────
print("Abriendo Excel…")
wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)

# ─── SQLite setup ─────────────────────────────────────────────────────────────
DB.parent.mkdir(parents=True, exist_ok=True)
con = sqlite3.connect(DB)
cur = con.cursor()

cur.executescript("""
DROP TABLE IF EXISTS hist_2024;
DROP TABLE IF EXISTS hist_2025;
DROP TABLE IF EXISTS hist_2026;

CREATE TABLE hist_2024 (
    ci          INTEGER,
    cargo       TEXT,
    categoria   TEXT,
    subsistema  TEXT,
    area        TEXT,
    nivel       TEXT,
    en_funcion  TEXT,
    anio_egreso INTEGER,
    carga_horaria INTEGER,
    departamento TEXT
);

CREATE TABLE hist_2025 (
    ci          INTEGER,
    cargo       TEXT,
    categoria   TEXT,
    subsistema  TEXT,
    area        TEXT,
    nivel       TEXT,
    en_funcion  TEXT,
    anio_egreso INTEGER,
    carga_horaria INTEGER,
    departamento TEXT
);

CREATE TABLE hist_2026 (
    departamento TEXT,
    horas        INTEGER,
    ci           INTEGER,
    cargo        TEXT,
    pertinencia  TEXT,
    p2022        INTEGER,
    p2023        INTEGER,
    p2024        INTEGER,
    p2025        INTEGER,
    p2026        INTEGER,
    area         TEXT,
    discapacidad TEXT,
    especialidad TEXT
);
""")
con.commit()

# ─── Ingest 2024 ─────────────────────────────────────────────────────────────
print("Cargando 2024…")
ws24 = wb['2024']
rows24 = []
for row in ws24.iter_rows(min_row=2, values_only=True):
    ci = clean_int(row[0])
    if ci is None:
        continue
    rows24.append((
        ci,
        clean(row[1]),  # cargo
        clean(row[2]),  # categoria
        clean(row[3]),  # subsistema
        clean(row[4]),  # area
        clean(row[5]),  # nivel
        clean(row[6]),  # en_funcion
        clean_int(row[7]),  # anio_egreso
        clean_int(row[8]),  # carga_horaria
        clean(row[9]),  # departamento
    ))
cur.executemany("INSERT INTO hist_2024 VALUES (?,?,?,?,?,?,?,?,?,?)", rows24)
con.commit()
print(f"  → {len(rows24)} filas 2024")

# ─── Ingest 2025 ─────────────────────────────────────────────────────────────
print("Cargando 2025…")
ws25 = wb['2025']
rows25 = []
for row in ws25.iter_rows(min_row=2, values_only=True):
    ci = clean_int(row[0])
    if ci is None:
        continue
    rows25.append((
        ci,
        clean(row[1]),
        clean(row[2]),
        clean(row[3]),
        clean(row[4]),
        clean(row[5]),
        clean(row[6]),
        clean_int(row[7]),
        clean_int(row[8]),
        clean(row[9]),
    ))
cur.executemany("INSERT INTO hist_2025 VALUES (?,?,?,?,?,?,?,?,?,?)", rows25)
con.commit()
print(f"  → {len(rows25)} filas 2025")

# ─── Ingest 2026 ─────────────────────────────────────────────────────────────
print("Cargando 2026…")
ws26 = wb['2026']
rows26 = []
for row in ws26.iter_rows(min_row=2, values_only=True):
    ci = clean_int(row[2])
    if ci is None:
        continue
    rows26.append((
        clean(row[0]),   # departamento
        clean_int(row[1]),  # horas
        ci,              # carnet/ci
        clean(row[3]),   # cargo
        clean(row[4]),   # pertinencia
        clean_int(row[5]),  # 2022
        clean_int(row[6]),  # 2023
        clean_int(row[7]),  # 2024
        clean_int(row[8]),  # 2025
        clean_int(row[9]),  # 2026
        clean(row[10]),  # area
        clean(row[11]),  # discapacidad
        clean(row[12]),  # especialidad
    ))
cur.executemany("INSERT INTO hist_2026 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows26)
con.commit()
print(f"  → {len(rows26)} filas 2026")

wb.close()

# ─── Indexes ─────────────────────────────────────────────────────────────────
print("Creando índices…")
cur.executescript("""
CREATE INDEX IF NOT EXISTS idx24_ci   ON hist_2024(ci);
CREATE INDEX IF NOT EXISTS idx24_dep  ON hist_2024(departamento);
CREATE INDEX IF NOT EXISTS idx24_sub  ON hist_2024(subsistema);
CREATE INDEX IF NOT EXISTS idx25_ci   ON hist_2025(ci);
CREATE INDEX IF NOT EXISTS idx25_dep  ON hist_2025(departamento);
CREATE INDEX IF NOT EXISTS idx25_sub  ON hist_2025(subsistema);
CREATE INDEX IF NOT EXISTS idx26_ci   ON hist_2026(ci);
CREATE INDEX IF NOT EXISTS idx26_dep  ON hist_2026(departamento);
CREATE INDEX IF NOT EXISTS idx26_per  ON hist_2026(pertinencia);
""")
con.commit()

# ─────────────────────────────────────────────────────────────────────────────
# REPORTE 1: Salientes / Entrantes 2024→2025
# - Saliente: CI en 2024 pero NO en 2025
# - Entrante: CI en 2025 pero NO en 2024
# Filtrado por SUBSISTEMA = REGULAR (ambos años)
# ─────────────────────────────────────────────────────────────────────────────
print("\nCalculando Reporte 1: Salientes/Entrantes…")

# CIs en REGULAR 2024
cur.execute("SELECT DISTINCT ci FROM hist_2024 WHERE subsistema = 'REGULAR'")
ci_2024 = set(r[0] for r in cur.fetchall())

# CIs en REGULAR 2025
cur.execute("SELECT DISTINCT ci FROM hist_2025 WHERE subsistema = 'REGULAR'")
ci_2025 = set(r[0] for r in cur.fetchall())

salientes_ci = ci_2024 - ci_2025  # estaban en 2024, no en 2025
entrantes_ci = ci_2025 - ci_2024  # están en 2025, no estaban en 2024

print(f"  Salientes (CI): {len(salientes_ci)}")
print(f"  Entrantes (CI): {len(entrantes_ci)}")

# Por departamento de salientes: usar su dpto en 2024
cur.execute("""
    SELECT departamento, COUNT(DISTINCT ci) as total
    FROM hist_2024
    WHERE subsistema = 'REGULAR'
      AND ci IN ({})
    GROUP BY departamento
    ORDER BY departamento
""".format(",".join("?" * len(salientes_ci))), list(salientes_ci))
salientes_por_dpto = [{"departamento": r[0], "salientes": r[1]} for r in cur.fetchall()]

# Por departamento de entrantes: usar su dpto en 2025
cur.execute("""
    SELECT departamento, COUNT(DISTINCT ci) as total
    FROM hist_2025
    WHERE subsistema = 'REGULAR'
      AND ci IN ({})
    GROUP BY departamento
    ORDER BY departamento
""".format(",".join("?" * len(entrantes_ci))), list(entrantes_ci))
entrantes_por_dpto_raw = {r[0]: r[1] for r in cur.fetchall()}

# Merge
dpto_set = set(r["departamento"] for r in salientes_por_dpto) | set(entrantes_por_dpto_raw.keys())
reporte1 = []
for d in sorted(dpto_set):
    sal = next((r["salientes"] for r in salientes_por_dpto if r["departamento"] == d), 0)
    ent = entrantes_por_dpto_raw.get(d, 0)
    reporte1.append({
        "departamento": d,
        "salientes_2024_2025": sal,
        "entrantes_2024_2025": ent,
        "neto": ent - sal
    })

# Totales nacionales
cur.execute("SELECT COUNT(DISTINCT ci) FROM hist_2024 WHERE subsistema='REGULAR'")
total_2024 = cur.fetchone()[0]
cur.execute("SELECT COUNT(DISTINCT ci) FROM hist_2025 WHERE subsistema='REGULAR'")
total_2025 = cur.fetchone()[0]

reporte1_summary = {
    "total_regular_2024": total_2024,
    "total_regular_2025": total_2025,
    "total_salientes": len(salientes_ci),
    "total_entrantes": len(entrantes_ci),
    "por_departamento": reporte1
}

# ─────────────────────────────────────────────────────────────────────────────
# REPORTE 2: Impertinencias por departamento (2026)
# - Pertinencia = 'NO' en hist_2026
# ─────────────────────────────────────────────────────────────────────────────
print("\nCalculando Reporte 2: Impertinencias…")

cur.execute("""
    SELECT departamento, COUNT(*) as total_docentes,
           SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) as impertinentes
    FROM hist_2026
    GROUP BY departamento
    ORDER BY departamento
""")
reporte2_rows = cur.fetchall()

cur.execute("SELECT COUNT(*), SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) FROM hist_2026")
tot_all, tot_impert = cur.fetchone()

reporte2 = {
    "total_docentes_2026": tot_all,
    "total_impertinentes": tot_impert,
    "por_departamento": [
        {
            "departamento": r[0],
            "total_docentes": r[1],
            "impertinentes": r[2],
            "porcentaje": round(r[2] / r[1] * 100, 2) if r[1] > 0 else 0
        }
        for r in reporte2_rows
    ]
}

# ─────────────────────────────────────────────────────────────────────────────
# REPORTE 3: Maestros sin cargo (2025 REGULAR)
# cargo vacío o solo espacios
# ─────────────────────────────────────────────────────────────────────────────
print("\nCalculando Reporte 3: Sin cargo…")

cur.execute("""
    SELECT departamento, COUNT(DISTINCT ci) as sin_cargo
    FROM hist_2025
    WHERE subsistema = 'REGULAR'
      AND (cargo IS NULL OR TRIM(cargo) = '')
    GROUP BY departamento
    ORDER BY departamento
""")
reporte3_rows = cur.fetchall()

cur.execute("""
    SELECT COUNT(DISTINCT ci)
    FROM hist_2025
    WHERE subsistema = 'REGULAR'
      AND (cargo IS NULL OR TRIM(cargo) = '')
""")
total_sin_cargo = cur.fetchone()[0]

# Also check sin_funcion (en_funcion = NO or SI)
cur.execute("""
    SELECT en_funcion, COUNT(DISTINCT ci)
    FROM hist_2025
    WHERE subsistema = 'REGULAR'
      AND (cargo IS NULL OR TRIM(cargo) = '')
    GROUP BY en_funcion
""")
sin_cargo_por_funcion = {r[0]: r[1] for r in cur.fetchall()}

reporte3 = {
    "total_sin_cargo_regular_2025": total_sin_cargo,
    "sin_cargo_por_funcion": sin_cargo_por_funcion,
    "por_departamento": [
        {"departamento": r[0], "sin_cargo": r[1]}
        for r in reporte3_rows
    ]
}

# ─── Save to JSON ─────────────────────────────────────────────────────────────
output = {
    "salientes_entrantes": reporte1_summary,
    "impertinencias": reporte2,
    "sin_cargo": reporte3
}

out_path = Path("src/data/historial_reportes.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

con.close()

print(f"\n✅ DB: {DB}")
print(f"✅ JSON: {out_path}")
print("\n=== RESUMEN ===")
print(f"Regular 2024: {total_2024:,} docentes")
print(f"Regular 2025: {total_2025:,} docentes")
print(f"Salientes: {len(salientes_ci):,}")
print(f"Entrantes: {len(entrantes_ci):,}")
print(f"Impertinentes 2026: {tot_impert:,} / {tot_all:,}")
print(f"Sin cargo 2025: {total_sin_cargo:,}")
