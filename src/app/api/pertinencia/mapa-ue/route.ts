import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'pertinencia_por_ue.json');
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 });
    }

    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const ues = JSON.parse(raw);

    // Filtrar solo UEs con coordenadas válidas dentro del cuadrante de Bolivia
    const compactList = [];
    for (const u of ues) {
      const lat = u.cord_x;
      const lng = u.cord_y;
      // Validar coordenadas en rango aproximado de Bolivia (-9 a -23 lat, -57 a -70 lng)
      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat < -8.0 &&
        lat > -24.0 &&
        lng < -56.0 &&
        lng > -71.0
      ) {
        compactList.push({
          c: u.cod_ue,
          d: u.departamento,
          dt: u.distrito,
          u: u.ue,
          s: u.subsistema || 'Regular',
          n: u.nivel_autorizado || '',
          t: u.turno || '',
          dp: u.dependencia || '',
          dir: u.direccion || '',
          x: Number(lat.toFixed(6)),
          y: Number(lng.toFixed(6)),
          tot: u.total_docentes || 0,
          v: u.docentes_alta_v || 0,
          a: u.docentes_media_a || 0,
          nb: u.docentes_baja_n || 0,
          sin: u.docentes_sin_pertinencia || 0,
          pct: u.pct_alta_pertinencia || 0,
          np: u.no_prejubilados_no_pertinentes || 0,
          pj: u.prejubilados || 0,
          jub: (typeof u.a_jubilar === 'number' ? u.a_jubilar : (typeof u.jubilacion === 'number' ? u.jubilacion : 0)),
          est: u.estudiantes || 0,
          url: u.url_ubicacion || `https://www.google.com/maps?q=${lat},${lng}`,
        });
      }
    }

    return NextResponse.json(compactList, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
