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

// GET: Obtener relaciones filtradas y especialidades oficiales
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'especialidades') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=*&order=id.asc`, {
        headers,
        next: { revalidate: 300 },
      });
      const data = await res.json();
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'resumen_deficit') {
    const gestion = searchParams.get('gestion');
    let url = `${SUPABASE_URL}/rest/v1/v_resumen_deficit_especialidad?select=*&order=total_deficit_horas.desc`;
    if (gestion && gestion !== 'all') {
      url += `&gestion=eq.${encodeURIComponent(gestion)}`;
    }
    try {
      const res = await fetch(url, { headers, next: { revalidate: 60 } });
      const data = await res.json();
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Listado de relaciones
  const especialidad_id = searchParams.get('especialidad_id');
  const subsistema = searchParams.get('subsistema');
  const nivel = searchParams.get('nivel');
  const dependencia = searchParams.get('dependencia');
  const search = searchParams.get('search');
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000);
  const offset = Number(searchParams.get('offset')) || 0;

  let query = `${SUPABASE_URL}/rest/v1/relacion_especialidad?select=id,especialidad_id,dependencia,subsistema,nivel,cargo,activo,created_at,especialidades_oficiales(nombre)&order=id.desc&limit=${limit}&offset=${offset}`;

  if (especialidad_id && especialidad_id !== 'all') {
    query += `&especialidad_id=eq.${encodeURIComponent(especialidad_id)}`;
  }
  if (subsistema && subsistema !== 'all') {
    query += `&subsistema=eq.${encodeURIComponent(subsistema)}`;
  }
  if (nivel && nivel !== 'all') {
    query += `&nivel=eq.${encodeURIComponent(nivel)}`;
  }
  if (dependencia && dependencia !== 'all') {
    query += `&dependencia=eq.${encodeURIComponent(dependencia)}`;
  }
  if (search) {
    query += `&cargo=ilike.*${encodeURIComponent(search)}*`;
  }

  try {
    const res = await fetch(query, {
      headers: { ...headers, Prefer: 'count=exact' },
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const contentRange = res.headers.get('content-range');
    const totalCount = contentRange ? Number(contentRange.split('/')[1]) || data.length : data.length;

    return NextResponse.json({ data, total: totalCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Crear nueva relación cargo <-> especialidad
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { especialidad_id, dependencia, subsistema, nivel, cargo } = body;

    if (!especialidad_id || !cargo) {
      return NextResponse.json({ error: 'especialidad_id y cargo son obligatorios' }, { status: 400 });
    }

    const payload = [{
      especialidad_id: Number(especialidad_id),
      dependencia: dependencia && dependencia !== 'all' ? dependencia : null,
      subsistema: subsistema && subsistema !== 'all' ? subsistema : null,
      nivel: nivel && nivel !== 'all' ? nivel : null,
      cargo: String(cargo).trim(),
      activo: true,
    }];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: jsonSafeString(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Eliminar una relación existente
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al eliminar' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function jsonSafeString(obj: any) {
  return JSON.stringify(obj);
}

