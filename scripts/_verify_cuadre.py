import json

with open('src/data/pertinencia_data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

total_ues = d['resumen']['TOTAL']['ues']
total_doc = d['resumen']['TOTAL']['docentes']
total_est = d['resumen']['TOTAL']['estudiantes_atendidos']

print('=== RESUMEN GENERAL ===')
print(f'TOTAL UEs:        {total_ues:,}')
print(f'TOTAL Docentes:   {total_doc:,}')
print(f'TOTAL Estudiantes:{total_est:,}')
print()

print('=== AREA ===')
ru = d['por_area']['RURAL']['ues']
ur = d['por_area']['URBANA']['ues']
print(f'Rural UEs:  {ru:,}')
print(f'Urbana UEs: {ur:,}')
print(f'Rural+Urbana: {ru+ur:,}  OK={ru+ur == total_ues}')
print()

print('=== POR DEPARTAMENTO (UEs) ===')
dep_sum = 0
for dep in d['por_departamento']:
    u = dep.get('ues', 0)
    e = dep.get('estudiantes_atendidos', 0)
    print(f"  {dep['departamento']:20s}: {u:5} UEs | {e:,} est")
    dep_sum += u
print(f'Suma deptos: {dep_sum:,}  OK={dep_sum == total_ues}')
print()

print('=== POR NIVEL (UEs) ===')
niv_sum = 0
for niv in d['por_nivel']:
    u = niv.get('ues', 0)
    print(f"  {niv['nivel']:30s}: {u:5} UEs")
    niv_sum += u
print(f'Suma niveles (sin dedup): {niv_sum:,}')
print(f'Total fila (deduplicado): {total_ues:,}')
print()

print('=== ESTUDIANTES POR RANGO ===')
suma_est = 0
for k in ['V', 'A', 'N', 'SIN']:
    e = d['resumen'][k].get('estudiantes_atendidos', 0)
    suma_est += e
    print(f'  {k}: {e:,}')
print(f'Suma rangos: {suma_est:,}  OK={suma_est == total_est}')
