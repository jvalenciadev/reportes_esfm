import json
import unicodedata
import os

FALLBACK_PATH = 'src/data/fallbackData.json'
SIE_PATH = 'src/data/sie_deficit_resumen_global.json'
OFICIALES_PATH = 'src/data/especialidades_oficiales.json'
OUTPUT_PATH = 'src/data/egresados_esfm_proyeccion.json'

DEPTOS_MAP = {
    1: 'CHUQUISACA',
    2: 'LA PAZ',
    3: 'COCHABAMBA',
    4: 'ORURO',
    5: 'POTOSÍ',
    6: 'TARIJA',
    7: 'SANTA CRUZ',
    8: 'BENI',
    9: 'PANDO'
}

def norm(s):
    s = s.upper().strip()
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def build():
    with open(FALLBACK_PATH, 'r', encoding='utf-8') as f:
        fb = json.load(f)
    with open(SIE_PATH, 'r', encoding='utf-8') as f:
        sie = json.load(f)
    with open(OFICIALES_PATH, 'r', encoding='utf-8') as f:
        oficiales = json.load(f)

    fb_esp_names = {e['id']: e['nombre'].upper().strip() for e in fb['especialidades']}
    sie_esp_map = {e['id']: e for e in sie['especialidades']}
    oficial_map = {norm(o['nombre']): o['id'] for o in oficiales}

    alias = {
        norm('CARPINTERÍA EN MADERA Y METAL'): norm('CARPINTERÍA INDUSTRIAL EN MADERA Y METAL'),
        norm('COMUNICACIÓN Y LENGUAJES: CASTELLANA E INGLÉS'): norm('COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)'),
        norm('EDUCACIÓN TECNICA TECNOLÓGICA PRODUCTIVA MUEBLERIA EN MADERA Y METAL'): norm('CARPINTERÍA INDUSTRIAL EN MADERA Y METAL'),
        norm('EDUCACIÓN TÉCNICA TECNOLÓGICA PRODUCTIVA ELECTROMECANICA'): norm('ELECTROMECÁNICA'),
        norm('EDUCACIÓN TÉCNICA TECNOLÓGICA PRODUCTIVA ELECTRÓNICA Y ELECTRICIDAD'): norm('ELECTRICIDAD Y ELECTRÓNICA'),
        norm('EDUCACIÓN TÉCNICA TECNOLÓGICA PRODUCTIVA INDUSTRIA DE ALIMENTOS Y GASTRONOMIA'): norm('TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA'),
        norm('EDUCACIÓN TÉCNICA TECNOLÓGICA PRODUCTIVA INDUSTRIA TEXTIL Y CONFECCIÓN'): norm('INDUSTRIA TEXTIL Y CONFECCIÓN'),
        norm('EDUCACIÓN TÉCNICA TECNOLÓGICA PRODUCTIVA MECÁNICA AUTOMOTRIZ'): norm('MECÁNICA AUTOMOTRIZ'),
        norm('ELECTRICIDAD INDUSTRIAL'): norm('ELECTRICIDAD Y ELECTRÓNICA'),
        norm('MECÁNICA INDUSTRIAL'): norm('MECÁNICA INDUSTRIAL')
    }

    inscritos_raw = fb.get('inscritos_esfm', [])

    # 1. Resumen por Cohorte (Gestión de ingreso 2021 a 2026)
    cohortes_data = []
    for g in range(2021, 2027):
        egreso_yr = g + 5
        records_g = [r for r in inscritos_raw if r.get('gestion') == g]
        total_insc = sum(r.get('total_inscritos', 0) for r in records_g)
        
        por_dpto = {}
        for d_id, d_nom in DEPTOS_MAP.items():
            tot_d = sum(r.get('total_inscritos', 0) for r in records_g if r.get('departamento_id') == d_id)
            por_dpto[d_nom] = tot_d

        cohortes_data.append({
            'gestion_ingreso': g,
            'gestion_egreso': egreso_yr,
            'anio_academico_actual': f'{2026 - g + 1}º Año',
            'total_inscritos': total_insc,
            'por_dpto': por_dpto
        })

    # 2. Resumen por Departamento (Cohortes 2022-2026 / Egresos 2027-2031)
    deptos_data = []
    for d_id, d_nom in DEPTOS_MAP.items():
        recs_d = [r for r in inscritos_raw if r.get('departamento_id') == d_id and 2022 <= r.get('gestion', 0) <= 2026]
        tot_insc_d = sum(r.get('total_inscritos', 0) for r in recs_d)
        
        # Déficit de items en la Matriz de Calor para este departamento
        d_sie = next((d for d in sie['totales_pais']['departamentos'] if d['departamento_id'] == d_id), {})
        items_def_d = d_sie.get('items_deficit_equiv', 0)
        def_horas_d = d_sie.get('deficit_horas', 0)

        cohortes_d = {}
        for g in range(2022, 2027):
            egr_y = g + 5
            tot_g = sum(r.get('total_inscritos', 0) for r in recs_d if r.get('gestion') == g)
            cohortes_d[str(egr_y)] = tot_g

        deptos_data.append({
            'departamento_id': d_id,
            'departamento': d_nom,
            'total_inscritos_2022_2026': tot_insc_d,
            'items_deficit_matriz': items_def_d,
            'deficit_horas_matriz': def_horas_d,
            'cohortes_inscritos': cohortes_d
        })

    # 3. Resumen por Especialidad Oficial vinculada con la Matriz de Calor
    # Mapeo de inscritos a cada especialidad oficial
    esp_inscritos = {o['id']: {'total': 0, 'cohortes': {str(g+5): 0 for g in range(2022, 2027)}, 'por_dpto': {d: 0 for d in DEPTOS_MAP.values()}} for o in oficiales}

    for r in inscritos_raw:
        g = r.get('gestion', 0)
        if 2022 <= g <= 2026:
            fb_id = r.get('especialidad_id')
            fb_nom = fb_esp_names.get(fb_id, '')
            n_nom = norm(fb_nom)
            if n_nom in alias:
                n_nom = alias[n_nom]
            
            of_id = oficial_map.get(n_nom)
            if not of_id:
                for k, oid in oficial_map.items():
                    if k in n_nom or n_nom in k:
                        of_id = oid
                        break
            
            if of_id and of_id in esp_inscritos:
                cnt = r.get('total_inscritos', 0)
                esp_inscritos[of_id]['total'] += cnt
                egr_yr = str(g + 5)
                esp_inscritos[of_id]['cohortes'][egr_yr] = esp_inscritos[of_id]['cohortes'].get(egr_yr, 0) + cnt
                d_nom = DEPTOS_MAP.get(r.get('departamento_id', 0))
                if d_nom:
                    esp_inscritos[of_id]['por_dpto'][d_nom] = esp_inscritos[of_id]['por_dpto'].get(d_nom, 0) + cnt

    especialidades_data = []
    for o in oficiales:
        oid = o['id']
        nom = o['nombre']
        hora_item = o.get('hora_item', 96.0)

        # Datos de la Matriz de Calor SIE
        sie_item = sie_esp_map.get(oid, {})
        items_def_sie = sie_item.get('items_deficit_equiv', 0)
        def_horas_sie = sie_item.get('deficit_horas', 0)
        cob_actual_sie = sie_item.get('pct_cobertura', 100.0)

        # Inscritos
        insc_info = esp_inscritos.get(oid, {'total': 0, 'cohortes': {}, 'por_dpto': {}})
        tot_insc = insc_info['total']
        cohortes_esp = insc_info['cohortes']
        por_dpto_esp = insc_info['por_dpto']

        # Egresados base 82%
        egr_82 = round(tot_insc * 0.82)
        balance_base = egr_82 - items_def_sie

        # Dictamen claro y lógico sobre el balance real
        if balance_base > 200:
            dictamen = 'SOBREOFERTA'
            badge = 'Sobreoferta Crítica'
            color = 'rose'
            justificacion = f'Egresarán {egr_82:,} maestros pero la Matriz de Calor solo tiene {items_def_sie:,} ítems en déficit. Hay un excedente de +{balance_base:,} graduados que quedarán sin ítem.'
        elif balance_base < -50:
            dictamen = 'DÉFICIT'
            badge = 'Déficit sin Cubrir'
            color = 'emerald'
            justificacion = f'La Matriz de Calor requiere {items_def_sie:,} ítems pero solo egresarán {egr_82:,} maestros. Faltarán {-balance_base:,} ítems por cubrir. Se deben abrir más cupos.'
        else:
            dictamen = 'EQUILIBRIO'
            badge = 'Equilibrio'
            color = 'amber'
            justificacion = f'Oferta de egreso ({egr_82:,} maestros) en equilibrio con los {items_def_sie:,} ítems de déficit en aula.'

        especialidades_data.append({
            'especialidad_id': oid,
            'nombre': nom,
            'hora_item': hora_item,
            'total_inscritos_2022_2026': tot_insc,
            'items_deficit_matriz': items_def_sie,
            'deficit_horas_matriz': def_horas_sie,
            'cobertura_actual_sie': cob_actual_sie,
            'dictamen': dictamen,
            'color': color,
            'badge': badge,
            'justificacion': justificacion,
            'cohortes_inscritos': cohortes_esp,
            'por_dpto': por_dpto_esp
        })

    # Ordenar por déficit de la Matriz de Calor descendente
    especialidades_data.sort(key=lambda x: x['items_deficit_matriz'], reverse=True)

    final_payload = {
        'metadata': {
            'fuente_esfm': 'DGFM / Sistema de Formación Docente ESFM · Ministerio de Educación',
            'fuente_deficit': 'Matriz de Calor: Déficit de Ítems Docentes UIE / SIE UE',
            'horizonte_formacion': '5 años académicos por cohorte (2022 a 2026 -> Egresan 2027 a 2031)',
            'tasa_titulacion_historica_pct': 82.0,
            'tasa_abandono_historica_pct': 18.0,
            'corte': 'Noviembre 2026'
        },
        'totales_nacionales': {
            'total_inscritos_2022_2026': sum(e['total_inscritos_2022_2026'] for e in especialidades_data),
            'total_egresados_82_pct': round(sum(e['total_inscritos_2022_2026'] for e in especialidades_data) * 0.82),
            'total_merma_18_pct': round(sum(e['total_inscritos_2022_2026'] for e in especialidades_data) * 0.18),
            'total_deficit_items_matriz': sie['totales_pais']['items_deficit_equiv'],
            'total_deficit_horas_matriz': sie['totales_pais']['deficit_horas'],
            'total_especialidades': 22,
            'total_esfms': 46
        },
        'cohortes': cohortes_data,
        'departamentos': deptos_data,
        'especialidades': especialidades_data
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)

    print(f'Generado exitosamente {OUTPUT_PATH}')
    print(f'Inscritos: {final_payload["totales_nacionales"]["total_inscritos_2022_2026"]}')
    print(f'Déficit Ítems Matriz: {final_payload["totales_nacionales"]["total_deficit_items_matriz"]}')

if __name__ == '__main__':
    build()
