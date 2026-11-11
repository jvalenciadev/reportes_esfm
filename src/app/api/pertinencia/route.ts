import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'pertinencia_data.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[pertinencia] Error:', err);
    return NextResponse.json({ error: 'No se pudo cargar pertinencia_data.json' }, { status: 500 });
  }
}

