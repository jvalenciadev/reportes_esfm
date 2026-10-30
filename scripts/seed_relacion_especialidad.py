import openpyxl
import json
import os
import urllib.request

ESPECIALIDADES_MAP = {
    1: 'CIENCIAS NATURALES: FÍSICA - QUÍMICA',
    2: 'EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL',
    3: 'EDUCACIÓN MUSICAL',
    4: 'ARTES PLÁSTICAS Y VISUALES',
    5: 'EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA',
    6: 'EDUCACIÓN FÍSICA Y DEPORTES',
    7: 'TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA',
    8: 'COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA',
    9: 'MATEMÁTICA',
    10: 'VALORES, ESPIRITUALIDAD Y RELIGIONES',
    11: 'COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA',
    12: 'CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA',
    13: 'AGROPECUARIA',
    14: 'ELECTRICIDAD Y ELECTRÓNICA',
    15: 'MECÁNICA AUTOMOTRIZ',
    16: 'ELECTROMECÁNICA',
    17: 'COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)',
    18: 'INDUSTRIA TEXTIL Y CONFECCIÓN',
    19: 'EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD',
    20: 'CIENCIAS SOCIALES',
}

def match_especialidad(sub, niv, cargo):
    c = cargo.upper()
    n = niv.upper()
    s = sub.upper()

    # Inicial
    if 'INICIAL' in n and any(k in c for k in ['AULA', 'CURSO', 'DOCENTE', 'NORMALISTA', 'EGRESADO', 'INICIAL']):
        return 5 # EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA

    # Primaria
    if 'PRIMARIA' in n and any(k in c for k in ['AULA', 'CURSO', 'DOCENTE', 'NORMALISTA', 'EGRESADO', 'TITULAR']):
        if not any(k in c for k in ['MUSICA', 'FISICA', 'DEPORTE', 'RELIGION', 'VALORES']):
            return 2 # EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL

    # Musical
    if any(k in c for k in ['MUSICA', 'MUSICAL']):
        return 3 # EDUCACIÓN MUSICAL

    # Artes Plásticas
    if any(k in c for k in ['ARTES PLAST', 'PLASTICAS', 'VISUALES']):
        return 4 # ARTES PLÁSTICAS Y VISUALES

    # Educación Física
    if any(k in c for k in ['FISICA Y DEP', 'EDUC.FISICA', 'EDUC FISICA', 'DEPORTE']):
        return 6 # EDUCACIÓN FÍSICA Y DEPORTES

    # Gastronomía
    if any(k in c for k in ['GASTRONOM', 'ALIMENT']):
        return 7 # TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA

    # Lengua Castellana
    if any(k in c for k in ['LENGUA CAST', 'LITERATURA', 'LENGUAJE', 'ORIGINAR']):
        return 8 # COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA

    # Inglés
    if any(k in c for k in ['EXTRANJ', 'INGLES', 'FRANCES']):
        return 17 # COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)

    # Matemática
    if 'MATEMAT' in c:
        return 9 # MATEMÁTICA

    # Valores y Religiones
    if any(k in c for k in ['VALORES', 'RELIGIO', 'ESPIRITUAL']):
        return 10 # VALORES, ESPIRITUALIDAD Y RELIGIONES

    # Filosofía / Psicología
    if any(k in c for k in ['COSMOVIS', 'FILOSOF', 'SICOLOG', 'PSICOLOG']):
        return 11 # COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA

    # Biología - Geografía
    if any(k in c for k in ['BIOLOG', 'GEOGRAF']):
        return 12 # CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA

    # Física - Química
    if ('FISICA' in c and 'QUIMICA' in c) or ('QUIMICA' in c and 'BIOLOG' not in c) or ('FISICA' in c and 'DEP' not in c and 'EDUC' not in c):
        return 1 # CIENCIAS NATURALES: FÍSICA - QUÍMICA

    # Agropecuaria
    if any(k in c for k in ['AGROPEC', 'VETERINAR', 'AGRONOM']):
        return 13 # AGROPECUARIA

    # Electricidad / Electrónica
    if any(k in c for k in ['ELECTRIC', 'ELECTRONIC']):
        return 14 # ELECTRICIDAD Y ELECTRÓNICA

    # Mecánica Automotriz
    if any(k in c for k in ['AUTOMOT', 'MECANICA AUT']):
        return 15 # MECÁNICA AUTOMOTRIZ

    # Electromecánica
    if 'ELECTROMECAN' in c or 'MECANICA IND' in c:
        return 16 # ELECTROMECÁNICA

    # Textil
    if any(k in c for k in ['TEXTIL', 'CONFECC']):
        return 18 # INDUSTRIA TEXTIL Y CONFECCIÓN

    # Educación Especial
    if 'ESPECIAL' in s or any(k in c for k in ['INTELECTUAL', 'AUDITIV', 'VISUAL', 'AUTISMO', 'SORDO', 'DISCAPACIDAD']):
        return 19 # EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD

    # Ciencias Sociales
    if any(k in c for k in ['CIENCIAS SOCIALES', 'SOCIALES', 'HISTORIA', 'CIVICA']):
        return 20 # CIENCIAS SOCIALES

    return None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
catalogo_file = os.path.join(BASE_DIR, 'src', 'data', 'uieCargosCatalogo.json')

with open(catalogo_file, 'r', encoding='utf-8') as f:
    catalogo = json.load(f)

mapeos = []
for item in catalogo:
    dep = item['dependencia']
    sub = item['subsistema']
    niv = item['nivel']
    cargo = item['cargo']
    esp_id = match_especialidad(sub, niv, cargo)
    
    if esp_id:
        mapeos.append({
            'especialidad_id': esp_id,
            'dependencia': dep,
            'subsistema': sub,
            'nivel': niv,
            'cargo': cargo,
            'activo': True
        })

print(f'Mapeos autodetectados: {len(mapeos)} de {len(catalogo)} combinaciones.')

# Guardar lote SQL
sql_file = os.path.join(BASE_DIR, 'scripts', 'seed_relaciones_especialidad.sql')
with open(sql_file, 'w', encoding='utf-8') as f:
    f.write('-- INSERTS INICIALES PARA relacion_especialidad\n')
    f.write('TRUNCATE TABLE public.relacion_especialidad RESTART IDENTITY CASCADE;\n\n')
    
    # Inserciones en bloques
    batch_size = 200
    for i in range(0, len(mapeos), batch_size):
        chunk = mapeos[i:i+batch_size]
        f.write('INSERT INTO public.relacion_especialidad (especialidad_id, dependencia, subsistema, nivel, cargo, activo) VALUES\n')
        lines = []
        for m in chunk:
            c_esc = m['cargo'].replace("'", "''")
            s_esc = m['subsistema'].replace("'", "''")
            n_esc = m['nivel'].replace("'", "''")
            d_esc = m['dependencia'].replace("'", "''")
            lines.append(f"  ({m['especialidad_id']}, '{d_esc}', '{s_esc}', '{n_esc}', '{c_esc}', true)")
        f.write(',\n'.join(lines))
        f.write('\nON CONFLICT (especialidad_id, cargo, nivel, subsistema, dependencia) DO NOTHING;\n\n')

print(f'SQL de seed generado en: {sql_file} ({os.path.getsize(sql_file):,} bytes)')

# Subir a Supabase por REST API
SUPABASE_URL = 'https://dwretdtwyqsltylvnvld.supabase.co'
SUPABASE_KEY = 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq'
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print('Subiendo mapeos a Supabase via REST API...')
inserted = 0
for i in range(0, len(mapeos), 200):
    chunk = mapeos[i:i+200]
    payload = json.dumps(chunk).encode('utf-8')
    req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/relacion_especialidad', data=payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            inserted += len(chunk)
            print(f'  Lote {i//200 + 1}: {len(chunk)} relaciones insertadas ({inserted}/{len(mapeos)})')
    except Exception as e:
        print(f'  Error en lote {i//200 + 1}: {e}')

print('Subida completada.')

