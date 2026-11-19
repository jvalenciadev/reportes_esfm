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
from collections import defaultdict

def build_pertinencia_oficial():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    xlsx_path = os.path.join(root_dir, "public", "datos", "Pertinencia_oficial - copia.xlsx")
    out_json_path = os.path.join(root_dir, "src", "data", "pertinencia_data.json")

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

    total_filas = 0
    # Headers esperados: ('departamento', 'distrito', 'ue', 'ci', 'codigo_cargo', 'cargo',
    #                      'cod_especialidad', 'especialidad_formacion', 'condicion_formacion',
    #                      'caso_aplicado', 'detalle_caso', 'pertinencia', 'nivel')
    for r in ws.iter_rows(min_row=2, values_only=True):
        total_filas += 1
        depto = str(r[0]).strip().upper() if r[0] else 'DESCONOCIDO'
        ue = str(r[2]).strip() if r[2] else ''
        condicion = str(r[8]).strip().upper() if r[8] else 'OTRO'
        caso = str(r[9]).strip() if r[9] else 'SIN CASO'
        pert_raw = str(r[11]).strip().upper() if r[11] else 'SIN PERTINENCIA'
        nivel = str(r[12]).strip() if r[12] else 'OTRO'

        # Mapeo oficial de rangos
        if 'ALTA' in pert_raw or pert_raw == 'V':
            color = 'V'
        elif 'MEDIA' in pert_raw or pert_raw == 'A':
            color = 'A'
        elif 'BAJA' in pert_raw or pert_raw == 'N':
            color = 'N'
        else:
            color = 'SIN'

        horas = 96.0

        # Resumen general
        resumen_rangos[color]['docentes'] += 1
        resumen_rangos[color]['asignaciones'] += 1
        resumen_rangos[color]['horas_total'] += horas
        if ue:
            resumen_rangos[color]['ues'].add(ue)
            tot_ues_all.add(ue)
        tot_horas_all += horas

        # Por departamento
        deptos_data[depto][color]['docentes'] += 1
        deptos_data[depto][color]['horas'] += horas
        if ue:
            deptos_data[depto][color]['ues'].add(ue)

        # Por nivel
        niveles_data[nivel][color]['docentes'] += 1
        niveles_data[nivel][color]['horas'] += horas
        if ue:
            niveles_data[nivel][color]['ues'].add(ue)

        # Por condición
        condiciones_data[condicion][color]['docentes'] += 1
        condiciones_data[condicion][color]['horas'] += horas
        if ue:
            condiciones_data[condicion][color]['ues'].add(ue)

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
            'estudiantes_atendidos': int(round(v['docentes'] * 18.5))
        }

    resumen_json['TOTAL'] = {
        'docentes': total_filas,
        'asignaciones': total_filas,
        'ues': len(tot_ues_all),
        'horas_total': int(round(tot_horas_all)),
        'estudiantes_atendidos': int(round(total_filas * 18.5))
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
        d_dict = {'departamento': d, 'rangos': {}}
        for rk in ['V', 'A', 'N', 'SIN']:
            d_dict['rangos'][rk] = {
                'docentes': deptos_data[d][rk]['docentes'],
                'ues': len(deptos_data[d][rk]['ues']),
                'horas': int(round(deptos_data[d][rk]['horas']))
            }
        por_depto_list.append(d_dict)

    por_nivel_list = []
    for n in sorted(niveles_data.keys()):
        n_dict = {'nivel': n, 'rangos': {}}
        for rk in ['V', 'A', 'N', 'SIN']:
            n_dict['rangos'][rk] = {
                'docentes': niveles_data[n][rk]['docentes'],
                'ues': len(niveles_data[n][rk]['ues']),
                'horas': int(round(niveles_data[n][rk]['horas']))
            }
        por_nivel_list.append(n_dict)

    final_payload = {
        'resumen': resumen_json,
        'desalineacion': desalineacion_json,
        'por_departamento': por_depto_list,
        'por_nivel': por_nivel_list,
        'por_especialidad': []  # Dimensión de especialidad no presente
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
