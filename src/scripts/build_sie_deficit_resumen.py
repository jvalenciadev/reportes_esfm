import json
import math
import os

AGRUPADO_PATH = 'src/data/sie_materia_agrupado.json'
FILTROS_PATH = 'src/data/filtros_materia_config.json'
ESP_OFICIALES_PATH = 'src/data/especialidades_oficiales.json'
OUTPUT_PATH = 'src/data/sie_deficit_resumen_global.json'

ESP_NOMBRES = {
    1: 'CIENCIAS NATURALES: FÍSICA - QUÍMICA',
    2: 'EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL',
    3: 'EDUCACIÓN MUSICAL',
    4: 'ARTES PLÁSTICAS Y VISUALES',
    5: 'EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA',
    6: 'EDUCACIÓN FÍSICA Y DEPORTES',
    7: 'TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA',
    8: 'COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA',
    9: 'MATEMÁTICA',
    10: 'VALORES, ESPIRITUALIDAD Y RELIGIONES',
    11: 'COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA',
    12: 'CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA',
    13: 'AGROPECUARIA',
    14: 'ELECTRICIDAD Y ELECTRÓNICA',
    15: 'MECÁNICA AUTOMOTRIZ',
    16: 'ELECTROMECÁNICA',
    17: 'COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)',
    18: 'INDUSTRIA TEXTIL Y CONFECCIÓN',
    19: 'EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD',
    20: 'CIENCIAS SOCIALES',
    21: 'CARPINTERÍA EN MADERA Y METAL',
    22: 'MECÁNICA INDUSTRIAL'
}

HORA_ITEM_MAP = {
    19: 108.0,  # Educación Especial
}

DEPARTAMENTOS_LIST = [
    {"id": 1, "nombre": "CHUQUISACA"},
    {"id": 2, "nombre": "LA PAZ"},
    {"id": 3, "nombre": "COCHABAMBA"},
    {"id": 4, "nombre": "ORURO"},
    {"id": 5, "nombre": "POTOSÍ"},
    {"id": 6, "nombre": "TARIJA"},
    {"id": 7, "nombre": "SANTA CRUZ"},
    {"id": 8, "nombre": "BENI"},
    {"id": 9, "nombre": "PANDO"},
]

ESPECIALIDAD_SUBMATERIAS_MAP = {
    3: ['Instrumento Musical: Viento', 'Instrumento Musical: Cuerda'],
    7: ['Gastronomía', 'Transformación de Alimentos'],
    13: ['Agropecuaria'],
    14: ['Electricidad Industrial', 'Electrónica'],
    15: ['Mecánica Automotriz'],
    16: ['Electromecánica'],
    17: ['Traductor e Intérprete de Lengua Extranjera: Ingles'],
    18: ['Textiles y Confecciones'],
    21: ['Carpintería en Madera y Metal'],
    22: ['Mecánica Industrial'],
}

GENERIC_TECNICA_MATERIAS = [
    'TÉCNICA TECNOLÓGICA',
    'TÉCNICA TECNOLÓGICA GENERAL',
    'TÉCNICA TECNOLÓGICA ESPECIALIZADA',
]

def matches_materia(row_mat, rule_mat):
    r = row_mat.upper().strip()
    m = rule_mat.upper().strip()
    if r == m: return True
    if r in m or m in r:
        if (m in ['FÍSICA', 'FISICA']) and ('EDUCACIÓN FÍSICA' in r or 'EDUCACION FISICA' in r):
            return False
        return True
    return False

def normalize_subsistema(s):
    val = str(s or '').upper()
    if 'REGULAR' in val: return 'REGULAR'
    if 'ALTERNATIVA' in val: return 'ALTERNATIVA'
    if 'ESPECIAL' in val: return 'ESPECIAL'
    return val

def build():
    with open(AGRUPADO_PATH, 'r', encoding='utf-8') as f:
        agrupado = json.load(f)
    with open(FILTROS_PATH, 'r', encoding='utf-8') as f:
        filtros = json.load(f)
    with open(ESP_OFICIALES_PATH, 'r', encoding='utf-8') as f:
        esp_oficiales_db = json.load(f)

    # Catálogo oficial extraído directamente de la tabla especialidades_oficiales
    esp_db_map = {int(e['id']): {'nombre': e['nombre'], 'hora_item': float(e['hora_item'])} for e in esp_oficiales_db}

    especialidades_resumen = []
    totales_dept = {d['id']: {'carga': 0, 'planilla': 0, 'deficit': 0, 'items': 0, 'ues': set()} for d in DEPARTAMENTOS_LIST}

    tot_carga_pais = 0
    tot_plan_pais = 0
    tot_def_pais = 0
    tot_items_pais = 0
    tot_ues_pais = set()

    for f in filtros:
        esp_id = int(f['especialidad_oficial_id'])
        db_info = esp_db_map.get(esp_id, {})
        esp_nombre = db_info.get('nombre', ESP_NOMBRES.get(esp_id, f.get('descripcion', f'Especialidad {esp_id}')))
        hora_item = db_info.get('hora_item', 96.0)

        materias_list = [m.upper() for m in f.get('materias', [])]
        subsistemas_list = [normalize_subsistema(s) for s in f.get('subsistemas', [])]
        niveles_list = [n.upper() for n in f.get('niveles', [])]

        ues_set_nac = set()
        carga_nac = 0
        planilla_nac = 0
        deficit_nac = 0

        dept_map = {d['id']: {'carga': 0, 'planilla': 0, 'deficit': 0, 'ues': set()} for d in DEPARTAMENTOS_LIST}
        mat_breakdown = {}

        for row in agrupado:
            row_mat = str(row.get('m', '')).upper()
            row_sub = str(row.get('sm', ''))
            row_subsis = normalize_subsistema(row.get('s', ''))
            row_niv = str(row.get('n', '')).upper()
            dep_id = int(row.get('d', 0))

            target_sub = ESPECIALIDAD_SUBMATERIAS_MAP.get(esp_id, [])
            is_generic_tec = any(matches_materia(row_mat, gt) for gt in GENERIC_TECNICA_MATERIAS)
            tec_matched = bool(is_generic_tec and row_sub and any(matches_materia(row_sub, ts) for ts in target_sub))
            reg_matched = any(matches_materia(row_mat, m) or (row_sub and matches_materia(row_sub, m)) for m in materias_list)

            if not reg_matched and not tec_matched:
                continue

            if reg_matched and not tec_matched:
                if subsistemas_list and row_subsis not in subsistemas_list: continue
                if niveles_list and row_niv not in niveles_list: continue
            else:
                if subsistemas_list and row_subsis not in subsistemas_list: continue

            c = float(row.get('c', 0))
            p = float(row.get('p', 0))
            def_hrs = float(row.get('def', 0))
            u_arr = row.get('u', [])

            carga_nac += c
            planilla_nac += p
            deficit_nac += def_hrs
            ues_set_nac.update(u_arr)

            if dep_id in dept_map:
                dept_map[dep_id]['carga'] += c
                dept_map[dep_id]['planilla'] += p
                dept_map[dep_id]['deficit'] += def_hrs
                dept_map[dep_id]['ues'].update(u_arr)

            mat_key = f"{row_mat}__{row_niv}"
            if mat_key not in mat_breakdown:
                mat_breakdown[mat_key] = {'materia': row_mat, 'nivel': row_niv, 'carga': 0, 'deficit': 0, 'ues': set()}
            mat_breakdown[mat_key]['carga'] += c
            mat_breakdown[mat_key]['deficit'] += def_hrs
            mat_breakdown[mat_key]['ues'].update(u_arr)

        items_equiv_nac = math.ceil(deficit_nac / hora_item) if deficit_nac > 0 else 0
        pct_cob_nac = round((planilla_nac / carga_nac * 100), 1) if carga_nac > 0 else 100.0

        tot_carga_pais += carga_nac
        tot_plan_pais += planilla_nac
        tot_def_pais += deficit_nac
        tot_items_pais += items_equiv_nac
        tot_ues_pais.update(ues_set_nac)

        dept_list = []
        for d in DEPARTAMENTOS_LIST:
            d_id = d['id']
            d_info = dept_map[d_id]
            d_c = d_info['carga']
            d_p = d_info['planilla']
            d_def = d_info['deficit']
            d_items = math.ceil(d_def / hora_item) if d_def > 0 else 0
            d_pct = round((d_p / d_c * 100), 1) if d_c > 0 else 100.0

            totales_dept[d_id]['carga'] += d_c
            totales_dept[d_id]['planilla'] += d_p
            totales_dept[d_id]['deficit'] += d_def
            totales_dept[d_id]['items'] += d_items
            totales_dept[d_id]['ues'].update(d_info['ues'])

            dept_list.append({
                "departamento_id": d_id,
                "departamento": d['nombre'],
                "carga_horaria": round(d_c),
                "horas_planilla": round(d_p),
                "deficit_horas": round(d_def),
                "items_deficit_equiv": d_items,
                "pct_cobertura": d_pct,
                "ues_afectadas": len(d_info['ues'])
            })

        materias_sorted = sorted(
            [
                {
                    "materia": v['materia'],
                    "nivel": v['nivel'],
                    "carga_horaria": round(v['carga']),
                    "deficit_horas": round(v['deficit']),
                    "ues_afectadas": len(v['ues'])
                }
                for v in mat_breakdown.values()
            ],
            key=lambda x: x['deficit_horas'],
            reverse=True
        )

        especialidades_resumen.append({
            "id": esp_id,
            "nombre": esp_nombre,
            "hora_item": hora_item,
            "carga_horaria": round(carga_nac),
            "horas_planilla": round(planilla_nac),
            "deficit_horas": round(deficit_nac),
            "items_deficit_equiv": items_equiv_nac,
            "pct_cobertura": pct_cob_nac,
            "ues_afectadas": len(ues_set_nac),
            "materias_breakdown": materias_sorted,
            "departamentos": dept_list
        })

    # Ordenar especialidades por mayor déficit nacional
    especialidades_resumen.sort(key=lambda e: e['deficit_horas'], reverse=True)

    departamentos_totales = []
    for d in DEPARTAMENTOS_LIST:
        d_id = d['id']
        t = totales_dept[d_id]
        c = t['carga']
        p = t['planilla']
        df = t['deficit']
        it = t['items']
        pct = round((p / c * 100), 1) if c > 0 else 100.0
        departamentos_totales.append({
            "departamento_id": d_id,
            "departamento": d['nombre'],
            "carga_horaria": round(c),
            "horas_planilla": round(p),
            "deficit_horas": round(df),
            "items_deficit_equiv": it,
            "pct_cobertura": pct,
            "ues_afectadas": len(t['ues'])
        })

    resumen_global = {
        "metadata": {
            "fecha_corte": "Octubre 2026",
            "fuente": "UIE / SIE UE · Ministerio de Educación",
            "total_especialidades": len(especialidades_resumen),
        },
        "totales_pais": {
            "carga_horaria": round(tot_carga_pais),
            "horas_planilla": round(tot_plan_pais),
            "deficit_horas": round(tot_def_pais),
            "items_deficit_equiv": tot_items_pais,
            "pct_cobertura": round((tot_plan_pais / tot_carga_pais * 100), 1) if tot_carga_pais > 0 else 100.0,
            "total_ues_afectadas": len(tot_ues_pais),
            "departamentos": departamentos_totales
        },
        "especialidades": especialidades_resumen
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(resumen_global, f, ensure_ascii=False, indent=2)

    print(f"✓ Generado exitosamente {OUTPUT_PATH}")
    print(f"  Total Horas Déficit País: {tot_def_pais:,.0f} hrs")
    print(f"  Total Ítems Docentes Necesarios: {tot_items_pais:,} ítems")

if __name__ == '__main__':
    build()
