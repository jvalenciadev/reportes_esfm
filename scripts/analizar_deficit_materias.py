import json

with open('src/data/sie_deficit_resumen_global.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

tp = d['totales_pais']
print("=== TOTAL PAÍS ===")
print(f"Carga horaria requerida en aula: {tp['carga_horaria']:,} hrs")
print(f"Horas cubiertas con planilla:    {tp['horas_planilla']:,} hrs ({tp['pct_cobertura']}%)")
print(f"Horas DÉFICIT sin cubrir:        {tp['deficit_horas']:,} hrs ({100 - tp['pct_cobertura']:.1f}%)")
print(f"Ítems equivalentes faltantes:    {tp['items_deficit_equiv']:,} ítems")
print(f"Unidades Educativas afectadas:   {tp['total_ues_afectadas']:,} UEs")

materias_list = []
for esp in d.get('especialidades', []):
    esp_nom = esp['nombre']
    hora_item = esp.get('hora_item', 96)
    for m in esp.get('materias_breakdown', []):
        m_nom = m['materia']
        nivel = m.get('nivel', '')
        carga = m['carga_horaria']
        def_hrs = m['deficit_horas']
        cub = carga - def_hrs
        pct = (cub / carga * 100) if carga > 0 else 0
        items_def = round(def_hrs / hora_item)
        materias_list.append({
            'materia': m_nom,
            'nivel': nivel,
            'especialidad': esp_nom,
            'carga': carga,
            'cubiertas': cub,
            'deficit_horas': def_hrs,
            'items_def': items_def,
            'pct_cobertura': pct,
            'ues': m.get('ues_afectadas', 0)
        })

print(f"\nTotal materias curriculares registradas: {len(materias_list)}")
materias_con_def = [m for m in materias_list if m['deficit_horas'] > 0]
materias_sin_def = [m for m in materias_list if m['deficit_horas'] == 0]
print(f"Materias con déficit: {len(materias_con_def)}")
print(f"Materias sin déficit (100% cubiertas): {len(materias_sin_def)}")

# Ranking
materias_list.sort(key=lambda x: x['deficit_horas'], reverse=True)
print("\n=== TOP 15 MATERIAS CON MAYOR DÉFICIT DE HORAS (NO CUBIERTAS) ===")
for i, m in enumerate(materias_list[:15], 1):
    print(f"{i:2d}. {m['materia']} [{m['nivel']}] (Especialidad: {m['especialidad']})")
    print(f"    - Carga requerida: {m['carga']:,} hrs")
    print(f"    - Cubierto:        {m['cubiertas']:,} hrs ({m['pct_cobertura']:.1f}%)")
    print(f"    - DÉFICIT:         {m['deficit_horas']:,} hrs ({100 - m['pct_cobertura']:.1f}% NO cubierto) ~ {m['items_def']:,} ítems")
    print(f"    - UEs afectadas:   {m['ues']:,} establecimientos")

print("\n=== RESUMEN POR DEPARTAMENTO DE HORAS NO CUBIERTAS ===")
for dpto in tp.get('departamentos', []):
    d_nom = dpto['departamento']
    d_carga = dpto['carga_horaria']
    d_cub = dpto['horas_planilla']
    d_def = dpto['deficit_horas']
    d_items = dpto['items_deficit_equiv']
    d_pct = dpto['pct_cobertura']
    d_ues = dpto['ues_afectadas']
    print(f"{d_nom:<12} | Requerido: {d_carga:>8,} hrs | Cubierto: {d_cub:>8,} ({d_pct:>4.1f}%) | DÉFICIT: {d_def:>8,} hrs ({100-d_pct:>4.1f}% sin cubrir) | {d_items:>5,} ítems | {d_ues:>5,} UEs")
