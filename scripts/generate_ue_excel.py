#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del reporte específico de Pertinencia por Unidad Educativa (UE).
Crea un libro Excel optimizado con todas las 16.313 UEs de Bolivia.
"""

import os
import sys
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

COLOR_NAVY = "0F172A"
COLOR_GOLD = "C9A751"
COLOR_GOLD_LIGHT = "FDF8ED"
COLOR_LIGHT_BG = "F8FAFC"
COLOR_BORDER = "CBD5E1"
COLOR_BORDER_DARK = "94A3B8"

font_title = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
font_subtitle = Font(name="Segoe UI", size=9, bold=False, color="F8FAFC")
font_section = Font(name="Segoe UI", size=11, bold=True, color="0F172A")
font_header = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
font_data = Font(name="Segoe UI", size=9, bold=False, color="0F172A")
font_bold = Font(name="Segoe UI", size=9, bold=True, color="0F172A")

fill_navy = PatternFill(start_color=COLOR_NAVY, end_color=COLOR_NAVY, fill_type="solid")
fill_gold = PatternFill(start_color=COLOR_GOLD, end_color=COLOR_GOLD, fill_type="solid")
fill_gold_light = PatternFill(start_color=COLOR_GOLD_LIGHT, end_color=COLOR_GOLD_LIGHT, fill_type="solid")
fill_zebra = PatternFill(start_color=COLOR_LIGHT_BG, end_color=COLOR_LIGHT_BG, fill_type="solid")

thin_side = Side(border_style="thin", color=COLOR_BORDER)
border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
border_double_bottom = Border(left=thin_side, right=thin_side, top=thin_side, bottom=Side(border_style="double", color=COLOR_BORDER_DARK))

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")
align_right = Alignment(horizontal="right", vertical="center")


def generate_ue_excel(output_path=None):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ue_json_path = os.path.join(root_dir, "src", "data", "pertinencia_por_ue.json")

    if not output_path:
        output_path = os.path.join(root_dir, "public", "exports", "Reporte_Pertinencia_Por_UE.xlsx")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if not os.path.exists(ue_json_path):
        print(f"Error: {ue_json_path} no encontrado", file=sys.stderr)
        sys.exit(1)

    with open(ue_json_path, "r", encoding="utf-8") as f:
        ue_data = json.load(f)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Pertinencia por UE"
    ws.views.sheetView[0].showGridLines = True

    cant_ue = f"{len(ue_data):,}".replace(",", ".")

    # Banner
    ws.merge_cells("A1:O1")
    c1 = ws["A1"]
    c1.value = "MINISTERIO DE EDUCACIÓN · ESTADO PLURINACIONAL DE BOLIVIA"
    c1.font = font_title
    c1.fill = fill_navy
    c1.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:O2")
    c2 = ws["A2"]
    c2.value = f"DIAGNÓSTICO OFICIAL DE PERTINENCIA CURRICULAR POR UNIDAD EDUCATIVA ({cant_ue} UEs)"
    c2.font = font_subtitle
    c2.fill = fill_navy
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18

    ws.merge_cells("A3:O3")
    ws["A3"].fill = fill_gold
    ws.row_dimensions[3].height = 3

    ws.cell(row=5, column=1, value=f"Padrón Consolidado por Unidad Educativa ({cant_ue} Establecimientos)").font = font_section

    headers = [
        "Código SIE",
        "Departamento",
        "Distrito Educativo",
        "Unidad Educativa",
        "Dependencia",
        "Estudiantes",
        "Alta Pertinencia (V)",
        "Media Pertinencia (A)",
        "Baja Pertinencia (N)",
        "Sin Pertinencia (SIN)",
        "Total Docentes",
        "% Pertinencia Alta",
        "Prejubilados",
        "A Jubilar",
        "Diagnóstico Pertinencia"
    ]

    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 24

    tot_v = tot_a = tot_n = tot_sin = tot_doc = 0
    curr_r = start_r + 1

    for row_idx, item in enumerate(ue_data):
        fill_curr = fill_zebra if row_idx % 2 == 1 else None
        v = item.get("docentes_alta_v", 0)
        a = item.get("docentes_media_a", 0)
        n = item.get("docentes_baja_n", 0)
        sin = item.get("docentes_sin_pertinencia", 0)
        total = item.get("total_docentes", 0)
        pct = (v / total) if total > 0 else 0.0

        tot_v += v
        tot_a += a
        tot_n += n
        tot_sin += sin
        tot_doc += total

        vals = [
            (item.get("cod_ue", ""), align_center, "@"),
            (item.get("departamento", ""), align_left, "@"),
            (item.get("distrito", ""), align_left, "@"),
            (item.get("ue", ""), align_left, "@"),
            (item.get("dependencia", ""), align_left, "@"),
            (item.get("estudiantes", 0), align_right, "#,##0"),
            (v, align_right, "#,##0"),
            (a, align_right, "#,##0"),
            (n, align_right, "#,##0"),
            (sin, align_right, "#,##0"),
            (total, align_right, "#,##0"),
            (pct, align_right, "0.0%"),
            (item.get("prejubilados", 0), align_right, "#,##0"),
            (item.get("a_jubilar", 0), align_right, "#,##0"),
            (item.get("diagnostico", ""), align_center, "@")
        ]

        for col_i, (val, al, num_fmt) in enumerate(vals, start=1):
            cell = ws.cell(row=curr_r, column=col_i, value=val)
            cell.font = font_data
            cell.alignment = al
            cell.border = border_cell
            cell.number_format = num_fmt
            if fill_curr:
                cell.fill = fill_curr

        ws.row_dimensions[curr_r].height = 18
        curr_r += 1

    # Fila de Totales
    ws.merge_cells(start_row=curr_r, start_column=1, end_row=curr_r, end_column=6)
    ws.cell(row=curr_r, column=1, value="TOTAL CONSOLIDADO NACIONAL").font = font_bold
    ws.cell(row=curr_r, column=1).alignment = align_center

    tot_pct = (tot_v / tot_doc) if tot_doc > 0 else 0.0
    tot_vals = [
        (7, tot_v, "#,##0"),
        (8, tot_a, "#,##0"),
        (9, tot_n, "#,##0"),
        (10, tot_sin, "#,##0"),
        (11, tot_doc, "#,##0"),
        (12, tot_pct, "0.0%"),
        (15, "Padrón Evaluado", "@")
    ]

    for c_i, val, num_fmt in tot_vals:
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.alignment = align_right if c_i < 15 else align_center
        cell.number_format = num_fmt

    for c_i in range(1, 16):
        cell = ws.cell(row=curr_r, column=c_i)
        cell.fill = fill_gold_light
        cell.border = border_double_bottom

    ws.row_dimensions[curr_r].height = 24

    ws.auto_filter.ref = f"A{start_r}:O{curr_r - 1}"

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 22
    ws.column_dimensions["D"].width = 38
    ws.column_dimensions["E"].width = 16
    ws.column_dimensions["F"].width = 14
    ws.column_dimensions["G"].width = 18
    ws.column_dimensions["H"].width = 18
    ws.column_dimensions["I"].width = 18
    ws.column_dimensions["J"].width = 20
    ws.column_dimensions["K"].width = 16
    ws.column_dimensions["L"].width = 18
    ws.column_dimensions["M"].width = 14
    ws.column_dimensions["N"].width = 14
    ws.column_dimensions["O"].width = 28

    wb.save(output_path)
    print(f"Reporte UE guardado en: {output_path}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else None
    generate_ue_excel(out)
