import { NextRequest, NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/relaciones?especialidad_id=X  → relaciones de una especialidad
// GET /api/admin/relaciones                     → todas (con join)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const espId = searchParams.get('especialidad_id');

  const viewQuery = espId
    ? `select=*&or=(especialidad_id.eq.${espId},especialidad_rel_id.eq.${espId})&order=id.asc`
    : 'select=*&order=id.asc';

  const res = await fetch(sbUrl('v_especialidad_relaciones', viewQuery), {
    headers: SB_HEADERS,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

// POST /api/admin/relaciones → crear relación
export async function POST(req: NextRequest) {
  const body = await req.json();
  // body: { especialidad_id, especialidad_rel_id, tipo_relacion, descripcion? }
  const res = await fetch(sbUrl('especialidad_relacion'), {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 201 });
}
