#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Reporte Ejecutivo de Pertinencia Curricular Docente (SEP - Bolivia)
Genera un archivo Excel (.xlsx) institucional con tablas analíticas y gráficos nativos de alta fidelidad.
"""

import sys
import os
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import PieChart, BarChart, Reference, Series
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint

# Paleta oficial institucional
COLOR_NAVY = "0F172A"       # Azul institucional profundo
COLOR_GOLD = "C9A751"       # Acento dorado oficial
COLOR_GOLD_LIGHT = "FDF8ED" # Fondo suave dorado
COLOR_LIGHT_BG = "F8FAFC"   # Fondo gris suave
COLOR_BORDER = "CBD5E1"     # Borde gris claro
COLOR_BORDER_DARK = "94A3B8"# Borde gris medio

# Colores de Rangos de Pertinencia
COLOR_V = "059669"   # Verde - Alta Pertinencia
COLOR_A = "2563EB"   # Azul - Media Pertinencia
COLOR_N = "EA580C"   # Naranja - Baja Pertinencia
COLOR_SIN = "64748B" # Pizarra - Sin Pertinencia

# Estilos reutilizables
font_title = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
font_subtitle = Font(name="Segoe UI", size=9, bold=False, color="F8FAFC")
font_section = Font(name="Segoe UI", size=11, bold=True, color="0F172A")
font_header = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
font_data = Font(name="Segoe UI", size=9, bold=False, color="0F172A")
font_bold = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
font_kpi_num = Font(name="Segoe UI", size=15, bold=True, color="0F172A")
font_kpi_lbl = Font(name="Segoe UI", size=8, bold=True, color="64748B")

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


def apply_header_banner(ws, title: str, subtitle: str, max_col: int = 10):
    """Inserta el banner superior institucional de dos filas con línea divisoria."""
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max_col)
    cell_t = ws.cell(row=1, column=1)
    cell_t.value = title
    cell_t.font = font_title
    cell_t.fill = fill_navy
    cell_t.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 30

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max_col)
    cell_s = ws.cell(row=2, column=1)
    cell_s.value = subtitle
    cell_s.font = font_subtitle
    cell_s.fill = fill_navy
    cell_s.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 18

    # Línea dorada separadora
    ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=max_col)
    cell_line = ws.cell(row=3, column=1)
    cell_line.fill = fill_gold
    ws.row_dimensions[3].height = 3


def adjust_column_widths(ws, min_width=11, padding=3):
    """Autoajusta los anchos de columna para una visualización pulcra."""
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            # Ignorar filas de banners mergeados
            if cell.row in [1, 2, 3]:
                continue
            if cell.value is not None:
                txt = str(cell.value)
                if len(txt) > max_len and len(txt) < 55:
                    max_len = len(txt)
        ws.column_dimensions[col_letter].width = max(max_len + padding, min_width)


def create_sheet_resumen(wb, data):
    """Hoja 1: Resumen Ejecutivo, Rangos y Desalineación."""
    ws = wb.active
    ws.title = "1. Resumen y Rangos"
    ws.views.sheetView[0].showGridLines = True

    resumen = data.get("resumen", {})
    desalineacion = data.get("desalineacion", {})
    totales = resumen.get("TOTAL", {})

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "DIAGNÓSTICO INTEGRAL DE PERTINENCIA CURRICULAR DOCENTE - SEP (BID COMPONENTE 2)",
        max_col=18
    )

    # ── Tarjetas KPI Ejecutivos (Filas 5-6)
    kpis = [
        ("UNIVERSO DE REGISTROS", totales.get("docentes", 0), 1, 2),
        ("PERTINENCIA IDÓNEA (SI)", resumen.get("V", {}).get("docentes", 0) + resumen.get("A", {}).get("docentes", 0), 3, 4),
        ("UNIDADES EDUCATIVAS", totales.get("ues", 0), 5, 6),
        ("HORAS TOTALES IMPARTIDAS", totales.get("horas_total", 0), 7, 8),
    ]

    for title, val, c1, c2 in kpis:
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
        cell_lbl = ws.cell(row=5, column=c1)
        cell_lbl.value = title
        cell_lbl.font = font_kpi_lbl
        cell_lbl.alignment = align_center
        cell_lbl.fill = fill_gold_light

        ws.merge_cells(start_row=6, start_column=c1, end_row=6, end_column=c2)
        cell_val = ws.cell(row=6, column=c1)
        cell_val.value = val
        cell_val.font = font_kpi_num
        cell_val.number_format = "#,##0"
        cell_val.alignment = align_center
        cell_val.fill = fill_gold_light

        for r in range(5, 7):
            for c in range(c1, c2 + 1):
                ws.cell(row=r, column=c).border = border_cell

    ws.row_dimensions[5].height = 18
    ws.row_dimensions[6].height = 26

    # ── Bloque 1: Distribución por Rango Normativo (Fila 8)
    ws.cell(row=8, column=1, value="1. Distribución Nacional por Rango de Pertinencia").font = font_section

    headers_rangos = [
        "Rango", "Denominación Oficial", "Docentes", "% Docentes",
        "Asignaciones", "UEs", "Horas Impartidas", "Estudiantes"
    ]
    start_r = 9
    for col_idx, h in enumerate(headers_rangos, start=1):
        c = ws.cell(row=start_r, column=col_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    rangos_info = [
        ("V", "Rango V · Alta Pertinencia (Idóneo)", resumen.get("V", {})),
        ("A", "Rango A · Media Pertinencia (Afín)", resumen.get("A", {})),
        ("N", "Rango N · Baja Pertinencia (Sin correspondencia con el cargo)", resumen.get("N", {})),
        ("SIN", "Rango SIN · Técnico Sup. / Universitario / Otros", resumen.get("SIN", {})),
    ]

    total_doc = totales.get("docentes", 1)
    curr_r = start_r + 1
    for r_code, r_denom, r_data in rangos_info:
        docs = r_data.get("docentes", 0)
        asigs = r_data.get("asignaciones", 0)
        ues = r_data.get("ues", 0)
        horas = r_data.get("horas_total", 0)
        est = r_data.get("estudiantes_atendidos", 0)
        pct = docs / total_doc if total_doc > 0 else 0

        ws.cell(row=curr_r, column=1, value=r_code).alignment = align_center
        ws.cell(row=curr_r, column=2, value=r_denom).alignment = align_left
        ws.cell(row=curr_r, column=3, value=docs).number_format = "#,##0"
        ws.cell(row=curr_r, column=4, value=pct).number_format = "0.0%"
        ws.cell(row=curr_r, column=5, value=asigs).number_format = "#,##0"
        ws.cell(row=curr_r, column=6, value=ues).number_format = "#,##0"
        ws.cell(row=curr_r, column=7, value=horas).number_format = "#,##0"
        ws.cell(row=curr_r, column=8, value=est).number_format = "#,##0"

        for c in range(1, 9):
            cell = ws.cell(row=curr_r, column=c)
            cell.font = font_data
            cell.border = border_cell
            if c >= 3:
                cell.alignment = align_right

        badge_cell = ws.cell(row=curr_r, column=1)
        badge_cell.font = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        if r_code == "V":
            badge_cell.fill = PatternFill(start_color=COLOR_V, end_color=COLOR_V, fill_type="solid")
        elif r_code == "A":
            badge_cell.fill = PatternFill(start_color=COLOR_A, end_color=COLOR_A, fill_type="solid")
        elif r_code == "N":
            badge_cell.fill = PatternFill(start_color=COLOR_N, end_color=COLOR_N, fill_type="solid")
        else:
            badge_cell.fill = PatternFill(start_color=COLOR_SIN, end_color=COLOR_SIN, fill_type="solid")

        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Fila Total
    ws.cell(row=curr_r, column=1, value="TOTAL").alignment = align_center
    ws.cell(row=curr_r, column=2, value="TOTAL GENERAL NACIONAL").alignment = align_left
    ws.cell(row=curr_r, column=3, value=totales.get("docentes", 0)).number_format = "#,##0"
    ws.cell(row=curr_r, column=4, value=1.0).number_format = "0.0%"
    ws.cell(row=curr_r, column=5, value=totales.get("asignaciones", 0)).number_format = "#,##0"
    ws.cell(row=curr_r, column=6, value=totales.get("ues", 0)).number_format = "#,##0"
    ws.cell(row=curr_r, column=7, value=totales.get("horas_total", 0)).number_format = "#,##0"
    ws.cell(row=curr_r, column=8, value=totales.get("estudiantes_atendidos", 0)).number_format = "#,##0"

    for c in range(1, 9):
        cell = ws.cell(row=curr_r, column=c)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if c >= 3:
            cell.alignment = align_right
    ws.row_dimensions[curr_r].height = 22

    # ── Gráfico 1: PieChart de Distribución de Pertinencia (Limpio, en J8)
    chart_pie = PieChart()
    chart_pie.title = "Distribución de Docentes por Rango de Pertinencia"
    chart_pie.width = 17
    chart_pie.height = 9.5

    data_ref = Reference(ws, min_col=3, min_row=start_r, max_row=start_r + 4)
    cats_ref = Reference(ws, min_col=2, min_row=start_r + 1, max_row=start_r + 4)
    chart_pie.add_data(data_ref, titles_from_data=True)
    chart_pie.set_categories(cats_ref)

    chart_pie.dataLabels = DataLabelList()
    chart_pie.dataLabels.showPercent = True
    chart_pie.dataLabels.showVal = False

    colors = [COLOR_V, COLOR_A, COLOR_N, COLOR_SIN]
    for idx, col_hex in enumerate(colors):
        dp = DataPoint(idx=idx)
        dp.graphicalProperties.solidFill = col_hex
        chart_pie.series[0].data_points.append(dp)

    # Ubicado a la derecha de la tabla en J8 (sin solaparse con nada)
    ws.add_chart(chart_pie, "J8")

    # ── Bloque 2: Desalineación Curricular Crítica (Fila 17)
    row_desal = 17
    ws.cell(row=row_desal, column=1, value="2. Análisis de Desalineación Curricular").font = font_section

    headers_desal = ["Tipo de Desalineación Curricular", "Asignaciones", "% Padrón"]
    for col_idx, h in enumerate(headers_desal, start=1):
        c = ws.cell(row=row_desal + 1, column=col_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[row_desal + 1].height = 22

    desal_items = [
        ("Fuera de especialidad de egreso",
         desalineacion.get("fuera_especialidad", 0),
         desalineacion.get("pct_fuera_especialidad", 0) / 100.0),
        ("Fuera de nivel de enseñanza",
         desalineacion.get("fuera_nivel", 0),
         desalineacion.get("pct_fuera_nivel", 0) / 100.0),
        ("Desalineación combinada (Ambos factores)",
         desalineacion.get("fuera_ambos", 0),
         desalineacion.get("pct_fuera_ambos", 0) / 100.0),
    ]

    for idx, (label, val, pct_v) in enumerate(desal_items):
        r_num = row_desal + 2 + idx
        c1 = ws.cell(row=r_num, column=1, value=label)
        c2 = ws.cell(row=r_num, column=2, value=val)
        c3 = ws.cell(row=r_num, column=3, value=pct_v)

        c1.alignment = align_left
        c2.alignment = align_right
        c3.alignment = align_right

        c2.number_format = "#,##0"
        c3.number_format = "0.00%"

        for c_idx in [1, 2, 3]:
            c = ws.cell(row=r_num, column=c_idx)
            c.font = font_data
            c.border = border_cell
            if idx % 2 == 1:
                c.fill = fill_zebra
        ws.row_dimensions[r_num].height = 20

    # Fila Total Desalineación
    row_total_desal = row_desal + 2 + len(desal_items)
    tot_desal_asigs = desalineacion.get("total_asignaciones_desalineadas", 0)
    pct_total_desal = tot_desal_asigs / totales.get("asignaciones", 1)

    c1 = ws.cell(row=row_total_desal, column=1, value="TOTAL ASIGNACIONES DESALINEADAS")
    c2 = ws.cell(row=row_total_desal, column=2, value=tot_desal_asigs)
    c3 = ws.cell(row=row_total_desal, column=3, value=pct_total_desal)

    c1.alignment = align_left
    c2.alignment = align_right
    c3.alignment = align_right

    c2.number_format = "#,##0"
    c3.number_format = "0.00%"

    for c_idx in [1, 2, 3]:
        c = ws.cell(row=row_total_desal, column=c_idx)
        c.font = font_bold
        c.fill = fill_gold_light
        c.border = border_double_bottom
    ws.row_dimensions[row_total_desal].height = 22

    # ── Gráfico 2: Columnas Verticales de Desalineación (En J20, SIN solapamiento con J8)
    chart_desal = BarChart()
    chart_desal.type = "col"
    chart_desal.title = "Causas de Desalineación Curricular Docente"
    chart_desal.width = 17
    chart_desal.height = 8.5
    chart_desal.legend = None

    # Solo las 3 causas individuales (excluye fila total para no distorsionar escala)
    data_desal_ref = Reference(ws, min_col=2, min_row=row_desal + 1, max_row=row_desal + 4)
    cats_desal_ref = Reference(ws, min_col=1, min_row=row_desal + 2, max_row=row_desal + 4)
    chart_desal.add_data(data_desal_ref, titles_from_data=True)
    chart_desal.set_categories(cats_desal_ref)

    chart_desal.y_axis.title = "Asignaciones"
    chart_desal.x_axis.title = "Causa"

    chart_desal.dataLabels = DataLabelList()
    chart_desal.dataLabels.showVal = True

    if chart_desal.series:
        chart_desal.series[0].graphicalProperties.solidFill = COLOR_N

    # Ubicado a la derecha de la tabla de desalineación en E18 (utiliza columnas E a I sin tocar el gráfico 1 en J6)
    ws.add_chart(chart_desal, "E18")

    adjust_column_widths(ws)
    ws.column_dimensions["B"].width = 44
    ws.column_dimensions["I"].width = 4  # Columna separadora


def create_sheet_departamentos(wb, data):
    """Hoja 2: Pertinencia Territorial por Departamento con Gráfico al Lado."""
    ws = wb.create_sheet(title="2. Por Departamento")
    ws.views.sheetView[0].showGridLines = True

    deptos = data.get("por_departamento", [])

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "ESTRUCTURA DE PERTINENCIA CURRICULAR POR DEPARTAMENTO (SEP)",
        max_col=22
    )

    ws.cell(row=5, column=1, value="Distribución Territorial de Docentes por Rango de Pertinencia").font = font_section

    headers = [
        "Departamento",
        "Alta (V)",
        "Media (A)",
        "Baja (N)",
        "Sin Pert. (SIN)",
        "Total Docentes",
        "% Alta",
        "% Idóneo (V+A)",
        "Total Horas",
        "UEs"
    ]

    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    tot_v = tot_a = tot_n = tot_sin = tot_doc = tot_hrs = tot_ues = 0

    curr_r = start_r + 1
    for d in deptos:
        d_name = d.get("departamento", "")
        r = d.get("rangos", {})
        v_doc = r.get("V", {}).get("docentes", 0)
        a_doc = r.get("A", {}).get("docentes", 0)
        n_doc = r.get("N", {}).get("docentes", 0)
        sin_doc = r.get("SIN", {}).get("docentes", 0)
        total_d = v_doc + a_doc + n_doc + sin_doc

        hrs_d = sum(r.get(k, {}).get("horas", 0) for k in ["V", "A", "N", "SIN"])
        ues_d = d.get("ues", max(r.get(k, {}).get("ues", 0) for k in ["V", "A", "N", "SIN"])) if total_d > 0 else 0

        tot_v += v_doc
        tot_a += a_doc
        tot_n += n_doc
        tot_sin += sin_doc
        tot_doc += total_d
        tot_hrs += hrs_d
        tot_ues += ues_d

        pct_alta = v_doc / total_d if total_d > 0 else 0
        pct_idoneo = (v_doc + a_doc) / total_d if total_d > 0 else 0

        ws.cell(row=curr_r, column=1, value=d_name).alignment = align_left
        ws.cell(row=curr_r, column=2, value=v_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=3, value=a_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=4, value=n_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=5, value=sin_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=6, value=total_d).number_format = "#,##0"
        ws.cell(row=curr_r, column=7, value=pct_alta).number_format = "0.0%"
        ws.cell(row=curr_r, column=8, value=pct_idoneo).number_format = "0.0%"
        ws.cell(row=curr_r, column=9, value=hrs_d).number_format = "#,##0"
        ws.cell(row=curr_r, column=10, value=ues_d).number_format = "#,##0"

        for col_i in range(1, 11):
            cell = ws.cell(row=curr_r, column=col_i)
            cell.font = font_data
            cell.border = border_cell
            if col_i >= 2:
                cell.alignment = align_right
            if (curr_r % 2) == 0:
                cell.fill = fill_zebra

        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Fila Total General
    pct_alta_nac = tot_v / tot_doc if tot_doc > 0 else 0
    pct_id_nac = (tot_v + tot_a) / tot_doc if tot_doc > 0 else 0

    ws.cell(row=curr_r, column=1, value="TOTAL GENERAL NACIONAL").alignment = align_left
    ws.cell(row=curr_r, column=2, value=tot_v).number_format = "#,##0"
    ws.cell(row=curr_r, column=3, value=tot_a).number_format = "#,##0"
    ws.cell(row=curr_r, column=4, value=tot_n).number_format = "#,##0"
    ws.cell(row=curr_r, column=5, value=tot_sin).number_format = "#,##0"
    ws.cell(row=curr_r, column=6, value=tot_doc).number_format = "#,##0"
    ws.cell(row=curr_r, column=7, value=pct_alta_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=8, value=pct_id_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=9, value=tot_hrs).number_format = "#,##0"
    ws.cell(row=curr_r, column=10, value=tot_ues).number_format = "#,##0"

    for col_i in range(1, 11):
        cell = ws.cell(row=curr_r, column=col_i)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if col_i >= 2:
            cell.alignment = align_right
    ws.row_dimensions[curr_r].height = 22

    # ── Gráfico 3: Stacked Column Chart colocado a la DERECHA en L5 (Visible inmediatamente)
    chart = BarChart()
    chart.type = "col"
    chart.grouping = "stacked"
    chart.overlap = 100
    chart.title = "Composición de Pertinencia Docente por Departamento"
    chart.width = 20
    chart.height = 11.5

    chart.legend.legendPos = "t"
    chart.x_axis.title = "Departamento"
    chart.y_axis.title = "Cantidad de Docentes"

    data_ref = Reference(ws, min_col=2, min_row=start_r, max_col=5, max_row=start_r + len(deptos))
    cats_ref = Reference(ws, min_col=1, min_row=start_r + 1, max_row=start_r + len(deptos))
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats_ref)

    colors = [COLOR_V, COLOR_A, COLOR_N, COLOR_SIN]
    for idx, s in enumerate(chart.series):
        if idx < len(colors):
            s.graphicalProperties.solidFill = colors[idx]

    # Ubicado al lado de la tabla en L5 (separador columna K)
    ws.add_chart(chart, "L5")

    adjust_column_widths(ws)
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["K"].width = 4  # Separador visual


def create_sheet_niveles(wb, data):
    """Hoja 3: Pertinencia por Nivel Educativo con Gráfico al Lado."""
    ws = wb.create_sheet(title="3. Por Nivel Educativo")
    ws.views.sheetView[0].showGridLines = True

    niveles = data.get("por_nivel", [])

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "PERTINENCIA CURRICULAR POR NIVEL Y SUBSISTEMA EDUCATIVO",
        max_col=22
    )

    ws.cell(row=5, column=1, value="Distribución por Nivel de Enseñanza").font = font_section

    headers = [
        "Nivel Educativo",
        "Alta (V)",
        "Media (A)",
        "Baja (N)",
        "Sin Pert. (SIN)",
        "Total Docentes",
        "% Alta",
        "% Idóneo (V+A)",
        "Total Horas",
        "UEs"
    ]

    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    tot_v = tot_a = tot_n = tot_sin = tot_doc = tot_hrs = tot_ues = 0

    curr_r = start_r + 1
    for n in niveles:
        n_name = n.get("nivel", "")
        r = n.get("rangos", {})
        v_doc = r.get("V", {}).get("docentes", 0)
        a_doc = r.get("A", {}).get("docentes", 0)
        n_doc = r.get("N", {}).get("docentes", 0)
        sin_doc = r.get("SIN", {}).get("docentes", 0)
        total_n = v_doc + a_doc + n_doc + sin_doc

        hrs_n = sum(r.get(k, {}).get("horas", 0) for k in ["V", "A", "N", "SIN"])
        ues_n = n.get("ues", max(r.get(k, {}).get("ues", 0) for k in ["V", "A", "N", "SIN"])) if total_n > 0 else 0

        tot_v += v_doc
        tot_a += a_doc
        tot_n += n_doc
        tot_sin += sin_doc
        tot_doc += total_n
        tot_hrs += hrs_n

        pct_alta = v_doc / total_n if total_n > 0 else 0
        pct_idoneo = (v_doc + a_doc) / total_n if total_n > 0 else 0

        ws.cell(row=curr_r, column=1, value=n_name).alignment = align_left
        ws.cell(row=curr_r, column=2, value=v_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=3, value=a_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=4, value=n_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=5, value=sin_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=6, value=total_n).number_format = "#,##0"
        ws.cell(row=curr_r, column=7, value=pct_alta).number_format = "0.0%"
        ws.cell(row=curr_r, column=8, value=pct_idoneo).number_format = "0.0%"
        ws.cell(row=curr_r, column=9, value=hrs_n).number_format = "#,##0"
        ws.cell(row=curr_r, column=10, value=ues_n).number_format = "#,##0"

        for col_i in range(1, 11):
            cell = ws.cell(row=curr_r, column=col_i)
            cell.font = font_data
            cell.border = border_cell
            if col_i >= 2:
                cell.alignment = align_right
            if (curr_r % 2) == 0:
                cell.fill = fill_zebra

        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Fila Total General
    pct_alta_nac = tot_v / tot_doc if tot_doc > 0 else 0
    pct_id_nac = (tot_v + tot_a) / tot_doc if tot_doc > 0 else 0
    tot_ues_nac = data.get("resumen", {}).get("TOTAL", {}).get("ues", 16308)

    ws.cell(row=curr_r, column=1, value="TOTAL GENERAL NACIONAL").alignment = align_left
    ws.cell(row=curr_r, column=2, value=tot_v).number_format = "#,##0"
    ws.cell(row=curr_r, column=3, value=tot_a).number_format = "#,##0"
    ws.cell(row=curr_r, column=4, value=tot_n).number_format = "#,##0"
    ws.cell(row=curr_r, column=5, value=tot_sin).number_format = "#,##0"
    ws.cell(row=curr_r, column=6, value=tot_doc).number_format = "#,##0"
    ws.cell(row=curr_r, column=7, value=pct_alta_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=8, value=pct_id_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=9, value=tot_hrs).number_format = "#,##0"
    ws.cell(row=curr_r, column=10, value=tot_ues_nac).number_format = "#,##0"

    for col_i in range(1, 11):
        cell = ws.cell(row=curr_r, column=col_i)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if col_i >= 2:
            cell.alignment = align_right
    ws.row_dimensions[curr_r].height = 22

    # Nota técnica aclaratoria
    curr_r += 1
    ws.merge_cells(start_row=curr_r, start_column=1, end_row=curr_r, end_column=10)
    note_cell = ws.cell(row=curr_r, column=1, value="* NOTA TÉCNICA: Los establecimientos educativos en Bolivia suelen impartir múltiples niveles (Inicial, Primaria, Secundaria). La columna 'UEs' reporta los establecimientos con presencia en cada nivel; el Total Nacional corresponde a las 16.308 Unidades Educativas únicas del país (Padrón Oficial SIE).")
    note_cell.font = Font(name="Segoe UI", size=8, italic=True, color="64748B")
    note_cell.alignment = align_left

    # ── Gráfico 4: Columna agrupada colocado a la DERECHA en L5
    chart = BarChart()
    chart.type = "col"
    chart.title = "Docentes por Nivel Educativo y Rango de Pertinencia"
    chart.width = 19
    chart.height = 10.5
    chart.legend.legendPos = "t"
    chart.x_axis.title = "Nivel Educativo"
    chart.y_axis.title = "Docentes"

    data_ref = Reference(ws, min_col=2, min_row=start_r, max_col=5, max_row=start_r + len(niveles))
    cats_ref = Reference(ws, min_col=1, min_row=start_r + 1, max_row=start_r + len(niveles))
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats_ref)

    colors = [COLOR_V, COLOR_A, COLOR_N, COLOR_SIN]
    for idx, s in enumerate(chart.series):
        if idx < len(colors):
            s.graphicalProperties.solidFill = colors[idx]

    ws.add_chart(chart, "L5")

    adjust_column_widths(ws)
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["K"].width = 4  # Separador visual


def create_sheet_especialidades(wb, data):
    """Hoja 4: Matriz Detallada por Especialidad Oficial Docente con Gráfico Top 10."""
    ws = wb.create_sheet(title="4. Por Especialidad")
    ws.views.sheetView[0].showGridLines = True

    especialidades = data.get("por_especialidad", [])

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "PERTINENCIA POR ESPECIALIDAD ACADÉMICA DEL MAGISTERIO (SEP)",
        max_col=22
    )

    ws.cell(row=5, column=1, value="Matriz Analítica de Especialidades de Egresados ESFM/Normal").font = font_section

    headers = [
        "Especialidad Oficial",
        "Alta (V)",
        "Media (A)",
        "Baja (N)",
        "Sin Pert. (SIN)",
        "Total Docentes",
        "% Alta",
        "% Idóneo (V+A)",
        "Horas Totales",
        "UEs"
    ]

    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    tot_v = tot_a = tot_n = tot_sin = tot_doc = tot_hrs = tot_ues = 0

    curr_r = start_r + 1
    for esp in especialidades:
        esp_name = esp.get("especialidad", "")
        r = esp.get("rangos", {})
        v_doc = r.get("V", {}).get("docentes", 0)
        a_doc = r.get("A", {}).get("docentes", 0)
        n_doc = r.get("N", {}).get("docentes", 0)
        sin_doc = r.get("SIN", {}).get("docentes", 0)
        total_e = esp.get("docentes", v_doc + a_doc + n_doc + sin_doc)
        hrs_e = esp.get("horas", 0)
        ues_e = esp.get("ues", 0)

        tot_v += v_doc
        tot_a += a_doc
        tot_n += n_doc
        tot_sin += sin_doc
        tot_doc += total_e
        tot_hrs += hrs_e
        tot_ues += ues_e

        pct_alta = v_doc / total_e if total_e > 0 else 0
        pct_idoneo = (v_doc + a_doc) / total_e if total_e > 0 else 0

        ws.cell(row=curr_r, column=1, value=esp_name).alignment = align_left
        ws.cell(row=curr_r, column=2, value=v_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=3, value=a_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=4, value=n_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=5, value=sin_doc).number_format = "#,##0"
        ws.cell(row=curr_r, column=6, value=total_e).number_format = "#,##0"
        ws.cell(row=curr_r, column=7, value=pct_alta).number_format = "0.0%"
        ws.cell(row=curr_r, column=8, value=pct_idoneo).number_format = "0.0%"
        ws.cell(row=curr_r, column=9, value=hrs_e).number_format = "#,##0"
        ws.cell(row=curr_r, column=10, value=ues_e).number_format = "#,##0"

        for col_i in range(1, 11):
            cell = ws.cell(row=curr_r, column=col_i)
            cell.font = font_data
            cell.border = border_cell
            if col_i >= 2:
                cell.alignment = align_right
            if (curr_r % 2) == 0:
                cell.fill = fill_zebra

        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Total General
    pct_alta_nac = tot_v / tot_doc if tot_doc > 0 else 0
    pct_id_nac = (tot_v + tot_a) / tot_doc if tot_doc > 0 else 0

    ws.cell(row=curr_r, column=1, value="TOTAL GENERAL").alignment = align_left
    ws.cell(row=curr_r, column=2, value=tot_v).number_format = "#,##0"
    ws.cell(row=curr_r, column=3, value=tot_a).number_format = "#,##0"
    ws.cell(row=curr_r, column=4, value=tot_n).number_format = "#,##0"
    ws.cell(row=curr_r, column=5, value=tot_sin).number_format = "#,##0"
    ws.cell(row=curr_r, column=6, value=tot_doc).number_format = "#,##0"
    ws.cell(row=curr_r, column=7, value=pct_alta_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=8, value=pct_id_nac).number_format = "0.0%"
    ws.cell(row=curr_r, column=9, value=tot_hrs).number_format = "#,##0"
    ws.cell(row=curr_r, column=10, value=tot_ues).number_format = "#,##0"

    for col_i in range(1, 11):
        cell = ws.cell(row=curr_r, column=col_i)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if col_i >= 2:
            cell.alignment = align_right
    ws.row_dimensions[curr_r].height = 22

    # ── Gráfico 5: Barras Horizontales Top 8 Especialidades por Docentes (en L5)
    chart = BarChart()
    chart.type = "bar"
    chart.title = "Top Especialidades con Mayor Volumen Docente"
    chart.width = 19
    chart.height = 13
    chart.legend = None

    chart.x_axis.title = "Docentes"
    chart.y_axis.title = "Especialidad"

    # Tomar las primeras 8 especialidades (que concentran el mayor volumen)
    max_top = min(8, len(especialidades))
    data_ref = Reference(ws, min_col=6, min_row=start_r, max_row=start_r + max_top)
    cats_ref = Reference(ws, min_col=1, min_row=start_r + 1, max_row=start_r + max_top)
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(cats_ref)

    chart.dataLabels = DataLabelList()
    chart.dataLabels.showVal = True

    if chart.series:
        chart.series[0].graphicalProperties.solidFill = COLOR_A

    ws.add_chart(chart, "L5")

    adjust_column_widths(ws)
    ws.column_dimensions["A"].width = 48
    ws.column_dimensions["K"].width = 4  # Separador visual


def create_sheet_cruzada(wb, data):
    """Hoja 5: Matriz Territorial Cruzada Especialidad x Departamento."""
    ws = wb.create_sheet(title="5. Territorial Cruzado")
    ws.views.sheetView[0].showGridLines = True

    especialidades = data.get("por_especialidad", [])
    deptos = ["BENI", "CHUQUISACA", "COCHABAMBA", "LA PAZ", "ORURO", "PANDO", "POTOSI", "SANTA CRUZ", "TARIJA"]

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "MATRIZ TERRITORIAL CRUZADA: ESPECIALIDAD VS DEPARTAMENTO (TOTAL DOCENTES)",
        max_col=12
    )

    ws.cell(row=5, column=1, value="Distribución Geográfica de Docentes por Especialidad").font = font_section

    headers = ["Especialidad Oficial"] + deptos + ["TOTAL NACIONAL"]
    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    totales_deptos = {d: 0 for d in deptos}
    gran_total = 0

    curr_r = start_r + 1
    for esp in especialidades:
        esp_name = esp.get("especialidad", "")
        por_dep = esp.get("por_departamento", {})

        row_total = 0
        ws.cell(row=curr_r, column=1, value=esp_name).alignment = align_left

        for idx, d in enumerate(deptos, start=2):
            val = por_dep.get(d, {}).get("total", 0)
            ws.cell(row=curr_r, column=idx, value=val).number_format = "#,##0"
            row_total += val
            totales_deptos[d] += val

        ws.cell(row=curr_r, column=len(deptos) + 2, value=row_total).number_format = "#,##0"
        gran_total += row_total

        for col_i in range(1, len(deptos) + 3):
            cell = ws.cell(row=curr_r, column=col_i)
            cell.font = font_data
            cell.border = border_cell
            if col_i >= 2:
                cell.alignment = align_right
            if (curr_r % 2) == 0:
                cell.fill = fill_zebra

        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Fila Total Departamento
    ws.cell(row=curr_r, column=1, value="TOTAL GENERAL").alignment = align_left
    for idx, d in enumerate(deptos, start=2):
        ws.cell(row=curr_r, column=idx, value=totales_deptos[d]).number_format = "#,##0"
    ws.cell(row=curr_r, column=len(deptos) + 2, value=gran_total).number_format = "#,##0"

    for col_i in range(1, len(deptos) + 3):
        cell = ws.cell(row=curr_r, column=col_i)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if col_i >= 2:
            cell.alignment = align_right
    ws.row_dimensions[curr_r].height = 22

    adjust_column_widths(ws)
    ws.column_dimensions["A"].width = 48


def create_sheet_ue(wb, ue_data):
    """Hoja 4: Padrón Consolidado de Pertinencia por Unidad Educativa / UA con Geolocalización."""
    ws = wb.create_sheet(title="4. Pertinencia por UE")
    ws.views.sheetView[0].showGridLines = True

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "DIAGNÓSTICO OFICIAL DE PERTINENCIA CURRICULAR POR UNIDAD EDUCATIVA / UNIDAD ACADÉMICA (UE / UA)",
        max_col=18
    )

    cant_ue = f"{len(ue_data):,}".replace(",", ".")
    ws.cell(row=5, column=1, value=f"Padrón Consolidado por Unidad Educativa / UA ({cant_ue} Establecimientos)").font = font_section

    headers = [
        "Código SIE",
        "Departamento",
        "Distrito Educativo",
        "Unidad Educativa / UA",
        "Subsistema",
        "Nivel Autorizado",
        "Turno",
        "Dependencia",
        "Dirección",
        "Cord X",
        "Cord Y",
        "Alta Pertinencia (V)",
        "Media Pertinencia (A)",
        "Baja Pertinencia (N)",
        "Sin Pertinencia (SIN)",
        "Total Docentes",
        "% Pertinencia Alta",
        "No Prejubilados No Pertinentes",
        "Diagnóstico Oficial"
    ]

    start_r = 6
    for c_idx, h in enumerate(headers, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 24

    tot_v = tot_a = tot_n = tot_sin = tot_doc = tot_no_prejub_np = 0
    curr_r = start_r + 1

    for row_idx, item in enumerate(ue_data):
        fill_curr = fill_zebra if row_idx % 2 == 1 else None
        v = item.get("docentes_alta_v", 0)
        a = item.get("docentes_media_a", 0)
        n = item.get("docentes_baja_n", 0)
        sin = item.get("docentes_sin_pertinencia", 0)
        total = item.get("total_docentes", 0)
        pct = (v / total) if total > 0 else 0.0
        no_prejub_np = item.get("no_prejubilados_no_pertinentes", 0)

        tot_v += v
        tot_a += a
        tot_n += n
        tot_sin += sin
        tot_doc += total
        tot_no_prejub_np += no_prejub_np

        vals = [
            (item.get("cod_ue", ""), align_center, "@"),
            (item.get("departamento", ""), align_left, "@"),
            (item.get("distrito", ""), align_left, "@"),
            (item.get("ue", ""), align_left, "@"),
            (item.get("subsistema", "Regular"), align_left, "@"),
            (item.get("nivel_autorizado", ""), align_left, "@"),
            (item.get("turno", ""), align_center, "@"),
            (item.get("dependencia", ""), align_center, "@"),
            (item.get("direccion", ""), align_left, "@"),
            (item.get("cord_x"), align_right, "0.0000000"),
            (item.get("cord_y"), align_right, "0.0000000"),
            (v, align_right, "#,##0"),
            (a, align_right, "#,##0"),
            (n, align_right, "#,##0"),
            (sin, align_right, "#,##0"),
            (total, align_right, "#,##0"),
            (pct, align_right, "0.0%"),
            (no_prejub_np, align_right, "#,##0"),
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
    ws.merge_cells(start_row=curr_r, start_column=1, end_row=curr_r, end_column=11)
    ws.cell(row=curr_r, column=1, value="TOTAL CONSOLIDADO NACIONAL").font = font_bold
    ws.cell(row=curr_r, column=1).alignment = align_center

    tot_pct = (tot_v / tot_doc) if tot_doc > 0 else 0.0
    tot_vals = [
        (12, tot_v, "#,##0"),
        (13, tot_a, "#,##0"),
        (14, tot_n, "#,##0"),
        (15, tot_sin, "#,##0"),
        (16, tot_doc, "#,##0"),
        (17, tot_pct, "0.0%"),
        (18, tot_no_prejub_np, "#,##0"),
        (19, "Padrón Evaluado 100%", "@")
    ]

    for c_i, val, num_fmt in tot_vals:
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.alignment = align_right if c_i < 19 else align_center
        cell.number_format = num_fmt

    for c_i in range(1, 20):
        cell = ws.cell(row=curr_r, column=c_i)
        cell.fill = fill_gold_light
        cell.border = border_double_bottom

    ws.row_dimensions[curr_r].height = 24

    ws.auto_filter.ref = f"A{start_r}:S{curr_r - 1}"

    ws.column_dimensions["A"].width = 13
    ws.column_dimensions["B"].width = 15
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 34
    ws.column_dimensions["E"].width = 16
    ws.column_dimensions["F"].width = 24
    ws.column_dimensions["G"].width = 12
    ws.column_dimensions["H"].width = 14
    ws.column_dimensions["I"].width = 26
    ws.column_dimensions["J"].width = 14
    ws.column_dimensions["K"].width = 14
    ws.column_dimensions["L"].width = 18
    ws.column_dimensions["M"].width = 18
    ws.column_dimensions["N"].width = 18
    ws.column_dimensions["O"].width = 18
    ws.column_dimensions["P"].width = 15
    ws.column_dimensions["Q"].width = 16
    ws.column_dimensions["R"].width = 24
    ws.column_dimensions["S"].width = 28


def create_sheet_rural_urbano(wb, data: dict):
    """Crea la hoja de Pertinencia Curricular por Área Rural vs Urbana por Departamento."""
    deptos_area = data.get("por_departamento_area", [])
    por_area = data.get("por_area", {})
    if not deptos_area:
        return

    ws = wb.create_sheet(title="Rural vs Urbano")
    apply_header_banner(
        ws,
        "PERTINENCIA CURRICULAR POR ÁREA: RURAL VS URBANA POR DEPARTAMENTO",
        "Diagnóstico Comparativo de Idoneidad Curricular Docente · Sistema Educativo Plurinacional (SEP)",
        max_col=10,
    )

    # KPIs Superiores
    r_info = por_area.get("RURAL", {})
    u_info = por_area.get("URBANA", {})

    r_doc = r_info.get("docentes", 0)
    u_doc = u_info.get("docentes", 0)
    tot_doc = r_doc + u_doc

    r_alta = r_info.get("pct_alta", 0.0)
    u_alta = u_info.get("pct_alta", 0.0)
    brecha_nac = round(u_alta - r_alta, 2)

    kpis = [
        ("ÁREA RURAL NACIONAL", f"{r_doc:,.0f} doc. ({r_info.get('pct_del_total', 0)}%)", f"{r_alta}% Alta Pertinencia", COLOR_GOLD_LIGHT),
        ("ÁREA URBANA NACIONAL", f"{u_doc:,.0f} doc. ({u_info.get('pct_del_total', 0)}%)", f"{u_alta}% Alta Pertinencia", "EFF6FF"),
        ("BRECHA TERRITORIAL", f"{brecha_nac:+.2f} pp diferencia", "Urbana vs Rural", "F0FDF4"),
    ]

    for k_i, (k_t, k_v1, k_v2, k_bg) in enumerate(kpis):
        col_st = 1 + k_i * 3
        col_en = col_st + 2
        ws.merge_cells(start_row=5, start_column=col_st, end_row=5, end_column=col_en)
        ws.merge_cells(start_row=6, start_column=col_st, end_row=6, end_column=col_en)
        ws.merge_cells(start_row=7, start_column=col_st, end_row=7, end_column=col_en)

        c1 = ws.cell(row=5, column=col_st, value=k_t)
        c1.font = font_kpi_lbl
        c1.alignment = align_center

        c2 = ws.cell(row=6, column=col_st, value=k_v1)
        c2.font = font_kpi_num
        c2.alignment = align_center

        c3 = ws.cell(row=7, column=col_st, value=k_v2)
        c3.font = font_bold
        c3.alignment = align_center

        k_fill = PatternFill(start_color=k_bg, end_color=k_bg, fill_type="solid")
        for r_x in range(5, 8):
            for c_x in range(col_st, col_en + 1):
                cell = ws.cell(row=r_x, column=c_x)
                cell.fill = k_fill
                cell.border = border_cell

    # Tabla de Datos por Departamento
    headers = [
        "Departamento",
        "Padrón Total",
        "Doc. Rural",
        "% Rural",
        "Alta Rural (%)",
        "Doc. Urbano",
        "% Urbano",
        "Alta Urbano (%)",
        "Brecha (U - R)",
        "Prioridad Rural (A+N)",
    ]

    start_r = 9
    for col_idx, h_text in enumerate(headers, 1):
        cell = ws.cell(row=start_r, column=col_idx, value=h_text)
        cell.font = font_header
        cell.fill = fill_navy
        cell.alignment = align_center
        cell.border = border_cell
    ws.row_dimensions[start_r].height = 24

    curr_r = start_r + 1
    for idx, d in enumerate(deptos_area):
        row_fill = fill_zebra if idx % 2 == 1 else PatternFill(fill_type=None)

        vals = [
            (d["departamento"], align_left, "@"),
            (d["total_docentes"], align_right, "#,##0"),
            (d["rural"]["docentes"], align_right, "#,##0"),
            (d["pct_rural_del_depto"] / 100.0, align_center, "0.0%"),
            (d["rural"]["pct_alta"] / 100.0, align_right, "0.0%"),
            (d["urbana"]["docentes"], align_right, "#,##0"),
            (d["pct_urbana_del_depto"] / 100.0, align_center, "0.0%"),
            (d["urbana"]["pct_alta"] / 100.0, align_right, "0.0%"),
            (d["brecha_alta_urbano_rural"], align_center, "+0.0;-0.0;0.0"),
            (d["rural"]["prioridad_formacion"], align_right, "#,##0"),
        ]

        for col_idx, (v_val, v_al, v_fmt) in enumerate(vals, 1):
            cell = ws.cell(row=curr_r, column=col_idx, value=v_val)
            cell.font = font_data
            cell.alignment = v_al
            cell.border = border_cell
            cell.number_format = v_fmt
            if row_fill.fill_type:
                cell.fill = row_fill
        ws.row_dimensions[curr_r].height = 19
        curr_r += 1

    # Fila de Totales
    total_r = curr_r
    ws.cell(row=total_r, column=1, value="TOTAL NACIONAL").font = font_bold
    ws.cell(row=total_r, column=1).alignment = align_left

    ws.cell(row=total_r, column=2, value=f"=SUM(B{start_r+1}:B{total_r-1})").number_format = "#,##0"
    ws.cell(row=total_r, column=3, value=f"=SUM(C{start_r+1}:C{total_r-1})").number_format = "#,##0"
    ws.cell(row=total_r, column=4, value=f"=C{total_r}/B{total_r}").number_format = "0.0%"
    ws.cell(row=total_r, column=5, value=r_alta / 100.0).number_format = "0.0%"
    ws.cell(row=total_r, column=6, value=f"=SUM(F{start_r+1}:F{total_r-1})").number_format = "#,##0"
    ws.cell(row=total_r, column=7, value=f"=F{total_r}/B{total_r}").number_format = "0.0%"
    ws.cell(row=total_r, column=8, value=u_alta / 100.0).number_format = "0.0%"
    ws.cell(row=total_r, column=9, value=brecha_nac).number_format = "+0.0;-0.0;0.0"
    ws.cell(row=total_r, column=10, value=f"=SUM(J{start_r+1}:J{total_r-1})").number_format = "#,##0"

    for c_i in range(1, 11):
        cell = ws.cell(row=total_r, column=c_i)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if c_i not in [1, 4, 7, 9]:
            cell.alignment = align_right
        elif c_i in [4, 7, 9]:
            cell.alignment = align_center

    ws.row_dimensions[total_r].height = 22
    ws.auto_filter.ref = f"A{start_r}:J{total_r - 1}"

    # Gráfico Nativo de Excel: Barras Comparativas Rural vs Urbano (% Alta Pertinencia)
    chart = BarChart()
    chart.type = "col"
    chart.style = 10
    chart.title = "Tasa de Alta Pertinencia Curricular: Rural vs Urbana por Departamento (%)"
    chart.y_axis.title = "% Alta Pertinencia"
    chart.x_axis.title = "Departamento"
    chart.width = 19
    chart.height = 11

    # Referencias de datos: Columnas E (Alta Rural) y H (Alta Urbano)
    # Categorías: Columna A (Departamentos)
    data_ref_r = Reference(ws, min_col=5, min_row=start_r, max_row=total_r - 1)
    data_ref_u = Reference(ws, min_col=8, min_row=start_r, max_row=total_r - 1)
    cats_ref = Reference(ws, min_col=1, min_row=start_r + 1, max_row=total_r - 1)

    chart.add_data(data_ref_r, titles_from_data=True)
    chart.add_data(data_ref_u, titles_from_data=True)
    chart.set_categories(cats_ref)

    if chart.series and len(chart.series) >= 2:
        chart.series[0].graphicalProperties.solidFill = COLOR_N  # Ámbar Rural
        chart.series[1].graphicalProperties.solidFill = COLOR_A  # Azul Urbano

    ws.add_chart(chart, "B21")

    # Anchos de columna
    col_widths = {
        "A": 18,
        "B": 15,
        "C": 14,
        "D": 12,
        "E": 15,
        "F": 14,
        "G": 12,
        "H": 15,
        "I": 15,
        "J": 20,
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width


def create_sheet_jubilacion(wb, data):
    """Hoja adicional: Estadísticas de Prejubilación y Jubilación por Departamento y Distrito."""
    ws = wb.create_sheet(title="Prejubilación y Jubilación")
    ws.views.sheetView[0].showGridLines = True

    jub_data = data.get("jubilacion", {})
    nacional = jub_data.get("nacional", {})
    por_depto = jub_data.get("por_departamento", [])
    por_distrito = jub_data.get("por_distrito", [])

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "ESTADÍSTICAS DE PREJUBILACIÓN Y JUBILACIÓN DOCENTE - CORTE OFICIAL (SEP)",
        max_col=12
    )

    # KPIs Nacionales (fila 5-6)
    tot_nacional = nacional.get("total", 1)
    kpis = [
        ("UNIVERSO DOCENTE", tot_nacional, 1, 2),
        ("EN JUBILACIÓN (SI)", nacional.get("jubilacion", 0), 3, 4),
        ("EN PREJUBILACIÓN (SI)", nacional.get("prejubilacion", 0), 5, 6),
        ("% JUBILACIÓN", round(nacional.get("jubilacion", 0) / tot_nacional * 100, 2) if tot_nacional > 0 else 0.0, 7, 8),
    ]
    for title, val, c1, c2 in kpis:
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
        cell_lbl = ws.cell(row=5, column=c1, value=title)
        cell_lbl.font = font_kpi_lbl
        cell_lbl.alignment = align_center
        cell_lbl.fill = fill_gold_light

        ws.merge_cells(start_row=6, start_column=c1, end_row=6, end_column=c2)
        cell_val = ws.cell(row=6, column=c1, value=val)
        cell_val.font = font_kpi_num
        cell_val.number_format = "0.00%" if title.startswith("%") else "#,##0"
        cell_val.alignment = align_center
        cell_val.fill = fill_gold_light

        for r in range(5, 7):
            for c in range(c1, c2 + 1):
                ws.cell(row=r, column=c).border = border_cell

    ws.row_dimensions[5].height = 18
    ws.row_dimensions[6].height = 26

    # --- Tabla por Departamento ---
    ws.cell(row=8, column=1, value="1. Jubilación y Prejubilación por Departamento").font = font_section

    h_depto = ["Departamento", "Total Docentes", "Jubilación (SI)", "% Jubilación", "Prejubilación (SI)", "% Prejubilación", "Pendientes Jubilación"]
    start_r = 9
    for c_idx, h in enumerate(h_depto, start=1):
        c = ws.cell(row=start_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[start_r].height = 22

    curr_r = start_r + 1
    for idx, d in enumerate(por_depto):
        total_d = d.get("total", 1)
        jub_d = d.get("jubilacion", 0)
        pjub_d = d.get("prejubilacion", 0)
        pct_j = jub_d / total_d if total_d > 0 else 0.0
        pct_pj = pjub_d / total_d if total_d > 0 else 0.0
        pendiente = total_d - jub_d

        row_vals = [d.get("departamento", ""), total_d, jub_d, pct_j, pjub_d, pct_pj, pendiente]
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=curr_r, column=c_idx, value=val)
            cell.font = font_data
            cell.border = border_cell
            if c_idx == 1:
                cell.alignment = align_left
            elif c_idx in [4, 6]:
                cell.number_format = "0.00%"
                cell.alignment = align_right
            else:
                cell.number_format = "#,##0"
                cell.alignment = align_right
            if idx % 2 == 1:
                cell.fill = fill_zebra
        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Fila total departamentos
    tot_jub = sum(d.get("jubilacion", 0) for d in por_depto)
    tot_pjub = sum(d.get("prejubilacion", 0) for d in por_depto)
    tot_all = nacional.get("total", 1)
    tot_row = ["TOTAL NACIONAL", tot_all, tot_jub, tot_jub / tot_all if tot_all > 0 else 0.0,
               tot_pjub, tot_pjub / tot_all if tot_all > 0 else 0.0, tot_all - tot_jub]
    for c_idx, val in enumerate(tot_row, start=1):
        cell = ws.cell(row=curr_r, column=c_idx, value=val)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        cell.alignment = align_right if c_idx > 1 else align_left
        if c_idx in [4, 6]:
            cell.number_format = "0.00%"
        elif c_idx != 1:
            cell.number_format = "#,##0"
    ws.row_dimensions[curr_r].height = 22
    depto_end_r = curr_r
    curr_r += 2

    # --- Tabla Top 20 Distritos por Jubilación ---
    ws.cell(row=curr_r, column=1, value="2. Top 20 Distritos con Mayor Jubilación Docente").font = font_section
    curr_r += 1

    h_dist = ["Departamento", "Distrito", "Total Docentes", "Jubilación (SI)", "% Jubilación", "Prejubilación (SI)", "% Prejubilación"]
    for c_idx, h in enumerate(h_dist, start=1):
        c = ws.cell(row=curr_r, column=c_idx, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[curr_r].height = 22
    dist_start_r = curr_r
    curr_r += 1

    top20 = sorted(por_distrito, key=lambda x: x.get("jubilacion", 0), reverse=True)[:20]
    for idx, dist in enumerate(top20):
        total_dt = dist.get("total", 1)
        jub_dt = dist.get("jubilacion", 0)
        pjub_dt = dist.get("prejubilacion", 0)
        row_vals = [dist.get("departamento", ""), dist.get("distrito", ""), total_dt,
                    jub_dt, jub_dt / total_dt if total_dt > 0 else 0.0,
                    pjub_dt, pjub_dt / total_dt if total_dt > 0 else 0.0]
        for c_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=curr_r, column=c_idx, value=val)
            cell.font = font_data
            cell.border = border_cell
            if c_idx in [1, 2]:
                cell.alignment = align_left
            elif c_idx in [5, 7]:
                cell.number_format = "0.00%"
                cell.alignment = align_right
            else:
                cell.number_format = "#,##0"
                cell.alignment = align_right
            if idx % 2 == 1:
                cell.fill = fill_zebra
        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # --- Gráfico: Jubilación vs Prejubilación por Departamento ---
    chart = BarChart()
    chart.type = "col"
    chart.title = "Jubilación vs Prejubilación por Departamento"
    chart.y_axis.title = "Docentes"
    chart.x_axis.title = "Departamento"
    chart.width = 22
    chart.height = 12
    chart.legend.legendPos = "t"

    data_ref_j = Reference(ws, min_col=3, min_row=start_r, max_row=depto_end_r - 1)
    data_ref_pj = Reference(ws, min_col=5, min_row=start_r, max_row=depto_end_r - 1)
    cats_ref = Reference(ws, min_col=1, min_row=start_r + 1, max_row=depto_end_r - 1)
    chart.add_data(data_ref_j, titles_from_data=True)
    chart.add_data(data_ref_pj, titles_from_data=True)
    chart.set_categories(cats_ref)

    chart.dataLabels = DataLabelList()
    chart.dataLabels.showVal = True

    if len(chart.series) >= 2:
        chart.series[0].graphicalProperties.solidFill = COLOR_N    # Naranja - Jubilación
        chart.series[1].graphicalProperties.solidFill = COLOR_A    # Azul - Prejubilación

    ws.add_chart(chart, "I8")

    # Anchos de columna
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 28
    ws.column_dimensions["C"].width = 16
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 15
    ws.column_dimensions["F"].width = 18
    ws.column_dimensions["G"].width = 15
    ws.column_dimensions["H"].width = 4  # Separador


def create_sheet_prejub_genero(wb, data):
    """Hoja adicional: Análisis Estratégico de No Prejubilados x No Pertinentes y Composición de Género."""
    ws = wb.create_sheet(title="No Prejubilados y Género")
    ws.views.sheetView[0].showGridLines = True

    pj_data = data.get("prejubilacion_pertinencia", {})
    gen_data = data.get("genero", {})
    nac_pj = pj_data.get("nacional", {})
    depto_pj = pj_data.get("por_departamento", [])
    nac_gen = gen_data.get("nacional", {})
    depto_gen = gen_data.get("por_departamento", [])

    apply_header_banner(
        ws,
        "MINISTERIO DE EDUCACIÓN - ESTADO PLURINACIONAL DE BOLIVIA",
        "ANÁLISIS DE NO PREJUBILADOS X NO PERTINENTES Y COMPOSICIÓN DE GÉNERO (SEP)",
        max_col=14
    )

    tot_padron = nac_pj.get("total_docentes", 168758)
    no_prejub = nac_pj.get("no_prejubilados", {})
    prejub = nac_pj.get("prejubilados", {})
    fem = nac_gen.get("femenino", {})
    masc = nac_gen.get("masculino", {})

    # Tarjetas KPI (Filas 5-6)
    kpis = [
        ("UNIVERSO DOCENTE", tot_padron, "#,##0", 1, 2),
        ("DOCENTES ACTIVOS (NO PREJUBILADOS)", no_prejub.get("total", 0), "#,##0", 3, 4),
        ("NO PREJUBILADOS NO PERTINENTES (N+SIN)", nac_pj.get("no_prejubilados_no_pertinentes", 0), "#,##0", 5, 7),
        ("% NO PERTINENTE EN SERVICIO ACTIVO", nac_pj.get("pct_no_prejubilados_no_pertinentes_sobre_no_prejub", 0) / 100.0, "0.00%", 8, 9),
        ("DOCENTES MUJERES", fem.get("total", 0), "#,##0", 10, 11),
        ("DOCENTES VARONES", masc.get("total", 0), "#,##0", 12, 13)
    ]

    for title, val, num_fmt, c1, c2 in kpis:
        ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
        cell_lbl = ws.cell(row=5, column=c1, value=title)
        cell_lbl.font = font_kpi_lbl
        cell_lbl.alignment = align_center
        cell_lbl.fill = fill_gold_light

        ws.merge_cells(start_row=6, start_column=c1, end_row=6, end_column=c2)
        cell_val = ws.cell(row=6, column=c1, value=val)
        cell_val.font = font_kpi_num
        cell_val.number_format = num_fmt
        cell_val.alignment = align_center
        cell_val.fill = fill_gold_light

        for r in range(5, 7):
            for c in range(c1, c2 + 1):
                ws.cell(row=r, column=c).border = border_cell

    ws.row_dimensions[5].height = 18
    ws.row_dimensions[6].height = 26

    # ── Tabla 1: Matriz Cruzada Prejubilación x Pertinencia (Fila 8)
    curr_r = 8
    ws.cell(row=curr_r, column=1, value="1. Matriz Cruzada Nacional: Condición de Prejubilación vs Pertinencia Curricular").font = font_section
    curr_r += 1

    h_matriz = [
        "Condición Docente", "Total", "Alta (V)", "Media (A)", "Baja (N)", "Sin Pert. (SIN)",
        "No Pertinentes (N+SIN)", "% No Pertinente", "% Alta Pertinencia"
    ]
    for c_i, h in enumerate(h_matriz, start=1):
        c = ws.cell(row=curr_r, column=c_i, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[curr_r].height = 22
    curr_r += 1

    filas_matriz = [
        ("Docentes en Servicio Activo (No Prejubilados)", no_prejub),
        ("Docentes en Proceso de Prejubilación (SI)", prejub),
    ]

    for label, item in filas_matriz:
        t = item.get("total", 0)
        v = item.get("V", 0)
        a = item.get("A", 0)
        n = item.get("N", 0)
        sin = item.get("SIN", 0)
        np = item.get("no_pertinentes", n + sin)
        pct_np = (np / t) if t > 0 else 0.0
        pct_v = (v / t) if t > 0 else 0.0

        vals = [label, t, v, a, n, sin, np, pct_np, pct_v]
        for c_i, val in enumerate(vals, start=1):
            cell = ws.cell(row=curr_r, column=c_i, value=val)
            cell.font = font_data
            cell.border = border_cell
            if c_i == 1:
                cell.alignment = align_left
            elif c_i in [8, 9]:
                cell.alignment = align_right
                cell.number_format = "0.00%"
            else:
                cell.alignment = align_right
                cell.number_format = "#,##0"
        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Total Nacional Matriz
    t_tot = tot_padron
    v_tot = no_prejub.get("V", 0) + prejub.get("V", 0)
    a_tot = no_prejub.get("A", 0) + prejub.get("A", 0)
    n_tot = no_prejub.get("N", 0) + prejub.get("N", 0)
    sin_tot = no_prejub.get("SIN", 0) + prejub.get("SIN", 0)
    np_tot = n_tot + sin_tot
    pct_np_tot = (np_tot / t_tot) if t_tot > 0 else 0.0
    pct_v_tot = (v_tot / t_tot) if t_tot > 0 else 0.0

    tot_vals_m = ["TOTAL GENERAL NACIONAL", t_tot, v_tot, a_tot, n_tot, sin_tot, np_tot, pct_np_tot, pct_v_tot]
    for c_i, val in enumerate(tot_vals_m, start=1):
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if c_i == 1:
            cell.alignment = align_left
        elif c_i in [8, 9]:
            cell.alignment = align_right
            cell.number_format = "0.00%"
        else:
            cell.alignment = align_right
            cell.number_format = "#,##0"
    ws.row_dimensions[curr_r].height = 22
    curr_r += 2

    # ── Tabla 2: Desglose Departamental de No Prejubilados No Pertinentes
    ws.cell(row=curr_r, column=1, value="2. Población Objetivo Activa: No Prejubilados No Pertinentes por Departamento").font = font_section
    curr_r += 1

    h_depto_np = [
        "Departamento", "Total Docentes", "No Prejubilados", "No Pertinentes Activos (N+SIN)",
        "% No Pertinentes Activos", "No Prejubilados V (Alta)", "No Prejubilados A (Media)", "Prejubilados No Pertinentes"
    ]
    for c_i, h in enumerate(h_depto_np, start=1):
        c = ws.cell(row=curr_r, column=c_i, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[curr_r].height = 22
    start_depto_r = curr_r
    curr_r += 1

    for idx, d in enumerate(depto_pj):
        d_nom = d.get("departamento", "")
        tot_d = d.get("total", 0)
        no_pj = d.get("no_prejubilados", 0)
        no_pj_np = d.get("no_prejub_no_pert", 0)
        pct_np_act = (no_pj_np / no_pj) if no_pj > 0 else 0.0
        v_act = d.get("no_prejub_v", 0)
        a_act = d.get("no_prejub_a", 0)
        pj_np = d.get("prejub_no_pert", 0)

        row_vals = [d_nom, tot_d, no_pj, no_pj_np, pct_np_act, v_act, a_act, pj_np]
        for c_i, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=curr_r, column=c_i, value=val)
            cell.font = font_data
            cell.border = border_cell
            if c_i == 1:
                cell.alignment = align_left
            elif c_i == 5:
                cell.alignment = align_right
                cell.number_format = "0.00%"
            else:
                cell.alignment = align_right
                cell.number_format = "#,##0"
            if idx % 2 == 1:
                cell.fill = fill_zebra
        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    end_depto_r = curr_r - 1

    # Fila Total Departamental
    tot_pj_np = sum(d.get("prejub_no_pert", 0) for d in depto_pj)
    tot_row_d = [
        "TOTAL NACIONAL", tot_padron, no_prejub.get("total", 0),
        nac_pj.get("no_prejubilados_no_pertinentes", 0),
        nac_pj.get("pct_no_prejubilados_no_pertinentes_sobre_no_prejub", 0) / 100.0,
        no_prejub.get("V", 0), no_prejub.get("A", 0), tot_pj_np
    ]
    for c_i, val in enumerate(tot_row_d, start=1):
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if c_i == 1:
            cell.alignment = align_left
        elif c_i == 5:
            cell.alignment = align_right
            cell.number_format = "0.00%"
        else:
            cell.alignment = align_right
            cell.number_format = "#,##0"
    ws.row_dimensions[curr_r].height = 22
    curr_r += 2

    # ── Tabla 3: Composición por Género y Desempeño Curricular por Departamento
    ws.cell(row=curr_r, column=1, value="3. Composición y Desempeño Curricular por Género por Departamento").font = font_section
    curr_r += 1

    h_gen = [
        "Departamento", "Mujeres Total", "% Alta Mujeres", "Mujeres No Pert. Activas",
        "Varones Total", "% Alta Varones", "Varones No Pert. Activos"
    ]
    for c_i, h in enumerate(h_gen, start=1):
        c = ws.cell(row=curr_r, column=c_i, value=h)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_cell
    ws.row_dimensions[curr_r].height = 22
    curr_r += 1

    for idx, d in enumerate(depto_gen):
        d_nom = d.get("departamento", "")
        f_tot = d.get("total_femenino", 0)
        f_pct = d.get("pct_femenino_alta", 0.0) / 100.0
        f_np = d.get("femenino_no_prejub_no_pert", 0)
        m_tot = d.get("total_masculino", 0)
        m_pct = d.get("pct_masculino_alta", 0.0) / 100.0
        m_np = d.get("masculino_no_prejub_no_pert", 0)

        row_vals = [d_nom, f_tot, f_pct, f_np, m_tot, m_pct, m_np]
        for c_i, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=curr_r, column=c_i, value=val)
            cell.font = font_data
            cell.border = border_cell
            if c_i == 1:
                cell.alignment = align_left
            elif c_i in [3, 6]:
                cell.alignment = align_right
                cell.number_format = "0.00%"
            else:
                cell.alignment = align_right
                cell.number_format = "#,##0"
            if idx % 2 == 1:
                cell.fill = fill_zebra
        ws.row_dimensions[curr_r].height = 20
        curr_r += 1

    # Total Nacional Género
    f_nac_tot = fem.get("total", 0)
    f_nac_pct = fem.get("pct_alta", 0.0) / 100.0
    f_nac_np = fem.get("no_prejub_no_pert", 0)
    m_nac_tot = masc.get("total", 0)
    m_nac_pct = masc.get("pct_alta", 0.0) / 100.0
    m_nac_np = masc.get("no_prejub_no_pert", 0)

    tot_gen_row = ["TOTAL GENERAL NACIONAL", f_nac_tot, f_nac_pct, f_nac_np, m_nac_tot, m_nac_pct, m_nac_np]
    for c_i, val in enumerate(tot_gen_row, start=1):
        cell = ws.cell(row=curr_r, column=c_i, value=val)
        cell.font = font_bold
        cell.fill = fill_gold_light
        cell.border = border_double_bottom
        if c_i == 1:
            cell.alignment = align_left
        elif c_i in [3, 6]:
            cell.alignment = align_right
            cell.number_format = "0.00%"
        else:
            cell.alignment = align_right
            cell.number_format = "#,##0"
    ws.row_dimensions[curr_r].height = 22

    # Gráfico de Barras: No Prejubilados No Pertinentes por Departamento
    chart = BarChart()
    chart.type = "col"
    chart.title = "Docentes Activos No Pertinentes (N+SIN) por Departamento"
    chart.y_axis.title = "Docentes Prioritarios"
    chart.x_axis.title = "Departamento"
    chart.width = 18
    chart.height = 10
    chart.legend = None

    data_ref_np = Reference(ws, min_col=4, min_row=start_depto_r, max_row=end_depto_r)
    cats_ref_np = Reference(ws, min_col=1, min_row=start_depto_r + 1, max_row=end_depto_r)
    chart.add_data(data_ref_np, titles_from_data=True)
    chart.set_categories(cats_ref_np)

    chart.dataLabels = DataLabelList()
    chart.dataLabels.showVal = True

    if chart.series:
        chart.series[0].graphicalProperties.solidFill = COLOR_N

    ws.add_chart(chart, "J8")

    # Anchos de columna
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 16
    ws.column_dimensions["D"].width = 22
    ws.column_dimensions["E"].width = 18
    ws.column_dimensions["F"].width = 16
    ws.column_dimensions["G"].width = 16
    ws.column_dimensions["H"].width = 18
    ws.column_dimensions["I"].width = 4



def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    json_path = os.path.join(root_dir, "src", "data", "pertinencia_data.json")
    ue_json_path = os.path.join(root_dir, "src", "data", "pertinencia_por_ue.json")

    output_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        root_dir, "public", "exports", "Reporte_Pertinencia_Docente_Graficos.xlsx"
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if not os.path.exists(json_path):
        print(f"Error: No se encontró el archivo de datos: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    wb = openpyxl.Workbook()

    # Construir hojas según disponibilidad de datos
    create_sheet_resumen(wb, data)
    create_sheet_rural_urbano(wb, data)
    create_sheet_departamentos(wb, data)
    create_sheet_niveles(wb, data)

    # Hoja adicional: Jubilación y Prejubilación
    if data.get("jubilacion"):
        create_sheet_jubilacion(wb, data)

    # Hoja estratégica: No Prejubilados x No Pertinentes y Género
    if data.get("prejubilacion_pertinencia") or data.get("genero"):
        create_sheet_prejub_genero(wb, data)

    # Hoja 4: Pertinencia por Unidad Educativa
    if os.path.exists(ue_json_path):
        with open(ue_json_path, "r", encoding="utf-8") as f:
            ue_data = json.load(f)
        create_sheet_ue(wb, ue_data)

    if data.get("por_especialidad"):
        create_sheet_especialidades(wb, data)
        create_sheet_cruzada(wb, data)

    wb.save(output_path)
    print(f"Reporte generado exitosamente en: {output_path}")


if __name__ == "__main__":
    main()
