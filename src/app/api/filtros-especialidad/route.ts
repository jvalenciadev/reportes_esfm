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

// 1. GET: Listar todos los filtros guardados y especialidades oficiales
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // Si se solicitan solo las 20 especialidades oficiales
    if (action === 'especialidades') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=*&order=id.asc`,
        { headers, next: { revalidate: 300 } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Listar todos los filtros con JOIN a especialidades oficiales
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/filtro_especialidad?select=*,especialidades_oficiales(id,nombre)&order=especialidad_oficial_id.asc`,
      {
        headers: {
          ...headers,
          Prefer: 'count=exact',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      // Si la tabla aún no se ha creado en Supabase, devolver error claro
      return NextResponse.json(
        { error: `Tabla filtro_especialidad: ${res.statusText}`, notReady: true },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en GET' }, { status: 500 });
  }
}

// 2. POST: Crear o hacer Upsert de un filtro para una especialidad
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      especialidad_oficial_id,
      subsistemas = [],
      niveles = [],
      cargos = [],
      operador_carga = null,
      carga_especialidad = null,
      cargos_condiciones = [],
      activo = true,
      descripcion = '',
    } = body;

    if (!especialidad_oficial_id) {
      return NextResponse.json({ error: 'especialidad_oficial_id es requerido' }, { status: 400 });
    }

    const payload = {
      especialidad_oficial_id: Number(especialidad_oficial_id),
      subsistemas: Array.isArray(subsistemas) ? subsistemas : [subsistemas],
      niveles: Array.isArray(niveles) ? niveles : [niveles],
      cargos: Array.isArray(cargos) ? cargos : [cargos],
      operador_carga: operador_carga || null,
      carga_especialidad: carga_especialidad !== null && carga_especialidad !== '' ? Number(carga_especialidad) : null,
      cargos_condiciones: Array.isArray(cargos_condiciones) ? cargos_condiciones : [],
      activo: Boolean(activo),
      descripcion,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filtro_especialidad`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Supabase error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data[0] || data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en POST' }, { status: 500 });
  }
}

// 3. PUT: Actualizar un filtro por ID o por especialidad_oficial_id
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, especialidad_oficial_id } = body;

    let targetQuery = '';
    if (id) {
      targetQuery = `id=eq.${id}`;
    } else if (especialidad_oficial_id) {
      targetQuery = `especialidad_oficial_id=eq.${especialidad_oficial_id}`;
    } else {
      return NextResponse.json({ error: 'Se requiere id o especialidad_oficial_id' }, { status: 400 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.subsistemas !== undefined) {
      updatePayload.subsistemas = Array.isArray(body.subsistemas) ? body.subsistemas : [body.subsistemas];
    }
    if (body.niveles !== undefined) {
      updatePayload.niveles = Array.isArray(body.niveles) ? body.niveles : [body.niveles];
    }
    if (body.cargos !== undefined) {
      updatePayload.cargos = Array.isArray(body.cargos) ? body.cargos : [body.cargos];
    }
    if (body.operador_carga !== undefined) {
      updatePayload.operador_carga = body.operador_carga || null;
    }
    if (body.carga_especialidad !== undefined) {
      updatePayload.carga_especialidad = body.carga_especialidad !== null && body.carga_especialidad !== '' ? Number(body.carga_especialidad) : null;
    }
    if (body.cargos_condiciones !== undefined) {
      updatePayload.cargos_condiciones = Array.isArray(body.cargos_condiciones) ? body.cargos_condiciones : [];
    }
    if (body.activo !== undefined) {
      updatePayload.activo = Boolean(body.activo);
    }
    if (body.descripcion !== undefined) {
      updatePayload.descripcion = body.descripcion;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filtro_especialidad?${targetQuery}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Supabase error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data[0] || data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en PUT' }, { status: 500 });
  }
}

// 4. DELETE: Eliminar un filtro guardado
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id es requerido para eliminar' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/filtro_especialidad?id=eq.${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Error al eliminar: ${errText}` }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: `Filtro ${id} eliminado` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en DELETE' }, { status: 500 });
  }
}
