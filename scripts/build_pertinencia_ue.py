#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera el consolidado de Pertinencia por Unidad Educativa (UE).
Fuente: public/datos/Pertinencia_oficial - copia.xlsx
Destino: src/data/pertinencia_por_ue.json
"""

import os
import json
import openpyxl
from collections import defaultdict

def build_ue_summary():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    xlsx_path = os.path.join(root_dir, "public", "datos", "Pertinencia_oficial - copia.xlsx")
    out_json_path = os.path.join(root_dir, "src", "data", "pertinencia_por_ue.json")

    print(f"Cargando {xlsx_path}...")
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb.active

    # Clave: (depto, distrito, ue)
    ue_map = defaultdict(lambda: {'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0})

    deptos_orden = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"]

    for r in ws.iter_rows(min_row=2, values_only=True):
        depto = str(r[0]).strip().upper() if r[0] else 'DESCONOCIDO'
        distrito = str(r[1]).strip().upper() if r[1] else 'DESCONOCIDO'
        ue = str(r[2]).strip().upper() if r[2] else 'SIN NOMBRE'
        pert_raw = str(r[11]).strip().upper() if r[11] else 'SIN PERTINENCIA'

        if 'ALTA' in pert_raw or pert_raw == 'V':
            color = 'V'
        elif 'MEDIA' in pert_raw or pert_raw == 'A':
            color = 'A'
        elif 'BAJA' in pert_raw or pert_raw == 'N':
            color = 'N'
        else:
            color = 'SIN'

        key = (depto, distrito, ue)
        ue_map[key][color] += 1
        ue_map[key]['total'] += 1

    wb.close()
    print(f"Procesadas {len(ue_map)} Unidades Educativas únicas.")

    # Construir lista ordenada
    ue_list = []
    for (depto, distrito, ue), counts in ue_map.items():
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

        ue_list.append({
            'departamento': depto,
            'distrito': distrito,
            'ue': ue,
            'docentes_alta_v': v,
            'docentes_media_a': a,
            'docentes_baja_n': n,
            'docentes_sin_pertinencia': sin,
            'total_docentes': total,
            'pct_alta_pertinencia': pct_alta,
            'diagnostico': diagnostico
        })

    # Ordenar por Departamento oficial, Distrito y Nombre UE
    def sort_key(item):
        d = item['departamento']
        d_idx = deptos_orden.index(d) if d in deptos_orden else 99
        return (d_idx, item['distrito'], item['ue'])

    ue_list.sort(key=sort_key)

    os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump(ue_list, f, ensure_ascii=False, indent=1)

    print(f"Guardado exitoso en {out_json_path} con {len(ue_list)} UEs.")

if __name__ == "__main__":
    build_ue_summary()
