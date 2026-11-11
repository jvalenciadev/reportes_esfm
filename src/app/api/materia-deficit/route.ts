import { NextRequest, NextResponse } from 'next/server';
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

const CONFIG_PATH = path.join(process.cwd(), 'src/data/filtros_materia_config.json');
const AGRUPADO_PATH = path.join(process.cwd(), 'src/data/sie_materia_agrupado.json');

let cachedAgrupado: any[] | null = null;

function getAgrupadoData(): any[] {
  if (!cachedAgrupado) {
    if (fs.existsSync(AGRUPADO_PATH)) {
      try {
        const raw = fs.readFileSync(AGRUPADO_PATH, 'utf-8');
        cachedAgrupado = JSON.parse(raw);
      } catch (e) {
        console.error('Error cargando sie_materia_agrupado.json:', e);
      }
    }
  }
  return cachedAgrupado || [];
}

function matchesMateria(rowMat: string, ruleMat: string): boolean {
  const r = rowMat.toUpperCase().trim();
  const m = ruleMat.toUpperCase().trim();
  if (r === m) return true;
  if (r.includes(m) || m.includes(r)) {
    if ((m === 'FÍSICA' || m === 'FISICA') && (r.includes('EDUCACIÓN FÍSICA') || r.includes('EDUCACION FISICA'))) {
      return false;
    }
    return true;
  }
  return false;
}

function normalizeSubsistema(sub?: string | null): string {
  if (!sub) return 'REGULAR';
  const s = sub.trim().toUpperCase();
  if (s.includes('REGULAR')) return 'REGULAR';
  if (s.includes('ALTERNATIVA')) return 'ALTERNATIVA';
  if (s.includes('ESPECIAL')) return 'ESPECIAL';
  return s;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const especialidadIdParam = searchParams.get('especialidad_id');
  const departamentoIdParam = searchParams.get('departamento_id');
  const viewUes = searchParams.get('view') === 'ues';
  const baseHorasParam = searchParams.get('base_horas');
  const customBaseHoras = baseHorasParam && !isNaN(Number(baseHorasParam)) && Number(baseHorasParam) > 0 ? Number(baseHorasParam) : null;

  try {
    // 1. Si no especifica especialidad_id, listar especialidades y número de reglas de materia
    if (!especialidadIdParam) {
      const [espRes, relRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=id,nombre&order=id.asc`, {
          headers,
          next: { revalidate: 60 },
        }),
        fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?select=especialidad_id,materia,activo`, {
          headers,
          cache: 'no-store',
        }),
      ]);

      const especialidades = espRes.ok ? await espRes.json() : [];
      const relaciones = relRes.ok ? await relRes.json() : [];

      const countsMap: Record<number, { total: number; activas: number }> = {};
      relaciones.forEach((r: any) => {
        if (!countsMap[r.especialidad_id]) countsMap[r.especialidad_id] = { total: 0, activas: 0 };
        countsMap[r.especialidad_id].total += 1;
        if (r.activo) countsMap[r.especialidad_id].activas += 1;
      });

      const list = especialidades.map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        hora_item: e.hora_item ?? (e.nombre?.toUpperCase().includes('ESPECIAL') ? 108 : 88),
        reglas_total: countsMap[e.id]?.total ?? 0,
        reglas_activas: countsMap[e.id]?.activas ?? 0,
      }));

      return NextResponse.json({ especialidades: list });
    }

    const especialidadId = Number(especialidadIdParam);

    // Obtener nombre de la especialidad oficial
    let espNombre = 'Especialidad Oficial';
    let horaItemBd = 88.0;
    try {
      const resEsp = await fetch(
        `${SUPABASE_URL}/rest/v1/especialidades_oficiales?id=eq.${especialidadId}&select=id,nombre,hora_item`,
        { headers, next: { revalidate: 300 } }
      );
      if (resEsp.ok) {
        const espData = await resEsp.json();
        if (espData.length > 0) {
          espNombre = espData[0].nombre;
          horaItemBd = Number(espData[0].hora_item) || (espNombre.toUpperCase().includes('ESPECIAL') ? 108.0 : 88.0);
        }
      } else {
        horaItemBd = espNombre.toUpperCase().includes('ESPECIAL') ? 108.0 : 88.0;
      }
    } catch (e) {
      console.warn(e);
    }

    // Obtener reglas activas de la especialidad desde Supabase
    let reglasDb: any[] = [];
    try {
      const resRel = await fetch(
        `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?especialidad_id=eq.${especialidadId}&activo=eq.true&select=*`,
        { headers, cache: 'no-store' }
      );
      if (resRel.ok) {
        reglasDb = await resRel.json();
      }
    } catch (e) {
      console.warn(e);
    }

    // Leer config local como fallback
    let localFiltro: any = null;
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const localAll = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        localFiltro = localAll.find((f: any) => f.especialidad_oficial_id === especialidadId) || null;
      } catch (e) {
        console.warn(e);
      }
    }

    // Reconstruir o consolidar configuración activa
    const subsistemasSet = new Set<string>();
    const nivelesSet = new Set<string>();
    const materiasSet = new Set<string>();

    if (reglasDb.length > 0) {
      reglasDb.forEach((r) => {
        if (r.subsistema) subsistemasSet.add(normalizeSubsistema(r.subsistema));
        if (r.nivel) nivelesSet.add(r.nivel.toUpperCase().trim());
        if (r.materia) materiasSet.add(r.materia.toUpperCase().trim());
      });
    } else if (localFiltro && localFiltro.activo && Array.isArray(localFiltro.materias)) {
      (localFiltro.subsistemas || []).forEach((s: string) => subsistemasSet.add(normalizeSubsistema(s)));
      (localFiltro.niveles || []).forEach((n: string) => nivelesSet.add(n.toUpperCase().trim()));
      (localFiltro.materias || []).forEach((m: string) => materiasSet.add(m.toUpperCase().trim()));
    }

    const materiasList = Array.from(materiasSet);
    const subsistemasList = Array.from(subsistemasSet);
    const nivelesList = Array.from(nivelesSet);
    const filtroConfigurado = materiasList.length > 0;

    const filtroInfo = {
      id: localFiltro?.id || especialidadId,
      especialidad_oficial_id: especialidadId,
      subsistemas: subsistemasList.length > 0 ? subsistemasList : ['REGULAR'],
      niveles: nivelesList,
      materias: materiasList,
      activo: filtroConfigurado,
      descripcion: localFiltro?.descripcion || '',
    };

    // 2. Si pide desglose de UEs para un departamento específico
    if (viewUes && departamentoIdParam) {
      const depId = Number(departamentoIdParam);
      if (!filtroConfigurado) {
        return NextResponse.json({ ues: [], count: 0 });
      }

      // Consultar en sie_deficit_materia de Supabase para este departamento
      try {
        const matOrConditions = materiasList
          .flatMap((m) => [
            `materia.ilike.*${encodeURIComponent(m)}*`,
            `sub_materia.ilike.*${encodeURIComponent(m)}*`,
          ])
          .join(',');

        const fieldsWithSub = 'cod_ue,ue,cod_dep,departamento,cod_dis,distrito,area,subsistema,nivel,grado,paralelo,materia,sub_materia,hora_tra,hora_pla,deficit';
        const fieldsFallback = 'cod_ue,ue,cod_dep,departamento,cod_dis,distrito,area,subsistema,nivel,grado,paralelo,materia,hora_tra,hora_pla,deficit';
        const queryUrl = `${SUPABASE_URL}/rest/v1/sie_deficit_materia?cod_dep=eq.${depId}&deficit=gt.0&or=(${matOrConditions})&order=deficit.desc&limit=300&select=${fieldsWithSub}`;

        let resUes = await fetch(queryUrl, { headers, cache: 'no-store' });
        if (!resUes.ok) {
          const fallbackUrl = `${SUPABASE_URL}/rest/v1/sie_deficit_materia?cod_dep=eq.${depId}&deficit=gt.0&or=(${matOrConditions})&order=deficit.desc&limit=300&select=${fieldsFallback}`;
          resUes = await fetch(fallbackUrl, { headers, cache: 'no-store' });
        }
        if (resUes.ok) {
          const rawUes = await resUes.json();
          const baseHoras = customBaseHoras && customBaseHoras > 0 ? customBaseHoras : horaItemBd;

          const ues = rawUes.map((r: any) => ({
            cod_ue: Number(r.cod_ue),
            ue: r.ue || 'SIN NOMBRE',
            distrito: r.distrito || '',
            area: r.area || 'U',
            subsistema: r.subsistema || '',
            nivel: r.nivel || '',
            grado: r.grado !== null && r.grado !== undefined ? r.grado : '',
            paralelo: r.paralelo || '',
            materia: r.materia || '',
            sub_materia: r.sub_materia || '',
            hora_tra: Number(r.hora_tra) || 0,
            hora_pla: Number(r.hora_pla) || 0,
            deficit: Number(r.deficit) || 0,
            items_deficit_equiv: Number((Number(r.deficit) / baseHoras).toFixed(2)),
          }));

          return NextResponse.json({ ues, count: ues.length });
        }
      } catch (eUe) {
        console.error('Error buscando UEs:', eUe);
      }

      return NextResponse.json({ ues: [], count: 0 });
    }

    // 3. Si no hay filtro configurado, devolver datos vacíos consistentes
    if (!filtroConfigurado) {
      const emptyDept = DEPARTAMENTOS_LIST.map((d) => ({
        departamento_id: d.id,
        departamento: d.nombre.toUpperCase(),
        ues_afectadas: 0,
        carga_horaria: 0,
        horas_planilla: 0,
        deficit_horas: 0,
        items_deficit_equiv: 0,
        pct_cobertura: 100,
      }));

      return NextResponse.json({
        especialidad_id: especialidadId,
        especialidad: espNombre,
        filtro: filtroInfo,
        filtro_configurado: false,
        resumen_nacional: {
          total_ues: 0,
          carga_horaria: 0,
          horas_planilla: 0,
          deficit_horas: 0,
          items_deficit_equiv: 0,
          pct_cobertura: 100,
        },
        departamentos: emptyDept,
        materias_breakdown: [],
        total_registros: 0,
        sin_datos: true,
      });
    }

    // 4. Agregación analítica instantánea en memoria (0.7 MB agrupado, < 5 ms, 0 fallos en Vercel)
    const agrupado = getAgrupadoData();
    const baseHoras = customBaseHoras && customBaseHoras > 0 ? customBaseHoras : horaItemBd;

    const uesSetNac = new Set<number>();
    let cargaNac = 0;
    let planillaNac = 0;
    let deficitNac = 0;

    const deptMap: Record<number, { uesSet: Set<number>; carga: number; planilla: number; deficit: number }> = {};
    DEPARTAMENTOS_LIST.forEach((d) => {
      deptMap[d.id] = { uesSet: new Set<number>(), carga: 0, planilla: 0, deficit: 0 };
    });

    const matBreakdownMap: Record<string, { uesSet: Set<number>; carga: number; deficit: number; nivel: string; sub_materia: string }> = {};

    agrupado.forEach((row: any) => {
      const rowMateria = String(row.m || '').toUpperCase();
      const rowSubMateria = String(row.sm || '');
      const rowSubsistema = normalizeSubsistema(row.s);
      const rowNivel = String(row.n || '').toUpperCase();
      const depId = Number(row.d);

      // 1. Coincidencia de Materia o Sub-materia (exacta o contenida)
      const matMatched = materiasList.some((m) =>
        matchesMateria(rowMateria, m) || (rowSubMateria && matchesMateria(rowSubMateria, m))
      );
      if (!matMatched) return;

      // 2. Coincidencia de Subsistema (si está especificado)
      if (subsistemasList.length > 0 && !subsistemasList.includes(rowSubsistema)) return;

      // 3. Coincidencia de Nivel (si está especificado)
      if (nivelesList.length > 0 && !nivelesList.includes(rowNivel)) return;

      const carga = Number(row.c) || 0;
      const pla = Number(row.p) || 0;
      const def = Number(row.def) || 0;
      const uesArr: number[] = Array.isArray(row.u) ? row.u : [];

      cargaNac += carga;
      planillaNac += pla;
      deficitNac += def;
      uesArr.forEach((u) => uesSetNac.add(u));

      if (deptMap[depId]) {
        deptMap[depId].carga += carga;
        deptMap[depId].planilla += pla;
        deptMap[depId].deficit += def;
        uesArr.forEach((u) => deptMap[depId].uesSet.add(u));
      }

      const matKey = `${rowMateria}__${rowNivel}__${rowSubMateria}`;
      if (!matBreakdownMap[matKey]) {
        matBreakdownMap[matKey] = {
          uesSet: new Set<number>(),
          carga: 0,
          deficit: 0,
          nivel: rowNivel,
          sub_materia: rowSubMateria,
        };
      }
      matBreakdownMap[matKey].carga += carga;
      matBreakdownMap[matKey].deficit += def;
      uesArr.forEach((u) => matBreakdownMap[matKey].uesSet.add(u));
    });

    const pctCobNac = cargaNac > 0 ? Number(((planillaNac / cargaNac) * 100).toFixed(1)) : 100;
    const itemsNac = Number((deficitNac / baseHoras).toFixed(1));

    const departamentos = DEPARTAMENTOS_LIST.map((d) => {
      const data = deptMap[d.id];
      const pct = data.carga > 0 ? Number(((data.planilla / data.carga) * 100).toFixed(1)) : 100;
      const items = Number((data.deficit / baseHoras).toFixed(1));
      return {
        departamento_id: d.id,
        departamento: d.nombre.toUpperCase(),
        ues_afectadas: data.uesSet.size,
        carga_horaria: data.carga,
        horas_planilla: data.planilla,
        deficit_horas: data.deficit,
        items_deficit_equiv: items,
        pct_cobertura: pct,
      };
    });

    const materias_breakdown = Object.entries(matBreakdownMap)
      .map(([key, val]) => {
        const matName = key.split('__')[0];
        return {
          materia: matName,
          sub_materia: val.sub_materia || '',
          nivel: val.nivel,
          ues_afectadas: val.uesSet.size,
          carga_horaria: val.carga,
          deficit_horas: val.deficit,
        };
      })
      .sort((a, b) => b.deficit_horas - a.deficit_horas);

    return NextResponse.json({
      especialidad_id: especialidadId,
      especialidad: espNombre,
      filtro: filtroInfo,
      filtro_configurado: true,
      resumen_nacional: {
        total_ues: uesSetNac.size,
        carga_horaria: cargaNac,
        horas_planilla: planillaNac,
        deficit_horas: deficitNac,
        hora_item_bd: horaItemBd,
        base_horas_aplicada: baseHoras,
        es_promedio_dinamico: !customBaseHoras,
        items_deficit_equiv: itemsNac,
        pct_cobertura: pctCobNac,
      },
      especialidad_obj: {
        id: especialidadId,
        nombre: espNombre,
        hora_item: horaItemBd,
      },
      departamentos,
      materias_breakdown,
      total_registros: materias_breakdown.length,
      sin_datos: uesSetNac.size === 0,
    });
  } catch (err: any) {
    console.error('Error en /api/materia-deficit:', err);
    return NextResponse.json({ error: err.message || 'Error en materia-deficit' }, { status: 500 });
  }
}
