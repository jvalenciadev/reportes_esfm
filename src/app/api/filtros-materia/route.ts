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

function saveLocalConfig(data: any[]) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Aviso escribiendo filtros_materia_config.json local (ignorable en Vercel):', e);
  }
}

function normalizeSubsistema(sub?: string | null): string {
  if (!sub) return 'REGULAR';
  const s = sub.trim().toUpperCase();
  if (s.includes('REGULAR')) return 'REGULAR';
  if (s.includes('ALTERNATIVA')) return 'ALTERNATIVA';
  if (s.includes('ESPECIAL')) return 'ESPECIAL';
  return s;
}

// 1. GET: Listar especialidades oficiales o filtros configurados
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'especialidades') {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=id,nombre,hora_item&order=id.asc`,
        { headers, next: { revalidate: 120 } }
      );
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
      return NextResponse.json([]);
    }

    // Consultar relacion_especialidad_materia en Supabase (Fuente de Verdad Persistente en la Nube)
    const [relRes, espRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?select=*&order=especialidad_id.asc`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${SUPABASE_URL}/rest/v1/especialidades_oficiales?select=id,nombre,hora_item&order=id.asc`, {
        headers,
        next: { revalidate: 120 },
      }),
    ]);

    const relaciones: any[] = relRes.ok ? await relRes.json() : [];
    const especialidades: any[] = espRes.ok ? await espRes.json() : [];
    const localConfigs = getLocalConfig();

    const localMap = new Map<number, any>();
    localConfigs.forEach((c) => localMap.set(c.especialidad_oficial_id, c));

    // Agrupar relaciones por especialidad_id
    const relMap = new Map<number, { subs: Set<string>; nivs: Set<string>; mats: Set<string>; activo: boolean }>();
    relaciones.forEach((r) => {
      const espId = Number(r.especialidad_id);
      if (!relMap.has(espId)) {
        relMap.set(espId, {
          subs: new Set<string>(),
          nivs: new Set<string>(),
          mats: new Set<string>(),
          activo: false,
        });
      }
      const item = relMap.get(espId)!;
      if (r.activo) item.activo = true;
      if (r.subsistema) item.subs.add(normalizeSubsistema(r.subsistema));
      if (r.nivel) item.nivs.add(r.nivel.toUpperCase().trim());
      if (r.materia) item.mats.add(r.materia.toUpperCase().trim());
    });

    // Construir la lista consolidada para todas las especialidades oficiales
    const result: any[] = [];

    especialidades.forEach((esp) => {
      const espId = esp.id;
      const relData = relMap.get(espId);
      const localData = localMap.get(espId);

      if (relData && relData.mats.size > 0) {
        result.push({
          id: localData?.id || espId,
          especialidad_oficial_id: espId,
          subsistemas: Array.from(relData.subs),
          niveles: Array.from(relData.nivs),
          materias: Array.from(relData.mats),
          operador_carga: localData?.operador_carga || null,
          carga_especialidad: localData?.carga_especialidad || null,
          materias_condiciones: localData?.materias_condiciones || [],
          activo: relData.activo,
          descripcion: localData?.descripcion || '',
          updated_at: localData?.updated_at || new Date().toISOString(),
        });
      } else if (localData) {
        result.push(localData);
      }
    });

    // Guardar copia local de respaldo si hay resultados
    if (result.length > 0) {
      saveLocalConfig(result);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en GET filtros-materia' }, { status: 500 });
  }
}

// 2. POST / PUT: Crear o actualizar filtro de especialidad
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

    // Sincronizar reglas en relacion_especialidad_materia en Supabase (Persistente en Vercel)
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/relacion_especialidad_materia?especialidad_id=eq.${espId}`,
        { method: 'DELETE', headers }
      );

      if (record.activo && record.materias.length > 0) {
        const subsNorm = record.subsistemas.length > 0
          ? record.subsistemas.map((s: string) => normalizeSubsistema(s))
          : ['REGULAR'];
        const nivs = record.niveles.length > 0 ? record.niveles : [null];

        const insertPayload: any[] = [];
        for (const sub of subsNorm) {
          for (const niv of nivs) {
            for (const mat of record.materias) {
              insertPayload.push({
                especialidad_id: espId,
                subsistema: sub,
                nivel: niv,
                materia: mat.toUpperCase().trim(),
                tipo_coincidencia: 'CONTIENE',
                activo: true,
              });
            }
          }
        }

        if (insertPayload.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/relacion_especialidad_materia`, {
            method: 'POST',
            headers: {
              ...headers,
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify(insertPayload),
          });
        }
      }
    } catch (syncErr) {
      console.warn('Aviso sincronizando relacion_especialidad_materia:', syncErr);
    }

    return NextResponse.json({ success: true, filtro: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en POST filtros-materia' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

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
        console.warn('Aviso eliminando de BD:', syncErr);
      }
    }

    return NextResponse.json({ success: true, deleted_id: filterId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en DELETE filtros-materia' }, { status: 500 });
  }
}
