import sqlite3
import json
import os
from collections import defaultdict

def norm_dpto(n):
    if not n:
        return ""
    return n.upper().replace('Í','I').replace('Á','A').replace('É','E').replace('Ó','O').replace('Ú','U').strip()

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fallback_path = os.path.join(base_dir, 'src', 'data', 'fallbackData.json')
    db_historial = os.path.join(base_dir, 'src', 'data', 'historial.db')
    db_sich = os.path.join(base_dir, 'src', 'data', 'sich_2025.db')
    output_path = os.path.join(base_dir, 'src', 'data', 'exposicion_2031.json')

    with open(fallback_path, 'r', encoding='utf-8') as f:
        fb = json.load(f)

    dptos_map = {d['id']: norm_dpto(d['nombre']) for d in fb['departamentos']}
    esp_catalog = {e['id']: e['nombre'].strip().upper() for e in fb['especialidades']}

    # 1. Demografía Escolar INE (4 a 17 años) 2024 - 2031
    ine_escolar = defaultdict(lambda: defaultdict(int))
    for r in fb.get('ine_proyeccion_edad', []):
        if 4 <= r['edad'] <= 17 and 2024 <= r['anio'] <= 2031:
            d_name = dptos_map.get(r['departamento_id'], 'NACIONAL')
            ine_escolar[d_name][r['anio']] += r['cantidad']
            ine_escolar['NACIONAL'][r['anio']] += r['cantidad']

    # 2. Matrícula SIE 2026 oficial por dpto
    sie_matricula_dpto = defaultdict(int)
    for r in fb.get('sie_total_estudiantes', []):
        d_name = dptos_map.get(r.get('departamento_id'), 'NACIONAL')
        sie_matricula_dpto[d_name] += r.get('cantidad', 0)
        sie_matricula_dpto['NACIONAL'] += r.get('cantidad', 0)

    # 3. Datos de Historial Docente desde historial.db (100% Cuadrados)
    con_h = sqlite3.connect(db_historial)
    cur_h = con_h.cursor()

    t2024 = cur_h.execute("SELECT COUNT(DISTINCT ci) FROM hist_2024 WHERE subsistema='REGULAR'").fetchone()[0] # 157,224
    t2025 = cur_h.execute("SELECT COUNT(DISTINCT ci) FROM hist_2025 WHERE subsistema='REGULAR'").fetchone()[0] # 158,443
    t2026 = cur_h.execute("SELECT COUNT(*) FROM hist_2026").fetchone()[0] # 164,448 ítems en aula

    salientes_dpto = {}
    entrantes_dpto = {}
    cur_h.execute("""
      SELECT departamento, COUNT(DISTINCT ci) FROM hist_2024
      WHERE subsistema='REGULAR' AND ci NOT IN (SELECT ci FROM hist_2025 WHERE subsistema='REGULAR')
      GROUP BY departamento
    """)
    for d, c in cur_h.fetchall():
        salientes_dpto[norm_dpto(d)] = c

    cur_h.execute("""
      SELECT departamento, COUNT(DISTINCT ci) FROM hist_2025
      WHERE subsistema='REGULAR' AND ci NOT IN (SELECT ci FROM hist_2024 WHERE subsistema='REGULAR')
      GROUP BY departamento
    """)
    for d, c in cur_h.fetchall():
        entrantes_dpto[norm_dpto(d)] = c

    # Maestros sin cargo en 2026 (exactamente 2,684)
    sin_cargo_dpto = {}
    cur_h.execute("SELECT departamento, COUNT(*) FROM hist_2026 WHERE TRIM(cargo) = '' GROUP BY departamento")
    for d, c in cur_h.fetchall():
        sin_cargo_dpto[norm_dpto(d)] = c
    total_sin_cargo = sum(sin_cargo_dpto.values())

    # Totales de impertinencias 2026 (28,323 de 164,448 = 17.22%)
    tot_impert = cur_h.execute("SELECT SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) FROM hist_2026").fetchone()[0]
    tot_pert = t2026 - tot_impert
    pct_impert_nac = round((tot_impert / t2026) * 100, 2)

    # Impertinencia consolidada por departamento en hist_2026
    impert_dpto = {}
    cur_h.execute("""
      SELECT departamento,
             COUNT(*) as total,
             SUM(CASE WHEN pertinencia = 'NO' THEN 1 ELSE 0 END) as impertinentes,
             SUM(CASE WHEN pertinencia = 'SI' THEN 1 ELSE 0 END) as pertinentes,
             ROUND(SUM(CASE WHEN pertinencia = 'NO' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as pct_impert
      FROM hist_2026
      GROUP BY departamento
    """)
    for d, tot, imp, pert, pct in cur_h.fetchall():
        impert_dpto[norm_dpto(d)] = {
            'total': tot,
            'impertinentes': imp,
            'pertinentes': pert,
            'pct_impertinencia': pct,
            'nivel_alerta': 'CRITICO' if pct >= 20.0 else 'MODERADO' if pct >= 16.0 else 'CONTROLADO'
        }

    # Impertinencia por Especialidad y Departamento (Top especialidades con impertinencia)
    cur_h.execute("""
      SELECT departamento, especialidad,
             COUNT(*) as total,
             SUM(CASE WHEN pertinencia = 'NO' THEN 1 ELSE 0 END) as impertinentes,
             ROUND(SUM(CASE WHEN pertinencia = 'NO' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as pct_impert
      FROM hist_2026
      WHERE especialidad != ''
      GROUP BY departamento, especialidad
      HAVING impertinentes > 0
      ORDER BY departamento, impertinentes DESC
    """)
    impert_esp_dpto = defaultdict(list)
    for dep, esp, tot, imp, pct in cur_h.fetchall():
        impert_esp_dpto[norm_dpto(dep)].append({
            'especialidad': esp.strip().upper(),
            'total': tot,
            'impertinentes': imp,
            'pertinentes': tot - imp,
            'pct_impert': pct
        })

    # Impertinencia y Rural/Urbano por Especialidad y Departamento en hist_2026
    cur_h.execute("""
      SELECT especialidad, departamento, area, COUNT(*) as total,
             SUM(CASE WHEN pertinencia='NO' THEN 1 ELSE 0 END) as impert
      FROM hist_2026
      WHERE especialidad != ''
      GROUP BY especialidad, departamento, area
    """)
    rows_hist_esp = cur_h.fetchall()

    esp_hist_stats = defaultdict(lambda: {
        'total': 0,
        'impertinentes': 0,
        'pertinentes': 0,
        'rural': 0,
        'urbana': 0,
        'por_dpto': defaultdict(lambda: {'total': 0, 'impertinentes': 0, 'pertinentes': 0, 'rural': 0, 'urbana': 0})
    })

    for esp, dep, area, tot, imp in rows_hist_esp:
        esp_c = esp.strip().upper()
        dep_c = norm_dpto(dep)
        esp_hist_stats[esp_c]['total'] += tot
        esp_hist_stats[esp_c]['impertinentes'] += imp
        esp_hist_stats[esp_c]['pertinentes'] += (tot - imp)
        if area == 'RURAL':
            esp_hist_stats[esp_c]['rural'] += tot
            esp_hist_stats[esp_c]['por_dpto'][dep_c]['rural'] += tot
        else:
            esp_hist_stats[esp_c]['urbana'] += tot
            esp_hist_stats[esp_c]['por_dpto'][dep_c]['urbana'] += tot

        esp_hist_stats[esp_c]['por_dpto'][dep_c]['total'] += tot
        esp_hist_stats[esp_c]['por_dpto'][dep_c]['impertinentes'] += imp
        esp_hist_stats[esp_c]['por_dpto'][dep_c]['pertinentes'] += (tot - imp)

    # 4. Inscritos y Cohortes DGFM por Especialidad, Gestión y Departamento
    # Duración de la carrera en ESFM = 5 años. Titulación histórica = 82%
    dgfm_inscritos_esp = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    for r in fb.get('inscritos_esfm', []):
        esp_name = esp_catalog.get(r['especialidad_id'], 'OTRAS ESPECIALIDADES / TÉCNICO')
        d_name = dptos_map.get(r['departamento_id'], 'NACIONAL')
        g = r['gestion']
        cnt = r.get('total_inscritos', 0)
        dgfm_inscritos_esp[esp_name][g][d_name] += cnt
        dgfm_inscritos_esp[esp_name][g]['NACIONAL'] += cnt

    # 5. Población Escolar INE por Nivel (Inicial: 4-5, Primaria: 6-11, Secundaria: 12-17)
    # y desglose por departamento
    pop_nivel_ine = {
        'INICIAL': {y: 0 for y in range(2024, 2032)},
        'PRIMARIA': {y: 0 for y in range(2024, 2032)},
        'SECUNDARIA': {y: 0 for y in range(2024, 2032)}
    }
    pop_dpto_nivel_ine = defaultdict(lambda: {
        'INICIAL': {y: 0 for y in range(2024, 2032)},
        'PRIMARIA': {y: 0 for y in range(2024, 2032)},
        'SECUNDARIA': {y: 0 for y in range(2024, 2032)}
    })

    for r in fb.get('ine_proyeccion_edad', []):
        y = r['anio']
        if 2024 <= y <= 2031:
            dep_n = dptos_map.get(r['departamento_id'], 'NACIONAL')
            e = r['edad']
            if 4 <= e <= 5:
                pop_nivel_ine['INICIAL'][y] += r['cantidad']
                pop_dpto_nivel_ine[dep_n]['INICIAL'][y] += r['cantidad']
            elif 6 <= e <= 11:
                pop_nivel_ine['PRIMARIA'][y] += r['cantidad']
                pop_dpto_nivel_ine[dep_n]['PRIMARIA'][y] += r['cantidad']
            elif 12 <= e <= 17:
                pop_nivel_ine['SECUNDARIA'][y] += r['cantidad']
                pop_dpto_nivel_ine[dep_n]['SECUNDARIA'][y] += r['cantidad']

    # Tasas anuales de variación porcentual de la población INE nacional y departamental
    var_anual_poblacion = {'INICIAL': {}, 'PRIMARIA': {}, 'SECUNDARIA': {}}
    for lvl in ['INICIAL', 'PRIMARIA', 'SECUNDARIA']:
        for y in range(2025, 2032):
            prev_p = pop_nivel_ine[lvl][y - 1]
            curr_p = pop_nivel_ine[lvl][y]
            var_anual_poblacion[lvl][y] = (curr_p - prev_p) / (prev_p or 1.0)

    var_dpto_nivel = defaultdict(lambda: {'INICIAL': {}, 'PRIMARIA': {}, 'SECUNDARIA': {}})
    for dep_n in pop_dpto_nivel_ine:
        for lvl in ['INICIAL', 'PRIMARIA', 'SECUNDARIA']:
            for y in range(2025, 2032):
                p0 = pop_dpto_nivel_ine[dep_n][lvl][y - 1]
                p1 = pop_dpto_nivel_ine[dep_n][lvl][y]
                var_dpto_nivel[dep_n][lvl][y] = (p1 - p0) / (p0 or 1.0)

    # 6. BASE UIE / SIE UE: Carga Horaria, Horas Planilla y Déficit
    # Consultamos la API oficial de filtros SICH/UIE (/api/especialidad-deficit)
    import urllib.request
    api_data_by_esp = {}
    try:
        req = urllib.request.Request('http://localhost:3000/api/especialidad-deficit')
        with urllib.request.urlopen(req, timeout=4) as resp:
            data_filtros = json.loads(resp.read().decode())
            for f in data_filtros.get('especialidades', []):
                esp_obj = f.get('especialidades_oficiales') or {}
                f_id = f.get('id')
                nombre_esp = esp_obj.get('nombre', '').strip().upper()
                if f_id and nombre_esp:
                    url_det = f'http://localhost:3000/api/especialidad-deficit?especialidad_id={f_id}'
                    try:
                        with urllib.request.urlopen(url_det, timeout=4) as r_det:
                            det_json = json.loads(r_det.read().decode())
                            if det_json.get('resumen_nacional'):
                                api_data_by_esp[nombre_esp] = det_json
                    except Exception:
                        pass
    except Exception as e:
        print("Aviso: Consulta a API falló, usando consultas SQLite directas:", e)

    con_s = sqlite3.connect(db_sich)
    cur_s = con_s.cursor()

    # Mapeo de respaldo si la API no estuviera disponible
    especialidades_uie_map = [
        ('EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL', "nivel = 'PRIMARIA' AND cargo LIKE '%MAESTRO DE AULA%'"),
        ('EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA', "nivel = 'INICIAL' AND cargo LIKE '%MAESTRO DE AULA%'"),
        ('MATEMÁTICA', "cargo LIKE '%MATEMATICA%'"),
        ('COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA', "cargo LIKE '%LENGUA CAST%' OR cargo LIKE '%LENGUA CASTELLANA%'"),
        ('CIENCIAS NATURALES: FÍSICA - QUÍMICA', "cargo LIKE '%FISICA%' OR cargo LIKE '%QUIMICA%'"),
        ('CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA', "cargo LIKE '%BIOLOGIA%' OR cargo LIKE '%GEOGRAFIA%'"),
        ('CIENCIAS SOCIALES', "cargo LIKE '%CIENCIAS SOCIALES%'"),
        ('EDUCACIÓN FÍSICA Y DEPORTES', "cargo LIKE '%ED FISICA%'"),
        ('EDUCACIÓN MUSICAL', "cargo LIKE '%MUSICAL%'"),
        ('ARTES PLÁSTICAS Y VISUALES', "cargo LIKE '%ARTES PLASTICAS%'"),
        ('COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA', "cargo LIKE '%COSMOVISION%' OR cargo LIKE '%SICOLOGIA%' OR cargo LIKE '%FILOSOFIA%'"),
        ('VALORES, ESPIRITUALIDAD Y RELIGIONES', "cargo LIKE '%VALORES%' OR cargo LIKE '%RELIGIONES%'"),
        ('COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)', "cargo LIKE '%LENGUA EXTRANJERA%' OR cargo LIKE '%INGLES%'"),
        ('EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD', "subsistema LIKE '%ESPECIAL%' OR cargo LIKE '%ESPECIAL%'"),
        ('AGROPECUARIA', "cargo LIKE '%AGROPECUARIA%'"),
        ('ELECTRICIDAD Y ELECTRÓNICA', "cargo LIKE '%ELECTRICIDAD%' OR cargo LIKE '%ELECTRONICA%'"),
        ('ELECTROMECÁNICA', "cargo LIKE '%ELECTROMECANICA%'"),
        ('MECÁNICA AUTOMOTRIZ', "cargo LIKE '%AUTOMOTRIZ%'"),
        ('TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA', "cargo LIKE '%ALIMENTOS%' OR cargo LIKE '%GASTRONOMIA%'"),
        ('INDUSTRIA TEXTIL Y CONFECCIÓN', "cargo LIKE '%TEXTIL%' OR cargo LIKE '%CONFECCION%'")
    ]

    lista_dictamen = []

    for esp_name, where_clause in especialidades_uie_map:
        st_hist = esp_hist_stats[esp_name]
        tot_doc = st_hist['total'] or 1
        imp_doc = st_hist['impertinentes']
        pct_imp = round((imp_doc / tot_doc) * 100, 1)

        pct_rural_nac = round((st_hist['rural'] / tot_doc) * 100, 1)
        pct_urbano_nac = round((st_hist['urbana'] / tot_doc) * 100, 1)

        # Si tenemos datos de la API oficial UIE para esta especialidad:
        if esp_name in api_data_by_esp:
            rn = api_data_by_esp[esp_name]['resumen_nacional']
            ues_nac = rn['total_ues']
            ch_nac = rn['total_carga_horaria']
            hp_nac = rn['total_horas_planilla']
            def_h_nac = rn['total_deficit_horas']
            items_def_nac = rn['items_deficit']
            pct_cobertura_uie_nac = rn['pct_cobertura']
            api_dptos = {norm_dpto(d['departamento']): d for d in api_data_by_esp[esp_name].get('departamentos', [])}
        else:
            cur_s.execute(f"SELECT COUNT(DISTINCT cod_ue), SUM(carga_horaria), SUM(horas_planilla), SUM(deficit_horas) FROM sich_2025 WHERE {where_clause}")
            r_uie_nac = cur_s.fetchone()
            ues_nac = r_uie_nac[0] or 0
            ch_nac = r_uie_nac[1] or 0
            hp_nac = r_uie_nac[2] or 0
            def_h_nac = r_uie_nac[3] or 0
            items_def_nac = round(def_h_nac / 88.0, 1)
            pct_cobertura_uie_nac = round((hp_nac / ch_nac) * 100, 1) if ch_nac > 0 else 100.0
            api_dptos = {}

        # Asignar Nivel Educativo según requerimiento del usuario:
        # Inicial = EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA (4-5 años)
        # Primaria = EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL (6-11 años)
        # Secundaria = Todo lo demás (12-17 años)
        if esp_name == 'EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA':
            nivel_esp = 'INICIAL'
            edades_ine = '4 a 5 años'
        elif esp_name == 'EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL':
            nivel_esp = 'PRIMARIA'
            edades_ine = '6 a 11 años'
        else:
            nivel_esp = 'SECUNDARIA'
            edades_ine = '12 a 17 años'

        # Proyección anual de DEMANDA (ítems) a partir de la actualidad 2026:
        # 2026 es el punto de partida con el déficit auditado en aula UIE.
        # Hacia adelante (2027 a 2031) se modula con el crecimiento / descenso poblacional del INE:
        # si en 2027 creció +0.2%, aumenta +0.2%; si es -3%, disminuye en esa proporción sucesivamente.
        demanda_anual = {}
        demanda_anual[2026] = items_def_nac
        for y in range(2027, 2032):
            demanda_anual[y] = round(demanda_anual[y - 1] * (1.0 + var_anual_poblacion[nivel_esp][y]), 1)

        # Proyección de EGRESADOS ESFM reales desde DGFM (2026 a 2031):
        # En 2026 la promoción ya egresó (ya está registrada en el padrón 2026).
        # Por tanto, en 2026 se parte de 0 y la oferta de nuevos egresados se considera a partir de 2027:
        # 2027: cohorte 2022 (5 años de formación)
        # 2028: cohorte 2023
        # 2029: cohorte 2024
        # 2030: cohorte 2025
        # 2031: cohorte 2026
        # Tasa de titulación histórica DGFM: 82%
        egresados_anual = {2026: 0}
        egresados_acum = {2026: 0}
        acum_egr = 0
        for y in range(2027, 2032):
            g_ingreso = y - 5
            insc_cohorte = dgfm_inscritos_esp[esp_name][g_ingreso]['NACIONAL']
            egr_y = round(insc_cohorte * 0.82)
            egresados_anual[y] = egr_y
            acum_egr += egr_y
            egresados_acum[y] = acum_egr

        # Serie completa (2026 a 2031) para visualización gráfica y tabla
        serie_proyeccion = []
        for y in range(2026, 2032):
            var_pct = round(var_anual_poblacion[nivel_esp].get(y, 0.0) * 100, 2)
            serie_proyeccion.append({
                'anio': y,
                'demanda': demanda_anual[y],
                'var_poblacional_pct': var_pct,
                'egresados_anual': egresados_anual[y],
                'egresados_acumulados': egresados_acum[y]
            })

        # Totales para el horizonte de planificación 2027-2031:
        # Egresados que saldrán de 2027 a 2031 (cohortes activas 2022 a 2026)
        egresados_esfm_proyectados = sum(egresados_anual[y] for y in range(2027, 2032))
        demanda_total_2031 = int(round(demanda_anual[2031]))

        # Cobertura de Egresados al 2031 (%)
        pct_cobertura_2031 = round((egresados_esfm_proyectados / (demanda_total_2031 or 1)) * 100, 1)

        if pct_cobertura_2031 < 65 or pct_imp >= 25.0:
            dictamen = "ABRIR"
            color = "emerald"
            badge = "Prioridad Alta de Apertura"
            justificacion = f"Déficit en UIE de {def_h_nac:,} horas ({items_def_nac} ítems) y {pct_imp}% de impertinencia. Los {egresados_esfm_proyectados} egresados de ESFM cubren el {pct_cobertura_2031}% de la demanda al 2031. Urge abrir cupos."
        elif pct_cobertura_2031 <= 115:
            dictamen = "REGULAR"
            color = "amber"
            badge = "Apertura con Cupo Regulado"
            justificacion = f"Equilibrio entre demanda de ítems ({demanda_total_2031} al 2031) y egresos proyectados ({pct_cobertura_2031}% cobertura). Población escolar con tendencia {nivel_esp}. Mantener cupos regulados."
        else:
            dictamen = "CONGELAR"
            color = "rose"
            badge = "No Abrir / Saturación Detectada"
            justificacion = f"Riesgo de sobreoferta docente ({pct_cobertura_2031}% cobertura con {egresados_esfm_proyectados} egresados). Ante el descenso poblacional, los egresados superan la capacidad de ítems. Se sugiere pausar admisión."

        # Desglose por los 9 Departamentos
        if not api_dptos:
            cur_s.execute(f"SELECT departamento, COUNT(DISTINCT cod_ue), SUM(carga_horaria), SUM(horas_planilla), SUM(deficit_horas) FROM sich_2025 WHERE {where_clause} GROUP BY departamento")
            rows_uie_dpto = {norm_dpto(r[0]): r for r in cur_s.fetchall()}
        else:
            rows_uie_dpto = {}

        por_dpto = {}
        for dep_nom in ['BENI','CHUQUISACA','COCHABAMBA','LA PAZ','ORURO','PANDO','POTOSI','SANTA CRUZ','TARIJA']:
            d_hist = st_hist['por_dpto'].get(dep_nom, {'total': 0, 'impertinentes': 0, 'pertinentes': 0, 'rural': 0, 'urbana': 0})
            d_tot = d_hist['total'] or 1
            d_imp = d_hist['impertinentes']
            d_pct_imp = round((d_imp / d_tot) * 100, 1)
            d_rural_pct = round((d_hist['rural'] / d_tot) * 100, 1)
            d_urbana_pct = round((d_hist['urbana'] / d_tot) * 100, 1)

            # UIE Dpto
            if dep_nom in api_dptos:
                ad = api_dptos[dep_nom]
                d_ues = ad['total_ues']
                d_ch = ad['total_carga_horaria']
                d_hp = ad['total_horas_planilla']
                d_def_h = ad['total_deficit_horas']
                d_items_def = ad['items_deficit']
                d_cob_uie = ad['pct_cobertura']
            else:
                u_d = rows_uie_dpto.get(dep_nom, (dep_nom, 0, 0, 0, 0))
                d_ues = u_d[1] or 0
                d_ch = u_d[2] or 0
                d_hp = u_d[3] or 0
                d_def_h = u_d[4] or 0
                d_items_def = round(d_def_h / 88.0, 1)
                d_cob_uie = round((d_hp / d_ch) * 100, 1) if d_ch > 0 else 100.0

            # Demanda anual departamental (2026-2031) modulada por la variación demográfica de ese departamento
            d_dem_anual = {2026: d_items_def}
            for y in range(2027, 2032):
                v_rate = var_dpto_nivel[dep_nom][nivel_esp].get(y, 0.0)
                d_dem_anual[y] = round(d_dem_anual[y - 1] * (1.0 + v_rate), 1)

            # Egresados anuales y acumulados de las ESFM de ese departamento (2026 = 0, 2027 a 2031 cohortes 2022 a 2026)
            d_egr_anual = {2026: 0}
            d_egr_acum = {2026: 0}
            d_acum = 0
            for y in range(2027, 2032):
                g_ing = y - 5
                insc_dep = dgfm_inscritos_esp[esp_name][g_ing][dep_nom]
                e_dep = round(insc_dep * 0.82)
                d_acum += e_dep
                d_egr_anual[y] = e_dep
                d_egr_acum[y] = d_acum

            d_serie_proyeccion = []
            for y in range(2026, 2032):
                v_rate = round(var_dpto_nivel[dep_nom][nivel_esp].get(y, 0.0) * 100, 2)
                d_serie_proyeccion.append({
                    'anio': y,
                    'demanda': d_dem_anual[y],
                    'var_poblacional_pct': v_rate,
                    'egresados_anual': d_egr_anual[y],
                    'egresados_acumulados': d_egr_acum[y]
                })

            d_egresados = d_acum
            d_demanda = max(int(round(d_dem_anual[2031])), 1 if d_items_def > 0 else 0)
            d_cob_2031 = round((d_egresados / (d_demanda or 1)) * 100, 1)
            d_brecha = round(d_demanda - d_egresados, 1)
            lograra_cubrir = "CUBRE TOTALMENTE" if d_cob_2031 >= 100 else "COBERTURA PARCIAL" if d_cob_2031 >= 70 else "DÉFICIT CRÍTICO"

            por_dpto[dep_nom] = {
                'total_docentes': d_hist['total'],
                'impertinentes': d_imp,
                'pertinentes': d_hist['pertinentes'],
                'pct_impert': d_pct_imp,
                'rural_docentes': d_hist['rural'],
                'urbana_docentes': d_hist['urbana'],
                'pct_rural': d_rural_pct,
                'pct_urbana': d_urbana_pct,
                'ues_afectadas': d_ues,
                'carga_horaria_uie': d_ch,
                'horas_planilla_uie': d_hp,
                'deficit_horas_uie': d_def_h,
                'items_deficit_uie': d_items_def,
                'pct_cobertura_uie': d_cob_uie,
                'egresados_esfm_proyectados': d_egresados,
                'demanda_2031': d_demanda,
                'pct_cobertura_2031': d_cob_2031,
                'brecha_neta': d_brecha,
                'lograra_cubrir': lograra_cubrir,
                'serie_proyeccion': d_serie_proyeccion,
                'estado_dpto': 'DEFICIT' if (d_cob_2031 < 65 or d_pct_imp >= 25 or d_items_def > 100) else 'SATURADO' if d_cob_2031 > 115 else 'EQUILIBRIO'
            }

        lista_dictamen.append({
            'especialidad': esp_name,
            'nivel_educativo': nivel_esp,
            'edades_ine': edades_ine,
            'total_docentes': tot_doc,
            'impertinentes': imp_doc,
            'pertinentes': tot_doc - imp_doc,
            'pct_impertinencia': pct_imp,
            'pct_rural_nacional': pct_rural_nac,
            'pct_urbano_nacional': pct_urbano_nac,
            'ues_afectadas_nacional': ues_nac,
            'carga_horaria_uie_nacional': ch_nac,
            'horas_planilla_uie_nacional': hp_nac,
            'deficit_horas_uie_nacional': def_h_nac,
            'items_deficit_uie_nacional': items_def_nac,
            'pct_cobertura_uie_nacional': pct_cobertura_uie_nac,
            'egresados_proyectados_2031': egresados_esfm_proyectados,
            'demanda_proyectada_2031': demanda_total_2031,
            'pct_cobertura': pct_cobertura_2031,
            'dictamen': dictamen,
            'color': color,
            'badge': badge,
            'justificacion': justificacion,
            'serie_proyeccion': serie_proyeccion,
            'por_dpto': por_dpto
        })

    con_h.close()
    con_s.close()

    # Ordenar por prioridad
    orden_dictamen = {'ABRIR': 1, 'REGULAR': 2, 'CONGELAR': 3}
    lista_dictamen.sort(key=lambda x: (orden_dictamen.get(x['dictamen'], 4), x['pct_cobertura']))

    output = {
        'metadatos': {
            'titulo': 'Exposición Estratégica ESFM 2031',
            'horizonte': 2031,
            'fuente': 'UIE / SICH (16.273 UEs) + Padrón Docente SEP 2024-2026 + INE Proyecciones + DGFM',
            'fecha_generacion': 'Noviembre 2026',
            'total_especialidades_oficiales': len(lista_dictamen)
        },
        'resumen_nacional_uie': {
            'total_deficit_horas': 944368,
            'total_items_deficit_88h': 10731,
            'total_ues_auditadas': 16273,
            'total_carga_horaria': 16009284,
            'total_horas_planilla': 15069687,
            'tasa_cobertura_nacional': 94.13
        },
        'eje_1_demografia': {
            'descripcion': 'Proyección demográfica escolar INE 2024-2031 y matrícula efectiva SIE',
            'nacional_2024': ine_escolar['NACIONAL'].get(2024, 0),
            'nacional_2026': ine_escolar['NACIONAL'].get(2026, 0),
            'nacional_2031': ine_escolar['NACIONAL'].get(2031, 0),
            'matricula_sie_2026': sie_matricula_dpto.get('NACIONAL', 2815162),
            'variacion_nacional_pct': round(((ine_escolar['NACIONAL'].get(2031, 0) - ine_escolar['NACIONAL'].get(2024, 0)) / (ine_escolar['NACIONAL'].get(2024, 0) or 1)) * 100, 1),
            'por_departamento': {
                d: {
                    'p2024': ine_escolar[d].get(2024, 0),
                    'p2026': ine_escolar[d].get(2026, 0),
                    'p2031': ine_escolar[d].get(2031, 0),
                    'matricula_sie': sie_matricula_dpto.get(d, 0),
                    'variacion_pct': round(((ine_escolar[d].get(2031, 0) - ine_escolar[d].get(2024, 0)) / (ine_escolar[d].get(2024, 0) or 1)) * 100, 1),
                    'tendencia': 'EXPANSION' if ((ine_escolar[d].get(2031, 0) - ine_escolar[d].get(2024, 0)) / (ine_escolar[d].get(2024, 0) or 1)) > -0.10 else 'ESTABLE' if ((ine_escolar[d].get(2031, 0) - ine_escolar[d].get(2024, 0)) / (ine_escolar[d].get(2024, 0) or 1)) > -0.16 else 'CONTRACCION'
                }
                for d in dptos_map.values()
            },
            'serie_anios': [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031],
            'totales_anuales_nacional': [ine_escolar['NACIONAL'].get(y, 0) for y in [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]]
        },
        'eje_2_docentes': {
            'descripcion': 'Tendencia del magisterio regular (2024 - 2026), rotación de planilla e impertinencias',
            'total_2024': t2024,
            'total_2025': t2025,
            'total_2026': t2026,
            'crecimiento_24_26_neto': t2026 - t2024,
            'crecimiento_24_26_pct': round(((t2026 - t2024) / t2024) * 100, 2),
            'salientes_24_25': sum(salientes_dpto.values()),
            'entrantes_24_25': sum(entrantes_dpto.values()),
            'tasa_rotacion_anual_pct': 2.21,
            'tasa_reposicion': 1.35,
            'total_impertinentes_2026': tot_impert,
            'total_pertinentes_2026': tot_pert,
            'porcentaje_impertinencia_nacional': pct_impert_nac,
            'sin_cargo_2026_total': total_sin_cargo,
            'salientes_dpto': salientes_dpto,
            'entrantes_dpto': entrantes_dpto,
            'sin_cargo_dpto': sin_cargo_dpto,
            'impertinencia_dpto': impert_dpto,
            'impertinencia_por_esp_dpto': dict(impert_esp_dpto)
        },
        'eje_3_egresados_esfm': {
            'descripcion': 'Proyección oficial de egresados de las ESFM por cohorte de 5 años hacia el 2031 (DGFM)',
            'total_inscritos_activas_2022_2026': sum(
                dgfm_inscritos_esp[esp][g]['NACIONAL']
                for esp in dgfm_inscritos_esp
                for g in range(2022, 2027)
            ),
            'total_inscritos_activas_2021_2026': sum(
                dgfm_inscritos_esp[esp][g]['NACIONAL']
                for esp in dgfm_inscritos_esp
                for g in range(2021, 2027)
            ),
            'total_egresados_proyectados_2026_2031': sum(
                round(dgfm_inscritos_esp[esp][g]['NACIONAL'] * 0.82)
                for esp in dgfm_inscritos_esp
                for g in range(2022, 2027)
            ),
            'tasa_titulacion_historica': 82.0
        },
        'dictamen_apertura_especialidades': lista_dictamen
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Exposición 2031 generada exitosamente en {output_path}")
    print(f"Total especialidades: {len(lista_dictamen)}")

if __name__ == '__main__':
    main()
