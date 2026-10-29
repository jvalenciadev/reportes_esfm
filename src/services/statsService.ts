import { DashboardDataset } from '@/types/stats';
import fallbackData from '@/data/fallbackData.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dwretdtwyqsltylvnvld.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// Setup corporate proxy dispatcher ONLY in local environment if proxy is configured (NEVER in Vercel or cloud)
const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
if (typeof window === 'undefined' && !isVercel) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ProxyAgent, setGlobalDispatcher } = require('undici');
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch {
      // ignore
    }
  }
}

async function fetchAllRows<T>(endpoint: string, fallbackRows: T[] = [], pageSize = 1000): Promise<T[]> {
  let allRows: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const offset = page * pageSize;
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}${separator}limit=${pageSize}&offset=${offset}`;

    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (!res.ok) {
        console.error(`Error fetching ${endpoint}:`, res.status, res.statusText);
        break;
      }
      const data: T[] = await res.json();
      allRows = allRows.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      console.error(`Exception fetching ${endpoint}:`, err);
      break;
    }
  }

  // If network failed or table is empty in production, return verified static fallback
  if (allRows.length === 0 && fallbackRows.length > 0) {
    return fallbackRows;
  }

  return allRows;
}

export async function getDashboardData(): Promise<DashboardDataset> {
  const [
    departamentos,
    especialidades,
    esfm,
    inscritos_esfm,
    ine_matricula,
    ine_poblacion,
    ine_proyeccion_edad,
    matricula_rural_urbana,
    sie_total_estudiantes,
    discapacidad_seie,
  ] = await Promise.all([
    fetchAllRows<DashboardDataset['departamentos'][0]>(
      'departamentos?select=*&order=id.asc',
      (fallbackData.departamentos || []) as DashboardDataset['departamentos']
    ),
    fetchAllRows<DashboardDataset['especialidades'][0]>(
      'especialidades?select=*&order=id.asc',
      (fallbackData.especialidades || []) as DashboardDataset['especialidades']
    ),
    fetchAllRows<DashboardDataset['esfm'][0]>(
      'esfm?select=*&order=id.asc',
      (fallbackData.esfm || []) as DashboardDataset['esfm']
    ),
    fetchAllRows<DashboardDataset['inscritos_esfm'][0]>(
      'inscritos_esfm?select=id,gestion,departamento_id,esfm_id,especialidad_id,modalidad,total_inscritos,departamentos(nombre),esfm(nombre),especialidades(nombre)&order=id.asc',
      (fallbackData.inscritos_esfm || []) as DashboardDataset['inscritos_esfm']
    ),
    fetchAllRows<DashboardDataset['ine_matricula'][0]>(
      'ine_matricula?select=id,departamento_id,tipo,nivel,cantidad,anio,departamentos(nombre)&order=id.asc',
      (fallbackData.ine_matricula || []) as DashboardDataset['ine_matricula']
    ),
    fetchAllRows<DashboardDataset['ine_poblacion'][0]>(
      'ine_poblacion?select=*&order=anio.asc',
      (fallbackData.ine_poblacion || []) as DashboardDataset['ine_poblacion']
    ),
    fetchAllRows<DashboardDataset['ine_proyeccion_edad'][0]>(
      'ine_proyeccion_edad?select=*,departamentos(nombre)&order=anio.asc,departamento_id.asc,edad.asc',
      (fallbackData.ine_proyeccion_edad || []) as DashboardDataset['ine_proyeccion_edad']
    ),
    fetchAllRows<DashboardDataset['matricula_rural_urbana'][0]>(
      'matricula_rural_urbana?select=*&order=id.asc',
      (fallbackData.matricula_rural_urbana || []) as DashboardDataset['matricula_rural_urbana']
    ),
    fetchAllRows<DashboardDataset['sie_total_estudiantes'][0]>(
      'sie_total_estudiantes?select=id,departamento_id,dependencia,cantidad,nivel,nivel_texto,departamentos(nombre)&order=id.asc',
      (fallbackData.sie_total_estudiantes || []) as DashboardDataset['sie_total_estudiantes']
    ),
    fetchAllRows<DashboardDataset['discapacidad_seie'][0]>(
      'discapacidad_seie?select=*&order=id.asc',
      (fallbackData.discapacidad_seie || []) as DashboardDataset['discapacidad_seie']
    ),
  ]);

  return {
    departamentos,
    especialidades,
    esfm,
    inscritos_esfm,
    ine_matricula,
    ine_poblacion,
    ine_proyeccion_edad,
    matricula_rural_urbana,
    sie_total_estudiantes,
    discapacidad_seie,
  };
}
