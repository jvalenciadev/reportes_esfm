import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dwretdtwyqsltylvnvld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const DEPARTAMENTOS_MAP: Record<string, { id: number; nombre: string }> = {
  'CHUQUISACA': { id: 1, nombre: 'Chuquisaca' },
  'LA PAZ': { id: 2, nombre: 'La Paz' },
  'COCHABAMBA': { id: 3, nombre: 'Cochabamba' },
  'ORURO': { id: 4, nombre: 'Oruro' },
  'POTOSI': { id: 5, nombre: 'Potosí' },
  'POTOSÍ': { id: 5, nombre: 'Potosí' },
  'TARIJA': { id: 6, nombre: 'Tarija' },
  'SANTA CRUZ': { id: 7, nombre: 'Santa Cruz' },
  'BENI': { id: 8, nombre: 'Beni' },
  'PANDO': { id: 9, nombre: 'Pando' },
};

const DEPARTAMENTOS_LIST = [
  { id: 1, nombre: 'Chuquisaca' },
  { id: 2, nombre: 'La Paz' },
  { id: 3, nombre: 'Cochabamba' },
  { id: 4, nombre: 'Oruro' },
  { id: 5, nombre: 'Potosí' },
  { id: 6, nombre: 'Tarija' },
  { id: 7, nombre: 'Santa Cruz' },
  { id: 8, nombre: 'Beni' },
  { id: 9, nombre: 'Pando' },
];

function runSqlite(sql: string, dbPath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/sqlite3', ['-json', dbPath, sql], { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('SQLite exec error:', err, stderr);
        return reject(err);
      }
      try {
        const text = stdout.trim();
        if (!text) return resolve([]);
        const data = JSON.parse(text);
        resolve(data);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const especialidadIdParam = searchParams.get('especialidad_id');
  const departamentoIdParam = searchParams.get('departamento_id');
  const baseHorasParam = searchParams.get('base_horas');
  const customBaseHoras = baseHorasParam && !isNaN(Number(baseHorasParam)) ? Number(baseHorasParam) : null;
  const viewUes = searchParams.get('view') === 'ues';

  const dbPath = path.join(process.cwd(), 'src/data/sich_2025.db');

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json(
      { error: 'Base de datos SICH local no inicializada. Por favor espere.' },
      { status: 500 }
    );
  }

  if (!especialidadIdParam) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/filtro_especialidad?select=id,especialidad_oficial_id,subsistemas,niveles,cargos,operador_carga,carga_especialidad,activo,especialidades_oficiales(id,nombre)&order=especialidad_oficial_id.asc`,
        { headers, next: { revalidate: 60 } }
      );
      if (!res.ok) {
        return NextResponse.json({ error: 'Error cargando filtros' }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ especialidades: data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const especialidadId = Number(especialidadIdParam);

  try {
    // 1. Obtener la regla del filtro guardado en Supabase
    const resFiltro = await fetch(
      `${SUPABASE_URL}/rest/v1/filtro_especialidad?especialidad_oficial_id=eq.${especialidadId}&select=*,especialidades_oficiales(id,nombre)&limit=1`,
      { headers, next: { revalidate: 10 } }
    );

    if (!resFiltro.ok) {
      return NextResponse.json({ error: 'Error buscando filtro de especialidad' }, { status: resFiltro.status });
    }

    const filtros = await resFiltro.json();
    const filtro = filtros[0];

    if (!filtro) {
      return NextResponse.json({
        especialidad: null,
        filtro_configurado: false,
        departamentos: [],
        resumen_nacional: null,
      });
    }

    const {
      subsistemas = [],
      niveles = [],
      cargos = [],
      operador_carga,
      carga_especialidad,
      cargos_condiciones = [],
    } = filtro;

    if (!subsistemas.length || !niveles.length || !cargos.length) {
      return NextResponse.json({
        especialidad: filtro.especialidades_oficiales,
        filtro,
        filtro_configurado: false,
        mensaje: 'La especialidad no tiene subsistemas, niveles o cargos marcados en el filtro.',
        departamentos: [],
        resumen_nacional: null,
      });
    }

    // 2. Construir la cláusula dinámica SQL
    const subSql = subsistemas.map((s: string) => `'${escapeSql(s.toUpperCase().trim())}'`).join(',');
    const nivSql = niveles.map((n: string) => `'${escapeSql(n.toUpperCase().trim())}'`).join(',');

    const condMap = new Map<string, { operador: string; horas: number }>();
    if (Array.isArray(cargos_condiciones)) {
      cargos_condiciones.forEach((cc: any) => {
        if (cc.cargo && cc.operador && cc.horas !== undefined) {
          condMap.set(cc.cargo.toUpperCase().trim(), {
            operador: cc.operador,
            horas: Number(cc.horas),
          });
        }
      });
    }

    const cargoClauses: string[] = [];
    const cargosGlobales: string[] = [];

    cargos.forEach((c: string) => {
      const cUpper = c.toUpperCase().trim();
      if (condMap.has(cUpper)) {
        const cond = condMap.get(cUpper)!;
        cargoClauses.push(
          `(cargo = '${escapeSql(cUpper)}' AND carga_horaria ${cond.operador} ${cond.horas})`
        );
      } else {
        cargosGlobales.push(cUpper);
      }
    });

    if (cargosGlobales.length > 0) {
      const listSql = cargosGlobales.map((c: string) => `'${escapeSql(c)}'`).join(',');
      if (operador_carga && carga_especialidad !== null && carga_especialidad !== undefined) {
        cargoClauses.push(
          `(cargo IN (${listSql}) AND carga_horaria ${operador_carga} ${carga_especialidad})`
        );
      } else {
        cargoClauses.push(`(cargo IN (${listSql}))`);
      }
    }

    const whereCargos = cargoClauses.length > 0 ? `(${cargoClauses.join(' OR ')})` : '1=1';

    // 3. Si se solicita desglose de Unidades Educativas de un departamento específico
    if (viewUes && departamentoIdParam) {
      const deptObj = DEPARTAMENTOS_LIST.find((d) => d.id === Number(departamentoIdParam));
      const deptNameUpper = deptObj ? deptObj.nombre.toUpperCase() : '';

      const uesSql = `
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
        WHERE subsistema IN (${subSql})
          AND nivel IN (${nivSql})
          AND (${whereCargos})
          ${deptNameUpper ? `AND (departamento = '${escapeSql(deptNameUpper)}' OR departamento LIKE '${escapeSql(deptNameUpper)}%')` : ''}
        ORDER BY deficit_horas DESC
        LIMIT 100;
      `;

      const uesRows = await runSqlite(uesSql, dbPath);

      return NextResponse.json({
        especialidad: filtro.especialidades_oficiales,
        filtro,
        departamento_id: Number(departamentoIdParam),
        departamento: deptObj?.nombre || '',
        unidades_educativas: uesRows,
      });
    }

    // 4. Agregación de la Matriz Departamental
    const matrixSql = `
      SELECT 
        UPPER(TRIM(departamento)) as dept_raw,
        COUNT(DISTINCT cod_ue) as total_ues,
        COUNT(*) as total_docentes,
        SUM(total_paralelos) as total_par,
        SUM(carga_horaria) as total_carga,
        SUM(horas_planilla) as total_plan,
        SUM(deficit_horas) as total_def
      FROM sich_2025
      WHERE subsistema IN (${subSql})
        AND nivel IN (${nivSql})
        AND (${whereCargos})
      GROUP BY UPPER(TRIM(departamento))
      ORDER BY total_def DESC;
    `;

    const matrixRows = await runSqlite(matrixSql, dbPath);

    // 5. Distribución por Rangos de Horas (como el análisis del usuario)
    const distribucionSql = `
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
      WHERE subsistema IN (${subSql})
        AND nivel IN (${nivSql})
        AND (${whereCargos})
      GROUP BY rango
      ORDER BY MIN(carga_horaria);
    `;

    const distribucionRows = await runSqlite(distribucionSql, dbPath);

    // Mapear a los 9 departamentos oficiales
    const deptResultMap = new Map<number, any>();

    DEPARTAMENTOS_LIST.forEach((d) => {
      deptResultMap.set(d.id, {
        departamento_id: d.id,
        departamento: d.nombre,
        total_ues: 0,
        total_docentes: 0,
        total_paralelos: 0,
        total_carga_horaria: 0,
        total_horas_planilla: 0,
        total_deficit_horas: 0,
        promedio_horas_docente: 0,
        items_deficit: 0,
        items_deficit_88h: 0,
        pct_cobertura: 100,
      });
    });

    let totalNacionalCarga = 0;
    let totalNacionalPlan = 0;
    let totalNacionalDef = 0;
    let totalNacionalDocentes = 0;

    matrixRows.forEach((r: any) => {
      const raw = String(r.dept_raw || '').toUpperCase().trim();
      const matched = DEPARTAMENTOS_MAP[raw];
      if (matched && deptResultMap.has(matched.id)) {
        const item = deptResultMap.get(matched.id);
        item.total_ues += Number(r.total_ues || 0);
        item.total_docentes += Number(r.total_docentes || 0);
        item.total_paralelos += Number(r.total_par || 0);
        item.total_carga_horaria += Number(r.total_carga || 0);
        item.total_horas_planilla += Number(r.total_plan || 0);
        item.total_deficit_horas += Number(r.total_def || 0);

        totalNacionalCarga += Number(r.total_carga || 0);
        totalNacionalPlan += Number(r.total_plan || 0);
        totalNacionalDef += Number(r.total_def || 0);
        totalNacionalDocentes += Number(r.total_docentes || 0);
      }
    });

    // CÁLCULO DEL PROMEDIO DINÁMICO POR DOCENTE / ÍTEM
    // Promedio Máximo Posible = Total Horas Carga / Total Docentes
    const promedioHorasDocenteNacional =
      totalNacionalDocentes > 0
        ? Number((totalNacionalCarga / totalNacionalDocentes).toFixed(2))
        : 88.0;

    // Si el usuario especificó un base_horas personalizado, usarlo; de lo contrario usar el promedio del filtro
    const baseHorasAplicada =
      customBaseHoras && customBaseHoras > 0
        ? customBaseHoras
        : promedioHorasDocenteNacional;

    const departamentList = Array.from(deptResultMap.values()).map((d) => {
      d.promedio_horas_docente =
        d.total_docentes > 0
          ? Number((d.total_carga_horaria / d.total_docentes).toFixed(2))
          : promedioHorasDocenteNacional;
      // Ítems calculados sobre la base de horas del promedio del filtro
      d.items_deficit = Number((d.total_deficit_horas / baseHorasAplicada).toFixed(1));
      d.items_deficit_88h = Number((d.total_deficit_horas / 88.0).toFixed(1));
      d.pct_cobertura =
        d.total_carga_horaria > 0
          ? Number(((d.total_horas_planilla / d.total_carga_horaria) * 100).toFixed(1))
          : 100;
      return d;
    });

    departamentList.sort((a, b) => b.total_deficit_horas - a.total_deficit_horas);

    // Total nacional único de UEs
    const totalUesSql = `
      SELECT COUNT(DISTINCT cod_ue) as nacional_ues
      FROM sich_2025
      WHERE subsistema IN (${subSql})
        AND nivel IN (${nivSql})
        AND (${whereCargos});
    `;
    const totalUesRows = await runSqlite(totalUesSql, dbPath);
    const nacionalUes = totalUesRows[0]?.nacional_ues || 0;

    const resumenNacional = {
      total_ues: nacionalUes,
      total_docentes: totalNacionalDocentes,
      total_paralelos: departamentList.reduce((acc, c) => acc + c.total_paralelos, 0),
      total_carga_horaria: totalNacionalCarga,
      total_horas_planilla: totalNacionalPlan,
      total_deficit_horas: totalNacionalDef,
      promedio_horas_docente: promedioHorasDocenteNacional,
      base_horas_aplicada: baseHorasAplicada,
      es_promedio_dinamico: !customBaseHoras,
      items_deficit: Number((totalNacionalDef / baseHorasAplicada).toFixed(1)),
      items_deficit_88h: Number((totalNacionalDef / 88.0).toFixed(1)),
      pct_cobertura:
        totalNacionalCarga > 0
          ? Number(((totalNacionalPlan / totalNacionalCarga) * 100).toFixed(1))
          : 100,
    };

    // Formatear distribución de rangos con % de docentes
    const distribucionFormateada = distribucionRows.map((r: any) => {
      const cant = Number(r.cantidad_docentes || 0);
      const hrs = Number(r.horas_totales || 0);
      const pct = totalNacionalDocentes > 0 ? Number(((cant / totalNacionalDocentes) * 100).toFixed(1)) : 0;
      return {
        rango: r.rango,
        cantidad_docentes: cant,
        pct_del_total: pct,
        horas_totales: hrs,
        promedio_rango: cant > 0 ? Number((hrs / cant).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({
      especialidad: filtro.especialidades_oficiales,
      filtro,
      filtro_configurado: true,
      departamentos: departamentList,
      resumen_nacional: resumenNacional,
      distribucion_rangos: distribucionFormateada,
      filtro_cargos_aplicados: cargos.length,
    });
  } catch (err: any) {
    console.error('Error in /api/especialidad-deficit:', err);
    return NextResponse.json({ error: err.message || 'Error en cálculo analítico' }, { status: 500 });
  }
}
