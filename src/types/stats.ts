export type SourceTab = 'proyecciones' | 'dgfm' | 'ine' | 'sie' | 'seie' | 'uie' | 'historial' | 'exposicion';

export interface Departamento {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Especialidad {
  id: number;
  nombre: string;
}

export interface Esfm {
  id: number;
  nombre: string;
}

export interface InscritoEsfm {
  id: number;
  gestion: number;
  departamento_id: number;
  esfm_id: number;
  especialidad_id: number;
  modalidad: string;
  total_inscritos: number;
  departamentos?: { nombre: string };
  esfm?: { nombre: string };
  especialidades?: { nombre: string };
}

export interface IneMatricula {
  id: number;
  departamento_id: number;
  tipo: string;
  nivel: string;
  cantidad: number;
  anio: number;
  departamentos?: { nombre: string };
}

export interface InePoblacion {
  id: number;
  anio: number;
  poblacion: number;
}

export interface IneProyeccionEdad {
  id: number;
  edad: number;
  cantidad: number;
  anio: number;
  departamento_id: number | null;
  departamentos?: { nombre: string };
}

export interface MatriculaRuralUrbana {
  id: number;
  area: string;
  cantidad: number;
  anio: number;
}

export interface SieTotalEstudiantes {
  id: number;
  departamento_id: number;
  dependencia: string;
  cantidad: number;
  nivel: number;
  nivel_texto: string;
  departamentos?: { nombre: string };
}

export interface DiscapacidadSeie {
  id: number;
  area: string;
  cantidad_est: number;
  anio: number;
}

export interface SeieDiscapacidadDependencia {
  id: number;
  departamento_id: number;
  dependencia: string;
  cantidad: number;
  anio: number;
  departamentos?: { nombre: string };
}

export interface SeieDiscapacidadArea {
  id: number;
  departamento_id: number;
  area: string;
  cantidad: number;
  anio: number;
  departamentos?: { nombre: string };
}

export interface SieDiscapacidad2026 {
  id: number;
  departamento_id: number;
  dependencia: string;
  tipo_discapacidad: string;
  cantidad: number;
  anio: number;
  departamentos?: { nombre: string };
}

export interface UieDeficitHoras {
  id: number;
  gestion: number;
  departamento_id: number;
  departamento: string;
  dependencia: string;
  subsistema: string;
  nivel: string;
  cargo: string;
  horas_trabajadas: number;
  horas_planilla: number;
  deficit_horas: number;
  departamentos?: { nombre: string };
}

export interface UnidadEducativa {
  cod_ue: number;
  unidad_educativa: string;
  departamento_id: number;
  departamento: string;
  dependencia: 'FISCAL' | 'CONVENIO' | 'COMUNITARIA' | string;
  created_at?: string;
}

export interface SieUnidadEducativa {
  id?: number;
  cod_ue: number;
  departamento_id: number;
  departamento: string;
  unidad_educativa: string;
  dependencia: 'FISCAL' | 'CONVENIO' | 'COMUNITARIA' | string;
  subsistema: string;
  nivel: string;
  nro_estudiantes: number;
  total_paralelos: number;
  carga_horaria: number;
  horas_planilla: number;
  deficit_horas?: number;
  created_at?: string;
}

export interface ResumenUnidadEducativa {
  cod_ue: number;
  unidad_educativa: string;
  departamento_id: number;
  departamento: string;
  dependencia: string;
  registros_items: number;
  total_estudiantes: number;
  total_paralelos: number;
  total_carga_horaria: number;
  total_horas_planilla: number;
  total_deficit_horas: number;
  items_deficit_88h: number;
}

export interface CargoCondicion {
  cargo: string;
  operador: '<=' | '>=' | '<' | '>' | '=';
  horas: number;
}

export interface FiltroEspecialidad {
  id?: number;
  especialidad_oficial_id: number;
  subsistemas: string[];
  niveles: string[];
  cargos: string[];
  operador_carga: '<=' | '>=' | '<' | '>' | '=' | null;
  carga_especialidad: number | null;
  cargos_condiciones: CargoCondicion[];
  activo?: boolean;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
  especialidades_oficiales?: {
    id: number;
    nombre: string;
  };
}

export interface DashboardDataset {
  departamentos: Departamento[];
  especialidades: Especialidad[];
  esfm: Esfm[];
  inscritos_esfm: InscritoEsfm[];
  ine_matricula: IneMatricula[];
  ine_poblacion: InePoblacion[];
  ine_proyeccion_edad: IneProyeccionEdad[];
  matricula_rural_urbana: MatriculaRuralUrbana[];
  sie_total_estudiantes: SieTotalEstudiantes[];
  discapacidad_seie: DiscapacidadSeie[];
  seie_discapacidad_dependencia: SeieDiscapacidadDependencia[];
  seie_discapacidad_area: SeieDiscapacidadArea[];
  sie_discapacidad_2026: SieDiscapacidad2026[];
  uie_deficit_horas?: UieDeficitHoras[];
  unidades_educativas?: UnidadEducativa[];
  sie_unidades_educativas?: SieUnidadEducativa[];
}

