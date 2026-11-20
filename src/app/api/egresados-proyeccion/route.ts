import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/egresados_esfm_proyeccion.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }
    const stat = fs.statSync(filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      ...data,
      _mtime: stat.mtimeMs,
      _updatedAt: stat.mtime.toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('[api/egresados-proyeccion] Error:', err);
    return NextResponse.json({ error: err.message || 'Error cargando proyección de egresados' }, { status: 500 });
  }
}
