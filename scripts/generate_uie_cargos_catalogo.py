import openpyxl
import json
import os
import re

dept_map = {
    'chuquisaca': 1, 'la paz': 2, 'cochabamba': 3, 'oruro': 4,
    'potosi': 5, 'potosí': 5, 'tarija': 6, 'santa cruz': 7,
    'beni': 8, 'pando': 9,
}
dept_names = {
    1: 'Chuquisaca', 2: 'La Paz', 3: 'Cochabamba', 4: 'Oruro',
    5: 'Potosí', 6: 'Tarija', 7: 'Santa Cruz', 8: 'Beni', 9: 'Pando'
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
excel_path = os.path.join(BASE_DIR, 'public', 'datos', '- UIE UNIDAD EDUCATIVA DEFICIT.xlsx')

print('Analizando base de datos completa de UIE...')
wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active

# 1. Extraer catálogo de dependencias, subsistemas, niveles y cargos con sus estadísticas agregadas
cargos_dict = {}
combos_dict = {}

for r in ws.iter_rows(min_row=2, values_only=True):
    g = int(r[0])
    raw_dept = str(r[1]).strip()
    d_id = dept_map.get(raw_dept.lower(), 0)
    dep = str(r[2]).strip()
    sub = str(r[3]).strip()
    niv = str(r[4]).strip()
    cargo = str(r[5]).strip()
    trab = int(r[6])
    plan = int(r[7])
    defic = trab - plan

    # Info por combinación
    combo_key = f"{dep}|{sub}|{niv}|{cargo}"
    if combo_key not in combos_dict:
        combos_dict[combo_key] = {
            'dependencia': dep,
            'subsistema': sub,
            'nivel': niv,
            'cargo': cargo,
            'total_trabajadas': 0,
            'total_planilla': 0,
            'total_deficit': 0,
            'por_gestion': {}
        }
    c = combos_dict[combo_key]
    c['total_trabajadas'] += trab
    c['total_planilla'] += plan
    c['total_deficit'] += defic
    
    sg = str(g)
    if sg not in c['por_gestion']:
        c['por_gestion'][sg] = {'trabajadas': 0, 'planilla': 0, 'deficit': 0}
    c['por_gestion'][sg]['trabajadas'] += trab
    c['por_gestion'][sg]['planilla'] += plan
    c['por_gestion'][sg]['deficit'] += defic

print(f'Total combinaciones UIE extraídas: {len(combos_dict)}')

# Guardar lista estructurada para el selector en el frontend
lista_cargos_opciones = []
for k, v in combos_dict.items():
    lista_cargos_opciones.append({
        'key': k,
        'dependencia': v['dependencia'],
        'subsistema': v['subsistema'],
        'nivel': v['nivel'],
        'cargo': v['cargo'],
        'total_deficit': v['total_deficit'],
        'total_trabajadas': v['total_trabajadas'],
        'total_planilla': v['total_planilla'],
        'deficit_2025': v['por_gestion'].get('2025', {}).get('deficit', 0),
        'por_gestion': v['por_gestion']
    })

# Ordenar por mayor déficit
lista_cargos_opciones.sort(key=lambda x: x['total_deficit'], reverse=True)

out_file = os.path.join(BASE_DIR, 'src', 'data', 'uieCargosCatalogo.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(lista_cargos_opciones, f, ensure_ascii=False)

print(f'Archivo guardado: {out_file} ({os.path.getsize(out_file):,} bytes)')

