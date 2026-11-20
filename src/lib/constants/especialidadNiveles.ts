export type NivelCodigo = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'TECNICA' | 'ESPECIAL';

export interface NivelInfo {
  nivelCodigo: NivelCodigo;
  nivelNombre: string;
  ordenJerarquia: number; // 1: Inicial, 2: Primaria, 3: Secundaria, 4: Técnica, 5: Especial
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

export const NIVELES_CONFIG: Record<NivelCodigo, NivelInfo> = {
  INICIAL: {
    nivelCodigo: 'INICIAL',
    nivelNombre: 'Educación Inicial',
    ordenJerarquia: 1,
    badgeColor: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200',
    },
  },
  PRIMARIA: {
    nivelCodigo: 'PRIMARIA',
    nivelNombre: 'Educación Primaria',
    ordenJerarquia: 2,
    badgeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
  },
  SECUNDARIA: {
    nivelCodigo: 'SECUNDARIA',
    nivelNombre: 'Educación Secundaria',
    ordenJerarquia: 3,
    badgeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  },
  TECNICA: {
    nivelCodigo: 'TECNICA',
    nivelNombre: 'Técnica Tecnológica',
    ordenJerarquia: 4,
    badgeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
  },
  ESPECIAL: {
    nivelCodigo: 'ESPECIAL',
    nivelNombre: 'Educación Especial',
    ordenJerarquia: 5,
    badgeColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
  },
};

export function getNivelEspecialidad(id: number, nombre?: string): NivelInfo {
  const n = (nombre || '').toUpperCase().trim();

  // 1. Inicial
  if (id === 5 || n.includes('INICIAL')) {
    return NIVELES_CONFIG.INICIAL;
  }

  // 2. Primaria
  if (id === 2 || n.includes('PRIMARIA')) {
    return NIVELES_CONFIG.PRIMARIA;
  }

  // 5. Especial
  if (id === 19 || n.includes('ESPECIAL') || n.includes('DISCAPACIDAD')) {
    return NIVELES_CONFIG.ESPECIAL;
  }

  // 4. Técnica Tecnológica (BTH)
  const isTecnica =
    [7, 13, 14, 15, 16, 18, 21, 22].includes(id) ||
    n.includes('AGROPECUARIA') ||
    n.includes('ALIMENTOS') ||
    n.includes('GASTRONOM') ||
    n.includes('ELECTRICIDAD') ||
    n.includes('ELECTRÓNICA') ||
    n.includes('ELECTRONICA') ||
    n.includes('MECÁNICA') ||
    n.includes('MECANICA') ||
    n.includes('ELECTROMEC') ||
    n.includes('TEXTIL') ||
    n.includes('CARPINTER') ||
    n.includes('TÉCNICA') ||
    n.includes('TECNICA');

  if (isTecnica) {
    return NIVELES_CONFIG.TECNICA;
  }

  // 3. Secundaria (Humanística / Campos de saberes)
  return NIVELES_CONFIG.SECUNDARIA;
}

export function sortEspecialidadesPorNivel<T extends { id?: number; especialidad_id?: number; nombre?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const idA = a.id ?? a.especialidad_id ?? 0;
    const idB = b.id ?? b.especialidad_id ?? 0;
    const infoA = getNivelEspecialidad(idA, a.nombre);
    const infoB = getNivelEspecialidad(idB, b.nombre);

    if (infoA.ordenJerarquia !== infoB.ordenJerarquia) {
      return infoA.ordenJerarquia - infoB.ordenJerarquia;
    }
    return (a.nombre || '').localeCompare(b.nombre || '');
  });
}
