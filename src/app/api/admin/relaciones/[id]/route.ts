import { NextRequest, NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/relaciones/[id] → actualizar tipo o descripción
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(sbUrl('especialidad_relacion', `id=eq.${id}`), {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

// DELETE /api/admin/relaciones/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const res = await fetch(sbUrl('especialidad_relacion', `id=eq.${id}`), {
    method: 'DELETE',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
