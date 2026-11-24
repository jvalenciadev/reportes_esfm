#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pre-agregador de matrícula histórica ESFM (public/datos/inscritos2022-2026.xlsx).
Genera src/data/inscritos_2022_2026.json optimizado para drill-down dinámico
por Departamento -> ESFM/UA -> Especialidad x Año que cursa (1° a 5°) x Gestión (2022-2026).
"""

import json
import os
from collections import Counter, defaultdict
import openpyxl


def build_inscritos():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    xlsx_path = os.path.join(root_dir, "public", "datos", "inscritos2022-2026.xlsx")
    out_path = os.path.join(root_dir, "src", "data", "inscritos_2022_2026.json")

    if not os.path.exists(xlsx_path):
        raise FileNotFoundError(f"No se encontró el archivo fuente: {xlsx_path}")

    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    agg = Counter()
    gestiones_set = set()
    anios_set = set()
    deptos_set = set()

    # Columnas: Departamento(0), ESFM(1), Gestion(2), Anio_Que_Cursa(3), Especialidad(4), Carnet_Identidad(5), ...
    total_registros = 0
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or r[0] is None:
            continue
        depto = str(r[0]).strip().upper()
        esfm = str(r[1]).strip().upper() if r[1] else "SIN ESFM"
        try:
            gestion = int(r[2])
        except (TypeError, ValueError):
            continue
        try:
            anio = int(r[3])
        except (TypeError, ValueError):
            continue
        esp = str(r[4]).strip().upper() if r[4] else "SIN ESPECIALIDAD"

        agg[(depto, esfm, gestion, anio, esp)] += 1
        gestiones_set.add(gestion)
        anios_set.add(anio)
        deptos_set.add(depto)
        total_registros += 1

    wb.close()

    registros = [
        {"d": d, "e": e, "g": g, "a": a, "s": s, "c": c}
        for (d, e, g, a, s), c in sorted(agg.items())
    ]

    payload = {
        "fuente": "public/datos/inscritos2022-2026.xlsx",
        "total_registros": total_registros,
        "gestiones": sorted(gestiones_set),
        "anios": sorted(anios_set),
        "departamentos": sorted(deptos_set),
        "registros": registros,
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    print(
        f"inscritos_2022_2026.json generado: {total_registros} estudiantes en "
        f"{len(registros)} combinaciones agregadas ({len(deptos_set)} deptos, gestiones {sorted(gestiones_set)})."
    )


if __name__ == "__main__":
    build_inscritos()
