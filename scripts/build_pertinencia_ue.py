#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Wrapper para generar el consolidado de Pertinencia por Unidad Educativa (UE / UA).
Invoca la lógica unificada de build_pertinencia_data.py.
"""

from build_pertinencia_data import build_pertinencia_oficial

if __name__ == "__main__":
    build_pertinencia_oficial()
