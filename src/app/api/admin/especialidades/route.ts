import { NextRequest, NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/especialidades → lista todas
export async function GET() {
  const res = await fetch(
    sbUrl('especialidades_oficiales', 'select=*&order=id.asc'),
    { headers: SB_HEADERS, cache: 'no-store' }
  );
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/admin/especialidades → crear nueva
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(sbUrl('especialidades_oficiales'), {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
