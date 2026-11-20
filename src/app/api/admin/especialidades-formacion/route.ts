import { NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';
import fallbackCatalog from '@/data/catalogo_especialidades_formacion.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(sbUrl('especialidades_formacion', 'select=*&order=total_docentes.desc'), {
      headers: SB_HEADERS,
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.warn('[especialidades-formacion] Fallback a JSON local:', err);
  }

  // Fallback seguro con el catálogo extraído de la auditoría oficial (729 registros)
  return NextResponse.json(fallbackCatalog);
}
