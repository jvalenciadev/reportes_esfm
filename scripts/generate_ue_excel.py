#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del reporte específico de Pertinencia por Unidad Educativa (UE / UA).
Crea un libro Excel optimizado con todas las 16.308 UEs de Bolivia,
incluyendo Subsistema, Nivel Autorizado, Turno, Dirección, Coordenadas X/Y y URL de Ubicación Real en Google Maps.
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
COLOR_BLUE_LINK = "1D4ED8"

font_title = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
font_subtitle = Font(name="Segoe UI", size=9, bold=False, color="F8FAFC")
font_section = Font(name="Segoe UI", size=11, bold=True, color="0F172A")
font_header = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
font_data = Font(name="Segoe UI", size=9, bold=False, color="0F172A")
font_bold = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
font_link = Font(name="Segoe UI", size=9, bold=True, color=COLOR_BLUE_LINK, underline="single")

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
    ws.title = "Pertinencia por UE - UA"
    ws.views.sheetView[0].showGridLines = True

    cant_ue = f"{len(ue_data):,}".replace(",", ".")

    # Banner
    max_col_letter = "X"
    ws.merge_cells(f"A1:{max_col_letter}1")
    c1 = ws["A1"]
    c1.value = "MINISTERIO DE EDUCACIÓN · ESTADO PLURINACIONAL DE BOLIVIA"
    c1.font = font_title
    c1.fill = fill_navy
    c1.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30

    ws.merge_cells(f"A2:{max_col_letter}2")
    c2 = ws["A2"]
    c2.value = f"DIAGNÓSTICO OFICIAL DE PERTINENCIA CURRICULAR POR UNIDAD EDUCATIVA / UNIDAD ACADÉMICA ({cant_ue} UEs / UAs)"
    c2.font = font_subtitle
    c2.fill = fill_navy
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18

    ws.merge_cells(f"A3:{max_col_letter}3")
    ws["A3"].fill = fill_gold
    ws.row_dimensions[3].height = 3

    ws.cell(row=5, column=1, value=f"Padrón Consolidado por Unidad Educativa / UA ({cant_ue} Establecimientos con Geolocalización y Subsistema)").font = font_section

    headers = [
        "Código SIE",
        "Departamento",
        "Distrito Educativo",
        "Unidad Educativa / UA",
        "Subsistema",
        "Nivel Autorizado",
        "1º Lengua Enseñanza",
        "Turno",
        "Dependencia",
        "Dirección",
        "Cord X (Latitud)",
        "Cord Y (Longitud)",
        "URL Ubicación Real",
        "Estudiantes",
        "Alta Pertinencia (V)",
        "Media Pertinencia (A)",
        "Baja Pertinencia (N)",
        "Sin Pertinencia (SIN)",
        "Total Docentes",
        "% Pertinencia Alta",
        "Prejubilados",
        "No Prejubilados No Pertinentes",
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

    tot_v = tot_a = tot_n = tot_sin = tot_doc = tot_prejub = tot_no_prejub_no_pert = tot_jub = tot_est = 0
    curr_r = start_r + 1

    for row_idx, item in enumerate(ue_data):
        fill_curr = fill_zebra if row_idx % 2 == 1 else None
        v = item.get("docentes_alta_v", 0)
        a = item.get("docentes_media_a", 0)
        n = item.get("docentes_baja_n", 0)
        sin = item.get("docentes_sin_pertinencia", 0)
        total = item.get("total_docentes", 0)
        pct = (v / total) if total > 0 else 0.0
        prejub = item.get("prejubilados", 0)
        no_prejub_np = item.get("no_prejubilados_no_pertinentes", 0)
        jub = item.get("a_jubilar", 0)
        est = item.get("estudiantes", 0)

        tot_v += v
        tot_a += a
        tot_n += n
        tot_sin += sin
        tot_doc += total
        tot_prejub += prejub
        tot_no_prejub_no_pert += no_prejub_np
        tot_jub += jub
        tot_est += est

        url_map = item.get("url_ubicacion", "")

        vals = [
            (item.get("cod_ue", ""), align_center, "@", False),
            (item.get("departamento", ""), align_left, "@", False),
            (item.get("distrito", ""), align_left, "@", False),
            (item.get("ue", ""), align_left, "@", False),
            (item.get("subsistema", "Regular"), align_left, "@", False),
            (item.get("nivel_autorizado", ""), align_left, "@", False),
            (item.get("lengua_ensenanza", "Sin Registro"), align_left, "@", False),
            (item.get("turno", ""), align_center, "@", False),
            (item.get("dependencia", ""), align_center, "@", False),
            (item.get("direccion", ""), align_left, "@", False),
            (item.get("cord_x"), align_right, "0.0000000", False),
            (item.get("cord_y"), align_right, "0.0000000", False),
            ("Ver en Mapa" if url_map else "Sin Coordenadas", align_center, "@", bool(url_map)),
            (est, align_right, "#,##0", False),
            (v, align_right, "#,##0", False),
            (a, align_right, "#,##0", False),
            (n, align_right, "#,##0", False),
            (sin, align_right, "#,##0", False),
            (total, align_right, "#,##0", False),
            (pct, align_right, "0.0%", False),
            (prejub, align_right, "#,##0", False),
            (no_prejub_np, align_right, "#,##0", False),
            (jub, align_right, "#,##0", False),
            (item.get("diagnostico", ""), align_center, "@", False)
        ]

        for col_i, (val, al, num_fmt, is_link) in enumerate(vals, start=1):
            cell = ws.cell(row=curr_r, column=col_i, value=val)
            cell.alignment = al
            cell.border = border_cell
            cell.number_format = num_fmt
            if is_link:
                cell.font = font_link
                cell.hyperlink = url_map
            else:
                cell.font = font_data
            if fill_curr:
                cell.fill = fill_curr

        ws.row_dimensions[curr_r].height = 18
        curr_r += 1

    # Fila de Totales Consolidados Nacionales
    ws.merge_cells(start_row=curr_r, start_column=1, end_row=curr_r, end_column=13)
    c_tot = ws.cell(row=curr_r, column=1, value="TOTAL CONSOLIDADO NACIONAL")
    c_tot.font = font_bold
    c_tot.alignment = align_center

    tot_pct = (tot_v / tot_doc) if tot_doc > 0 else 0.0
    tot_vals = [
        (14, tot_est, "#,##0"),
        (15, tot_v, "#,##0"),
        (16, tot_a, "#,##0"),
        (17, tot_n, "#,##0"),
        (18, tot_sin, "#,##0"),
        (19, tot_doc, "#,##0"),
        (20, tot_pct, "0.0%"),
        (21, tot_prejub, "#,##0"),
        (22, tot_no_prejub_no_pert, "#,##0"),
        (23, tot_jub, "#,##0"),
        (24, "Padrón Auditado 100%", "@")
    ]

    for c_i, val, num_fmt in tot_vals:
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.alignment = align_right if c_i < 24 else align_center
        cell.number_format = num_fmt

    for c_i in range(1, 25):
        cell = ws.cell(row=curr_r, column=c_i)
        cell.fill = fill_gold_light
        cell.border = border_double_bottom

    ws.row_dimensions[curr_r].height = 24
    ws.auto_filter.ref = f"A{start_r}:{max_col_letter}{curr_r - 1}"

    # Anchos de columna balanceados
    widths = {
        "A": 13, "B": 15, "C": 20, "D": 36, "E": 22, "F": 18, "G": 28, "H": 12, "I": 14,
        "J": 30, "K": 16, "L": 16, "M": 18, "N": 14, "O": 18, "P": 18, "Q": 18,
        "R": 18, "S": 15, "T": 16, "U": 14, "V": 26, "W": 14, "X": 28
    }
    for col_letter, w in widths.items():
        ws.column_dimensions[col_letter].width = w

    wb.save(output_path)
    print(f"Reporte UE / UA guardado exitosamente en: {output_path}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else None
    generate_ue_excel(out)
