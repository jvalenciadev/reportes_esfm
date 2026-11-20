"""
Build migracion_data.json from:
  - migracion_planilla_2024_2025_2026.xls (2124 docentes que migraron entre deptos)
  - entrantes_salientes.xlsx (46325 docentes, movimientos completos)
"""
import pandas as pd
import json
from collections import defaultdict

# ── 1. ENTRANTES/SALIENTES ─────────────────────────────────────────────────
df_e = pd.read_excel('public/datos/entrantes_salientes.xlsx', engine='openpyxl')

# Limpiar filas con valores numéricos en columna movimiento (son errores de data)
VALID_MOV = {'CONTINUO', 'ENTRANTE (NUEVO INGRESO)', 'SALIENTE (BAJA)', 'NO ESTUVO EN NINGUNO'}
VALID_DEP = {'LA PAZ','SANTA CRUZ','COCHABAMBA','POTOSI','BENI','CHUQUISACA','ORURO','TARIJA','PANDO'}

df_e = df_e[df_e['departamento_referencia'].isin(VALID_DEP)]

# Movimientos globales por periodo
def kpis_periodo(df, col_mov):
    vc = df[col_mov].value_counts()
    return {
        'entrantes': int(vc.get('ENTRANTE (NUEVO INGRESO)', 0)),
        'salientes': int(vc.get('SALIENTE (BAJA)', 0)),
        'continuos':  int(vc.get('CONTINUO', 0)),
        'sin_registro': int(vc.get('NO ESTUVO EN NINGUNO', 0)),
    }

kpi_2425 = kpis_periodo(df_e, 'movimiento_2024_2025')
kpi_2526 = kpis_periodo(df_e, 'movimiento_2025_2026')

# Por departamento — 2024→2025
def por_depto(df, col_mov):
    result = {}
    for dep in sorted(VALID_DEP):
        sub = df[df['departamento_referencia'] == dep]
        vc = sub[col_mov].value_counts()
        result[dep] = {
            'entrantes': int(vc.get('ENTRANTE (NUEVO INGRESO)', 0)),
            'salientes': int(vc.get('SALIENTE (BAJA)', 0)),
            'continuos':  int(vc.get('CONTINUO', 0)),
        }
    return result

depto_2425 = por_depto(df_e, 'movimiento_2024_2025')
depto_2526 = por_depto(df_e, 'movimiento_2025_2026')

# ── 2. MIGRACIONES INTERDEPARTAMENTALES ───────────────────────────────────
df_m = pd.read_excel('public/datos/migracion_planilla_2024_2025_2026.xls', engine='xlrd')

def top_rutas(df, col_ruta, top=10):
    """Excluye 'MISMO DEPARTAMENTO', devuelve top rutas reales."""
    rutas = df[df[col_ruta] != 'MISMO DEPARTAMENTO'][col_ruta].value_counts()
    result = []
    for ruta, cnt in rutas.head(top).items():
        parts = str(ruta).split(' -> ')
        if len(parts) == 2:
            result.append({'origen': parts[0], 'destino': parts[1], 'docentes': int(cnt), 'ruta': str(ruta)})
    return result

# Balance neto de migración por depto (entradas - salidas)
def balance_migracion(df, col_ruta):
    balance = defaultdict(int)
    for ruta, cnt in df[col_ruta].value_counts().items():
        if ruta == 'MISMO DEPARTAMENTO':
            continue
        parts = str(ruta).split(' -> ')
        if len(parts) == 2:
            balance[parts[0]] -= int(cnt)  # salen
            balance[parts[1]] += int(cnt)  # entran
    return {dep: int(v) for dep, v in sorted(balance.items())}

mismo_2425 = int((df_m['ruta_2024_2025'] == 'MISMO DEPARTAMENTO').sum())
mismo_2526 = int((df_m['ruta_2025_2026'] == 'MISMO DEPARTAMENTO').sum())
inter_2425 = len(df_m) - mismo_2425
inter_2526 = len(df_m) - mismo_2526

# ── 3. PAYLOAD FINAL ──────────────────────────────────────────────────────
payload = {
    'kpis': {
        '2024_2025': {
            **kpi_2425,
            'total': sum(kpi_2425.values()),
            'tasa_renovacion_pct': round(kpi_2425['entrantes'] / max(1, kpi_2425['continuos'] + kpi_2425['entrantes']) * 100, 1),
            'migraciones_inter_depto': inter_2425,
            'permanecen_depto':       mismo_2425,
        },
        '2025_2026': {
            **kpi_2526,
            'total': sum(kpi_2526.values()),
            'tasa_renovacion_pct': round(kpi_2526['entrantes'] / max(1, kpi_2526['continuos'] + kpi_2526['entrantes']) * 100, 1),
            'migraciones_inter_depto': inter_2526,
            'permanecen_depto':       mismo_2526,
        }
    },
    'por_departamento': {
        '2024_2025': depto_2425,
        '2025_2026': depto_2526,
    },
    'flujo_interdepartamental': {
        '2024_2025': {
            'top_rutas':   top_rutas(df_m, 'ruta_2024_2025', 10),
            'balance_neto': balance_migracion(df_m, 'ruta_2024_2025'),
        },
        '2025_2026': {
            'top_rutas':   top_rutas(df_m, 'ruta_2025_2026', 10),
            'balance_neto': balance_migracion(df_m, 'ruta_2025_2026'),
        }
    }
}

out = 'src/data/migracion_data.json'
with open(out, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print("migracion_data.json generado OK")
print("KPIs 2024→2025:", payload['kpis']['2024_2025'])
print("KPIs 2025→2026:", payload['kpis']['2025_2026'])
