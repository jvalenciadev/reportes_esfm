import matriculaProyeccion from '@/data/matricula_proyeccion.json';
import { distributeInteger } from './egresadosAllocation';

export interface PuntoDemografico {
  anio: number;
  tipo: string;
  matricula_real?: number | null;
  modelo_1_ine?: number | null;
  modelo_2_cobertura?: number | null;
  modelo_arima?: number | null;
  modelo_consenso?: number | null;
}

export const DEPTO_KEY_MAP: Record<string, { mpKey: string; label: string }> = {
  CHUQUISACA: { mpKey: 'chuquisaca', label: 'CHUQUISACA' },
  'LA PAZ': { mpKey: 'la_paz', label: 'LA PAZ' },
  COCHABAMBA: { mpKey: 'cochabamba', label: 'COCHABAMBA' },
  ORURO: { mpKey: 'oruro', label: 'ORURO' },
  POTOSI: { mpKey: 'potosi', label: 'POTOSÍ' },
  'POTOSÍ': { mpKey: 'potosi', label: 'POTOSÍ' },
  TARIJA: { mpKey: 'tarija', label: 'TARIJA' },
  'SANTA CRUZ': { mpKey: 'santa_cruz', label: 'SANTA CRUZ' },
  BENI: { mpKey: 'beni', label: 'BENI' },
  PANDO: { mpKey: 'pando', label: 'PANDO' },
};

const MP_KEYS_9 = [
  'chuquisaca',
  'la_paz',
  'cochabamba',
  'oruro',
  'potosi',
  'tarija',
  'santa_cruz',
  'beni',
  'pando',
] as const;

type MpKey = (typeof MP_KEYS_9)[number];

export type NivelDemografico = 'TODOS' | 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'TECNICA' | 'ESPECIAL';
type MpNivelKey = 'inicial' | 'primaria' | 'secundaria';

const NIVEL_TO_MP: Record<string, MpNivelKey> = {
  INICIAL: 'inicial',
  PRIMARIA: 'primaria',
  SECUNDARIA: 'secundaria',
  TECNICA: 'secundaria',
  inicial: 'inicial',
  primaria: 'primaria',
  secundaria: 'secundaria',
};

interface SerieAnualCalibrada {
  realOrBase: number;
  arima: number;
  hibrido: number;
  m2Cobertura: number;
}

interface ProyeccionCalibradaCache {
  nacionalPorAnio: Record<number, SerieAnualCalibrada>;
  deptoPorAnio: Record<MpKey, Record<number, SerieAnualCalibrada>>;
  nivelNacionalPorAnio: Record<MpNivelKey, Record<number, SerieAnualCalibrada>>;
  nivelDeptoPorAnio: Record<MpNivelKey, Record<MpKey, Record<number, SerieAnualCalibrada>>>;
}

let cachedCalibracion: ProyeccionCalibradaCache | null = null;

/**
 * Calcula y calibra las series demográficas por departamento (2026–2034)
 * garantizando que la suma exacta de los 9 departamentos cuadre al 100%
 * con la Serie Nacional oficial (Consenso Híbrido y ARIMA Puro) en cada año.
 */
export function getProyeccionDemograficaCalibrada(): ProyeccionCalibradaCache {
  if (cachedCalibracion) return cachedCalibracion;

  const mp = matriculaProyeccion as {
    serie_nacional?: PuntoDemografico[];
    desagregaciones?: {
      por_departamento?: Record<string, PuntoDemografico[]>;
      por_nivel?: Record<string, PuntoDemografico[]>;
    };
  };

  const natPoints = mp.serie_nacional ?? [];
  const deptMap = mp.desagregaciones?.por_departamento ?? {};
  const nivelMap = mp.desagregaciones?.por_nivel ?? {};

  const natByYear = new Map<number, PuntoDemografico>();
  natPoints.forEach((p) => natByYear.set(p.anio, p));

  const baseNat2026 = natByYear.get(2026)?.matricula_real ?? 2815162;

  const nacionalPorAnio: ProyeccionCalibradaCache['nacionalPorAnio'] = {};
  const deptoPorAnio = {} as ProyeccionCalibradaCache['deptoPorAnio'];
  MP_KEYS_9.forEach((k) => {
    deptoPorAnio[k] = {};
  });

  const nivelNacionalPorAnio = {
    inicial: {},
    primaria: {},
    secundaria: {},
  } as ProyeccionCalibradaCache['nivelNacionalPorAnio'];
  const nivelDeptoPorAnio = {
    inicial: {},
    primaria: {},
    secundaria: {},
  } as ProyeccionCalibradaCache['nivelDeptoPorAnio'];
  (['inicial', 'primaria', 'secundaria'] as const).forEach((niv) => {
    MP_KEYS_9.forEach((k) => {
      nivelDeptoPorAnio[niv][k] = {};
    });
  });

  // Mapas rápidos por año para cada departamento
  const deptByYear = {} as Record<MpKey, Map<number, PuntoDemografico>>;
  MP_KEYS_9.forEach((k) => {
    const m = new Map<number, PuntoDemografico>();
    (deptMap[k] ?? []).forEach((p) => m.set(p.anio, p));
    deptByYear[k] = m;
  });

  const years = Array.from(natByYear.keys()).sort((a, b) => a - b);

  for (const yr of years) {
    const natPt = natByYear.get(yr)!;
    const natRealOrBase = natPt.matricula_real ?? natPt.modelo_consenso ?? natPt.modelo_arima ?? baseNat2026;
    const natArima = natPt.modelo_arima ?? natRealOrBase;
    const natHibrido = natPt.modelo_consenso ?? natRealOrBase;
    const natM2 = natPt.modelo_2_cobertura ?? natRealOrBase;

    nacionalPorAnio[yr] = {
      realOrBase: natRealOrBase,
      arima: natArima,
      hibrido: natHibrido,
      m2Cobertura: natM2,
    };

    if (yr < 2026) {
      MP_KEYS_9.forEach((k) => {
        const pt = deptByYear[k].get(yr);
        const val = pt?.matricula_real ?? 0;
        deptoPorAnio[k][yr] = { realOrBase: val, arima: val, hibrido: val, m2Cobertura: val };
      });
      continue;
    }

    if (yr === 2026) {
      MP_KEYS_9.forEach((k) => {
        const pt = deptByYear[k].get(2026);
        const val = pt?.matricula_real ?? 0;
        deptoPorAnio[k][2026] = { realOrBase: val, arima: val, hibrido: val, m2Cobertura: val };
      });
      continue;
    }

    // Años 2027..2034: calibrar M2, ARIMA e Híbrido para que los 9 deptos sumen exactamente la Serie Nacional
    const weightsM2 = MP_KEYS_9.map((k) => {
      const b26 = deptoPorAnio[k][2026]?.realOrBase ?? 0;
      return b26 * (natM2 / baseNat2026);
    });
    const weightsArima = MP_KEYS_9.map((k) => {
      const pt = deptByYear[k].get(yr);
      return pt?.modelo_arima ?? deptoPorAnio[k][2026]?.realOrBase ?? 0;
    });
    const weightsHibrido = MP_KEYS_9.map((_, idx) => 0.5 * weightsM2[idx] + 0.5 * weightsArima[idx]);

    const allocM2 = distributeInteger(Math.round(natM2), weightsM2);
    const allocArima = distributeInteger(Math.round(natArima), weightsArima);
    const allocHibrido = distributeInteger(Math.round(natHibrido), weightsHibrido);

    MP_KEYS_9.forEach((k, idx) => {
      deptoPorAnio[k][yr] = {
        realOrBase: allocHibrido[idx],
        arima: allocArima[idx],
        hibrido: allocHibrido[idx],
        m2Cobertura: allocM2[idx],
      };
    });
  }

  // Calibrar por Nivel (inicial, primaria, secundaria) × Departamento para cada año 2026..2034
  (['inicial', 'primaria', 'secundaria'] as const).forEach((niv) => {
    const nivByYear = new Map<number, PuntoDemografico>();
    (nivelMap[niv] ?? []).forEach((p) => nivByYear.set(p.anio, p));
    const baseNiv2026 = nivByYear.get(2026)?.matricula_real ?? 0;
    const shareNiv = baseNat2026 > 0 ? baseNiv2026 / baseNat2026 : 0;

    for (const yr of years) {
      const nPt = nivByYear.get(yr);
      const nRealOrBase = nPt?.matricula_real ?? nPt?.modelo_consenso ?? nPt?.modelo_arima ?? baseNiv2026;
      const nArima = nPt?.modelo_arima ?? nRealOrBase;
      const nHibrido = nPt?.modelo_consenso ?? nRealOrBase;
      const nM2 = nPt?.modelo_2_cobertura ?? nRealOrBase;

      nivelNacionalPorAnio[niv][yr] = {
        realOrBase: nRealOrBase,
        arima: nArima,
        hibrido: nHibrido,
        m2Cobertura: nM2,
      };

      if (yr <= 2026) {
        const wBase = MP_KEYS_9.map((k) => (deptoPorAnio[k][yr]?.realOrBase ?? 0) * shareNiv);
        const allocBase = distributeInteger(Math.round(nRealOrBase), wBase);
        MP_KEYS_9.forEach((k, idx) => {
          nivelDeptoPorAnio[niv][k][yr] = {
            realOrBase: allocBase[idx],
            arima: allocBase[idx],
            hibrido: allocBase[idx],
            m2Cobertura: allocBase[idx],
          };
        });
      } else {
        const natArimaRatio = nacionalPorAnio[yr].arima / baseNat2026;
        const natHibRatio = nacionalPorAnio[yr].hibrido / baseNat2026;
        const natM2Ratio = nacionalPorAnio[yr].m2Cobertura / baseNat2026;

        const wArima = MP_KEYS_9.map((k) => {
          const bDep = deptoPorAnio[k][2026]?.realOrBase ?? 0;
          const depRatio = bDep > 0 ? deptoPorAnio[k][yr].arima / bDep : 1;
          return bDep * shareNiv * (natArimaRatio > 0 ? depRatio / natArimaRatio : 1);
        });
        const wHibrido = MP_KEYS_9.map((k) => {
          const bDep = deptoPorAnio[k][2026]?.realOrBase ?? 0;
          const depRatio = bDep > 0 ? deptoPorAnio[k][yr].hibrido / bDep : 1;
          return bDep * shareNiv * (natHibRatio > 0 ? depRatio / natHibRatio : 1);
        });
        const wM2 = MP_KEYS_9.map((k) => {
          const bDep = deptoPorAnio[k][2026]?.realOrBase ?? 0;
          const depRatio = bDep > 0 ? deptoPorAnio[k][yr].m2Cobertura / bDep : 1;
          return bDep * shareNiv * (natM2Ratio > 0 ? depRatio / natM2Ratio : 1);
        });

        const aArima = distributeInteger(Math.round(nArima), wArima);
        const aHib = distributeInteger(Math.round(nHibrido), wHibrido);
        const aM2 = distributeInteger(Math.round(nM2), wM2);

        MP_KEYS_9.forEach((k, idx) => {
          nivelDeptoPorAnio[niv][k][yr] = {
            realOrBase: aHib[idx],
            arima: aArima[idx],
            hibrido: aHib[idx],
            m2Cobertura: aM2[idx],
          };
        });
      }
    }
  });

  cachedCalibracion = { nacionalPorAnio, deptoPorAnio, nivelNacionalPorAnio, nivelDeptoPorAnio };
  return cachedCalibracion;
}

/**
 * Retorna la variación porcentual acumulada desde 2026 hasta anioCorte
 * para un departamento ('CHUQUISACA', 'POTOSÍ', etc.) o 'TODOS' (Nacional),
 * opcionalmente desagregada por nivel ('INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'TECNICA' | 'ESPECIAL' | 'TODOS').
 */
export function getVariacionDemograficaPct(
  deptoOrTodos: string,
  anioCorte: number,
  modelo: 'hibrido' | 'arima' = 'hibrido',
  nivel: NivelDemografico = 'TODOS'
): number {
  const cal = getProyeccionDemograficaCalibrada();
  const mpNiv = NIVEL_TO_MP[nivel];

  if (deptoOrTodos === 'TODOS' || deptoOrTodos === 'todos') {
    const serie = mpNiv ? cal.nivelNacionalPorAnio[mpNiv] : cal.nacionalPorAnio;
    const b26 = serie[2026]?.realOrBase ?? 0;
    const target = modelo === 'hibrido' ? serie[anioCorte]?.hibrido : serie[anioCorte]?.arima;
    if (!b26 || !target) return 0;
    return Number((((target - b26) / b26) * 100).toFixed(2));
  }

  const normalized = deptoOrTodos.trim().toUpperCase();
  const mpKey = (DEPTO_KEY_MAP[normalized]?.mpKey ?? deptoOrTodos.toLowerCase()) as MpKey;
  const serie = mpNiv ? cal.nivelDeptoPorAnio[mpNiv]?.[mpKey] : cal.deptoPorAnio[mpKey];
  if (!serie) return 0;

  const b26 = serie[2026]?.realOrBase ?? 0;
  const target = modelo === 'hibrido' ? serie[anioCorte]?.hibrido : serie[anioCorte]?.arima;
  if (!b26 || !target) return 0;
  return Number((((target - b26) / b26) * 100).toFixed(2));
}

/**
 * Enriquece una serie de puntos departamentales para MatriculaEvolucionView
 * corrigiendo modelo_2_cobertura, modelo_arima y modelo_consenso (Consenso Híbrido).
 */
export function getSerieDepartamentalCalibrada(mpKey: string, rawPoints: PuntoDemografico[]): PuntoDemografico[] {
  const cal = getProyeccionDemograficaCalibrada();
  const deptCal = cal.deptoPorAnio[mpKey as MpKey];
  if (!deptCal) return rawPoints;

  return rawPoints.map((p) => {
    if (p.anio < 2026 || !deptCal[p.anio]) return p;
    const c = deptCal[p.anio];
    return {
      ...p,
      modelo_2_cobertura: c.m2Cobertura,
      modelo_arima: c.arima,
      modelo_consenso: c.hibrido,
    };
  });
}
