"""
Reconciliación matemática de datos de migración de estudiantes (2014-2025).
Garantiza que la partición (Sede + Retorno/Emigración + Sin Inserción) sea exhaustiva
y sume exactamente el 100.0% para todas las gestiones y departamentos usando Largest Remainder.
"""
import json
import pandas as pd

def round_percentages_1dp(counts, total):
    exact = [(c / total) * 1000 for c in counts]
    floors = [int(x) for x in exact]
    remainder = 1000 - sum(floors)
    diffs = sorted([(exact[i] - floors[i], i) for i in range(len(counts))], reverse=True)
    for k in range(remainder):
        floors[diffs[k][1]] += 1
    return [round(f / 10, 1) for f in floors]

def run():
    df = pd.read_excel('public/datos/datos_migracion_estudiantes.xlsx')
    df['dep_esfm'] = df['departamento'].astype(str).str.strip().str.upper()
    df['dep_ini'] = df['DES_DEPARTAMENTO_INI'].astype(str).str.strip().str.upper().replace({'NAN': None, '': None})
    df['dep_fin'] = df['DES_DEPARTAMENTO_0726'].astype(str).str.strip().str.upper().replace({'NAN': None, '': None})

    # Filtrar solo gestiones válidas 2014-2025
    df = df[df['gestion_titulacion'] != 2026]

    with open('src/data/migracion_estudiantes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Series por gestión
    new_series = []
    for g in sorted(df['gestion_titulacion'].unique()):
        sub = df[df['gestion_titulacion'] == g]
        tot = len(sub)
        sede = int(((~sub['dep_ini'].isna()) & (sub['dep_ini'] == sub['dep_esfm'])).sum())
        emig = int(((~sub['dep_ini'].isna()) & (sub['dep_ini'] != sub['dep_esfm'])).sum())
        sin = int(sub['dep_ini'].isna().sum())
        p_sede, p_emig, p_sin = round_percentages_1dp([sede, emig, sin], tot)
        
        sub_ini = sub[~sub['GESTION_INI'].isna()]
        espera = round(float((sub_ini['GESTION_INI'] - sub_ini['gestion_titulacion']).mean()), 1) if len(sub_ini) > 0 else 0.0

        new_series.append({
            'gestion': int(g),
            'total_titulados': tot,
            'quedan_sede': sede,
            'pct_quedan_sede': p_sede,
            'emigran_retornan_inmediato': emig,
            'pct_emigran_retornan': p_emig,
            'sin_ejercer': sin,
            'pct_sin_ejercer': p_sin,
            'espera_promedio_anos': espera
        })

    # 2. KPIs Globales
    tot_global = len(df)
    sede_global = int(((~df['dep_ini'].isna()) & (df['dep_ini'] == df['dep_esfm'])).sum())
    emig_global = int(((~df['dep_ini'].isna()) & (df['dep_ini'] != df['dep_esfm'])).sum())
    sin_global = int(df['dep_ini'].isna().sum())
    p_sede_g, p_emig_g, p_sin_g = round_percentages_1dp([sede_global, emig_global, sin_global], tot_global)

    # Subcategorías de movilidad posterior
    # - Permanentes en sede: dep_ini == dep_esfm & dep_fin == dep_esfm
    # - Emigración tardía: dep_ini == dep_esfm & dep_fin != dep_esfm & ~dep_fin.isna()
    emig_tardia = int(((~df['dep_ini'].isna()) & (df['dep_ini'] == df['dep_esfm']) & (~df['dep_fin'].isna()) & (df['dep_fin'] != df['dep_esfm'])).sum())
    retorno_tardio = int(((~df['dep_ini'].isna()) & (df['dep_ini'] != df['dep_esfm']) & (~df['dep_fin'].isna()) & (df['dep_fin'] == df['dep_esfm'])).sum())
    itinerantes = int(((~df['dep_ini'].isna()) & (df['dep_ini'] != df['dep_esfm']) & (~df['dep_fin'].isna()) & (df['dep_fin'] != df['dep_esfm']) & (df['dep_ini'] != df['dep_fin'])).sum())

    data['kpis_globales'] = {
        'total_titulados': tot_global,
        'retencion_sede_esfm': sede_global,
        'pct_retencion_sede': p_sede_g,
        'emigracion_retorno_inmediato': emig_global,
        'pct_emigracion_retorno': p_emig_g,
        'sin_insercion_sep': sin_global,
        'pct_sin_insercion': p_sin_g,
        'emigracion_tardia': emig_tardia,
        'pct_emigracion_tardia': round(emig_tardia / tot_global * 100, 1),
        'retorno_tardio_esfm': retorno_tardio,
        'pct_retorno_tardio': round(retorno_tardio / tot_global * 100, 1),
        'itinerantes': itinerantes,
        'pct_itinerantes': round(itinerantes / tot_global * 100, 1)
    }

    data['series_por_gestion'] = new_series

    # 3. Por departamento
    for dep in data['por_departamento']:
        sub_dep = df[df['dep_esfm'] == dep]
        tot_d = len(sub_dep)
        sede_d = int(((~sub_dep['dep_ini'].isna()) & (sub_dep['dep_ini'] == dep)).sum())
        emig_d = int(((~sub_dep['dep_ini'].isna()) & (sub_dep['dep_ini'] != dep)).sum())
        sin_d = int(sub_dep['dep_ini'].isna().sum())
        p_sede_d, p_emig_d, p_sin_d = round_percentages_1dp([sede_d, emig_d, sin_d], tot_d)

        data['por_departamento'][dep]['total_titulados'] = tot_d
        data['por_departamento'][dep]['quedan_sede'] = sede_d
        data['por_departamento'][dep]['pct_quedan_sede'] = p_sede_d
        data['por_departamento'][dep]['emigran_inmediato'] = emig_d
        data['por_departamento'][dep]['pct_emigran_inmediato'] = p_emig_d
        data['por_departamento'][dep]['sin_ejercer'] = sin_d
        data['por_departamento'][dep]['pct_sin_ejercer'] = p_sin_d

    # Guardar archivo actualizado
    with open('src/data/migracion_estudiantes.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('OK: migracion_estudiantes.json actualizado con conciliacion matemática exacta (100.0% por cohorte).')

if __name__ == '__main__':
    run()
