import egresadosProyeccionData from '@/data/egresados_esfm_proyeccion.json';
import migracionData from '@/data/migracion_estudiantes.json';

const DEPARTAMENTOS_LIST = [
  'BENI',
  'CHUQUISACA',
  'COCHABAMBA',
  'LA PAZ',
  'ORURO',
  'PANDO',
  'POTOSI',
  'SANTA CRUZ',
  'TARIJA'
];

const normDeptoKey = (dep: string) => (dep === 'POTOSI' ? 'POTOSÍ' : dep);

// Algoritmo Largest Remainder (Hamilton) para reparto entero sin pérdida por redondeo
export function distributeInteger(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW === 0) return new Array(weights.length).fill(0);
  const floats = weights.map((w) => (w / sumW) * total);
  const floors = floats.map((f) => Math.floor(f));
  let currentSum = floors.reduce((a, b) => a + b, 0);
  const remainder = total - currentSum;
  const diffs = floats.map((f, i) => ({ idx: i, diff: f - floors[i] }));
  diffs.sort((a, b) => b.diff - a.diff);
  for (let k = 0; k < remainder; k++) {
    floors[diffs[k].idx] += 1;
  }
  return floors;
}

export interface EgresadosDistribucionExacta {
  // [esp_id][depto] -> egresados asignados
  porEspecialidadYDeptoRadicacion: Record<number, Record<string, number>>;
  porEspecialidadYDeptoBolsa: Record<number, Record<string, number>>;
  // [esp_id] -> total nacional
  nacionalPorEspecialidad: Record<number, number>;
  totalNacionalGlobal: number;
}

export function computeDistribucionExactaEgresados(
  factorTit: number,
  especialidadesRaw: Array<{
    especialidad_id: number;
    nacional: { deficit_materia: number };
    por_departamento: Record<string, { deficit_materia: number }>;
  }>
): EgresadosDistribucionExacta {
  const TOTAL_INSCRITOS_GLOBAL = 17597;
  const totalNacionalGlobal = Math.round(TOTAL_INSCRITOS_GLOBAL * (factorTit / 100));

  const cohorteEsps = egresadosProyeccionData.especialidades as Array<{
    especialidad_id: number;
    total_inscritos_2022_2026: number;
    por_dpto: Record<string, number>;
  }>;

  // Mapa de inscritos por carrera y depto: [esp_id][depto]
  const I: Record<number, Record<string, number>> = {};
  cohorteEsps.forEach((esp) => {
    I[esp.especialidad_id] = {};
    DEPARTAMENTOS_LIST.forEach((dep) => {
      I[esp.especialidad_id][dep] = esp.por_dpto[normDeptoKey(dep)] || 0;
    });
  });

  // 1. Repartir totalNacionalGlobal a las carreras de forma exacta
  const weightsEsp = cohorteEsps.map((esp) => esp.total_inscritos_2022_2026);
  const nacPorEspArray = distributeInteger(totalNacionalGlobal, weightsEsp);

  const nacionalPorEspecialidad: Record<number, number> = {};
  cohorteEsps.forEach((esp, idx) => {
    nacionalPorEspecialidad[esp.especialidad_id] = nacPorEspArray[idx];
  });

  const P = migracionData.matriz_transicion_probabilidades as Record<string, Record<string, number>>;

  const porEspecialidadYDeptoRadicacion: Record<number, Record<string, number>> = {};
  const porEspecialidadYDeptoBolsa: Record<number, Record<string, number>> = {};

  especialidadesRaw.forEach((esp) => {
    const totalEsp = nacionalPorEspecialidad[esp.especialidad_id] || 0;
    porEspecialidadYDeptoRadicacion[esp.especialidad_id] = {};
    porEspecialidadYDeptoBolsa[esp.especialidad_id] = {};

    // A. Bolsa Nacional (según déficit de la especialidad en cada depto)
    const defWeights = DEPARTAMENTOS_LIST.map(
      (dep) => esp.por_departamento[dep]?.deficit_materia || 0
    );
    const hasDef = defWeights.some((w) => w > 0);
    const bWeights = hasDef
      ? defWeights
      : DEPARTAMENTOS_LIST.map((dep) => I[esp.especialidad_id]?.[dep] || 0);

    const bAlloc = distributeInteger(totalEsp, bWeights);
    DEPARTAMENTOS_LIST.forEach((dep, idx) => {
      porEspecialidadYDeptoBolsa[esp.especialidad_id][dep] = bAlloc[idx];
    });

    // B. Radicación Real (según producto matricial I(orig) * P(orig -> dest))
    const rWeights = DEPARTAMENTOS_LIST.map((dest) => {
      let sumDest = 0;
      DEPARTAMENTOS_LIST.forEach((orig) => {
        const inscOrig = I[esp.especialidad_id]?.[orig] || 0;
        const prob = P[orig] && P[orig][dest] ? P[orig][dest] / 100 : 0;
        sumDest += inscOrig * prob;
      });
      return sumDest;
    });

    const rAlloc = distributeInteger(totalEsp, rWeights);
    DEPARTAMENTOS_LIST.forEach((dep, idx) => {
      porEspecialidadYDeptoRadicacion[esp.especialidad_id][dep] = rAlloc[idx];
    });
  });

  return {
    porEspecialidadYDeptoRadicacion,
    porEspecialidadYDeptoBolsa,
    nacionalPorEspecialidad,
    totalNacionalGlobal
  };
}
