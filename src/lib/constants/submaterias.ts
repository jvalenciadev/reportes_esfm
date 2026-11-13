// Mapa de relación técnica entre especialidades oficiales (1..22) y sub-materias de Técnica Tecnológica
export const ESPECIALIDAD_SUBMATERIAS_MAP: Record<number, string[]> = {
  3: ['Instrumento Musical: Viento', 'Instrumento Musical: Cuerda'],
  7: ['Gastronomía', 'Transformación de Alimentos'],
  13: ['Agropecuaria'],
  14: ['Electricidad Industrial', 'Electrónica'],
  15: ['Mecánica Automotriz'],
  16: ['Electromecánica'],
  17: ['Traductor e Intérprete de Lengua Extranjera: Ingles'],
  18: ['Textiles y Confecciones'],
  21: ['Carpintería en Madera y Metal'],
  22: ['Mecánica Industrial'],
};

export const GENERIC_TECNICA_MATERIAS = [
  'TÉCNICA TECNOLÓGICA',
  'TÉCNICA TECNOLÓGICA GENERAL',
  'TÉCNICA TECNOLÓGICA ESPECIALIZADA',
];

