import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const especialidadIdParam = searchParams.get('especialidad_id');
  const departamentoIdParam = searchParams.get('departamento_id');
  const viewUes = searchParams.get('view') === 'ues';

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
        reglas_total: countsMap[e.id]?.total ?? 0,
        reglas_activas: countsMap[e.id]?.activas ?? 0,
      }));

      return NextResponse.json({ especialidades: list });
    }

    const especialidadId = Number(especialidadIdParam);

    // 2. Si pide desglose de UEs para un departamento específico
    if (viewUes && departamentoIdParam) {
      const depId = Number(departamentoIdParam);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/v_deficit_por_especialidad_materia?especialidad_id=eq.${especialidadId}&cod_dep=eq.${depId}&order=deficit.desc&limit=100`,
        { headers, cache: 'no-store' }
      );
      if (!res.ok) {
        return NextResponse.json({ ues: [], count: 0 });
      }
      const data = await res.json();
      return NextResponse.json({ ues: data, count: data.length });
    }

    // 3. Consultar vista agregada para la especialidad solicitada
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/v_deficit_por_especialidad_materia?especialidad_id=eq.${especialidadId}&limit=10000`,
      { headers, cache: 'no-store' }
    );

    if (!res.ok) {
      // Manejo resiliente si la vista aún no tiene datos cargados
      return NextResponse.json({
        especialidad_id: especialidadId,
        resumen_nacional: {
          total_ues: 0,
          carga_horaria: 0,
          horas_planilla: 0,
          deficit_horas: 0,
          items_deficit_equiv: 0,
          pct_cobertura: 100,
        },
        departamentos: DEPARTAMENTOS_LIST.map((d) => ({
          departamento_id: d.id,
          departamento: d.nombre.toUpperCase(),
          ues_afectadas: 0,
          carga_horaria: 0,
          horas_planilla: 0,
          deficit_horas: 0,
          items_deficit_equiv: 0,
          pct_cobertura: 100,
        })),
        materias_breakdown: [],
        total_registros: 0,
        sin_datos: true,
      });
    }

    const rows: any[] = await res.json();

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        especialidad_id: especialidadId,
        resumen_nacional: {
          total_ues: 0,
          carga_horaria: 0,
          horas_planilla: 0,
          deficit_horas: 0,
          items_deficit_equiv: 0,
          pct_cobertura: 100,
        },
        departamentos: DEPARTAMENTOS_LIST.map((d) => ({
          departamento_id: d.id,
          departamento: d.nombre.toUpperCase(),
          ues_afectadas: 0,
          carga_horaria: 0,
          horas_planilla: 0,
          deficit_horas: 0,
          items_deficit_equiv: 0,
          pct_cobertura: 100,
        })),
        materias_breakdown: [],
        total_registros: 0,
        sin_datos: true,
      });
    }

    // Agregación Nacional
    const uesSetNac = new Set<number>();
    let cargaNac = 0;
    let planillaNac = 0;
    let deficitNac = 0;
    let itemsNac = 0;

    // Agregación Departamental
    const deptMap: Record<number, {
      uesSet: Set<number>;
      carga: number;
      planilla: number;
      deficit: number;
      items: number;
      nombre: string;
    }> = {};

    DEPARTAMENTOS_LIST.forEach((d) => {
      deptMap[d.id] = {
        uesSet: new Set<number>(),
        carga: 0,
        planilla: 0,
        deficit: 0,
        items: 0,
        nombre: d.nombre,
      };
    });

    // Agregación por Materia
    const matMap: Record<string, { uesSet: Set<number>; carga: number; deficit: number; nivel: string }> = {};

    rows.forEach((r) => {
      const codUe = Number(r.cod_ue);
      const horaTra = Number(r.hora_tra) || 0;
      const horaPla = Number(r.hora_pla) || 0;
      const def = Number(r.deficit) || 0;
      const items = Number(r.items_deficit_equiv) || 0;
      const depId = Number(r.cod_dep);
      const materia = String(r.materia || 'SIN ESPECIFICAR').toUpperCase();

      uesSetNac.add(codUe);
      cargaNac += horaTra;
      planillaNac += horaPla;
      deficitNac += def;
      itemsNac += items;

      if (deptMap[depId]) {
        deptMap[depId].uesSet.add(codUe);
        deptMap[depId].carga += horaTra;
        deptMap[depId].planilla += horaPla;
        deptMap[depId].deficit += def;
        deptMap[depId].items += items;
      }

      if (!matMap[materia]) {
        matMap[materia] = { uesSet: new Set<number>(), carga: 0, deficit: 0, nivel: r.nivel || '' };
      }
      matMap[materia].uesSet.add(codUe);
      matMap[materia].carga += horaTra;
      matMap[materia].deficit += def;
    });

    const pctCobNac = cargaNac > 0 ? Number(((planillaNac / cargaNac) * 100).toFixed(1)) : 100;

    const departamentos = DEPARTAMENTOS_LIST.map((d) => {
      const data = deptMap[d.id];
      const pct = data.carga > 0 ? Number(((data.planilla / data.carga) * 100).toFixed(1)) : 100;
      return {
        departamento_id: d.id,
        departamento: d.nombre.toUpperCase(),
        ues_afectadas: data.uesSet.size,
        carga_horaria: data.carga,
        horas_planilla: data.planilla,
        deficit_horas: data.deficit,
        items_deficit_equiv: Number(data.items.toFixed(1)),
        pct_cobertura: pct,
      };
    });

    const materias_breakdown = Object.entries(matMap)
      .map(([materia, val]) => ({
        materia,
        nivel: val.nivel,
        ues_afectadas: val.uesSet.size,
        carga_horaria: val.carga,
        deficit_horas: val.deficit,
      }))
      .sort((a, b) => b.deficit_horas - a.deficit_horas);

    return NextResponse.json({
      especialidad_id: especialidadId,
      especialidad: rows[0]?.especialidad || '',
      resumen_nacional: {
        total_ues: uesSetNac.size,
        carga_horaria: cargaNac,
        horas_planilla: planillaNac,
        deficit_horas: deficitNac,
        items_deficit_equiv: Number(itemsNac.toFixed(1)),
        pct_cobertura: pctCobNac,
      },
      departamentos,
      materias_breakdown,
      total_registros: rows.length,
      sin_datos: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en materia-deficit' }, { status: 500 });
  }
}
