import { NextRequest, NextResponse } from 'next/server';
import { SB_HEADERS, sbUrl } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Archivo local de almacenamiento persistente para desarrollo / offline si Supabase aún no tiene la tabla
const LOCAL_RELACIONES_FILE = path.join(process.cwd(), 'src', 'data', 'relaciones_especialidades_local.json');

function getLocalRelaciones(): any[] {
  try {
    if (fs.existsSync(LOCAL_RELACIONES_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_RELACIONES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error leyendo relaciones locales:', e);
  }
  return [];
}

function saveLocalRelaciones(data: any[]) {
  try {
    fs.writeFileSync(LOCAL_RELACIONES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error guardando relaciones locales:', e);
  }
}

// GET: obtener relaciones
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oficialId = searchParams.get('oficial_id');

  try {
    const q = oficialId ? `especialidad_oficial_id=eq.${oficialId}` : 'select=*';
    const res = await fetch(sbUrl('relacion_especialidad', `${q}&order=id.asc`), {
      headers: SB_HEADERS,
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 50) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    console.warn('[relacion-especialidad] Supabase offline o tabla pendiente, usando local');
  }

  // Fallback local
  let list = getLocalRelaciones();
  if (oficialId) {
    list = list.filter(r => String(r.especialidad_oficial_id) === String(oficialId));
  }
  return NextResponse.json(list);
}

// POST: crear relación simple o en lote
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Si es un array de relaciones
  const items = Array.isArray(body) ? body : [body];

  try {
    const res = await fetch(sbUrl('relacion_especialidad'), {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(items),
    });
    if (res.ok) {
      return NextResponse.json(await res.json(), { status: 201 });
    }
  } catch (err) {
    console.warn('[relacion-especialidad] Error en Supabase, guardando localmente');
  }

  // Guardar en archivo local
  const current = getLocalRelaciones();
  const added: any[] = [];
  for (const item of items) {
    const exists = current.some(
      r => r.especialidad_oficial_id === item.especialidad_oficial_id &&
           r.cod_especialidad_formacion === item.cod_especialidad_formacion
    );
    if (!exists) {
      const newEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...item,
        created_at: new Date().toISOString()
      };
      current.push(newEntry);
      added.push(newEntry);
    }
  }
  saveLocalRelaciones(current);
  return NextResponse.json(added, { status: 201 });
}

// DELETE: eliminar relación
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  }

  try {
    const res = await fetch(sbUrl('relacion_especialidad', `id=eq.${id}`), {
      method: 'DELETE',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    });
    if (res.ok) {
      return new NextResponse(null, { status: 204 });
    }
  } catch (err) {
    console.warn('[relacion-especialidad] Error Supabase, borrando local');
  }

  const current = getLocalRelaciones().filter(r => String(r.id) !== String(id));
  saveLocalRelaciones(current);
  return new NextResponse(null, { status: 204 });
}
