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

    # Índices exactos verificados (22 columnas):
    # 0: dep_id, 1: departamento, 2: dis_id, 3: distrito, 4: ID_UE, 5: ue,
    # 6: cantidad_Est, 7: Dependencia, 8: ci, 9: fecha_naci, 10: años,
    # 11: codigo_cargo, 12: cargo, 13: cod_especialidad, 14: especialidad_formacion,
    # 15: condicion_formacion, 16: caso_aplicado, 17: detalle_caso,
    # 18: pertinencia, 19: nivel, 20: Jubilacion, 21: PreJubilacion

    # Mapeo unívoco por ID_UE (código numérico oficial del establecimiento)
    ue_map = defaultdict(lambda: {
        'depto': '',
        'distritos': defaultdict(int),
        'ue': '',
        'V': 0, 'A': 0, 'N': 0, 'SIN': 0, 'total': 0,
        'estudiantes': 0, 'dependencia': 'SIN DATOS',
        'prejubilados': 0, 'a_jubilar': 0
    })

    deptos_orden = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"]

    for r in ws.iter_rows(min_row=2, values_only=True):
        depto    = str(r[1]).strip().upper() if r[1] else 'DESCONOCIDO'
        distrito = str(r[3]).strip().upper() if r[3] else 'DESCONOCIDO'
        id_ue    = int(r[4]) if r[4] and str(r[4]).isdigit() else r[4]
        ue       = str(r[5]).strip().upper() if r[5] else 'SIN NOMBRE'
        cantidad_est = int(r[6]) if isinstance(r[6], (int, float)) else 0
        dependencia  = str(r[7]).strip() if r[7] else 'SIN DATOS'
        pert_raw     = str(r[18]).strip().upper() if r[18] else 'SIN PERTINENCIA'
        jubilacion   = str(r[20]).strip().upper() if r[20] else 'NO'
        prejubilacion = str(r[21]).strip().upper() if r[21] else 'NO'

        if 'ALTA' in pert_raw or pert_raw == 'V':
            color = 'V'
        elif 'MEDIA' in pert_raw or pert_raw == 'A':
            color = 'A'
        elif 'BAJA' in pert_raw or pert_raw == 'N':
            color = 'N'
        else:
            color = 'SIN'

        rec = ue_map[id_ue]
        rec['depto'] = depto
        rec['distritos'][distrito] += 1
        rec['ue'] = ue
        rec[color] += 1
        rec['total'] += 1
        rec['estudiantes'] = cantidad_est
        if dependencia != 'SIN DATOS':
            rec['dependencia'] = dependencia
        if jubilacion == 'SI':
            rec['a_jubilar'] += 1
        if prejubilacion == 'SI':
            rec['prejubilados'] += 1

    wb.close()
    print(f"Procesadas {len(ue_map)} Unidades Educativas únicas (por ID_UE).")

    # Construir lista ordenada
    ue_list = []
    for id_ue, counts in ue_map.items():
        v   = counts['V']
        a   = counts['A']
        n   = counts['N']
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

        # Distrito con mayor cantidad de docentes asociados
        distrito_principal = max(counts['distritos'].items(), key=lambda x: x[1])[0] if counts['distritos'] else 'DESCONOCIDO'

        ue_list.append({
            'cod_ue': id_ue,
            'departamento': counts['depto'],
            'distrito': distrito_principal,
            'ue': counts['ue'],
            'dependencia': counts['dependencia'],
            'estudiantes': counts['estudiantes'],
            'docentes_alta_v': v,
            'docentes_media_a': a,
            'docentes_baja_n': n,
            'docentes_sin_pertinencia': sin,
            'total_docentes': total,
            'pct_alta_pertinencia': pct_alta,
            'prejubilados': counts['prejubilados'],
            'a_jubilar': counts['a_jubilar'],
            'diagnostico': diagnostico
        })

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
