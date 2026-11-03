import json

data = json.load(open('src/data/exposicion_2031.json', encoding='utf-8'))
esps = data['dictamen_apertura_especialidades']

def get_macro(name):
    u = name.upper()
    if 'INICIAL' in u:
        return 'INICIAL'
    if 'PRIMARIA' in u:
        return 'PRIMARIA'
    if 'ESPECIAL' in u:
        return 'ESPECIAL'
    if any(k in u for k in ['ELECTROMEC', 'TEXTIL', 'ELECTRICIDAD', 'ALIMENTOS', 'GASTRONOM', 'AUTOMOTRIZ', 'AGROPECUARIA', 'BTH']):
        return 'SECUNDARIA BTH'
    return 'SECUNDARIA'

macros = {'INICIAL': [], 'PRIMARIA': [], 'SECUNDARIA BTH': [], 'ESPECIAL': [], 'SECUNDARIA': []}
for e in esps:
    m = get_macro(e['especialidad'])
    macros[m].append(e)

for m, lst in macros.items():
    print(f"=== {m} ({len(lst)} especialidades) ===")
    for e in lst:
        print(f"  - {e['especialidad']} (Deficit Nacional: {e.get('items_deficit_uie_nacional', 0)}, Egresados 2031: {e.get('egresados_proyectados_2031', 0)})")
