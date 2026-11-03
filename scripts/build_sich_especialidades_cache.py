import sqlite3
import json
import os
import urllib.request

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', 'https://dwretdtwyqsltylvnvld.supabase.co')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq')

DEPARTAMENTOS_LIST = [
    {'id': 1, 'nombre': 'Chuquisaca'},
    {'id': 2, 'nombre': 'La Paz'},
    {'id': 3, 'nombre': 'Cochabamba'},
    {'id': 4, 'nombre': 'Oruro'},
    {'id': 5, 'nombre': 'Potosí'},
    {'id': 6, 'nombre': 'Tarija'},
    {'id': 7, 'nombre': 'Santa Cruz'},
    {'id': 8, 'nombre': 'Beni'},
    {'id': 9, 'nombre': 'Pando'},
]

DEPARTAMENTOS_MAP = {
    'CHUQUISACA': {'id': 1, 'nombre': 'Chuquisaca'},
    'LA PAZ': {'id': 2, 'nombre': 'La Paz'},
    'COCHABAMBA': {'id': 3, 'nombre': 'Cochabamba'},
    'ORURO': {'id': 4, 'nombre': 'Oruro'},
    'POTOSI': {'id': 5, 'nombre': 'Potosí'},
    'POTOSÍ': {'id': 5, 'nombre': 'Potosí'},
    'TARIJA': {'id': 6, 'nombre': 'Tarija'},
    'SANTA CRUZ': {'id': 7, 'nombre': 'Santa Cruz'},
    'BENI': {'id': 8, 'nombre': 'Beni'},
    'PANDO': {'id': 9, 'nombre': 'Pando'},
}

def escape_sql(s):
    return s.replace("'", "''")

def main():
    print("Iniciando generación de caché analítico SICH 2025 para las 20 especialidades oficiales...")
    
    # 1. Obtener filtros de Supabase
    url = f"{SUPABASE_URL}/rest/v1/filtro_especialidad?select=id,especialidad_oficial_id,subsistemas,niveles,cargos,operador_carga,carga_especialidad,cargos_condiciones,activo,especialidades_oficiales(id,nombre)&order=especialidad_oficial_id.asc"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            filtros = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print("Error conectando con Supabase:", e)
        return

    db_path = 'src/data/sich_2025.db'
    if not os.path.exists(db_path):
        print("No se encuentra sich_2025.db")
        return

    con = sqlite3.connect(db_path)
    cur = con.cursor()

    cache_data = {}

    for f in filtros:
        esp_id = f['especialidad_oficial_id']
        esp_obj = f.get('especialidades_oficiales')
        esp_nombre = esp_obj.get('nombre', f'Especialidad {esp_id}') if esp_obj else f'Especialidad {esp_id}'
        print(f"Procesando especialidad {esp_id:2d}: {esp_nombre}...")

        subsistemas = f.get('subsistemas') or []
        niveles = f.get('niveles') or []
        cargos = f.get('cargos') or []
        operador_carga = f.get('operador_carga')
        carga_especialidad = f.get('carga_especialidad')
        cargos_condiciones = f.get('cargos_condiciones') or []

        if not subsistemas or not niveles or not cargos:
            cache_data[str(esp_id)] = {
                'especialidad': esp_obj,
                'filtro': f,
                'filtro_configurado': False,
                'mensaje': 'Sin configuración completa de filtro',
                'departamentos': [],
                'resumen_nacional': None,
                'distribucion_rangos': [],
                'unidades_educativas_por_dpto': {}
            }
            continue

        sub_sql = ",".join(f"'{escape_sql(s.upper().strip())}'" for s in subsistemas)
        niv_sql = ",".join(f"'{escape_sql(n.upper().strip())}'" for n in niveles)

        cond_map = {}
        if isinstance(cargos_condiciones, list):
            for cc in cargos_condiciones:
                if cc.get('cargo') and cc.get('operador') and cc.get('horas') is not None:
                    cond_map[cc['cargo'].upper().strip()] = (cc['operador'], float(cc['horas']))

        cargo_clauses = []
        cargos_globales = []
        for c_str in cargos:
            cu = c_str.upper().strip()
            if cu in cond_map:
                op, hrs = cond_map[cu]
                cargo_clauses.append(f"(cargo = '{escape_sql(cu)}' AND carga_horaria {op} {hrs})")
            else:
                cargos_globales.append(cu)

        if cargos_globales:
            list_sql = ",".join(f"'{escape_sql(c)}'" for c in cargos_globales)
            if operador_carga and carga_especialidad is not None:
                cargo_clauses.append(f"(cargo IN ({list_sql}) AND carga_horaria {operador_carga} {carga_especialidad})")
            else:
                cargo_clauses.append(f"(cargo IN ({list_sql}))")

        where_cargos = f"({' OR '.join(cargo_clauses)})" if cargo_clauses else "1=1"

        # Matriz Departamental
        matrix_sql = f"""
          SELECT 
            UPPER(TRIM(departamento)) as dept_raw,
            COUNT(DISTINCT cod_ue) as total_ues,
            COUNT(*) as total_docentes,
            SUM(total_paralelos) as total_par,
            SUM(carga_horaria) as total_carga,
            SUM(horas_planilla) as total_plan,
            SUM(deficit_horas) as total_def
          FROM sich_2025
          WHERE subsistema IN ({sub_sql})
            AND nivel IN ({niv_sql})
            AND ({where_cargos})
          GROUP BY UPPER(TRIM(departamento))
          ORDER BY total_def DESC;
        """
        cur.execute(matrix_sql)
        matrix_rows = cur.fetchall()

        # Distribución Rangos
        dist_sql = f"""
          SELECT 
            CASE 
              WHEN carga_horaria <= 20 THEN '0 – 20 hrs'
              WHEN carga_horaria <= 40 THEN '21 – 40 hrs'
              WHEN carga_horaria <= 60 THEN '41 – 60 hrs'
              WHEN carga_horaria <= 80 THEN '61 – 80 hrs'
              WHEN carga_horaria <= 100 THEN '81 – 100 hrs'
              ELSE '101 – 120+ hrs'
            END as rango,
            COUNT(*) as cantidad_docentes,
            SUM(carga_horaria) as horas_totales
          FROM sich_2025
          WHERE subsistema IN ({sub_sql})
            AND nivel IN ({niv_sql})
            AND ({where_cargos})
          GROUP BY rango
          ORDER BY MIN(carga_horaria);
        """
        cur.execute(dist_sql)
        dist_rows = cur.fetchall()

        # Nacional UEs únicas
        ues_count_sql = f"""
          SELECT COUNT(DISTINCT cod_ue) as nac_ues
          FROM sich_2025
          WHERE subsistema IN ({sub_sql})
            AND nivel IN ({niv_sql})
            AND ({where_cargos});
        """
        cur.execute(ues_count_sql)
        nac_ues = cur.fetchone()[0] or 0

        # Mapeo Departamental
        dept_result = {}
        for d in DEPARTAMENTOS_LIST:
            dept_result[d['id']] = {
                'departamento_id': d['id'],
                'departamento': d['nombre'],
                'total_ues': 0,
                'total_docentes': 0,
                'total_paralelos': 0,
                'total_carga_horaria': 0,
                'total_horas_planilla': 0,
                'total_deficit_horas': 0,
                'promedio_horas_docente': 0,
                'items_deficit': 0,
                'items_deficit_88h': 0,
                'pct_cobertura': 100.0,
            }

        tot_carga = 0
        tot_plan = 0
        tot_def = 0
        tot_docs = 0

        for r in matrix_rows:
            raw_dep = str(r[0] or '').upper().strip()
            match = DEPARTAMENTOS_MAP.get(raw_dep)
            if match:
                did = match['id']
                item = dept_result[did]
                item['total_ues'] += int(r[1] or 0)
                item['total_docentes'] += int(r[2] or 0)
                item['total_paralelos'] += int(r[3] or 0)
                item['total_carga_horaria'] += int(r[4] or 0)
                item['total_horas_planilla'] += int(r[5] or 0)
                item['total_deficit_horas'] += int(r[6] or 0)

                tot_carga += int(r[4] or 0)
                tot_plan += int(r[5] or 0)
                tot_def += int(r[6] or 0)
                tot_docs += int(r[2] or 0)

        prom_nac = round(tot_carga / tot_docs, 2) if tot_docs > 0 else 88.0

        dept_list = []
        for did in sorted(dept_result.keys()):
            item = dept_result[did]
            item['promedio_horas_docente'] = round(item['total_carga_horaria'] / item['total_docentes'], 2) if item['total_docentes'] > 0 else prom_nac
            item['items_deficit'] = round(item['total_deficit_horas'] / prom_nac, 1)
            item['items_deficit_88h'] = round(item['total_deficit_horas'] / 88.0, 1)
            item['pct_cobertura'] = round((item['total_horas_planilla'] / item['total_carga_horaria'] * 100.0), 1) if item['total_carga_horaria'] > 0 else 100.0
            dept_list.append(item)

        dept_list.sort(key=lambda x: x['total_deficit_horas'], reverse=True)

        resumen_nacional = {
            'total_ues': nac_ues,
            'total_docentes': tot_docs,
            'total_paralelos': sum(d['total_paralelos'] for d in dept_list),
            'total_carga_horaria': tot_carga,
            'total_horas_planilla': tot_plan,
            'total_deficit_horas': tot_def,
            'promedio_horas_docente': prom_nac,
            'base_horas_aplicada': prom_nac,
            'es_promedio_dinamico': True,
            'items_deficit': round(tot_def / prom_nac, 1) if prom_nac > 0 else 0,
            'items_deficit_88h': round(tot_def / 88.0, 1),
            'pct_cobertura': round((tot_plan / tot_carga * 100.0), 1) if tot_carga > 0 else 100.0
        }

        dist_list = []
        for dr in dist_rows:
            cant = int(dr[1] or 0)
            hrs = int(dr[2] or 0)
            pct = round((cant / tot_docs * 100.0), 1) if tot_docs > 0 else 0.0
            dist_list.append({
                'rango': dr[0],
                'cantidad_docentes': cant,
                'pct_del_total': pct,
                'horas_totales': hrs,
                'promedio_rango': round(hrs / cant, 1) if cant > 0 else 0.0
            })

        # Precalcular también las top UEs por departamento (para vista rápida sin lag)
        ues_por_dpto = {}
        for d in DEPARTAMENTOS_LIST:
            dname_upper = d['nombre'].upper()
            ues_sql = f"""
              SELECT 
                id,
                cod_ue,
                unidad_educativa,
                dependencia,
                subsistema,
                nivel,
                cargo,
                carga_horaria,
                horas_planilla,
                deficit_horas
              FROM sich_2025
              WHERE subsistema IN ({sub_sql})
                AND nivel IN ({niv_sql})
                AND ({where_cargos})
                AND (departamento = '{escape_sql(dname_upper)}' OR departamento LIKE '{escape_sql(dname_upper)}%')
              ORDER BY deficit_horas DESC
              LIMIT 100;
            """
            cur.execute(ues_sql)
            u_rows = cur.fetchall()
            ues_por_dpto[str(d['id'])] = [
                {
                    'id': ur[0],
                    'cod_ue': ur[1],
                    'unidad_educativa': ur[2],
                    'dependencia': ur[3],
                    'subsistema': ur[4],
                    'nivel': ur[5],
                    'cargo': ur[6],
                    'carga_horaria': ur[7],
                    'horas_planilla': ur[8],
                    'deficit_horas': ur[9]
                }
                for ur in u_rows
            ]

        cache_data[str(esp_id)] = {
            'especialidad': esp_obj,
            'filtro': f,
            'filtro_configurado': True,
            'departamentos': dept_list,
            'resumen_nacional': resumen_nacional,
            'distribucion_rangos': dist_list,
            'filtro_cargos_aplicados': len(cargos),
            'unidades_educativas_por_dpto': ues_por_dpto
        }

    out_path = 'src/data/sich_especialidades_cache.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)

    print(f"ÉXITO: Caché analítico guardado en {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
