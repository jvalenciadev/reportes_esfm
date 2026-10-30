import openpyxl
import json
import os
from collections import defaultdict

def classify_cargo(cargo_raw):
    c = str(cargo_raw).upper().strip()
    if any(k in c for k in ['MUSICA', 'MUSICAL']):
        return 'Educación Musical'
    if any(k in c for k in ['FISICA Y DEP', 'EDUC.FISICA', 'EDUC FISICA', 'DEPORTE']):
        return 'Educación Física y Deportes'
    if any(k in c for k in ['ARTES PLAST', 'PLASTICAS', 'VISUALES']):
        return 'Artes Plásticas y Visuales'
    if any(k in c for k in ['BTH', 'TECNICA', 'TECNOLOG', 'INFORMATIC', 'GASTRONOM', 'AGROPEC', 'MECANIC', 'ELECTRIC', 'ELECTRONIC', 'ROBOTIC', 'VETERINAR', 'TURISMO', 'TEXTIL', 'BELLEZA', 'CARPINTER', 'CONSTRUCCION', 'SALUD']):
        return 'Técnica Tecnológica / BTH'
    if any(k in c for k in ['MATEMAT', 'FISICA', 'QUIMICA']):
        return 'Matemáticas y Ciencias Exactas'
    if any(k in c for k in ['BIOLOG', 'GEOGRAF', 'CIENCIAS NAT']):
        return 'Ciencias Naturales y Biología'
    if any(k in c for k in ['LENGUA', 'COMUNICAC', 'LITERAT', 'EXTRANJ', 'INGLES', 'FRANCES', 'ORIGINAR']):
        return 'Lenguaje y Comunicación'
    if any(k in c for k in ['SOCIAL', 'HISTOR', 'COSMOVIS', 'FILOSOF', 'SICOLOG', 'PSICOLOG', 'VALORES', 'RELIGIO', 'CIVICA', 'CIUDADAN']):
        return 'Ciencias Sociales y Humanidades'
    if any(k in c for k in ['ESPECIAL', 'INTELECTUAL', 'AUDITIV', 'VISUAL', 'DISCAPACIDAD', 'AUTISMO', 'SORDO', 'CIEGO', 'TALENTO']):
        return 'Educación Especial'
    if any(k in c for k in ['MAESTRO DE AULA', 'PROF.CURSO', 'DOCENTE', 'NORMALISTA', 'EGRESADO', 'TITULAR', 'INTERINO', 'INICIAL', 'PRIMARIA', 'TODOS']):
        return 'Maestro de Aula / General'
    if any(k in c for k in ['DIRECTOR', 'SECRETAR', 'ADMINISTRAT', 'REGENTE', 'PORTER', 'AUXILIAR', 'ASISTENTE', 'PSICOLOGO']):
        return 'Personal Directivo y Administrativo'
    return 'Otras Especialidades'

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

print('Procesando datos para resumen UIE...')
wb = openpyxl.load_workbook(excel_path, data_only=True)
ws = wb.active

by_gestion = defaultdict(lambda: {'trab': 0, 'plan': 0, 'defic': 0, 'count': 0})
by_group_gestion = defaultdict(lambda: {'trab': 0, 'plan': 0, 'defic': 0, 'count': 0})
by_dept_gestion = defaultdict(lambda: {'trab': 0, 'plan': 0, 'defic': 0, 'count': 0})
by_cargo = defaultdict(lambda: {'trab': 0, 'plan': 0, 'defic': 0, 'count': 0, 'grupo': '', 'por_gestion': defaultdict(lambda: {'trab': 0, 'plan': 0, 'defic': 0})})

for row in ws.iter_rows(min_row=2, values_only=True):
    g = int(row[0])
    raw_dept = str(row[1]).strip()
    d_id = dept_map.get(raw_dept.lower(), 0)
    cargo = str(row[5]).strip()
    grp = classify_cargo(cargo)
    trab = int(row[6])
    plan = int(row[7])
    defic = trab - plan

    by_gestion[g]['trab'] += trab
    by_gestion[g]['plan'] += plan
    by_gestion[g]['defic'] += defic
    by_gestion[g]['count'] += 1

    by_group_gestion[(grp, g)]['trab'] += trab
    by_group_gestion[(grp, g)]['plan'] += plan
    by_group_gestion[(grp, g)]['defic'] += defic
    by_group_gestion[(grp, g)]['count'] += 1

    by_dept_gestion[(d_id, g)]['trab'] += trab
    by_dept_gestion[(d_id, g)]['plan'] += plan
    by_dept_gestion[(d_id, g)]['defic'] += defic
    by_dept_gestion[(d_id, g)]['count'] += 1

    by_cargo[cargo]['trab'] += trab
    by_cargo[cargo]['plan'] += plan
    by_cargo[cargo]['defic'] += defic
    by_cargo[cargo]['count'] += 1
    by_cargo[cargo]['grupo'] = grp
    by_cargo[cargo]['por_gestion'][g]['trab'] += trab
    by_cargo[cargo]['por_gestion'][g]['plan'] += plan
    by_cargo[cargo]['por_gestion'][g]['defic'] += defic

# 1. Histórico Nacional
historico_nacional = []
for g in sorted(by_gestion.keys()):
    t = by_gestion[g]['trab']
    p = by_gestion[g]['plan']
    d = by_gestion[g]['defic']
    pct = round((d / t * 100), 2) if t > 0 else 0
    items = round(d / 88)
    historico_nacional.append({
        'gestion': g,
        'horas_trabajadas': t,
        'horas_planilla': p,
        'deficit_horas': d,
        'deficit_pct': pct,
        'items_equiv_88h': items,
        'registros_count': by_gestion[g]['count']
    })

# 2. Pronóstico (Regresión 2022-2025 para estabilidad operacional)
years_norm = [2022, 2023, 2024, 2025]
n = len(years_norm)
x_mean = sum(years_norm) / n
y_trab_mean = sum(by_gestion[y]['trab'] for y in years_norm) / n
y_plan_mean = sum(by_gestion[y]['plan'] for y in years_norm) / n

slope_trab = sum((y - x_mean) * (by_gestion[y]['trab'] - y_trab_mean) for y in years_norm) / sum((y - x_mean)**2 for y in years_norm)
intercept_trab = y_trab_mean - slope_trab * x_mean

slope_plan = sum((y - x_mean) * (by_gestion[y]['plan'] - y_plan_mean) for y in years_norm) / sum((y - x_mean)**2 for y in years_norm)
intercept_plan = y_plan_mean - slope_plan * x_mean

pronosticos = []
for f_year in range(2026, 2036):
    f_trab = round(slope_trab * f_year + intercept_trab)
    f_plan = round(slope_plan * f_year + intercept_plan)
    f_def = max(0, f_trab - f_plan)
    pct = round((f_def / f_trab * 100), 2) if f_trab > 0 else 0
    items = round(f_def / 88)
    pronosticos.append({
        'gestion': f_year,
        'horas_trabajadas': f_trab,
        'horas_planilla': f_plan,
        'deficit_horas': f_def,
        'deficit_pct': pct,
        'items_equiv_88h': items,
        'tipo': 'pronostico'
    })

# 3. Resumen por Grupo de Cargo
grupos_set = set(k[0] for k in by_group_gestion.keys())
resumen_grupos = []
for grp in sorted(grupos_set):
    tot_trab = sum(by_group_gestion[(grp, g)]['trab'] for g in by_gestion.keys())
    tot_plan = sum(by_group_gestion[(grp, g)]['plan'] for g in by_gestion.keys())
    tot_def = sum(by_group_gestion[(grp, g)]['defic'] for g in by_gestion.keys())
    tot_cnt = sum(by_group_gestion[(grp, g)]['count'] for g in by_gestion.keys())
    
    por_g = {}
    for g in sorted(by_gestion.keys()):
        gt = by_group_gestion[(grp, g)]['trab']
        gp = by_group_gestion[(grp, g)]['plan']
        gd = by_group_gestion[(grp, g)]['defic']
        por_g[str(g)] = {
            'trabajadas': gt,
            'planilla': gp,
            'deficit': gd,
            'items_equiv_88h': round(gd / 88)
        }
    
    resumen_grupos.append({
        'grupo': grp,
        'deficit_total': tot_def,
        'trabajadas_total': tot_trab,
        'planilla_total': tot_plan,
        'deficit_pct': round((tot_def / tot_trab * 100), 2) if tot_trab > 0 else 0,
        'items_equiv_88h': round(tot_def / 88),
        'registros_count': tot_cnt,
        'por_gestion': por_g
    })
resumen_grupos.sort(key=lambda x: x['deficit_total'], reverse=True)

# 4. Resumen por Departamento
resumen_depts = []
for d_id in sorted(dept_names.keys()):
    tot_trab = sum(by_dept_gestion[(d_id, g)]['trab'] for g in by_gestion.keys())
    tot_plan = sum(by_dept_gestion[(d_id, g)]['plan'] for g in by_gestion.keys())
    tot_def = sum(by_dept_gestion[(d_id, g)]['defic'] for g in by_gestion.keys())
    
    por_g = {}
    for g in sorted(by_gestion.keys()):
        gt = by_dept_gestion[(d_id, g)]['trab']
        gp = by_dept_gestion[(d_id, g)]['plan']
        gd = by_dept_gestion[(d_id, g)]['defic']
        por_g[str(g)] = {
            'trabajadas': gt,
            'planilla': gp,
            'deficit': gd,
            'items_equiv_88h': round(gd / 88)
        }
    
    resumen_depts.append({
        'departamento_id': d_id,
        'departamento': dept_names[d_id],
        'deficit_total': tot_def,
        'trabajadas_total': tot_trab,
        'planilla_total': tot_plan,
        'deficit_pct': round((tot_def / tot_trab * 100), 2) if tot_trab > 0 else 0,
        'items_equiv_88h': round(tot_def / 88),
        'por_gestion': por_g
    })
resumen_depts.sort(key=lambda x: x['deficit_total'], reverse=True)

# 5. Top Cargos con Mayor Déficit
top_cargos = []
for cargo, d in by_cargo.items():
    if d['defic'] > 0:
        por_g = {}
        for g in sorted(by_gestion.keys()):
            por_g[str(g)] = d['por_gestion'][g]['defic']
            
        top_cargos.append({
            'cargo': cargo,
            'grupo': d['grupo'],
            'deficit_total': d['defic'],
            'trabajadas_total': d['trab'],
            'planilla_total': d['plan'],
            'deficit_pct': round((d['defic'] / d['trab'] * 100), 1) if d['trab'] > 0 else 0,
            'items_equiv_88h': round(d['defic'] / 88),
            'deficit_2025': d['por_gestion'][2025]['defic'],
            'por_gestion_deficit': por_g
        })
top_cargos.sort(key=lambda x: x['deficit_total'], reverse=True)

output_data = {
    'historico_nacional': historico_nacional,
    'pronostico_nacional': pronosticos,
    'por_grupo_cargo': resumen_grupos,
    'por_departamento': resumen_depts,
    'top_cargos': top_cargos[:150]
}

out_path = os.path.join(BASE_DIR, 'src', 'data', 'uieDeficitSummary.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f'Resumen UIE generado exitosamente en {out_path} ({os.path.getsize(out_path):,} bytes).')
