import { NextRequest, NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(sbUrl('especialidades_oficiales', 'select=id,nombre,hora_item&order=id.asc'), {
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
    console.warn('[especialidades-oficiales] Error conectando a Supabase:', err);
  }

  // Lista base institucional si aún no fue consultada
  return NextResponse.json([
    { id: 1, nombre: 'EDUCACIÓN INICIAL EN FAMILIA COMUNITARIA', hora_item: 88 },
    { id: 2, nombre: 'EDUCACIÓN PRIMARIA COMUNITARIA VOCACIONAL', hora_item: 96 },
    { id: 3, nombre: 'MATEMÁTICA', hora_item: 104 },
    { id: 4, nombre: 'COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA', hora_item: 104 },
    { id: 5, nombre: 'CIENCIAS SOCIALES', hora_item: 104 },
    { id: 6, nombre: 'CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA', hora_item: 104 },
    { id: 7, nombre: 'CIENCIAS NATURALES: FÍSICA - QUÍMICA', hora_item: 104 },
    { id: 8, nombre: 'EDUCACIÓN FÍSICA Y DEPORTES', hora_item: 96 },
    { id: 9, nombre: 'EDUCACIÓN MUSICAL', hora_item: 96 },
    { id: 10, nombre: 'COSMOVISIONES, FILOSOFÍAS Y SICOLOGÍA', hora_item: 104 },
    { id: 11, nombre: 'ARTES PLÁSTICAS Y VISUALES', hora_item: 96 },
    { id: 12, nombre: 'COMUNICACIÓN Y LENGUAJES: LENGUA EXTRANJERA (INGLÉS)', hora_item: 104 },
    { id: 13, nombre: 'VALORES, ESPIRITUALIDADES Y RELIGIONES', hora_item: 96 },
    { id: 14, nombre: 'TÉCNICA TECNOLÓGICA GENERAL', hora_item: 104 },
    { id: 15, nombre: 'SISTEMAS INFORMÁTICOS', hora_item: 112 },
    { id: 16, nombre: 'TRANSFORMACIÓN DE ALIMENTOS Y GASTRONOMÍA', hora_item: 112 },
    { id: 17, nombre: 'MECÁNICA AUTOMOTRIZ', hora_item: 112 },
    { id: 18, nombre: 'ELECTRICIDAD Y ELECTRÓNICA', hora_item: 112 },
    { id: 19, nombre: 'AGROPECUARIA', hora_item: 112 },
    { id: 20, nombre: 'EDUCACIÓN ESPECIAL PARA PERSONAS CON DISCAPACIDAD', hora_item: 96 },
    { id: 21, nombre: 'EDUCACIÓN DE PERSONAS JÓVENES Y ADULTAS (EPJA)', hora_item: 96 }
  ]);
}
