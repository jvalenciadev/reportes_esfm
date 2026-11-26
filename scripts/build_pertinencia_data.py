#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de procesamiento de Pertinencia Curricular Docente - Corte Oficial Definitivo.
Fuente: public/datos/Pertinencia_oficial - copia.xlsx (168,758 registros, 30 columnas).
Genera:
  - src/data/pertinencia_data.json (Métricas agregadas, cruce No Prejubilados x No Pertinentes, género)
  - src/data/pertinencia_por_ue.json (Consolidado por UE / UA con coordenadas, subsistema, nivel, turno, mapa)
  - src/data/ue_jubilacion_data.json (Lookup rápido de jubilación por UE)
"""

import os
import json
import openpyxl
import sqlite3
from collections import defaultdict, Counter

ESPECIALIDADES_22_OFICIALES = [
    (1, "EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA"),
    (2, "EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL"),
    (3, "ARTES PLÁSTICAS Y VISUALES"),
    (4, "CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA"),
    (5, "CIENCIAS NATURALES: FÍSICA - QUÍMICA"),
    (6, "CIENCIAS SOCIALES"),
    (7, "COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA"),
    (8, "COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)"),
    (9, "COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA"),
    (10, "EDUCACIÓN FÍSICA Y DEPORTES"),
    (11, "EDUCACIÓN MUSICAL"),
    (12, "MATEMÁTICA"),
    (13, "VALORES, ESPIRITUALIDAD Y RELIGIONES"),
    (14, "AGROPECUARIA"),
    (15, "CARPINTERÍA INDUSTRIAL EN MADERA Y METAL"),
    (16, "ELECTRICIDAD Y ELECTRÓNICA"),
    (17, "ELECTROMECÁNICA"),
    (18, "INDUSTRIA TEXTIL Y CONFECCIÓN"),
    (19, "MECÁNICA AUTOMOTRIZ"),
    (20, "MECÁNICA INDUSTRIAL"),
    (21, "TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA"),
    (22, "EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD"),
]


def normalize_especialidad_22(esp_raw: str) -> tuple[int, str] | None:
    """Normaliza la especialidad de formación a una de las 22 especialidades oficiales ESFM."""
    s = (esp_raw or "").strip().upper()
    if not s or s == "SIN ESPECIALIDAD ESPECIFICADA":
        return None
    if any(k in s for k in ["DISCAPACIDAD", "ED ESPECIAL", "ED. ESPECIAL", "EDUCACIÓN ESPECIAL", "EDUCACION ESPECIAL", "AUDITIVA", "INTELECTUAL"]):
        return (22, "EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD")
    if any(k in s for k in ["AGROPEC", "AGRONOM", "VETERINAR"]):
        return (14, "AGROPECUARIA")
    if any(k in s for k in ["CARPINTER", "MADERA Y METAL", "EBANISTER"]):
        return (15, "CARPINTERÍA INDUSTRIAL EN MADERA Y METAL")
    if "ELECTROMEC" in s:
        return (17, "ELECTROMECÁNICA")
    if any(k in s for k in ["ELECTRIC", "ELECTRÓNIC", "ELECTRONIC"]):
        return (16, "ELECTRICIDAD Y ELECTRÓNICA")
    if any(k in s for k in ["TEXTIL", "CONFECC", "COSTURA", "SASTRER"]):
        return (18, "INDUSTRIA TEXTIL Y CONFECCIÓN")
    if "AUTOMOT" in s:
        return (19, "MECÁNICA AUTOMOTRIZ")
    if "MECÁNICA IND" in s or "MECANICA IND" in s:
        return (20, "MECÁNICA INDUSTRIAL")
    if any(k in s for k in ["ALIMENT", "GASTRONOM", "NUTRIC"]):
        return (21, "TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA")
    if any(k in s for k in ["ARTES PLÁST", "ARTES PLAST", "PLÁSTICAS", "PLASTICAS", "VISUALES", "DIBUJO"]):
        return (3, "ARTES PLÁSTICAS Y VISUALES")
    if any(k in s for k in ["FÍSICA Y DEP", "FISICA Y DEP", "ED. FISICA", "ED FISICA", "EDUCACIÓN FÍSICA", "EDUCACION FISICA", "DEPORTE"]):
        return (10, "EDUCACIÓN FÍSICA Y DEPORTES")
    if any(k in s for k in ["MUSICAL", "MÚSICA", "MUSICA"]):
        return (11, "EDUCACIÓN MUSICAL")
    if any(k in s for k in ["VALORES", "ESPIRITUAL", "RELIGION"]):
        return (13, "VALORES, ESPIRITUALIDAD Y RELIGIONES")
    if any(k in s for k in ["COSMOVIS", "FILOSOF", "SICOLOG", "PSICOLOG"]):
        return (9, "COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA")
    if any(k in s for k in ["EXTRANJ", "INGLÉS", "INGLES", "FRANCÉS", "FRANCES"]):
        return (8, "COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)")
    if any(k in s for k in ["CASTELLAN", "LITERATURA", "LENGUAJE", "LENGUAS", "COMUNICACIÓN", "COMUNICACION"]):
        return (7, "COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA")
    if any(k in s for k in ["FÍSICA - QUÍMICA", "FISICA - QUIMICA", "FÍSICA Y QUÍMICA", "FISICA Y QUIMICA", "QUÍMICA", "QUIMICA", "FÍSICA", "FISICA"]):
        return (5, "CIENCIAS NATURALES: FÍSICA - QUÍMICA")
    if any(k in s for k in ["BIOLOG", "GEOGRAF", "CIENCIAS NATURALES"]):
        return (4, "CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA")
    if any(k in s for k in ["CIENCIAS SOCIALES", "HISTORIA", "CÍVICA", "CIVICA", "ESTUDIOS SOCIALES"]):
        return (6, "CIENCIAS SOCIALES")
    if "MATEMÁT" in s or "MATEMAT" in s:
        return (12, "MATEMÁTICA")
    if any(k in s for k in ["INICIAL", "PARVULAR", "PREESCOLAR"]):
        return (1, "EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA")
    if any(k in s for k in ["PRIMARIA", "BÁSICA", "BASICA", "PRIMER Y SEGUNDO", "MAESTRO DE AULA", "PROFESOR DE CURSO"]):
        return (2, "EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL")
    return None


def build_pertinencia_oficial():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    xlsx_path = os.path.join(root_dir, "public", "datos", "Pertinencia_oficial - copia.xlsx")
    pert_xlsx_path = os.path.join(root_dir, "public", "datos", "pertinencia.xlsx")
    db_path = os.path.join(root_dir, "src", "data", "sie_materia.db")
    out_json_path = os.path.join(root_dir, "src", "data", "pertinencia_data.json")
    out_ue_json_path = os.path.join(root_dir, "src", "data", "pertinencia_por_ue.json")
    out_ue_jub_path = os.path.join(root_dir, "src", "data", "ue_jubilacion_data.json")

    # 1. Cargar Mapeo de Área Rural / Urbana de apoyo
    print("Cargando catálogo territorial Rural/Urbano...")
    ue_area_map = {}
    dist_area_map = {}
    if os.path.exists(pert_xlsx_path):
        wb_p = openpyxl.load_workbook(pert_xlsx_path, read_only=True)
        ws_p = wb_p.active
        for r in ws_p.iter_rows(min_row=2, values_only=True):
            dep = str(r[0] or '').strip().upper()
            dist = str(r[1] or '').strip().upper()
            ue = str(r[2] or '').strip().upper()
            area = str(r[14] or '').strip().upper()
            if area in ['RURAL', 'URBANA']:
                ue_area_map[(dep, dist, ue)] = area
                dist_area_map[(dep, dist)] = area
        wb_p.close()

    sie_ue_areas = {}
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        sie_ue_areas = {r[0]: ('URBANA' if r[1] == 'U' else 'RURAL') for r in c.execute('SELECT DISTINCT cod_ue, area FROM sie_deficit_materia').fetchall()}
        conn.close()

    print(f"Catálogo cargado: {len(ue_area_map)} UEs de pertinencia y {len(sie_ue_areas)} UEs de SIE.")

    print(f"Cargando datos oficiales desde: {xlsx_path}...")
    wb = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)
    sheet_name = wb.sheetnames[0]
    ws = wb[sheet_name]
    print(f"Procesando hoja: {sheet_name}")

    resumen_rangos = {
        'V': {'rango': 'V', 'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0},
        'A': {'rango': 'A', 'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0},
        'N': {'rango': 'N', 'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0},
        'SIN': {'rango': 'SIN', 'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0},
    }
    tot_ues_all = set()
    tot_horas_all = 0.0

    # Desglose por Área (RURAL / URBANA)
    area_resumen = {
        'RURAL': {
            'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0,
            'rangos': {
                'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            }
        },
        'URBANA': {
            'docentes': 0, 'asignaciones': 0, 'ues': set(), 'horas_total': 0.0,
            'rangos': {
                'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
                'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            }
        }
    }

    # Desglose Departamento x Área
    deptos_area_data = defaultdict(lambda: {
        'RURAL': {
            'docentes': 0, 'ues': set(), 'horas': 0.0,
            'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        },
        'URBANA': {
            'docentes': 0, 'ues': set(), 'horas': 0.0,
            'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
            'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        }
    })

    deptos_data = defaultdict(lambda: {
        'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
    })

    niveles_data = defaultdict(lambda: {
        'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
    })

    condiciones_data = defaultdict(lambda: {
        'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
    })

    casos_data = defaultdict(lambda: {
        'V': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'A': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'N': {'docentes': 0, 'ues': set(), 'horas': 0.0},
        'SIN': {'docentes': 0, 'ues': set(), 'horas': 0.0},
    })

    # Especialidades
    especialidades_data = defaultdict(lambda: {
        'docentes': 0,
        'ues': set(),
        'V': 0, 'A': 0, 'N': 0, 'SIN': 0,
        'por_departamento': defaultdict(lambda: {'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0})
    })

    desalineacion_counts = {
        'fuera_especialidad': 0,
        'fuera_nivel': 0,
        'fuera_ambos': 0,
        'total': 0
    }

    deptos_orden = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"]

    # Estructuras para Jubilación y Prejubilación
    jub_por_depto = defaultdict(lambda: {'jubilacion': 0, 'prejubilacion': 0, 'total': 0})
    jub_por_distrito = defaultdict(lambda: {'jubilacion': 0, 'prejubilacion': 0, 'total': 0})
    jub_nacional = {'jubilacion': 0, 'prejubilacion': 0, 'total': 0}

    # NUEVO: Estructura Cruzada No Prejubilados x No Pertinentes
    # Prejubilacion (SI / NO) x Rango (V, A, N, SIN)
    prejub_pert_nac = {
        'prejubilados': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_pertinentes': 0},
        'no_prejubilados': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_pertinentes': 0},
        'candidatos_jubilacion': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_pertinentes': 0},
        'en_ejercicio': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_pertinentes': 0},
    }
    prejub_pert_depto = defaultdict(lambda: {
        'total': 0,
        'prejubilados': 0,
        'no_prejubilados': 0,
        'prejub_v': 0, 'prejub_a': 0, 'prejub_n': 0, 'prejub_sin': 0, 'prejub_no_pert': 0,
        'no_prejub_v': 0, 'no_prejub_a': 0, 'no_prejub_n': 0, 'no_prejub_sin': 0, 'no_prejub_no_pert': 0,
        'jub_total': 0, 'jub_v': 0, 'jub_a': 0, 'jub_n': 0, 'jub_sin': 0,
    })

    # NUEVO: Estructura de Género (Femenino / Masculino / Otro)
    genero_nac = {
        'femenino': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'prejub': 0, 'no_prejub_no_pert': 0},
        'masculino': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'prejub': 0, 'no_prejub_no_pert': 0},
        'otro': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'prejub': 0, 'no_prejub_no_pert': 0}
    }
    genero_depto = defaultdict(lambda: {
        'femenino': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_prejub_no_pert': 0},
        'masculino': {'total': 0, 'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'no_prejub_no_pert': 0},
    })

    # Acumulador unívoco para UE / UA
    ue_map = defaultdict(lambda: {
        'depto': '',
        'distrito': '',
        'distritos': Counter(),
        'ue': '',
        'lenguas': Counter(),
        'subsistema': '',
        'subsistemas': Counter(),
        'turno': '',
        'turnos': Counter(),
        'nivel_autorizado': '',
        'direccion': '',
        'cord_x': None,
        'cord_y': None,
        'dependencia': 'FISCAL',
        'dependencias': Counter(),
        'estudiantes': 0,
        'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0,
        'prejubilados': 0,
        'prejub_v': 0, 'prejub_a': 0, 'prejub_n': 0, 'prejub_sin': 0,
        'a_jubilar': 0,
        'jub_v': 0, 'jub_a': 0, 'jub_n': 0, 'jub_sin': 0,
        'no_prejub_no_pert': 0,
        'genero_fem': 0,
        'genero_masc': 0
    })

    ue_fixed_area = {}
    ue_matr_stats = defaultdict(lambda: {
        'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0,
        'estudiantes': 0, 'area': ''
    })

    total_filas = 0

    # 31 columnas verificadas:
    # 0: dep_id, 1: departamento, 2: dis_id, 3: distrito, 4: ID_UE, 5: ue,
    # 6: 1º LENGUA ENSEÑANZA, 7: cantidad_est, 8: Dependencia, 9: Subsistema, 10: Dependencia_dup, 11: Turno,
    # 12: Nivel Autorizado, 13: Dirección, 14: Cord X, 15: Cord Y, 16: ci,
    # 17: fecha_naci, 18: sexo, 19: años, 20: codigo_cargo, 21: cargo,
    # 22: cod_especialidad, 23: especialidad_formacion, 24: condicion_formacion,
    # 25: caso_aplicado, 26: detalle_caso, 27: pertinencia, 28: nivel,
    # 29: Jubilacion, 30: PreJubilacion
    for r in ws.iter_rows(min_row=2, values_only=True):
        total_filas += 1
        depto = str(r[1]).strip().upper() if r[1] else 'DESCONOCIDO'
        distrito = str(r[3]).strip().upper() if r[3] else 'DESCONOCIDO'
        id_ue = int(r[4]) if r[4] and str(r[4]).isdigit() else (r[4] or 0)
        ue = str(r[5]).strip().upper() if r[5] else 'SIN NOMBRE'
        lengua_ensenanza = str(r[6]).strip().upper() if r[6] else ''
        cantidad_est = int(r[7]) if r[7] and str(r[7]).isdigit() else (int(r[7]) if isinstance(r[7], (int, float)) else 0)
        dependencia = str(r[8]).strip() if r[8] else 'FISCAL'
        subsistema = str(r[9]).strip() if r[9] else 'Regular'
        turno = str(r[11]).strip() if r[11] else 'Mañana'
        nivel_aut = str(r[12]).strip() if r[12] else ''
        direccion = str(r[13]).strip() if r[13] else ''
        cord_x = r[14] if isinstance(r[14], (int, float)) else None
        cord_y = r[15] if isinstance(r[15], (int, float)) else None

        # Género (1: Masculino, 2: Femenino)
        sexo_raw = str(r[18]).strip() if r[18] is not None else ''
        if sexo_raw in ['2', 'F', 'FEMENINO']:
            gen_key = 'femenino'
        elif sexo_raw in ['1', 'M', 'MASCULINO']:
            gen_key = 'masculino'
        else:
            gen_key = 'otro'

        cargo = str(r[21]).strip().upper() if r[21] else ''
        esp_form = str(r[23]).strip().upper() if r[23] else 'SIN ESPECIALIDAD ESPECIFICADA'
        condicion = str(r[24]).strip().upper() if r[24] else 'OTRO'
        caso = str(r[25]).strip() if r[25] else 'SIN CASO'
        pert_raw = str(r[27]).strip().upper() if r[27] else 'SIN PERTINENCIA'
        nivel = str(r[28]).strip() if r[28] else 'OTRO'
        # Jubilación: Columna 29 (Padrón Oficial: =IF(T>=60, "SI", "NO"))
        is_jub = False
        jub_val = str(r[29]).strip().upper() if r[29] is not None else ''
        if jub_val == 'SI':
            is_jub = True
        else:
            try:
                if r[19] is not None and float(r[19]) >= 60:
                    is_jub = True
            except (ValueError, TypeError):
                pass
        jubilacion = 'SI' if is_jub else 'NO'
        prejubilacion = str(r[30]).strip().upper() if r[30] is not None else 'NO'

        # Mapeo oficial de rangos
        if 'ALTA' in pert_raw or pert_raw == 'V':
            color = 'V'
        elif 'MEDIA' in pert_raw or pert_raw == 'A':
            color = 'A'
        elif 'BAJA' in pert_raw or pert_raw == 'N':
            color = 'N'
        else:
            color = 'SIN'

        is_prejub = (prejubilacion == 'SI')
        is_no_pert = color in ['N', 'SIN']

        # Acumular Jubilación tradicional
        jub_key_d = depto
        jub_key_dist = (depto, distrito)
        jub_nacional['total'] += 1
        jub_por_depto[jub_key_d]['total'] += 1
        jub_por_distrito[jub_key_dist]['total'] += 1
        if jubilacion == 'SI':
            jub_nacional['jubilacion'] += 1
            jub_por_depto[jub_key_d]['jubilacion'] += 1
            jub_por_distrito[jub_key_dist]['jubilacion'] += 1
        if is_prejub:
            jub_nacional['prejubilacion'] += 1
            jub_por_depto[jub_key_d]['prejubilacion'] += 1
            jub_por_distrito[jub_key_dist]['prejubilacion'] += 1

        # Acumular Prejubilación x Pertinencia
        if is_prejub:
            prejub_pert_nac['prejubilados']['total'] += 1
            prejub_pert_nac['prejubilados'][color] += 1
            if is_no_pert:
                prejub_pert_nac['prejubilados']['no_pertinentes'] += 1

            prejub_pert_depto[depto]['total'] += 1
            prejub_pert_depto[depto]['prejubilados'] += 1
            prejub_pert_depto[depto][f'prejub_{color.lower()}'] += 1
            if is_no_pert:
                prejub_pert_depto[depto]['prejub_no_pert'] += 1
        else:
            prejub_pert_nac['no_prejubilados']['total'] += 1
            prejub_pert_nac['no_prejubilados'][color] += 1
            if is_no_pert:
                prejub_pert_nac['no_prejubilados']['no_pertinentes'] += 1

            prejub_pert_depto[depto]['total'] += 1
            prejub_pert_depto[depto]['no_prejubilados'] += 1
            prejub_pert_depto[depto][f'no_prejub_{color.lower()}'] += 1
            if is_no_pert:
                prejub_pert_depto[depto]['no_prejub_no_pert'] += 1

            if jubilacion == 'SI':
                prejub_pert_nac['candidatos_jubilacion']['total'] += 1
                prejub_pert_nac['candidatos_jubilacion'][color] += 1
                if is_no_pert:
                    prejub_pert_nac['candidatos_jubilacion']['no_pertinentes'] += 1
                prejub_pert_depto[depto]['jub_total'] += 1
                prejub_pert_depto[depto][f'jub_{color.lower()}'] += 1
            else:
                prejub_pert_nac['en_ejercicio']['total'] += 1
                prejub_pert_nac['en_ejercicio'][color] += 1
                if is_no_pert:
                    prejub_pert_nac['en_ejercicio']['no_pertinentes'] += 1

        # Acumular Género
        genero_nac[gen_key]['total'] += 1
        genero_nac[gen_key][color] += 1
        if is_prejub:
            genero_nac[gen_key]['prejub'] += 1
        if not is_prejub and is_no_pert:
            genero_nac[gen_key]['no_prejub_no_pert'] += 1

        if gen_key in ['femenino', 'masculino']:
            genero_depto[depto][gen_key]['total'] += 1
            genero_depto[depto][gen_key][color] += 1
            if not is_prejub and is_no_pert:
                genero_depto[depto][gen_key]['no_prejub_no_pert'] += 1

        # Acumular Especialidad (normalizada a las 22 Especialidades Oficiales ESFM)
        norm_esp = normalize_especialidad_22(esp_form)
        if norm_esp:
            _, esp_canon = norm_esp
            especialidades_data[esp_canon]['docentes'] += 1
            especialidades_data[esp_canon][color] += 1
            if id_ue:
                especialidades_data[esp_canon]['ues'].add(id_ue)
            especialidades_data[esp_canon]['por_departamento'][depto][color] += 1
            especialidades_data[esp_canon]['por_departamento'][depto]['total'] += 1

        # Acumular datos enriquecidos por UE / UA
        u_rec = ue_map[id_ue]
        u_rec['depto'] = depto
        u_rec['distritos'][distrito] += 1
        u_rec['ue'] = ue
        u_rec['total'] += 1
        u_rec[color] += 1
        u_rec['estudiantes'] = cantidad_est
        if lengua_ensenanza: u_rec['lenguas'][lengua_ensenanza] += 1
        if subsistema: u_rec['subsistemas'][subsistema] += 1
        if turno: u_rec['turnos'][turno] += 1
        if dependencia: u_rec['dependencias'][dependencia] += 1
        if nivel_aut and not u_rec['nivel_autorizado']: u_rec['nivel_autorizado'] = nivel_aut
        if direccion and not u_rec['direccion']: u_rec['direccion'] = direccion
        if cord_x is not None and u_rec['cord_x'] is None: u_rec['cord_x'] = cord_x
        if cord_y is not None and u_rec['cord_y'] is None: u_rec['cord_y'] = cord_y
        if is_prejub:
            u_rec['prejubilados'] += 1
            u_rec[f'prejub_{color.lower()}'] += 1
        if jubilacion == 'SI':
            u_rec['a_jubilar'] += 1
            u_rec[f'jub_{color.lower()}'] += 1
        if not is_prejub and is_no_pert: u_rec['no_prejub_no_pert'] += 1
        if gen_key == 'femenino': u_rec['genero_fem'] += 1
        elif gen_key == 'masculino': u_rec['genero_masc'] += 1

        # Determinar Área Rural / Urbana
        if id_ue in ue_fixed_area:
            area = ue_fixed_area[id_ue]
        else:
            k_ue = (depto, distrito, ue)
            if k_ue in ue_area_map:
                area = ue_area_map[k_ue]
            elif id_ue in sie_ue_areas:
                area = sie_ue_areas[id_ue]
            elif (depto, distrito) in dist_area_map:
                area = dist_area_map[(depto, distrito)]
            else:
                area = 'RURAL' if any(w in distrito for w in ['RURAL', 'CANTON', 'PROVINCIA', 'SEGUNDA', 'TERCERA', 'CUARTA']) else 'URBANA'
            ue_fixed_area[id_ue] = area

        # Acumular estadística para cálculo exacto de estudiantes
        u_stat = ue_matr_stats[id_ue]
        u_stat['area'] = area
        u_stat['estudiantes'] = cantidad_est
        u_stat['total'] += 1
        u_stat[color] += 1

        horas = 96.0

        # Resumen general
        resumen_rangos[color]['docentes'] += 1
        resumen_rangos[color]['asignaciones'] += 1
        resumen_rangos[color]['horas_total'] += horas
        if id_ue:
            resumen_rangos[color]['ues'].add(id_ue)
            tot_ues_all.add(id_ue)
        tot_horas_all += horas

        # Por Área general
        area_resumen[area]['docentes'] += 1
        area_resumen[area]['asignaciones'] += 1
        area_resumen[area]['horas_total'] += horas
        if id_ue:
            area_resumen[area]['ues'].add(id_ue)
            area_resumen[area]['rangos'][color]['ues'].add(id_ue)
        area_resumen[area]['rangos'][color]['docentes'] += 1
        area_resumen[area]['rangos'][color]['horas'] += horas

        # Por Departamento x Área
        deptos_area_data[depto][area]['docentes'] += 1
        deptos_area_data[depto][area]['horas'] += horas
        deptos_area_data[depto][area][color]['docentes'] += 1
        deptos_area_data[depto][area][color]['horas'] += horas
        if id_ue:
            deptos_area_data[depto][area]['ues'].add(id_ue)
            deptos_area_data[depto][area][color]['ues'].add(id_ue)

        # Por departamento
        deptos_data[depto][color]['docentes'] += 1
        deptos_data[depto][color]['horas'] += horas
        if id_ue:
            deptos_data[depto][color]['ues'].add(id_ue)

        # Por nivel
        niveles_data[nivel][color]['docentes'] += 1
        niveles_data[nivel][color]['horas'] += horas
        if id_ue:
            niveles_data[nivel][color]['ues'].add(id_ue)

        # Por condición
        condiciones_data[condicion][color]['docentes'] += 1
        condiciones_data[condicion][color]['horas'] += horas
        if id_ue:
            condiciones_data[condicion][color]['ues'].add(id_ue)

        # Por caso aplicado
        casos_data[caso][color]['docentes'] += 1
        casos_data[caso][color]['horas'] += horas

        # Desalineación
        if color == 'N':
            desalineacion_counts['fuera_especialidad'] += 1
            desalineacion_counts['total'] += 1
        elif color == 'SIN':
            desalineacion_counts['fuera_ambos'] += 1
            desalineacion_counts['total'] += 1

    wb.close()
    print(f"Lectura completa finalizada: {total_filas} registros procesados.")

    # Cálculo exacto de estudiantes según columna oficial cantidad_Est por UE
    estudiantes_por_rango_calc = {'V': 0.0, 'A': 0.0, 'N': 0.0, 'SIN': 0.0}
    estudiantes_por_area_calc = {'RURAL': 0, 'URBANA': 0}
    total_estudiantes_nacional = 0

    for id_ue, uinfo in ue_matr_stats.items():
        est_ue = uinfo['estudiantes']
        total_estudiantes_nacional += est_ue
        area_ue = uinfo['area']
        if area_ue in estudiantes_por_area_calc:
            estudiantes_por_area_calc[area_ue] += est_ue
        tot_d = uinfo['total']
        if tot_d > 0:
            for rk in ['V', 'A', 'N', 'SIN']:
                estudiantes_por_rango_calc[rk] += est_ue * (uinfo[rk] / tot_d)

    est_rango_enteros = {k: int(round(v)) for k, v in estudiantes_por_rango_calc.items()}
    diff_redondeo = total_estudiantes_nacional - sum(est_rango_enteros.values())
    if diff_redondeo != 0:
        est_rango_enteros['V'] += diff_redondeo

    resumen_json = {}
    for k in ['V', 'A', 'N', 'SIN']:
        v = resumen_rangos[k]
        resumen_json[k] = {
            'rango': k,
            'docentes': v['docentes'],
            'asignaciones': v['asignaciones'],
            'ues': len(v['ues']),
            'horas_total': int(round(v['horas_total'])),
            'estudiantes_atendidos': est_rango_enteros[k]
        }

    resumen_json['TOTAL'] = {
        'docentes': total_filas,
        'asignaciones': total_filas,
        'ues': len(tot_ues_all),
        'horas_total': int(round(tot_horas_all)),
        'estudiantes_atendidos': total_estudiantes_nacional
    }

    pct_esp = round((desalineacion_counts['fuera_especialidad'] / total_filas) * 100, 2)
    pct_ambos = round((desalineacion_counts['fuera_ambos'] / total_filas) * 100, 2)
    desalineacion_json = {
        'total_asignaciones_desalineadas': desalineacion_counts['total'],
        'docentes_unicos_afectados': desalineacion_counts['total'],
        'fuera_especialidad': desalineacion_counts['fuera_especialidad'],
        'fuera_nivel': 0,
        'fuera_ambos': desalineacion_counts['fuera_ambos'],
        'pct_fuera_especialidad': pct_esp,
        'pct_fuera_ambos': pct_ambos,
        'pct_fuera_nivel': 0.0
    }

    all_deptos = sorted(deptos_data.keys(), key=lambda d: deptos_orden.index(d) if d in deptos_orden else 99)
    por_depto_list = []
    for d in all_deptos:
        total_ues_depto = len(
            deptos_data[d]['V']['ues'] |
            deptos_data[d]['A']['ues'] |
            deptos_data[d]['N']['ues'] |
            deptos_data[d]['SIN']['ues']
        )
        d_dict = {'departamento': d, 'ues': total_ues_depto, 'rangos': {}}
        for rk in ['V', 'A', 'N', 'SIN']:
            d_dict['rangos'][rk] = {
                'docentes': deptos_data[d][rk]['docentes'],
                'ues': len(deptos_data[d][rk]['ues']),
                'horas': int(round(deptos_data[d][rk]['horas']))
            }
        por_depto_list.append(d_dict)

    por_nivel_list = []
    for n in sorted(niveles_data.keys()):
        ues_unicas_nivel = len(
            niveles_data[n]['V']['ues'] |
            niveles_data[n]['A']['ues'] |
            niveles_data[n]['N']['ues'] |
            niveles_data[n]['SIN']['ues']
        )
        n_dict = {'nivel': n, 'ues': ues_unicas_nivel, 'rangos': {}}
        for rk in ['V', 'A', 'N', 'SIN']:
            n_dict['rangos'][rk] = {
                'docentes': niveles_data[n][rk]['docentes'],
                'ues': len(niveles_data[n][rk]['ues']),
                'horas': int(round(niveles_data[n][rk]['horas']))
            }
        por_nivel_list.append(n_dict)

    # Estructura por Área
    por_area_json = {}
    for a_key in ['RURAL', 'URBANA']:
        a_info = area_resumen[a_key]
        a_tot = a_info['docentes']
        a_v = a_info['rangos']['V']['docentes']
        a_a = a_info['rangos']['A']['docentes']
        a_n = a_info['rangos']['N']['docentes']
        a_sin = a_info['rangos']['SIN']['docentes']

        por_area_json[a_key] = {
            'area': a_key,
            'docentes': a_tot,
            'pct_del_total': round((a_tot / total_filas) * 100, 2) if total_filas > 0 else 0.0,
            'ues': len(a_info['ues']),
            'horas_total': int(round(a_info['horas_total'])),
            'estudiantes_atendidos': estudiantes_por_area_calc.get(a_key, 0),
            'pct_alta': round((a_v / a_tot) * 100, 2) if a_tot > 0 else 0.0,
            'pct_media': round((a_a / a_tot) * 100, 2) if a_tot > 0 else 0.0,
            'pct_baja': round((a_n / a_tot) * 100, 2) if a_tot > 0 else 0.0,
            'pct_sin': round((a_sin / a_tot) * 100, 2) if a_tot > 0 else 0.0,
            'desalineados': a_n + a_sin,
            'pct_desalineados': round(((a_n + a_sin) / a_tot) * 100, 2) if a_tot > 0 else 0.0,
            'prioridad_formacion': a_a + a_n,
            'rangos': {
                rk: {
                    'rango': rk,
                    'docentes': a_info['rangos'][rk]['docentes'],
                    'pct': round((a_info['rangos'][rk]['docentes'] / a_tot) * 100, 2) if a_tot > 0 else 0.0,
                    'ues': len(a_info['rangos'][rk]['ues']),
                    'horas': int(round(a_info['rangos'][rk]['horas']))
                }
                for rk in ['V', 'A', 'N', 'SIN']
            }
        }

    # Estructura Departamento x Área
    por_depto_area_list = []
    for d in all_deptos:
        d_rural = deptos_area_data[d]['RURAL']
        d_urb = deptos_area_data[d]['URBANA']

        tot_r = d_rural['docentes']
        tot_u = d_urb['docentes']
        tot_d = tot_r + tot_u

        v_r = d_rural['V']['docentes']
        a_r = d_rural['A']['docentes']
        n_r = d_rural['N']['docentes']
        sin_r = d_rural['SIN']['docentes']

        v_u = d_urb['V']['docentes']
        a_u = d_urb['A']['docentes']
        n_u = d_urb['N']['docentes']
        sin_u = d_urb['SIN']['docentes']

        pct_alta_r = round((v_r / tot_r) * 100, 2) if tot_r > 0 else 0.0
        pct_alta_u = round((v_u / tot_u) * 100, 2) if tot_u > 0 else 0.0
        brecha_alta = round(pct_alta_u - pct_alta_r, 2)

        desal_r = n_r + sin_r
        desal_u = n_u + sin_u
        pct_desal_r = round((desal_r / tot_r) * 100, 2) if tot_r > 0 else 0.0
        pct_desal_u = round((desal_u / tot_u) * 100, 2) if tot_u > 0 else 0.0

        por_depto_area_list.append({
            'departamento': d,
            'total_docentes': tot_d,
            'total_ues': len(deptos_data[d]['V']['ues'] | deptos_data[d]['A']['ues'] | deptos_data[d]['N']['ues'] | deptos_data[d]['SIN']['ues']),
            'pct_rural_del_depto': round((tot_r / tot_d) * 100, 2) if tot_d > 0 else 0.0,
            'pct_urbana_del_depto': round((tot_u / tot_d) * 100, 2) if tot_d > 0 else 0.0,
            'brecha_alta_urbano_rural': brecha_alta,
            'brecha_desalineacion': round(pct_desal_r - pct_desal_u, 2),
            'rural': {
                'docentes': tot_r,
                'ues': len(d_rural['ues']),
                'horas': int(round(d_rural['horas'])),
                'pct_del_depto': round((tot_r / tot_d) * 100, 2) if tot_d > 0 else 0.0,
                'pct_alta': pct_alta_r,
                'pct_media': round((a_r / tot_r) * 100, 2) if tot_r > 0 else 0.0,
                'pct_baja': round((n_r / tot_r) * 100, 2) if tot_r > 0 else 0.0,
                'pct_sin': round((sin_r / tot_r) * 100, 2) if tot_r > 0 else 0.0,
                'desalineados': desal_r,
                'pct_desalineados': pct_desal_r,
                'prioridad_formacion': a_r + n_r,
                'V': {'docentes': v_r, 'pct': pct_alta_r, 'ues': len(d_rural['V']['ues'])},
                'A': {'docentes': a_r, 'pct': round((a_r / tot_r) * 100, 2) if tot_r > 0 else 0.0, 'ues': len(d_rural['A']['ues'])},
                'N': {'docentes': n_r, 'pct': round((n_r / tot_r) * 100, 2) if tot_r > 0 else 0.0, 'ues': len(d_rural['N']['ues'])},
                'SIN': {'docentes': sin_r, 'pct': round((sin_r / tot_r) * 100, 2) if tot_r > 0 else 0.0, 'ues': len(d_rural['SIN']['ues'])},
            },
            'urbana': {
                'docentes': tot_u,
                'ues': len(d_urb['ues']),
                'horas': int(round(d_urb['horas'])),
                'pct_del_depto': round((tot_u / tot_d) * 100, 2) if tot_d > 0 else 0.0,
                'pct_alta': pct_alta_u,
                'pct_media': round((a_u / tot_u) * 100, 2) if tot_u > 0 else 0.0,
                'pct_baja': round((n_u / tot_u) * 100, 2) if tot_u > 0 else 0.0,
                'pct_sin': round((sin_u / tot_u) * 100, 2) if tot_u > 0 else 0.0,
                'desalineados': desal_u,
                'pct_desalineados': pct_desal_u,
                'prioridad_formacion': a_u + n_u,
                'V': {'docentes': v_u, 'pct': pct_alta_u, 'ues': len(d_urb['V']['ues'])},
                'A': {'docentes': a_u, 'pct': round((a_u / tot_u) * 100, 2) if tot_u > 0 else 0.0, 'ues': len(d_urb['A']['ues'])},
                'N': {'docentes': n_u, 'pct': round((n_u / tot_u) * 100, 2) if tot_u > 0 else 0.0, 'ues': len(d_urb['N']['ues'])},
                'SIN': {'docentes': sin_u, 'pct': round((sin_u / tot_u) * 100, 2) if tot_u > 0 else 0.0, 'ues': len(d_urb['SIN']['ues'])},
            }
        })

    # 22 Especialidades Oficiales ESFM
    top_esp_list = []
    for esp_id, esp_nom in ESPECIALIDADES_22_OFICIALES:
        esp_val = especialidades_data[esp_nom]
        tot_esp = esp_val['docentes']
        dept_dict = {}
        for d_name in deptos_orden:
            dept_dict[d_name] = dict(esp_val['por_departamento'][d_name])
        top_esp_list.append({
            'especialidad': esp_nom,
            'docentes': tot_esp,
            'total_docentes': tot_esp,
            'ues': len(esp_val['ues']),
            'pct_alta': round((esp_val['V'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0,
            'pct_alta_pertinencia': round((esp_val['V'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0,
            'V': {'docentes': esp_val['V'], 'pct': round((esp_val['V'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0},
            'A': {'docentes': esp_val['A'], 'pct': round((esp_val['A'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0},
            'N': {'docentes': esp_val['N'], 'pct': round((esp_val['N'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0},
            'SIN': {'docentes': esp_val['SIN'], 'pct': round((esp_val['SIN'] / tot_esp) * 100, 2) if tot_esp > 0 else 0.0},
            'por_departamento': dept_dict
        })

    # Jubilación por depto y distrito
    jubilacion_json = {
        'nacional': jub_nacional,
        'por_departamento': [
            {'departamento': d, **v}
            for d, v in sorted(jub_por_depto.items(), key=lambda x: deptos_orden.index(x[0]) if x[0] in deptos_orden else 99)
        ],
        'por_distrito': [
            {'departamento': k[0], 'distrito': k[1], **v}
            for k, v in sorted(jub_por_distrito.items())
        ]
    }

    # NUEVO: Serializar No Prejubilados x No Pertinentes
    tot_no_prejub = prejub_pert_nac['no_prejubilados']['total']
    tot_no_prejub_no_pert = prejub_pert_nac['no_prejubilados']['no_pertinentes']
    tot_prejub = prejub_pert_nac['prejubilados']['total']
    tot_prejub_no_pert = prejub_pert_nac['prejubilados']['no_pertinentes']

    prejubilacion_pertinencia_json = {
        'nacional': {
            'total_docentes': total_filas,
            'prejubilados': {
                'total': tot_prejub,
                'pct_del_padron': round((tot_prejub / total_filas) * 100, 2) if total_filas > 0 else 0.0,
                'V': prejub_pert_nac['prejubilados']['V'],
                'A': prejub_pert_nac['prejubilados']['A'],
                'N': prejub_pert_nac['prejubilados']['N'],
                'SIN': prejub_pert_nac['prejubilados']['SIN'],
                'no_pertinentes': tot_prejub_no_pert,
                'pct_no_pertinentes': round((tot_prejub_no_pert / tot_prejub) * 100, 2) if tot_prejub > 0 else 0.0,
                'pct_alta': round((prejub_pert_nac['prejubilados']['V'] / tot_prejub) * 100, 2) if tot_prejub > 0 else 0.0
            },
            'no_prejubilados': {
                'total': tot_no_prejub,
                'pct_del_padron': round((tot_no_prejub / total_filas) * 100, 2) if total_filas > 0 else 0.0,
                'V': prejub_pert_nac['no_prejubilados']['V'],
                'A': prejub_pert_nac['no_prejubilados']['A'],
                'N': prejub_pert_nac['no_prejubilados']['N'],
                'SIN': prejub_pert_nac['no_prejubilados']['SIN'],
                'no_pertinentes': tot_no_prejub_no_pert,
                'pct_no_pertinentes': round((tot_no_prejub_no_pert / tot_no_prejub) * 100, 2) if tot_no_prejub > 0 else 0.0,
                'pct_alta': round((prejub_pert_nac['no_prejubilados']['V'] / tot_no_prejub) * 100, 2) if tot_no_prejub > 0 else 0.0
            },
            'candidatos_jubilacion': {
                'total': prejub_pert_nac['candidatos_jubilacion']['total'],
                'V': prejub_pert_nac['candidatos_jubilacion']['V'],
                'A': prejub_pert_nac['candidatos_jubilacion']['A'],
                'N': prejub_pert_nac['candidatos_jubilacion']['N'],
                'SIN': prejub_pert_nac['candidatos_jubilacion']['SIN'],
                'no_pertinentes': prejub_pert_nac['candidatos_jubilacion']['no_pertinentes'],
                'pct_alta': round((prejub_pert_nac['candidatos_jubilacion']['V'] / prejub_pert_nac['candidatos_jubilacion']['total']) * 100, 2) if prejub_pert_nac['candidatos_jubilacion']['total'] > 0 else 0.0,
            },
            'en_ejercicio': {
                'total': prejub_pert_nac['en_ejercicio']['total'],
                'V': prejub_pert_nac['en_ejercicio']['V'],
                'A': prejub_pert_nac['en_ejercicio']['A'],
                'N': prejub_pert_nac['en_ejercicio']['N'],
                'SIN': prejub_pert_nac['en_ejercicio']['SIN'],
                'no_pertinentes': prejub_pert_nac['en_ejercicio']['no_pertinentes'],
                'pct_alta': round((prejub_pert_nac['en_ejercicio']['V'] / prejub_pert_nac['en_ejercicio']['total']) * 100, 2) if prejub_pert_nac['en_ejercicio']['total'] > 0 else 0.0,
            },
            'no_prejubilados_no_pertinentes': tot_no_prejub_no_pert,
            'pct_no_prejubilados_no_pertinentes_sobre_total': round((tot_no_prejub_no_pert / total_filas) * 100, 2) if total_filas > 0 else 0.0,
            'pct_no_prejubilados_no_pertinentes_sobre_no_prejub': round((tot_no_prejub_no_pert / tot_no_prejub) * 100, 2) if tot_no_prejub > 0 else 0.0,
        },
        'por_departamento': [
            {
                'departamento': d,
                'total': prejub_pert_depto[d]['total'],
                'prejubilados': prejub_pert_depto[d]['prejubilados'],
                'no_prejubilados': prejub_pert_depto[d]['no_prejubilados'],
                'prejub_no_pert': prejub_pert_depto[d]['prejub_no_pert'],
                'prejub_v': prejub_pert_depto[d]['prejub_v'],
                'prejub_a': prejub_pert_depto[d]['prejub_a'],
                'prejub_n': prejub_pert_depto[d]['prejub_n'],
                'prejub_sin': prejub_pert_depto[d]['prejub_sin'],
                'no_prejub_no_pert': prejub_pert_depto[d]['no_prejub_no_pert'],
                'pct_no_prejub_no_pert': round((prejub_pert_depto[d]['no_prejub_no_pert'] / prejub_pert_depto[d]['no_prejubilados']) * 100, 2) if prejub_pert_depto[d]['no_prejubilados'] > 0 else 0.0,
                'no_prejub_v': prejub_pert_depto[d]['no_prejub_v'],
                'no_prejub_a': prejub_pert_depto[d]['no_prejub_a'],
                'no_prejub_n': prejub_pert_depto[d]['no_prejub_n'],
                'no_prejub_sin': prejub_pert_depto[d]['no_prejub_sin'],
                'jub_total': prejub_pert_depto[d]['jub_total'],
                'jub_v': prejub_pert_depto[d]['jub_v'],
                'jub_a': prejub_pert_depto[d]['jub_a'],
                'jub_n': prejub_pert_depto[d]['jub_n'],
                'jub_sin': prejub_pert_depto[d]['jub_sin'],
            }
            for d in all_deptos
        ]
    }

    # NUEVO: Serializar Métricas por Género
    tot_fem = genero_nac['femenino']['total']
    tot_masc = genero_nac['masculino']['total']
    genero_json = {
        'nacional': {
            'total_docentes': total_filas,
            'femenino': {
                'total': tot_fem,
                'pct_del_padron': round((tot_fem / total_filas) * 100, 2) if total_filas > 0 else 0.0,
                'V': genero_nac['femenino']['V'],
                'A': genero_nac['femenino']['A'],
                'N': genero_nac['femenino']['N'],
                'SIN': genero_nac['femenino']['SIN'],
                'pct_alta': round((genero_nac['femenino']['V'] / tot_fem) * 100, 2) if tot_fem > 0 else 0.0,
                'no_prejub_no_pert': genero_nac['femenino']['no_prejub_no_pert'],
            },
            'masculino': {
                'total': tot_masc,
                'pct_del_padron': round((tot_masc / total_filas) * 100, 2) if total_filas > 0 else 0.0,
                'V': genero_nac['masculino']['V'],
                'A': genero_nac['masculino']['A'],
                'N': genero_nac['masculino']['N'],
                'SIN': genero_nac['masculino']['SIN'],
                'pct_alta': round((genero_nac['masculino']['V'] / tot_masc) * 100, 2) if tot_masc > 0 else 0.0,
                'no_prejub_no_pert': genero_nac['masculino']['no_prejub_no_pert'],
            }
        },
        'por_departamento': [
            {
                'departamento': d,
                'total_femenino': genero_depto[d]['femenino']['total'],
                'pct_femenino_alta': round((genero_depto[d]['femenino']['V'] / genero_depto[d]['femenino']['total']) * 100, 2) if genero_depto[d]['femenino']['total'] > 0 else 0.0,
                'femenino_no_prejub_no_pert': genero_depto[d]['femenino']['no_prejub_no_pert'],
                'total_masculino': genero_depto[d]['masculino']['total'],
                'pct_masculino_alta': round((genero_depto[d]['masculino']['V'] / genero_depto[d]['masculino']['total']) * 100, 2) if genero_depto[d]['masculino']['total'] > 0 else 0.0,
                'masculino_no_prejub_no_pert': genero_depto[d]['masculino']['no_prejub_no_pert'],
            }
            for d in all_deptos
        ]
    }

    final_payload = {
        'resumen': resumen_json,
        'desalineacion': desalineacion_json,
        'por_area': por_area_json,
        'por_departamento': por_depto_list,
        'por_departamento_area': por_depto_area_list,
        'por_nivel': por_nivel_list,
        'por_especialidad': top_esp_list,
        'jubilacion': jubilacion_json,
        'prejubilacion_pertinencia': prejubilacion_pertinencia_json,
        'genero': genero_json
    }

    os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)
    print(f"pertinencia_data.json guardado exitosamente.")

    # Construir lista completa de Unidades Educativas / Unidades Académicas (UA)
    ue_list = []
    ue_jub_out = {}

    for id_ue, counts in ue_map.items():
        v = counts['V']
        a = counts['A']
        n = counts['N']
        sin = counts['SIN']
        total = counts['total']
        pct_alta = round((v / total) * 100, 1) if total > 0 else 0.0

        if v == total:
            diagnostico = "Alta Óptima (100%)"
        elif pct_alta >= 75.0:
            diagnostico = "Alta Pertinencia General"
        elif pct_alta >= 50.0:
            diagnostico = "Pertinencia Moderada"
        elif (n + sin) > v:
            diagnostico = "Prioritaria (Requiere Nivelación)"
        else:
            diagnostico = "Baja Pertinencia / Sin Pertinencia"

        distrito_principal = max(counts['distritos'].items(), key=lambda x: x[1])[0] if counts['distritos'] else 'DESCONOCIDO'
        lengua_principal = max(counts['lenguas'].items(), key=lambda x: x[1])[0] if counts['lenguas'] else 'Sin Registro'
        subsistema_principal = max(counts['subsistemas'].items(), key=lambda x: x[1])[0] if counts['subsistemas'] else 'Regular'
        turno_principal = max(counts['turnos'].items(), key=lambda x: x[1])[0] if counts['turnos'] else 'Mañana'
        dependencia_principal = max(counts['dependencias'].items(), key=lambda x: x[1])[0] if counts['dependencias'] else 'Fiscal'

        cord_x = counts['cord_x']
        cord_y = counts['cord_y']
        url_ubicacion = f"https://www.google.com/maps?q={cord_x},{cord_y}" if (cord_x is not None and cord_y is not None) else ""

        ue_item = {
            'cod_ue': id_ue,
            'departamento': counts['depto'],
            'distrito': distrito_principal,
            'ue': counts['ue'],
            'lengua_ensenanza': lengua_principal,
            'subsistema': subsistema_principal,
            'nivel_autorizado': counts['nivel_autorizado'] or 'Sin Registro',
            'turno': turno_principal,
            'dependencia': dependencia_principal,
            'direccion': counts['direccion'] or 'Sin Dirección Registrada',
            'cord_x': cord_x,
            'cord_y': cord_y,
            'url_ubicacion': url_ubicacion,
            'estudiantes': counts['estudiantes'],
            'docentes_alta_v': v,
            'docentes_media_a': a,
            'docentes_baja_n': n,
            'docentes_sin_pertinencia': sin,
            'total_docentes': total,
            'pct_alta_pertinencia': pct_alta,
            'prejubilados': counts['prejubilados'],
            'prejub_v': counts['prejub_v'],
            'prejub_a': counts['prejub_a'],
            'prejub_spc': counts['prejub_n'],
            'prejub_sfm': counts['prejub_sin'],
            'a_jubilar': counts['a_jubilar'],
            'jub_v': counts['jub_v'],
            'jub_a': counts['jub_a'],
            'jub_spc': counts['jub_n'],
            'jub_sfm': counts['jub_sin'],
            'genero_femenino': counts['genero_fem'],
            'genero_masculino': counts['genero_masc'],
            'diagnostico': diagnostico
        }
        ue_list.append(ue_item)

        ue_jub_out[str(id_ue)] = {
            'jubilacion': counts['a_jubilar'],
            'prejubilacion': counts['prejubilados'],
            'estudiantes': counts['estudiantes'],
            'dependencia': dependencia_principal
        }

    def sort_key(item):
        d = item['departamento']
        d_idx = deptos_orden.index(d) if d in deptos_orden else 99
        return (d_idx, item['distrito'], item['ue'])

    ue_list.sort(key=sort_key)

    with open(out_ue_json_path, 'w', encoding='utf-8') as f:
        json.dump(ue_list, f, ensure_ascii=False, indent=1)
    print(f"pertinencia_por_ue.json guardado con {len(ue_list)} UEs / UAs con coordenadas y campos completos.")

    with open(out_ue_jub_path, 'w', encoding='utf-8') as f:
        json.dump(ue_jub_out, f, ensure_ascii=False, indent=1)
    print(f"ue_jubilacion_data.json guardado.")

    print("==================================================")
    print(f"PROCESAMIENTO EXITOSO:")
    print(f"Docentes evaluados: {total_filas}")
    print(f"Alta (V): {resumen_rangos['V']['docentes']}")
    print(f"Media (A): {resumen_rangos['A']['docentes']}")
    print(f"Baja (N): {resumen_rangos['N']['docentes']}")
    print(f"Sin Pertinencia (SIN): {resumen_rangos['SIN']['docentes']}")
    print(f"No Prejubilados No Pertinentes: {tot_no_prejub_no_pert}")
    print(f"Docentes Femenino: {tot_fem} | Masculino: {tot_masc}")
    print(f"Total UEs consolidadas: {len(ue_list)}")
    print("==================================================")

if __name__ == "__main__":
    build_pertinencia_oficial()
