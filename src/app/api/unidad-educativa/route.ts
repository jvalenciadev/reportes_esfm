import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dwretdtwyqsltylvnvld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'detalle'; // 'detalle', 'catalogo', 'resumen'
  const departamento_id = searchParams.get('departamento_id');
  const dependencia = searchParams.get('dependencia');
  const subsistema = searchParams.get('subsistema');
  const nivel = searchParams.get('nivel');
  const search = searchParams.get('search');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 1000);
  const offset = Number(searchParams.get('offset')) || 0;

  let table = 'sie_unidad_educativa';
  let defaultOrder = 'deficit_horas.desc';

  if (view === 'catalogo') {
    table = 'unidad_educativa';
    defaultOrder = 'cod_ue.asc';
  } else if (view === 'resumen') {
    table = 'v_resumen_unidad_educativa';
    defaultOrder = 'total_deficit_horas.desc';
  }

  let query = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${limit}&offset=${offset}&order=${defaultOrder}`;

  if (departamento_id && departamento_id !== 'all') {
    query += `&departamento_id=eq.${encodeURIComponent(departamento_id)}`;
  }
  if (dependencia && dependencia !== 'all') {
    query += `&dependencia=eq.${encodeURIComponent(dependencia)}`;
  }
  if (subsistema && subsistema !== 'all' && view !== 'catalogo') {
    query += `&subsistema=eq.${encodeURIComponent(subsistema)}`;
  }
  if (nivel && nivel !== 'all' && view !== 'catalogo') {
    query += `&nivel=eq.${encodeURIComponent(nivel)}`;
  }
  if (search) {
    const s = search.trim();
    if (/^\d+$/.test(s)) {
      query += `&cod_ue=eq.${s}`;
    } else {
      query += `&unidad_educativa=ilike.*${encodeURIComponent(s)}*`;
    }
  }

  try {
    const res = await fetch(query, {
      headers: {
        ...headers,
        Prefer: 'count=exact',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Supabase status ${res.status}: ${res.statusText}`, fallback: true },
        { status: res.status }
      );
    }

    const data = await res.json();
    const contentRange = res.headers.get('content-range');
    const totalCount = contentRange ? Number(contentRange.split('/')[1]) || data.length : data.length;

    return NextResponse.json({
      data,
      total: totalCount,
      limit,
      offset,
      view,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error al conectar con Supabase', fallback: true },
      { status: 500 }
    );
  }
}
