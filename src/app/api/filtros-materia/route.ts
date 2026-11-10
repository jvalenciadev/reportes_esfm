import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

const CONFIG_PATH = path.join(process.cwd(), 'src/data/filtros_materia_config.json');

// Helper para leer configuración local
function getLocalConfig(): any[] {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error leyendo filtros_materia_config.json:', e);
  }
  return [];
}

// Helper para guardar configuración local
function saveLocalConfig(data: any[]) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error escribiendo filtros_materia_config.json:', e);
  }
}

// 1. GET: Listar especialidades oficiales o filtros guardados por materia
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    // A. Si se solicitan las especialidades oficiales
    if (action === 'especialidades') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=id,nombre&order=id.asc`,
        { headers, next: { revalidate: 120 } }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      return NextResponse.json([]);
    }

    // B. Listar filtros por materia configurados
    const local = getLocalConfig();
    return NextResponse.json(local);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en GET filtros-materia' }, { status: 500 });
  }
}

// 2. POST / PUT: Crear o actualizar filtro de especialidad (Subsistema -> Nivel -> Materias)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      especialidad_oficial_id,
      subsistemas = [],
      niveles = [],
      materias = [],
      operador_carga = null,
      carga_especialidad = null,
      materias_condiciones = [],
      activo = true,
      descripcion = '',
    } = body;

    if (!especialidad_oficial_id) {
      return NextResponse.json({ error: 'especialidad_oficial_id es requerido' }, { status: 400 });
    }

    const espId = Number(especialidad_oficial_id);
    let list = getLocalConfig();

    const existingIdx = list.findIndex((f) => f.especialidad_oficial_id === espId);
    const newId = existingIdx >= 0 ? list[existingIdx].id : Date.now();

    const record = {
      id: newId,
      especialidad_oficial_id: espId,
      subsistemas: Array.isArray(subsistemas) ? subsistemas : [subsistemas],
      niveles: Array.isArray(niveles) ? niveles : [niveles],
      materias: Array.isArray(materias) ? materias : [materias],
      operador_carga: operador_carga || null,
      carga_especialidad: carga_especialidad !== null && carga_especialidad !== '' ? Number(carga_especialidad) : null,
      materias_condiciones: Array.isArray(materias_condiciones) ? materias_condiciones : [],
      activo: Boolean(activo),
      descripcion: descripcion || '',
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.push(record);
    }
    saveLocalConfig(list);

    // Sincronizar en segundo plano con Supabase (relacion_especialidad_materia)
    try {
      // 1. Limpiar materias previas para esta especialidad
      await fetch(
        `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?especialidad_id=eq.${espId}`,
        { method: 'DELETE', headers }
      );

      // 2. Insertar las materias seleccionadas
      if (record.activo && record.materias.length > 0) {
        const sub = record.subsistemas[0] || null;
        const niv = record.niveles[0] || null;
        const insertPayload = record.materias.map((m: string) => ({
          especialidad_id: espId,
          subsistema: sub,
          nivel: niv,
          materia: m.toUpperCase(),
          tipo_coincidencia: 'CONTIENE',
          activo: true,
        }));

        await fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad_materia`, {
          method: 'POST',
          headers: {
            ...headers,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(insertPayload),
        });
      }
    } catch (syncErr) {
      console.warn('Aviso sincronizando relacion_especialidad_materia:', syncErr);
    }

    return NextResponse.json({ success: true, filtro: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en POST filtros-materia' }, { status: 500 });
  }
}

// 3. PUT: Actualizar filtro
export async function PUT(req: NextRequest) {
  return POST(req);
}

// 4. DELETE: Eliminar filtro por ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    const filterId = Number(id);
    let list = getLocalConfig();
    const itemToDelete = list.find((f) => f.id === filterId);

    list = list.filter((f) => f.id !== filterId);
    saveLocalConfig(list);

    if (itemToDelete) {
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?especialidad_id=eq.${itemToDelete.especialidad_oficial_id}`,
          { method: 'DELETE', headers }
        );
      } catch (syncErr) {
        console.warn('Aviso eliminando de relacion_especialidad_materia:', syncErr);
      }
    }

    return NextResponse.json({ success: true, deleted_id: filterId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en DELETE filtros-materia' }, { status: 500 });
  }
}
