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
  const gestion = searchParams.get('gestion');
  const departamento_id = searchParams.get('departamento_id');
  const dependencia = searchParams.get('dependencia');
  const subsistema = searchParams.get('subsistema');
  const search = searchParams.get('search');
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 1000);
  const offset = Number(searchParams.get('offset')) || 0;

  let query = `${SUPABASE_URL}/rest/v1/uie_deficit_horas?select=*&limit=${limit}&offset=${offset}&order=deficit_horas.desc`;

  if (gestion && gestion !== 'all') {
    query += `&gestion=eq.${encodeURIComponent(gestion)}`;
  }
  if (departamento_id && departamento_id !== 'all') {
    query += `&departamento_id=eq.${encodeURIComponent(departamento_id)}`;
  }
  if (dependencia && dependencia !== 'all') {
    query += `&dependencia=eq.${encodeURIComponent(dependencia)}`;
  }
  if (subsistema && subsistema !== 'all') {
    query += `&subsistema=eq.${encodeURIComponent(subsistema)}`;
  }
  if (search) {
    query += `&cargo=ilike.*${encodeURIComponent(search)}*`;
  }

  try {
    const res = await fetch(query, {
      headers: {
        ...headers,
        Prefer: 'count=exact',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Supabase error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    const contentRange = res.headers.get('content-range');
    const totalCount = contentRange ? Number(contentRange.split('/')[1]) || data.length : data.length;

    return NextResponse.json({
      data,
      total: totalCount,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching deficit data' }, { status: 500 });
  }
}

