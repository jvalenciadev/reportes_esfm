import json

data = json.load(open('src/data/exposicion_2031.json', encoding='utf-8'))
esps = data['dictamen_apertura_especialidades']

def get_macro(name):
    u = name.upper()
    if 'INICIAL' in u: return 'INICIAL'
    if 'PRIMARIA' in u: return 'PRIMARIA'
    if 'ESPECIAL' in u: return 'ESPECIAL'
    if any(k in u for k in ['ELECTROMEC', 'TEXTIL', 'ELECTRICIDAD', 'ALIMENTOS', 'GASTRONOM', 'AUTOMOTRIZ', 'AGROPECUARIA', 'BTH']):
        return 'SECUNDARIA BTH'
    return 'SECUNDARIA'

dptos = ["BENI", "LA PAZ", "SANTA CRUZ", "PANDO", "POTOSI", "CHUQUISACA", "TARIJA", "ORURO", "COCHABAMBA"]

print(f"{'DEPARTAMENTO':12} | {'INICIAL (Dem/Egr/Real)':22} | {'PRIMARIA':22} | {'SECUNDARIA':22} | {'BTH':22} | {'ESPECIAL':22}")
print("-" * 135)

for dpto in dptos:
    row_stats = {}
    for macro in ['INICIAL', 'PRIMARIA', 'SECUNDARIA', 'SECUNDARIA BTH', 'ESPECIAL']:
        macro_esps = [e for e in esps if get_macro(e['especialidad']) == macro]
        
        # Demanda 2026/2027 inicial y egresados al 2031
        tot_dem = sum(round(e['por_dpto'][dpto].get('items_deficit_uie', 0)) for e in macro_esps)
        tot_egr = sum(e['por_dpto'][dpto].get('egresados_esfm_proyectados', 0) for e in macro_esps)
        tot_real = tot_dem - tot_egr
        row_stats[macro] = (tot_dem, tot_egr, tot_real)
        
    print(f"{dpto:12} | " + " | ".join(f"{s[0]:4d} / {s[1]:4d} / {s[2]:5d}" for s in row_stats.values()))
