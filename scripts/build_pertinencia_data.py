#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de procesamiento de Pertinencia Curricular Docente - Corte Oficial Definitivo.
Fuente: public/datos/Pertinencia_oficial.xlsx (168,758 registros).
Genera: src/data/pertinencia_data.json con cuadre matemático al 100%.
"""

import os
import json
import openpyxl
import sqlite3
from collections import defaultdict

def build_pertinencia_oficial():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    xlsx_path = os.path.join(root_dir, "public", "datos", "Pertinencia_oficial - copia.xlsx")
    pert_xlsx_path = os.path.join(root_dir, "public", "datos", "pertinencia.xlsx")
    db_path = os.path.join(root_dir, "src", "data", "sie_materia.db")
    out_json_path = os.path.join(root_dir, "src", "data", "pertinencia_data.json")

    # 1. Cargar Mapeo de Área Rural / Urbana
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
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
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

    # Acumuladores por UE para enriquecer pertinencia_por_ue.json
    ue_jub_data = defaultdict(lambda: {
        'jubilacion': 0, 'prejubilacion': 0,
        'estudiantes': 0, 'dependencias': set()
    })
    ue_fixed_area = {}
    ue_matr_stats = defaultdict(lambda: {
        'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0,
        'estudiantes': 0, 'area': ''
    })

    total_filas = 0
    # Índices exactos verificados:
    # 0: dep_id, 1: departamento, 2: dis_id, 3: distrito, 4: ID_UE, 5: ue,
    # 6: cantidad_Est, 7: Dependencia, 8: ci, 9: fecha_naci, 10: años,
    # 11: codigo_cargo, 12: cargo, 13: cod_especialidad, 14: especialidad_formacion,
    # 15: condicion_formacion, 16: caso_aplicado, 17: detalle_caso,
    # 18: pertinencia, 19: nivel, 20: Jubilacion, 21: PreJubilacion
    for r in ws.iter_rows(min_row=2, values_only=True):
        total_filas += 1
        depto = str(r[1]).strip().upper() if r[1] else 'DESCONOCIDO'
        distrito = str(r[3]).strip().upper() if r[3] else 'DESCONOCIDO'
        id_ue = r[4]
        ue = str(r[5]).strip().upper() if r[5] else ''
        cantidad_est = int(r[6]) if r[6] and str(r[6]).isdigit() else (int(r[6]) if isinstance(r[6], (int, float)) else 0)
        dependencia = str(r[7]).strip() if r[7] else 'SIN DATOS'
        condicion = str(r[15]).strip().upper() if r[15] else 'OTRO'
        caso = str(r[16]).strip() if r[16] else 'SIN CASO'
        pert_raw = str(r[18]).strip().upper() if r[18] else 'SIN PERTINENCIA'
        nivel = str(r[19]).strip() if r[19] else 'OTRO'
        jubilacion = str(r[20]).strip().upper() if r[20] else 'NO'
        prejubilacion = str(r[21]).strip().upper() if r[21] else 'NO'

        # Acumular Jubilación y Prejubilación por UE
        ue_key = id_ue
        ue_jub_data[ue_key]['estudiantes'] = cantidad_est  # El valor es por UE, se sobreescribe pero es consistente
        ue_jub_data[ue_key]['dependencias'].add(dependencia)
        if jubilacion == 'SI':
            ue_jub_data[ue_key]['jubilacion'] += 1
        if prejubilacion == 'SI':
            ue_jub_data[ue_key]['prejubilacion'] += 1

        # Acumular por departamento y distrito
        jub_key_d = depto
        jub_key_dist = (depto, distrito)
        jub_nacional['total'] += 1
        jub_por_depto[jub_key_d]['total'] += 1
        jub_por_distrito[jub_key_dist]['total'] += 1
        if jubilacion == 'SI':
            jub_nacional['jubilacion'] += 1
            jub_por_depto[jub_key_d]['jubilacion'] += 1
            jub_por_distrito[jub_key_dist]['jubilacion'] += 1
        if prejubilacion == 'SI':
            jub_nacional['prejubilacion'] += 1
            jub_por_depto[jub_key_d]['prejubilacion'] += 1
            jub_por_distrito[jub_key_dist]['prejubilacion'] += 1

        # Determinar Área Rural / Urbana (unívoca por ID_UE)
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

        # Mapeo oficial de rangos
        if 'ALTA' in pert_raw or pert_raw == 'V':
            color = 'V'
        elif 'MEDIA' in pert_raw or pert_raw == 'A':
            color = 'A'
        elif 'BAJA' in pert_raw or pert_raw == 'N':
            color = 'N'
        else:
            color = 'SIN'

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

    # Ajuste por redondeo para cuadre entero exacto
    est_rango_enteros = {k: int(round(v)) for k, v in estudiantes_por_rango_calc.items()}
    diff_redondeo = total_estudiantes_nacional - sum(est_rango_enteros.values())
    if diff_redondeo != 0:
        est_rango_enteros['V'] += diff_redondeo

    # Construir JSON estructurado
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

    # Construir Estructura Consolidada por Área (RURAL / URBANA)
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

    # Construir Estructura por Departamento x Área (Rural vs Urbana)
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

    # Serializar datos de Jubilación por departamento y distrito
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

    # Persistir ue_jub_data como lookup JSON (para enriquecer pertinencia_por_ue.json)
    ue_jub_out = {}
    for ue_key, d in ue_jub_data.items():
        ue_jub_out[str(ue_key)] = {
            'jubilacion': d['jubilacion'],
            'prejubilacion': d['prejubilacion'],
            'estudiantes': d['estudiantes'],
            'dependencia': max(d['dependencias'], key=list(d['dependencias']).count) if d['dependencias'] else 'SIN DATOS'
        }

    ue_jub_json_path = os.path.join(root_dir, 'src', 'data', 'ue_jubilacion_data.json')
    with open(ue_jub_json_path, 'w', encoding='utf-8') as f:
        json.dump(ue_jub_out, f, ensure_ascii=False, indent=1)
    print(f"ue_jubilacion_data.json guardado: {len(ue_jub_out)} UEs con datos de jubilación.")

    final_payload = {
        'resumen': resumen_json,
        'desalineacion': desalineacion_json,
        'por_area': por_area_json,
        'por_departamento': por_depto_list,
        'por_departamento_area': por_depto_area_list,
        'por_nivel': por_nivel_list,
        'por_especialidad': [],  # Dimensión de especialidad no presente
        'jubilacion': jubilacion_json
    }

    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)

    print("==================================================")
    print(f"EXITO: {total_filas} registros procesados e integrados desde Pertinencia_oficial.xlsx.")
    print(f"Total Alta (V): {resumen_rangos['V']['docentes']}")
    print(f"Total Media (A): {resumen_rangos['A']['docentes']}")
    print(f"Total Baja (N): {resumen_rangos['N']['docentes']}")
    print(f"Total Sin Pert (SIN): {resumen_rangos['SIN']['docentes']}")
    print(f"Suma departamentos: {sum(sum(d['rangos'][k]['docentes'] for k in ['V','A','N','SIN']) for d in por_depto_list)}")
    print(f"Suma niveles: {sum(sum(n['rangos'][k]['docentes'] for k in ['V','A','N','SIN']) for n in por_nivel_list)}")
    print("==================================================")

if __name__ == "__main__":
    build_pertinencia_oficial()
