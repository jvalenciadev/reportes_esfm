'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import materiasCatalogoMapRaw from '@/data/materiasPorSubsistemaNivel.json';
import submateriasCatalogoRaw from '@/data/submateriasCatalogo.json';
import {
  GraduationCapIcon,
  CheckIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  AlertTriangleIcon,
  SaveIcon,
  PlusIcon,
} from '../ui/Icons';

const SUBSISTEMAS_DISPONIBLES = [
  'EDUCACIÓN REGULAR',
  'EDUCACIÓN ALTERNATIVA',
  'EDUCACIÓN ESPECIAL',
];

const SUBMATERIAS_SET = new Set<string>(
  (submateriasCatalogoRaw as string[]).map((s) => s.trim().toUpperCase())
);

const OPERADORES = [
  { value: '<=', label: '<= Menor o igual' },
  { value: '>=', label: '>= Mayor o igual' },
  { value: '<', label: '< Menor que' },
  { value: '>', label: '> Mayor que' },
  { value: '=', label: '= Exactamente' },
];

type Operador = '<=' | '>=' | '<' | '>' | '=';

export interface MateriaCondicion {
  materia: string;
  operador: Operador;
  horas: number;
}

export interface FiltroMateria {
  id?: number;
  especialidad_oficial_id: number;
  subsistemas: string[];
  niveles: string[];
  materias: string[];
  operador_carga: Operador | null;
  carga_especialidad: number | null;
  materias_condiciones: MateriaCondicion[];
  activo: boolean;
  descripcion: string;
  updated_at?: string;
}

type EditState = {
  id?: number;
  especialidad_oficial_id: number;
  subsistemas: string[];
  niveles: string[];
  materias: string[];
  operador_carga: Operador | null;
  carga_especialidad: number | null;
  materias_condiciones: MateriaCondicion[];
  activo: boolean;
  descripcion: string;
};

// Normaliza cualquier formato de subsistema al estándar del catálogo ('EDUCACIÓN REGULAR', 'EDUCACIÓN ALTERNATIVA', etc.)
function toCatalogSubsistema(sub?: string | null): string {
  if (!sub) return 'EDUCACIÓN REGULAR';
  const s = sub.trim().toUpperCase();
  if (s.includes('REGULAR')) return 'EDUCACIÓN REGULAR';
  if (s.includes('ALTERNATIVA')) return 'EDUCACIÓN ALTERNATIVA';
  if (s.includes('ESPECIAL')) return 'EDUCACIÓN ESPECIAL';
  return s;
}

// CASCADA: Niveles dependientes de subsistemas seleccionados
function getNivelesParaSubsistemas(subsistemas: string[]): string[] {
  const catalog = materiasCatalogoMapRaw as Record<string, string[]>;
  const nivelesSet = new Set<string>();
  const normalizedSubs = (subsistemas || []).map(toCatalogSubsistema);
  for (const key of Object.keys(catalog)) {
    const pipeIdx = key.indexOf('|');
    const sub = key.substring(0, pipeIdx);
    const nivel = key.substring(pipeIdx + 1);
    if (normalizedSubs.includes(sub)) nivelesSet.add(nivel);
  }
  return Array.from(nivelesSet).sort((a, b) => a.localeCompare(b));
}

// CASCADA: Materias dependientes de subsistemas y niveles seleccionados
function getMateriasParaCombo(subsistemas: string[], niveles: string[]): string[] {
  const catalog = materiasCatalogoMapRaw as Record<string, string[]>;
  const setMaterias = new Set<string>();
  const normalizedSubs = (subsistemas || []).map(toCatalogSubsistema);
  for (const s of normalizedSubs) {
    for (const n of (niveles || [])) {
      const lista = catalog[`${s.toUpperCase()}|${n.toUpperCase()}`] || [];
      lista.forEach((m) => setMaterias.add(m));
    }
  }
  return Array.from(setMaterias).sort((a, b) => a.localeCompare(b));
}

export function FiltrosMateriaManager() {
  const [filtros, setFiltros] = useState<FiltroMateria[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [espStatusFilter, setEspStatusFilter] = useState<'all' | 'configured' | 'pending'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingItem, setEditingItem] = useState<EditState | null>(null);
  const [materiaFilterSearch, setMateriaFilterSearch] = useState('');
  const [materiasTabFilter, setMateriasTabFilter] = useState<'all' | 'selected' | 'submateria' | 'with_condition'>('all');
  const [inputCustomMateria, setInputCustomMateria] = useState('');

  // Estado del mini-editor de condición individual por materia
  const [editingMateriaCondicion, setEditingMateriaCondicion] = useState<string | null>(null);
  const [tempOp, setTempOp] = useState<Operador>('>=');
  const [tempHoras, setTempHoras] = useState<number>(48);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resEsp, resFiltros] = await Promise.all([
        fetch('/api/filtros-materia?action=especialidades'),
        fetch('/api/filtros-materia'),
      ]);
      if (resEsp.ok) setEspecialidades(await resEsp.json() || []);
      if (resFiltros.ok) setFiltros(await resFiltros.json() || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionMessage]);

  const combinedList = useMemo(() =>
    especialidades.map((esp) => ({
      especialidad: esp,
      filtro: filtros.find((f) => f.especialidad_oficial_id === esp.id) || null,
    }))
  , [especialidades, filtros]);

  const configuredCount = useMemo(() =>
    combinedList.filter((i) => i.filtro && i.filtro.materias && i.filtro.materias.length > 0).length
  , [combinedList]);

  const pendingCount = useMemo(() =>
    combinedList.length - configuredCount
  , [combinedList, configuredCount]);

  const filteredList = useMemo(() => {
    let list = combinedList;
    if (espStatusFilter === 'configured') {
      list = list.filter((i) => i.filtro && i.filtro.materias && i.filtro.materias.length > 0);
    } else if (espStatusFilter === 'pending') {
      list = list.filter((i) => !i.filtro || !i.filtro.materias || i.filtro.materias.length === 0);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((i) => i.especialidad.nombre.toLowerCase().includes(q));
  }, [combinedList, searchTerm, espStatusFilter]);

  // CASCADA 1 & 2
  const nivelesDisponibles = useMemo(() => {
    if (!editingItem || editingItem.subsistemas.length === 0) return [];
    return getNivelesParaSubsistemas(editingItem.subsistemas);
  }, [editingItem?.subsistemas]);

  const materiasDisponibles = useMemo(() => {
    if (!editingItem) return [];
    const comboList = getMateriasParaCombo(editingItem.subsistemas, editingItem.niveles);
    const set = new Set(comboList);
    // Garantizar que las materias ya configuradas en el filtro siempre estén presentes en la lista
    if (editingItem.materias && editingItem.materias.length > 0) {
      editingItem.materias.forEach((m) => set.add(m));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [editingItem?.subsistemas, editingItem?.niveles, editingItem?.materias]);

  const submateriasCount = useMemo(() => {
    return materiasDisponibles.filter((m) => SUBMATERIAS_SET.has(m.trim().toUpperCase())).length;
  }, [materiasDisponibles]);

  const materiasFiltradas = useMemo(() => {
    let list = materiasDisponibles;
    if (materiasTabFilter === 'selected' && editingItem) {
      const set = new Set(editingItem.materias);
      list = materiasDisponibles.filter((m) => set.has(m));
      editingItem.materias.forEach((m) => {
        if (!list.includes(m)) list.push(m);
      });
      list.sort((a, b) => a.localeCompare(b));
    } else if (materiasTabFilter === 'submateria') {
      list = materiasDisponibles.filter((m) => SUBMATERIAS_SET.has(m.trim().toUpperCase()));
    } else if (materiasTabFilter === 'with_condition' && editingItem) {
      const set = new Set(editingItem.materias_condiciones.map((mc) => mc.materia));
      list = list.filter((m) => set.has(m));
    }
    if (!materiaFilterSearch.trim()) return list;
    const q = materiaFilterSearch.toLowerCase();
    return list.filter((m) => m.toLowerCase().includes(q));
  }, [materiasDisponibles, materiaFilterSearch, materiasTabFilter, editingItem]);

  const pasoActual = useMemo(() => {
    if (!editingItem) return 0;
    if (!editingItem.subsistemas.length) return 1;
    if (!editingItem.niveles.length) return 2;
    return 3;
  }, [editingItem?.subsistemas, editingItem?.niveles]);

  const condicionGlobalActiva = editingItem?.operador_carga !== null && editingItem?.carga_especialidad !== null;

  const handleOpenEdit = (esp: any, filtroExistente: FiltroMateria | null) => {
    const rawSubs = filtroExistente?.subsistemas && filtroExistente.subsistemas.length > 0
      ? filtroExistente.subsistemas.map(toCatalogSubsistema)
      : ['EDUCACIÓN REGULAR'];

    setEditingItem({
      id: filtroExistente?.id,
      especialidad_oficial_id: esp.id,
      subsistemas: rawSubs,
      niveles: filtroExistente?.niveles ? [...filtroExistente.niveles] : [],
      materias: filtroExistente?.materias ? [...filtroExistente.materias] : [],
      operador_carga: (filtroExistente?.operador_carga as Operador) ?? null,
      carga_especialidad: filtroExistente?.carga_especialidad ?? null,
      materias_condiciones: filtroExistente?.materias_condiciones ? [...filtroExistente.materias_condiciones] : [],
      activo: filtroExistente?.activo ?? true,
      descripcion: filtroExistente?.descripcion || '',
    });
    setMateriaFilterSearch('');
    setMateriasTabFilter('all');
    setInputCustomMateria('');
    setEditingMateriaCondicion(null);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/filtros-materia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al guardar');
      }
      const nombre = especialidades.find((e) => e.id === editingItem.especialidad_oficial_id)?.nombre;
      setActionMessage({ type: 'success', text: `Filtro de materias guardado para "${nombre}".` });
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar la configuración de materias para esta especialidad?')) return;
    const res = await fetch(`/api/filtros-materia?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setActionMessage({ type: 'success', text: 'Filtro eliminado correctamente.' });
      await loadData();
    }
  };

  const toggleMateria = (materia: string) => {
    if (!editingItem) return;
    const exists = editingItem.materias.includes(materia);
    const newMaterias = exists ? editingItem.materias.filter((m) => m !== materia) : [...editingItem.materias, materia];
    const newCondiciones = exists
      ? editingItem.materias_condiciones.filter((mc) => mc.materia !== materia)
      : editingItem.materias_condiciones;
    setEditingItem({ ...editingItem, materias: newMaterias, materias_condiciones: newCondiciones });
    if (editingMateriaCondicion === materia) setEditingMateriaCondicion(null);
  };

  const handleSelectAllVisible = () => {
    if (!editingItem) return;
    const set = new Set(editingItem.materias);
    materiasFiltradas.forEach((m) => set.add(m));
    setEditingItem({ ...editingItem, materias: Array.from(set) });
  };

  const handleDeselectAllVisible = () => {
    if (!editingItem) return;
    const toRemove = new Set(materiasFiltradas);
    const newMaterias = editingItem.materias.filter((m) => !toRemove.has(m));
    const newCondiciones = editingItem.materias_condiciones.filter((mc) => !toRemove.has(mc.materia));
    setEditingItem({ ...editingItem, materias: newMaterias, materias_condiciones: newCondiciones });
  };

  const handleClearAllMaterias = () => {
    if (!editingItem || editingItem.materias.length === 0) return;
    if (!confirm(`¿Desmarcar todas las ${editingItem.materias.length} materias?`)) return;
    setEditingItem({ ...editingItem, materias: [], materias_condiciones: [] });
    setEditingMateriaCondicion(null);
  };

  const handleAddCustomMateria = () => {
    const val = inputCustomMateria.trim().toUpperCase();
    if (!val || !editingItem || editingItem.materias.includes(val)) {
      setInputCustomMateria('');
      return;
    }
    setEditingItem({ ...editingItem, materias: [...editingItem.materias, val] });
    setInputCustomMateria('');
  };

  const toggleSubsistema = (sub: string) => {
    if (!editingItem) return;
    const catSub = toCatalogSubsistema(sub);
    const exists = editingItem.subsistemas.some((s) => toCatalogSubsistema(s) === catSub);
    const newSubs = exists
      ? editingItem.subsistemas.filter((s) => toCatalogSubsistema(s) !== catSub)
      : [...editingItem.subsistemas.map(toCatalogSubsistema), catSub];
    const nivelesValidos = new Set(getNivelesParaSubsistemas(newSubs));
    const newNiveles = editingItem.niveles.filter((n) => nivelesValidos.has(n));
    setEditingItem({ ...editingItem, subsistemas: newSubs, niveles: newNiveles });
  };

  const toggleNivel = (niv: string) => {
    if (!editingItem) return;
    const exists = editingItem.niveles.includes(niv);
    setEditingItem({
      ...editingItem,
      niveles: exists ? editingItem.niveles.filter((n) => n !== niv) : [...editingItem.niveles, niv],
    });
  };

  // Condición por materia
  const getCondicionMateria = (materia: string): MateriaCondicion | null =>
    editingItem?.materias_condiciones.find((mc) => mc.materia === materia) || null;

  const openMateriaCondicionEditor = (materia: string) => {
    const existing = getCondicionMateria(materia);
    setTempOp(existing?.operador || '>=');
    setTempHoras(existing?.horas || 48);
    setEditingMateriaCondicion(materia);
  };

  const saveMateriaCondicion = () => {
    if (!editingItem || !editingMateriaCondicion) return;
    const nuevasCondiciones = editingItem.materias_condiciones.filter((mc) => mc.materia !== editingMateriaCondicion);
    nuevasCondiciones.push({ materia: editingMateriaCondicion, operador: tempOp, horas: tempHoras });
    setEditingItem({ ...editingItem, materias_condiciones: nuevasCondiciones });
    setEditingMateriaCondicion(null);
  };

  const removeMateriaCondicion = (materia: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      materias_condiciones: editingItem.materias_condiciones.filter((mc) => mc.materia !== materia),
    });
    if (editingMateriaCondicion === materia) setEditingMateriaCondicion(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast de acción */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === 'success' ? (
              <CheckIcon className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangleIcon className="w-4 h-4 text-red-600" />
            )}
            {actionMessage.text}
          </div>
          <button onClick={() => setActionMessage(null)}>
            <XIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GraduationCapIcon className="w-5 h-5 text-indigo-600" />
            CRUD de Filtros por Materia Curricular (22 Especialidades)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Flujo en cascada: <strong>① Subsistema</strong> → <strong>② Nivel</strong> → <strong>③ Materias Curriculares</strong> → Condición de horas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setEspStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                espStatusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({combinedList.length})
            </button>
            <button
              onClick={() => setEspStatusFilter('configured')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                espStatusFilter === 'configured'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              Configuradas ({configuredCount})
            </button>
            <button
              onClick={() => setEspStatusFilter('pending')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                espStatusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Buscar especialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Grid de Especialidades */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Cargando catálogo de especialidades...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredList.map(({ especialidad, filtro }) => {
            const hasFiltro = Boolean(filtro && filtro.materias && filtro.materias.length > 0);
            const subsistemas = filtro?.subsistemas || [];
            const niveles = filtro?.niveles || [];
            const materias = filtro?.materias || [];
            const materiasCondiciones = filtro?.materias_condiciones || [];
            const operador = filtro?.operador_carga;
            const carga = filtro?.carga_especialidad;
            const activo = filtro?.activo ?? true;

            const tieneCondGlobal = operador !== null && operador !== undefined && carga !== null && carga !== undefined;
            const tieneCondPorMateria = materiasCondiciones.length > 0;

            return (
              <div
                key={especialidad.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all hover:shadow-sm ${
                  hasFiltro ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold shrink-0">
                      {especialidad.id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{especialidad.nombre}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {tieneCondGlobal ? (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Global: {operador} {carga} hrs
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Sin restricción global
                          </span>
                        )}
                        {tieneCondPorMateria && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {materiasCondiciones.length} excepción(es) por materia
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(especialidad, filtro)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      {hasFiltro ? 'Editar' : 'Configurar'}
                    </button>
                    {hasFiltro && filtro?.id && (
                      <button
                        onClick={() => handleDelete(filtro.id!)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar filtro"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">Subsistemas:</span>
                    <div className="flex flex-wrap gap-1">
                      {subsistemas.length > 0 ? (
                        subsistemas.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[10px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin configurar</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">Niveles ({niveles.length}):</span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {niveles.length > 0 ? (
                        niveles.map((n) => (
                          <span key={n} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px]">
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin configurar</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">
                      Materias Curriculares ({materias.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {materias.length > 0 ? (
                        materias.map((m) => {
                          const condMat = materiasCondiciones.find((mc) => mc.materia === m);
                          return (
                            <span
                              key={m}
                              className={`px-2 py-0.5 rounded border font-mono text-[10px] ${
                                condMat
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {m}
                              {condMat ? ` (${condMat.operador}${condMat.horas})` : ''}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Ninguna materia seleccionada</span>
                      )}
                    </div>
                  </div>

                  {filtro?.descripcion && (
                    <div className="text-[11px] text-slate-500 italic">&quot;{filtro.descripcion}&quot;</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL / DRAWER DE CONFIGURACIÓN EN CASCADA                    */}
      {/* ============================================================ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Configuración Curricular en Cascada
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {especialidades.find((e) => e.id === editingItem.especialidad_oficial_id)?.nombre}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Progreso de Pasos */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              {[
                { paso: 1, label: 'Subsistema', done: editingItem.subsistemas.length > 0 },
                { paso: 2, label: 'Nivel', done: editingItem.niveles.length > 0 },
                { paso: 3, label: 'Materias', done: editingItem.materias.length > 0 },
                { paso: 4, label: 'Condición', done: true },
              ].map(({ paso, label, done }, i) => (
                <React.Fragment key={paso}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        done
                          ? 'bg-emerald-500 text-white'
                          : pasoActual === paso
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {done ? '✓' : paso}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        done
                          ? 'text-emerald-700'
                          : pasoActual === paso
                          ? 'text-indigo-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 3 && <span className="text-slate-300 text-xs">→</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Cuerpo del Editor */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* PASO 1: SUBSISTEMA */}
              <div
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  pasoActual === 1
                    ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        editingItem.subsistemas.length > 0 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {editingItem.subsistemas.length > 0 ? '✓' : '1'}
                    </span>
                    Selecciona Subsistema(s):
                  </label>
                  <span className="text-[11px] text-slate-500">{editingItem.subsistemas.length} sel.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBSISTEMAS_DISPONIBLES.map((sub) => {
                    const sel = editingItem.subsistemas.some((s) => toCatalogSubsistema(s) === sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubsistema(sub)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1.5 transition-colors ${
                          sel
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sel && <CheckIcon className="w-3.5 h-3.5" />}
                        {sub}
                      </button>
                    );
                  })}
                </div>
                {editingItem.subsistemas.length === 0 && (
                  <p className="text-[11px] text-blue-700 font-medium">⚠ Selecciona al menos un subsistema.</p>
                )}
              </div>

              {/* PASO 2: NIVEL */}
              <div
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  editingItem.subsistemas.length === 0
                    ? 'opacity-40 pointer-events-none border-slate-200 bg-slate-50/30'
                    : pasoActual === 2
                    ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-200'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        editingItem.niveles.length > 0
                          ? 'bg-emerald-500 text-white'
                          : editingItem.subsistemas.length > 0
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-300 text-slate-500'
                      }`}
                    >
                      {editingItem.niveles.length > 0 ? '✓' : '2'}
                    </span>
                    Selecciona Nivel(es):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {editingItem.niveles.length} / {nivelesDisponibles.length} disp.
                  </span>
                </div>
                {nivelesDisponibles.length === 0 ? (
                  <p className="text-[11px] text-amber-700 italic">Selecciona un subsistema primero.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                    {nivelesDisponibles.map((niv) => {
                      const sel = editingItem.niveles.includes(niv);
                      return (
                        <button
                          key={niv}
                          type="button"
                          onClick={() => toggleNivel(niv)}
                          className={`p-2 rounded text-left border flex items-center justify-between text-xs transition-colors ${
                            sel
                              ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="break-words whitespace-normal leading-snug">{niv}</span>
                          {sel && <CheckIcon className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PASO 3: MATERIAS CURRICULARES */}
              <div
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  editingItem.niveles.length === 0
                    ? 'opacity-40 pointer-events-none border-slate-200 bg-slate-50/30'
                    : pasoActual === 3
                    ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        editingItem.materias.length > 0
                          ? 'bg-emerald-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {editingItem.materias.length > 0 ? '✓' : '3'}
                    </span>
                    Selecciona Materias Curriculares:
                  </label>
                  <span className="text-[11px] font-bold text-indigo-700">
                    {editingItem.materias.length} seleccionada(s)
                  </span>
                </div>

                {/* Filtros internos de materias */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar materia en catálogo..."
                      value={materiaFilterSearch}
                      onChange={(e) => setMateriaFilterSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMateriasTabFilter('all')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded ${
                        materiasTabFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Todas ({materiasDisponibles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMateriasTabFilter('submateria')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded ${
                        materiasTabFilter === 'submateria' ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      Submaterias ({submateriasCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMateriasTabFilter('selected')}
                      className={`px-2 py-1 text-[11px] font-semibold rounded ${
                        materiasTabFilter === 'selected' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Sel. ({editingItem.materias.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700"
                    >
                      Marcar Visibles
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllVisible}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700"
                    >
                      Desmarcar
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllMaterias}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-rose-200 rounded hover:bg-rose-50 text-rose-600"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Materia personalizada */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="O agrega una materia personalizada (ej: ROBÓTICA INDUSTRIAL)..."
                    value={inputCustomMateria}
                    onChange={(e) => setInputCustomMateria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomMateria();
                      }
                    }}
                    className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMateria}
                    disabled={!inputCustomMateria.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-xs flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                </div>

                {/* Catálogo de Materias */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 sm:max-h-80 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                  {materiasFiltradas.length === 0 ? (
                    <div className="col-span-2 text-center text-slate-400 py-6 italic text-xs">
                      No se encontraron materias con los filtros actuales.
                    </div>
                  ) : (
                    materiasFiltradas.map((mat) => {
                      const sel = editingItem.materias.includes(mat);
                      const condMat = getCondicionMateria(mat);
                      return (
                        <div
                          key={mat}
                          className={`p-2 rounded-lg border flex items-start justify-between gap-2 text-xs transition-colors ${
                            sel
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleMateria(mat)}
                            className="flex items-start gap-2 flex-1 text-left min-w-0"
                            title={mat}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                                sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {sel && <CheckIcon className="w-3 h-3" />}
                            </span>
                            <span className="font-mono text-[11px] break-words whitespace-normal leading-snug flex-1">
                              {mat}
                            </span>
                            {SUBMATERIAS_SET.has(mat.trim().toUpperCase()) && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold tracking-wide shrink-0 self-start mt-0.5">
                                Submateria
                              </span>
                            )}
                          </button>

                          {sel && (
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              {condMat ? (
                                <button
                                  type="button"
                                  onClick={() => openMateriaCondicionEditor(mat)}
                                  className="px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900 font-mono text-[10px]"
                                >
                                  {condMat.operador} {condMat.horas}h
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openMateriaCondicionEditor(mat)}
                                  className="text-[10px] text-slate-400 hover:text-indigo-600 underline"
                                >
                                  + Condición
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PASO 4: RESTRICCIÓN DE CARGA HORARIA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-700 text-white">
                      4
                    </span>
                    Restricción de Horas (Opcional):
                  </label>
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={condicionGlobalActiva}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingItem({ ...editingItem, operador_carga: '>=', carga_especialidad: 48 });
                        } else {
                          setEditingItem({ ...editingItem, operador_carga: null, carga_especialidad: null });
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Activar restricción global
                  </label>
                </div>

                {condicionGlobalActiva && (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-600 font-medium">Contabilizar solo si Carga:</span>
                    <select
                      value={editingItem.operador_carga || '>='}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, operador_carga: e.target.value as Operador })
                      }
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      {OPERADORES.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editingItem.carga_especialidad ?? 48}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, carga_especialidad: Number(e.target.value) })
                      }
                      className="w-20 text-xs border border-slate-300 rounded px-2 py-1"
                    />
                    <span className="text-slate-500 text-[11px]">horas</span>
                  </div>
                )}

                {/* Descripción y Activo */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200">
                  <div className="sm:col-span-9 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Descripción / Justificación:</label>
                    <input
                      type="text"
                      placeholder="Ej: Materias de formación técnica BTH..."
                      value={editingItem.descripcion}
                      onChange={(e) => setEditingItem({ ...editingItem, descripcion: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-end">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pb-1.5">
                      <input
                        type="checkbox"
                        checked={editingItem.activo}
                        onChange={(e) => setEditingItem({ ...editingItem, activo: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Filtro Activo
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || editingItem.materias.length === 0}
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
              >
                <SaveIcon className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Filtro de Materias'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-Modal de Condición Individual por Materia */}
      {editingMateriaCondicion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-5 w-full max-w-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Condición Específica</span>
              <h4 className="text-sm font-bold text-slate-900 font-mono mt-0.5 break-words whitespace-normal">{editingMateriaCondicion}</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-600 font-medium">Contabilizar solo si horas trabajadas son:</label>
              <div className="flex items-center gap-2">
                <select
                  value={tempOp}
                  onChange={(e) => setTempOp(e.target.value as Operador)}
                  className="text-xs border border-slate-300 rounded px-2 py-1.5 flex-1 bg-white"
                >
                  {OPERADORES.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={tempHoras}
                  onChange={(e) => setTempHoras(Number(e.target.value))}
                  className="w-20 text-xs border border-slate-300 rounded px-2 py-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => removeMateriaCondicion(editingMateriaCondicion)}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Eliminar condición
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMateriaCondicion(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveMateriaCondicion}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
