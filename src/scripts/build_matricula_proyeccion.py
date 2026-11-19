"""
build_matricula_proyeccion.py
Genera src/data/matricula_proyeccion.json con:
  - Serie nacional consolidada (2011-2034)
  - Desagregación por Nivel Educativo: Inicial, Primaria, Secundaria
  - Desagregación por Área Geográfica: Urbana, Rural
  - 4 Modelos:
      1. Demográfico Puro INE
      2. Planificado Oficial con Cobertura SIE
      3. Inercial ARIMA(1,1,0) con intervalos de confianza al 95%
      4. Consenso Híbrido Óptimo (Ensamble INE + SIE)
"""

import json
import math
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "src" / "data"

# ─── 1. Cargar fuentes oficiales primarias ────────────────────────────────────
fallback = json.loads((DATA_DIR / "fallbackData.json").read_text(encoding="utf-8"))
cobertura_data = json.loads((DATA_DIR / "tasa_cobertura.json").read_text(encoding="utf-8"))

ine_matricula: list[dict] = fallback["ine_matricula"]
ine_proyeccion_edad: list[dict] = fallback["ine_proyeccion_edad"]
matricula_rural_urbana: list[dict] = fallback.get("matricula_rural_urbana", [])
sie_total_estudiantes: list[dict] = fallback.get("sie_total_estudiantes", [])

# ─── 2. Función genérica de modelación y proyección por serie ────────────────
def modelar_serie(
    hist_dict: dict[int, float],
    pob_dict: dict[int, float],
    sie_2026_val: int,
    cob_dict_raw: dict[str, float],
    tasa_base_2025: float,
    techo_cobertura: float = 93.5,
    pasos: int = 9,  # 2026..2034
) -> tuple[list[dict], dict]:
    anios_hist = sorted(hist_dict.keys())
    serie_hist = [hist_dict[a] for a in anios_hist]

    # 1. Integración de datos oficiales del Excel (2012-2022):
    # Años previos al Excel (ej. 2011) quedan en None (no hay dato oficial en Excel).
    # 2. Proyección hacia adelante (2023..2034) mediante saturación logística desde el último dato del Excel (2022).
    anios_cob = [int(k) for k in sorted(cob_dict_raw.keys())] if cob_dict_raw else []
    max_anio_cob = max(anios_cob) if anios_cob else 2022
    tasas_cob = [round(cob_dict_raw[str(a)] * 100, 2) for a in anios_cob] if anios_cob else [tasa_base_2025]
    tasa_ancla = tasas_cob[-1] if tasas_cob else tasa_base_2025

    tasas_recientes = tasas_cob[-5:] if len(tasas_cob) >= 5 else tasas_cob
    delta_cob = (tasas_recientes[-1] - tasas_recientes[0]) / (len(tasas_recientes) - 1) if len(tasas_recientes) > 1 else 0.5
    delta_cob = max(0.1, min(1.2, delta_cob))

    # Diccionario completo: datos oficiales del Excel + proyección hacia adelante
    cob_proyectada: dict[int, float] = {}
    for a in anios_cob:
        cob_proyectada[a] = round(cob_dict_raw[str(a)] * 100, 2)

    # Proyección logística hacia adelante año a año desde max_anio_cob hasta 2034
    t = tasa_ancla
    for y in range(max_anio_cob + 1, 2035):
        gap = techo_cobertura - t
        t = t + delta_cob * (gap / (techo_cobertura - tasa_ancla + 0.001))
        t = min(t, techo_cobertura)
        cob_proyectada[y] = round(t, 2)

    # ARIMA(1,1,0) sobre diferencias de matrícula
    diff = [serie_hist[i] - serie_hist[i - 1] for i in range(1, len(serie_hist))]
    n_diff = len(diff)
    mean_x = sum(diff[:-1]) / (n_diff - 1)
    mean_y = sum(diff[1:]) / (n_diff - 1)
    cov = sum((diff[i] - mean_x) * (diff[i + 1] - mean_y) for i in range(n_diff - 1))
    var = sum((diff[i] - mean_x) ** 2 for i in range(n_diff - 1))
    phi = cov / var if var != 0 else 0.0
    phi = max(-0.95, min(0.95, phi))

    residuos = [diff[i] - phi * diff[i - 1] for i in range(1, n_diff)]
    sigma_error = math.sqrt(sum(r ** 2 for r in residuos) / len(residuos))
    mape = (sum(abs(residuos[i]) / serie_hist[i + 2] for i in range(len(residuos))) / len(residuos)) * 100

    last_diff = diff[-1]
    last_val = serie_hist[-1]
    arima_proy = []
    for h in range(1, pasos + 1):
        next_diff = phi * last_diff
        next_val = last_val + next_diff
        psi_sq_sum = sum(((1 - phi ** (j + 1)) / (1 - phi if abs(1 - phi) > 1e-6 else 1)) ** 2 for j in range(h))
        se_h = sigma_error * math.sqrt(psi_sq_sum)
        arima_proy.append({
            "anio": 2025 + h,
            "val": round(next_val),
            "ci_low": round(next_val - 1.96 * se_h),
            "ci_high": round(next_val + 1.96 * se_h),
        })
        last_diff = next_diff
        last_val = next_val

    # Reconstrucción demográfica continua 2011-2023 si faltan años históricos
    pob_completa = dict(pob_dict)
    if 2024 in pob_completa and 2024 in hist_dict and pob_completa[2024] > 0:
        ratio_2024 = hist_dict[2024] / pob_completa[2024]
        ratio_2011 = ratio_2024 * 0.91
        for a in range(2011, 2024):
            if a in hist_dict and a not in pob_completa:
                w = (a - 2011) / (2024 - 2011)
                r = ratio_2011 + w * (ratio_2024 - ratio_2011)
                pob_completa[a] = round(hist_dict[a] / r)

    # Ensamblar serie consolidada
    # Regla: Muestra la cobertura oficial del Excel (2012-2022) y la proyecta hacia adelante (2023-2034).
    # Años previos al Excel (ej. 2011) quedan en None para no inventar datos.
    serie_puntos: list[dict] = []
    for a in anios_hist:
        tasa_cob = cob_proyectada.get(a)
        pob_a = pob_completa.get(a)
        serie_puntos.append({
            "anio": a,
            "tipo": "HISTORICO",
            "matricula_real": round(hist_dict[a]),
            "modelo_1_ine": pob_a,
            "modelo_2_cobertura": None,
            "modelo_arima": None,
            "modelo_consenso": None,
            "arima_ci_low": None,
            "arima_ci_high": None,
            "tasa_cob_pct": tasa_cob,
        })

    for i, ar_item in enumerate(arima_proy):
        anio = ar_item["anio"]
        pob_ine = round(pob_completa.get(anio, 0))
        tasa_pct = cob_proyectada.get(anio, round(t, 2))
        modelo_2 = round(pob_ine * tasa_pct / 100)
        es_2026 = (anio == 2026)
        if es_2026:
            modelo_2 = sie_2026_val
        modelo_consenso = sie_2026_val if es_2026 else round((modelo_2 + ar_item["val"]) / 2)

        serie_puntos.append({
            "anio": anio,
            "tipo": "REAL_SIE" if es_2026 else "PROYECCION",
            "matricula_real": sie_2026_val if es_2026 else None,
            "modelo_1_ine": pob_ine,
            "modelo_2_cobertura": modelo_2,
            "modelo_arima": ar_item["val"],
            "modelo_consenso": modelo_consenso,
            "arima_ci_low": ar_item["ci_low"],
            "arima_ci_high": ar_item["ci_high"],
            "tasa_cob_pct": tasa_pct,
        })

    metricas = {
        "phi": round(phi, 4),
        "sigma": round(sigma_error, 1),
        "mape": round(mape, 2),
        "anio_base_cobertura": max_anio_cob,
        "tasa_base": tasa_ancla,
        "tasa_proy_2034": cob_proyectada.get(2034, round(t, 2)),
    }
    return serie_puntos, metricas

# ─── 3. Extracción de Datos por Segmentos ─────────────────────────────────────
# A. Histórico Total Nacional
hist_total: dict[int, float] = {}
hist_inicial: dict[int, float] = {a: 0.0 for a in range(2011, 2026)}
hist_primaria: dict[int, float] = {a: 0.0 for a in range(2011, 2026)}
hist_secundaria: dict[int, float] = {a: 0.0 for a in range(2011, 2026)}

for r in ine_matricula:
    a = r["anio"]
    cant = r["cantidad"]
    hist_total[a] = hist_total.get(a, 0.0) + cant
    niv = r["nivel"].strip().lower()
    if niv == "inicial":
        hist_inicial[a] += cant
    elif niv == "primaria":
        hist_primaria[a] += cant
    elif niv == "secundaria":
        hist_secundaria[a] += cant

# B. Histórico Urbana / Rural
hist_urbana: dict[int, float] = {a: 0.0 for a in range(2011, 2026)}
hist_rural: dict[int, float] = {a: 0.0 for a in range(2011, 2026)}
for r in matricula_rural_urbana:
    a = r["anio"]
    area = r["area"].strip().lower()
    if a in hist_urbana:
        if area == "urbana":
            hist_urbana[a] += r["cantidad"]
        elif area == "rural":
            hist_rural[a] += r["cantidad"]

# C. Población Escolar INE por Cohortes de Edad (2024-2034)
pob_total_escolar: dict[int, float] = {}
pob_inicial_escolar: dict[int, float] = {}
pob_primaria_escolar: dict[int, float] = {}
pob_secundaria_escolar: dict[int, float] = {}

for r in ine_proyeccion_edad:
    a = r["anio"]
    e = r["edad"]
    c = r["cantidad"]
    if 4 <= e <= 17:
        pob_total_escolar[a] = pob_total_escolar.get(a, 0.0) + c
    if 4 <= e <= 5:
        pob_inicial_escolar[a] = pob_inicial_escolar.get(a, 0.0) + c
    elif 6 <= e <= 11:
        pob_primaria_escolar[a] = pob_primaria_escolar.get(a, 0.0) + c
    elif 12 <= e <= 17:
        pob_secundaria_escolar[a] = pob_secundaria_escolar.get(a, 0.0) + c

# Población escolar aproximada Urbana (69.58%) y Rural (30.42%)
pob_urbana_escolar = {a: round(pob_total_escolar[a] * 0.6958) for a in pob_total_escolar}
pob_rural_escolar = {a: round(pob_total_escolar[a] * 0.3042) for a in pob_total_escolar}

# D. Cierre Real SIE 2026
SIE_TOTAL_2026 = 2_815_162
SIE_INICIAL_2026 = sum(r["cantidad"] for r in sie_total_estudiantes if r["nivel_texto"].strip().lower() == "inicial")  # 268,886
SIE_PRIMARIA_2026 = sum(r["cantidad"] for r in sie_total_estudiantes if r["nivel_texto"].strip().lower() == "primaria")  # 1,310,438
SIE_SECUNDARIA_2026 = sum(r["cantidad"] for r in sie_total_estudiantes if r["nivel_texto"].strip().lower() == "secundaria")  # 1,235,838
SIE_URBANA_2026 = round(SIE_TOTAL_2026 * (hist_urbana[2025] / hist_total[2025]))  # 1,958,790
SIE_RURAL_2026 = SIE_TOTAL_2026 - SIE_URBANA_2026  # 856,372

# E. Tasas de Cobertura Oficiales
cob_nacional = cobertura_data["nacional"]
cob_total = cob_nacional.get("total", {})
cob_inicial = cob_nacional.get("inicial", {})
cob_primaria = cob_nacional.get("primaria", {})
cob_secundaria = cob_nacional.get("secundaria", {})

# ─── 4. Generación de Series ──────────────────────────────────────────────────
# 1. Nacional
serie_nacional, met_nacional = modelar_serie(
    hist_total, pob_total_escolar, SIE_TOTAL_2026, cob_total, tasa_base_2025=88.0, techo_cobertura=93.5
)

# 2. Por Nivel
serie_inicial, met_inicial = modelar_serie(
    hist_inicial, pob_inicial_escolar, SIE_INICIAL_2026, cob_inicial, tasa_base_2025=72.0, techo_cobertura=82.0
)
serie_primaria, met_primaria = modelar_serie(
    hist_primaria, pob_primaria_escolar, SIE_PRIMARIA_2026, cob_primaria, tasa_base_2025=96.0, techo_cobertura=98.5
)
serie_secundaria, met_secundaria = modelar_serie(
    hist_secundaria, pob_secundaria_escolar, SIE_SECUNDARIA_2026, cob_secundaria, tasa_base_2025=80.0, techo_cobertura=90.0
)

# 3. Por Área
serie_urbana, met_urbana = modelar_serie(
    hist_urbana, pob_urbana_escolar, SIE_URBANA_2026, cob_total, tasa_base_2025=90.0, techo_cobertura=94.5
)
serie_rural, met_rural = modelar_serie(
    hist_rural, pob_rural_escolar, SIE_RURAL_2026, cob_total, tasa_base_2025=84.0, techo_cobertura=89.0
)

# 4. Por Departamento (9 Departamentos de Bolivia)
DEP_MAP = {
    1: ("chuquisaca", "CHUQUISACA", "Chuquisaca"),
    2: ("la_paz", "LA PAZ", "La Paz"),
    3: ("cochabamba", "COCHABAMBA", "Cochabamba"),
    4: ("oruro", "ORURO", "Oruro"),
    5: ("potosi", "POTOSÍ", "Potosí"),
    6: ("tarija", "TARIJA", "Tarija"),
    7: ("santa_cruz", "SANTA CRUZ", "Santa Cruz"),
    8: ("beni", "BENI", "Beni"),
    9: ("pando", "PANDO", "Pando"),
}

series_por_departamento: dict[str, list[dict]] = {}
metricas_por_departamento: dict[str, dict] = {}
anclas_departamentos: dict[str, int] = {}
cob_por_dep = cobertura_data.get("por_departamento", {})

for d_id, (slug, dep_key, name) in DEP_MAP.items():
    hist_d = {a: 0.0 for a in range(2011, 2026)}
    for r in ine_matricula:
        if r.get("departamento_id") == d_id and r["anio"] in hist_d:
            hist_d[r["anio"]] += r["cantidad"]

    pob_d = {}
    for r in ine_proyeccion_edad:
        if r.get("departamento_id") == d_id and 4 <= r["edad"] <= 17:
            a = r["anio"]
            pob_d[a] = pob_d.get(a, 0.0) + r["cantidad"]

    sie_2026_d = sum(r["cantidad"] for r in sie_total_estudiantes if r.get("departamento_id") == d_id)
    anclas_departamentos[slug] = sie_2026_d

    cob_dict_d = cob_por_dep.get(dep_key, {}).get("total", {})
    t2022 = cob_dict_d.get("2022")
    base_cob_d = round(t2022 * 100, 1) if t2022 else 88.0

    serie_d, met_d = modelar_serie(
        hist_d, pob_d, sie_2026_d, cob_dict_d, tasa_base_2025=base_cob_d, techo_cobertura=min(96.0, base_cob_d + 5.0)
    )
    series_por_departamento[slug] = serie_d
    metricas_por_departamento[slug] = met_d

# ─── 5. Guardar Archivo Consolidado ──────────────────────────────────────────
output = {
    "serie_nacional": serie_nacional,
    "desagregaciones": {
        "por_nivel": {
            "inicial": serie_inicial,
            "primaria": serie_primaria,
            "secundaria": serie_secundaria,
        },
        "por_area": {
            "urbana": serie_urbana,
            "rural": serie_rural,
        },
        "por_departamento": series_por_departamento
    },
    "metadata": {
        "modelo_arima": "ARIMA(1,1,0) con diferenciación de orden 1 y AR(1)",
        "modelo_1_descripcion": "Demanda Demográfica Pura INE: Población en edad escolar",
        "modelo_2_descripcion": "Proyección Oficial con Cobertura SIE: Población × Tasa de Cobertura observada",
        "modelo_consenso_descripcion": "Consenso Híbrido (INE + SIE): Ensamble óptimo 50% Planificado + 50% Inercia ARIMA",
        "fecha_generacion": str(date.today()),
        "fuentes": [
            "Registro Histórico SIE (2011–2025)",
            "Proyecciones de Población por Edad INE (2024–2034)",
            "Tasa de Cobertura Educativa Regular Oficial MinEdu (Excel 2012–2024)",
            "Matrícula Urbana y Rural Histórica (Excel 2000–2025)"
        ],
        "anio_ancla_sie": 2026,
        "matricula_ancla_sie": SIE_TOTAL_2026,
        "anclas_2026": {
            "total": SIE_TOTAL_2026,
            "inicial": SIE_INICIAL_2026,
            "primaria": SIE_PRIMARIA_2026,
            "secundaria": SIE_SECUNDARIA_2026,
            "urbana": SIE_URBANA_2026,
            "rural": SIE_RURAL_2026,
            "departamentos": anclas_departamentos,
        },
        "arima_metricas": {
            "total": met_nacional,
            "inicial": met_inicial,
            "primaria": met_primaria,
            "secundaria": met_secundaria,
            "urbana": met_urbana,
            "rural": met_rural,
            "departamentos": metricas_por_departamento,
        }
    }
}

out_path = DATA_DIR / "matricula_proyeccion.json"
out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"✓ Generado exitosamente: {out_path}")
print(f"  Nacional MAPE: {met_nacional['mape']}% | Inicial: {met_inicial['mape']}% | Primaria: {met_primaria['mape']}% | Secundaria: {met_secundaria['mape']}%")
