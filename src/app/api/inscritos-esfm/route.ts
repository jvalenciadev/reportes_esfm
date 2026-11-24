import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'inscritos_2022_2026.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Dataset de inscritos ESFM 2022-2026 no encontrado.' },
        { status: 404 }
      );
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[api/inscritos-esfm] Error:', err);
    return NextResponse.json(
      { error: 'Error interno al cargar matrícula ESFM 2022-2026.' },
      { status: 500 }
    );
  }
}
