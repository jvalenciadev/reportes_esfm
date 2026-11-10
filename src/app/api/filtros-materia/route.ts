import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dwretdtwyqsltylvnvld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// 1. GET: Listar reglas de relacion_especialidad_materia, especialidades o materias disponibles
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const especialidadId = searchParams.get('especialidad_id');

  try {
    // A. Listar especialidades oficiales
    if (action === 'especialidades') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=id,nombre&order=id.asc`,
        { headers, next: { revalidate: 120 } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // B. Listar materias únicas registradas en sie_deficit_materia (para autocompletado)
    if (action === 'materias_disponibles') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/sie_deficit_materia?select=materia,nivel,subsistema&limit=500`,
        { headers, cache: 'no-store' }
      );
      if (!res.ok) return NextResponse.json([]);
      const data = await res.json();
      const uniqueMaterias = Array.from(new Set(data.map((d: any) => d.materia).filter(Boolean))).sort();
      return NextResponse.json(uniqueMaterias);
    }

    // C. Listar reglas de mapeo relacion_especialidad_materia
    let queryUrl = `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?select=*,especialidades_oficiales(id,nombre)&order=especialidad_id.asc,id.asc`;
    if (especialidadId) {
      queryUrl += `&especialidad_id=eq.${Number(especialidadId)}`;
    }

    const res = await fetch(queryUrl, {
      headers: {
        ...headers,
        Prefer: 'count=exact',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Tabla relacion_especialidad_materia: ${res.statusText}`, notReady: true },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en GET filtros-materia' }, { status: 500 });
  }
}

// 2. POST: Crear nueva regla de mapeo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      especialidad_id,
      materia,
      subsistema = null,
      nivel = null,
      grado = null,
      tipo_coincidencia = 'EXACTA',
      activo = true,
    } = body;

    if (!especialidad_id || !materia?.trim()) {
      return NextResponse.json(
        { error: 'especialidad_id y materia son requeridos' },
        { status: 400 }
      );
    }

    const payload = {
      especialidad_id: Number(especialidad_id),
      materia: materia.trim().toUpperCase(),
      subsistema: subsistema?.trim() || null,
      nivel: nivel?.trim() || null,
      grado: grado !== null && grado !== '' ? Number(grado) : null,
      tipo_coincidencia: tipo_coincidencia || 'EXACTA',
      activo: Boolean(activo),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad_materia`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Error creando regla: ${res.statusText}`, detail: errText },
        { status: res.status }
      );
    }

    const created = await res.json();
    return NextResponse.json({ success: true, rule: created[0] || created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en POST' }, { status: 500 });
  }
}

// 3. PUT: Actualizar una regla existente (ej: alternar activo, cambiar parámetros)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id es requerido para actualizar' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (updates.materia !== undefined) payload.materia = updates.materia.trim().toUpperCase();
    if (updates.subsistema !== undefined) payload.subsistema = updates.subsistema?.trim() || null;
    if (updates.nivel !== undefined) payload.nivel = updates.nivel?.trim() || null;
    if (updates.grado !== undefined) payload.grado = updates.grado !== null && updates.grado !== '' ? Number(updates.grado) : null;
    if (updates.tipo_coincidencia !== undefined) payload.tipo_coincidencia = updates.tipo_coincidencia;
    if (updates.activo !== undefined) payload.activo = Boolean(updates.activo);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?id=eq.${Number(id)}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Error actualizando regla: ${res.statusText}`, detail: errText },
        { status: res.status }
      );
    }

    const updated = await res.json();
    return NextResponse.json({ success: true, rule: updated[0] || updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en PUT' }, { status: 500 });
  }
}

// 4. DELETE: Eliminar una regla por ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?id=eq.${Number(id)}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Error eliminando regla: ${res.statusText}`, detail: errText },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, deleted_id: Number(id) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en DELETE' }, { status: 500 });
  }
}
