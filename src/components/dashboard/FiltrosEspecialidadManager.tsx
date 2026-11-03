'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiltroEspecialidad, CargoCondicion } from '@/types/stats';
import cargosCatalogoMapRaw from '@/data/cargosPorSubsistemaNivel.json';
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

const NIVELES_DISPONIBLES = [
  'INICIAL',
  'PRIMARIA',
  'SECUNDARIA',
  'SECUNDARIA (BTH)',
  'EPA',
  'ESA',
  'ETA',
  'INTELECTUAL',
  'AUDITIVA',
  'VISUAL',
  'FISICA MOTORA',
  'DIFICULTADES EN EL APRENDIZAJE',
  'TRASTORNO DEL ESPECTRO AUTISTA',
  'TALENTO EXTRAORDINARIO',
  'MENTAL-PSIQUICA',
  'PROGRAMA DE EDUCACION SOCIO COMUNITARIA EN CASA PARA PERSONAS CON DISCAPACIDAD GRAVE Y MUY GRAVE (MAESTRO RESPONSABLE)',
  'PROGRAMA DE EDUCACION SOCIO COMUNITARIA EN CASA PARA PERSONAS CON DISCAPACIDAD GRAVE Y MUY GRAVE (MAESTRO VOLUNTARIO)',
];

const OPERADORES = [
  { value: '<=', label: '<= Menor o igual' },
  { value: '>=', label: '>= Mayor o igual' },
  { value: '<', label: '< Menor que' },
  { value: '>', label: '> Mayor que' },
  { value: '=', label: '= Exactamente' },
];

type Operador = '<=' | '>=' | '<' | '>' | '=';

type EditState = {
  id?: number;
  especialidad_oficial_id: number;
  subsistemas: string[];
  niveles: string[];
  cargos: string[];
  operador_carga: Operador | null;
  carga_especialidad: number | null;
  cargos_condiciones: CargoCondicion[];
  activo: boolean;
  descripcion: string;
};

function getNivelesParaSubsistemas(subsistemas: string[]): string[] {
  const catalog = cargosCatalogoMapRaw as Record<string, string[]>;
  const nivelesSet = new Set<string>();
  for (const key of Object.keys(catalog)) {
    const pipeIdx = key.indexOf('|');
    const sub = key.substring(0, pipeIdx);
    const nivel = key.substring(pipeIdx + 1);
    if (subsistemas.includes(sub)) nivelesSet.add(nivel);
  }
  return NIVELES_DISPONIBLES.filter((n) => nivelesSet.has(n));
}

function getCargosParaCombo(subsistemas: string[], niveles: string[]): string[] {
  const catalog = cargosCatalogoMapRaw as Record<string, string[]>;
  const setCargos = new Set<string>();
  for (const s of subsistemas) {
    for (const n of niveles) {
      const lista = catalog[`${s.toUpperCase()}|${n.toUpperCase()}`] || [];
      lista.forEach((c) => setCargos.add(c));
    }
  }
  return Array.from(setCargos).sort((a, b) => a.localeCompare(b));
}

function labelCondicion(op: Operador | null, horas: number | null): string {
  if (op === null || horas === null) return 'Sin restricción';
  return `${op} ${horas} hrs`;
}

export function FiltrosEspecialidadManager() {
  const [filtros, setFiltros] = useState<FiltroEspecialidad[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [espStatusFilter, setEspStatusFilter] = useState<'all' | 'configured' | 'pending'>('all');
  const [notReadyError, setNotReadyError] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingItem, setEditingItem] = useState<EditState | null>(null);
  const [cargoFilterSearch, setCargoFilterSearch] = useState('');
  const [cargosTabFilter, setCargosTabFilter] = useState<'all' | 'selected' | 'with_condition'>('all');
  const [inputCustomCargo, setInputCustomCargo] = useState('');

  // Estado del mini-editor de condición individual por cargo
  const [editingCargoCondicion, setEditingCargoCondicion] = useState<string | null>(null); // cargo name
  const [tempOp, setTempOp] = useState<Operador>('>=');
  const [tempHoras, setTempHoras] = useState<number>(48);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotReadyError(false);
    try {
      const [resEsp, resFiltros] = await Promise.all([
        fetch('/api/filtros-especialidad?action=especialidades'),
        fetch('/api/filtros-especialidad'),
      ]);
      if (resEsp.ok) setEspecialidades(await resEsp.json() || []);
      if (resFiltros.ok) {
        setFiltros(await resFiltros.json() || []);
      } else {
        const err = await resFiltros.json();
        if (err.notReady) setNotReadyError(true);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
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
    combinedList.filter((i) => i.filtro && i.filtro.cargos && i.filtro.cargos.length > 0).length
  , [combinedList]);

  const pendingCount = useMemo(() =>
    combinedList.length - configuredCount
  , [combinedList, configuredCount]);

  const filteredList = useMemo(() => {
    let list = combinedList;
    if (espStatusFilter === 'configured') {
      list = list.filter((i) => i.filtro && i.filtro.cargos && i.filtro.cargos.length > 0);
    } else if (espStatusFilter === 'pending') {
      list = list.filter((i) => !i.filtro || !i.filtro.cargos || i.filtro.cargos.length === 0);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((i) => i.especialidad.nombre.toLowerCase().includes(q));
  }, [combinedList, searchTerm, espStatusFilter]);

  // CASCADA
  const nivelesDisponibles = useMemo(() => {
    if (!editingItem || editingItem.subsistemas.length === 0) return [];
    return getNivelesParaSubsistemas(editingItem.subsistemas);
  }, [editingItem?.subsistemas]);

  const cargosDisponibles = useMemo(() => {
    if (!editingItem || !editingItem.subsistemas.length || !editingItem.niveles.length) return [];
    return getCargosParaCombo(editingItem.subsistemas, editingItem.niveles);
  }, [editingItem?.subsistemas, editingItem?.niveles]);

  const cargosGuardadosFuera = useMemo(() => {
    if (!editingItem) return [];
    const set = new Set(cargosDisponibles);
    return editingItem.cargos.filter((c) => !set.has(c));
  }, [editingItem?.cargos, cargosDisponibles]);

  const cargosFiltrados = useMemo(() => {
    let list = cargosDisponibles;
    if (cargosTabFilter === 'selected' && editingItem) {
      const set = new Set(editingItem.cargos);
      list = list.filter((c) => set.has(c));
    } else if (cargosTabFilter === 'with_condition' && editingItem) {
      const set = new Set(editingItem.cargos_condiciones.map((cc) => cc.cargo));
      list = list.filter((c) => set.has(c));
    }
    if (!cargoFilterSearch.trim()) return list;
    const q = cargoFilterSearch.toLowerCase();
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [cargosDisponibles, cargoFilterSearch, cargosTabFilter, editingItem]);

  const pasoActual = useMemo(() => {
    if (!editingItem) return 0;
    if (!editingItem.subsistemas.length) return 1;
    if (!editingItem.niveles.length) return 2;
    return 3;
  }, [editingItem?.subsistemas, editingItem?.niveles]);

  // Helpers condición global
  const condicionGlobalActiva = editingItem?.operador_carga !== null && editingItem?.carga_especialidad !== null;

  const handleOpenEdit = (esp: any, filtroExistente: FiltroEspecialidad | null) => {
    setEditingItem({
      id: filtroExistente?.id,
      especialidad_oficial_id: esp.id,
      subsistemas: filtroExistente?.subsistemas || [],
      niveles: filtroExistente?.niveles || [],
      cargos: filtroExistente?.cargos || [],
      operador_carga: (filtroExistente?.operador_carga as Operador) ?? null,
      carga_especialidad: filtroExistente?.carga_especialidad ?? null,
      cargos_condiciones: filtroExistente?.cargos_condiciones || [],
      activo: filtroExistente?.activo ?? true,
      descripcion: filtroExistente?.descripcion || '',
    });
    setCargoFilterSearch('');
    setCargosTabFilter('all');
    setInputCustomCargo('');
    setEditingCargoCondicion(null);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const method = editingItem.id ? 'PUT' : 'POST';
      const res = await fetch('/api/filtros-especialidad', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al guardar');
      }
      const nombre = especialidades.find((e) => e.id === editingItem.especialidad_oficial_id)?.nombre;
      setActionMessage({ type: 'success', text: `Filtro guardado para "${nombre}".` });
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este filtro?')) return;
    const res = await fetch(`/api/filtros-especialidad?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setActionMessage({ type: 'success', text: 'Filtro eliminado.' }); await loadData(); }
  };

  const toggleCargo = (cargo: string) => {
    if (!editingItem) return;
    const exists = editingItem.cargos.includes(cargo);
    const newCargos = exists ? editingItem.cargos.filter((c) => c !== cargo) : [...editingItem.cargos, cargo];
    // Si se desmarca, también eliminar su condición individual si existía
    const newCondiciones = exists
      ? editingItem.cargos_condiciones.filter((cc) => cc.cargo !== cargo)
      : editingItem.cargos_condiciones;
    setEditingItem({ ...editingItem, cargos: newCargos, cargos_condiciones: newCondiciones });
    if (editingCargoCondicion === cargo) setEditingCargoCondicion(null);
  };

  const handleSelectAllVisible = () => {
    if (!editingItem) return;
    const set = new Set(editingItem.cargos);
    cargosFiltrados.forEach((c) => set.add(c));
    setEditingItem({ ...editingItem, cargos: Array.from(set) });
  };

  const handleDeselectAllVisible = () => {
    if (!editingItem) return;
    const toRemove = new Set(cargosFiltrados);
    const newCargos = editingItem.cargos.filter((c) => !toRemove.has(c));
    const newCondiciones = editingItem.cargos_condiciones.filter((cc) => !toRemove.has(cc.cargo));
    setEditingItem({ ...editingItem, cargos: newCargos, cargos_condiciones: newCondiciones });
  };

  const handleClearAllCargos = () => {
    if (!editingItem || editingItem.cargos.length === 0) return;
    if (!confirm(`¿Desmarcar todos los ${editingItem.cargos.length} cargos y limpiar sus condiciones?`)) return;
    setEditingItem({ ...editingItem, cargos: [], cargos_condiciones: [] });
    setEditingCargoCondicion(null);
  };

  const handleAddCustomCargo = () => {
    const val = inputCustomCargo.trim().toUpperCase();
    if (!val || !editingItem || editingItem.cargos.includes(val)) { setInputCustomCargo(''); return; }
    setEditingItem({ ...editingItem, cargos: [...editingItem.cargos, val] });
    setInputCustomCargo('');
  };

  const toggleSubsistema = (sub: string) => {
    if (!editingItem) return;
    const exists = editingItem.subsistemas.includes(sub);
    const newSubs = exists ? editingItem.subsistemas.filter((s) => s !== sub) : [...editingItem.subsistemas, sub];
    const nivelesValidos = new Set(getNivelesParaSubsistemas(newSubs));
    const newNiveles = editingItem.niveles.filter((n) => nivelesValidos.has(n));
    setEditingItem({ ...editingItem, subsistemas: newSubs, niveles: newNiveles });
  };

  const toggleNivel = (niv: string) => {
    if (!editingItem) return;
    const exists = editingItem.niveles.includes(niv);
    setEditingItem({ ...editingItem, niveles: exists ? editingItem.niveles.filter((n) => n !== niv) : [...editingItem.niveles, niv] });
  };

  // === Condición por cargo ===
  const getCondicionCargo = (cargo: string): CargoCondicion | null =>
    editingItem?.cargos_condiciones.find((cc) => cc.cargo === cargo) || null;

  const openCargoCondicionEditor = (cargo: string) => {
    const existing = getCondicionCargo(cargo);
    setTempOp(existing?.operador || '>=');
    setTempHoras(existing?.horas || 48);
    setEditingCargoCondicion(cargo);
  };

  const saveCargoCondicion = () => {
    if (!editingItem || !editingCargoCondicion) return;
    const nuevasCondiciones = editingItem.cargos_condiciones.filter((cc) => cc.cargo !== editingCargoCondicion);
    nuevasCondiciones.push({ cargo: editingCargoCondicion, operador: tempOp, horas: tempHoras });
    setEditingItem({ ...editingItem, cargos_condiciones: nuevasCondiciones });
    setEditingCargoCondicion(null);
  };

  const removeCargoCondicion = (cargo: string) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, cargos_condiciones: editingItem.cargos_condiciones.filter((cc) => cc.cargo !== cargo) });
    if (editingCargoCondicion === cargo) setEditingCargoCondicion(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Toast de acción */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === 'success' ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <AlertTriangleIcon className="w-4 h-4 text-red-600" />}
            {actionMessage.text}
          </div>
          <button onClick={() => setActionMessage(null)}><XIcon className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
        </div>
      )}

      {/* Aviso tabla faltante */}
      {notReadyError && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-amber-900 text-xs space-y-2">
          <div className="font-bold flex items-center gap-2 text-sm"><AlertTriangleIcon className="w-5 h-5 text-amber-600" /> Tabla requerida en Supabase</div>
          <p>Ejecuta en el <strong>SQL Editor de Supabase</strong>:</p>
          <code className="text-[#937527] bg-[#faf5e8] px-2 py-1 rounded font-mono font-semibold block">scripts/create_filtro_especialidad.sql</code>
          <button onClick={loadData} className="mt-2 px-3 py-1.5 bg-[#c9a751] text-white font-semibold rounded-lg hover:bg-[#b09141] transition-colors">Reintentar</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GraduationCapIcon className="w-5 h-5 text-[#c9a751]" />
            CRUD de Filtros por Especialidad Oficial (20 Especialidades)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Flujo: <strong>① Subsistema</strong> → <strong>② Nivel</strong> → <strong>③ Cargos</strong> → condición global (o por cargo individual).
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
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
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a751]"
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Grid especialidades */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">Cargando especialidades...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredList.map(({ especialidad, filtro }) => {
            const hasFiltro = Boolean(filtro);
            const subsistemas = filtro?.subsistemas || [];
            const niveles = filtro?.niveles || [];
            const cargos = filtro?.cargos || [];
            const cargosCondiciones = filtro?.cargos_condiciones || [];
            const operador = filtro?.operador_carga;
            const carga = filtro?.carga_especialidad;
            const activo = filtro?.activo ?? true;

            const tieneCondGlobal = operador !== null && operador !== undefined && carga !== null && carga !== undefined;
            const tieneCondPorCargo = cargosCondiciones.length > 0;

            return (
              <div key={especialidad.id} className={`bg-white rounded-xl border p-5 shadow-xs transition-all hover:shadow-sm ${hasFiltro ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#faf5e8] text-[#937527] border border-[#e5d4a4] text-xs font-bold shrink-0">{especialidad.id}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{especialidad.nombre}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {tieneCondGlobal ? (
                          <span className="text-[11px] font-semibold text-[#937527] bg-[#faf5e8] px-2 py-0.5 rounded border border-[#e5d4a4]">
                            Global: {operador} {carga} hrs
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Sin restricción global</span>
                        )}
                        {tieneCondPorCargo && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {cargosCondiciones.length} excepción(es) por cargo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleOpenEdit(especialidad, filtro)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-[#faf5e8] text-slate-700 hover:text-[#937527] border border-slate-200 transition-colors flex items-center gap-1">
                      <EditIcon className="w-3.5 h-3.5" />
                      {hasFiltro ? 'Editar' : 'Configurar'}
                    </button>
                    {hasFiltro && filtro?.id && (
                      <button onClick={() => handleDelete(filtro.id!)} className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">Subsistemas:</span>
                    <div className="flex flex-wrap gap-1">
                      {subsistemas.length > 0 ? subsistemas.map((s) => <span key={s} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[10px]">{s}</span>) : <span className="text-slate-400 italic text-[11px]">Sin configurar</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">Niveles ({niveles.length}):</span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {niveles.length > 0 ? niveles.map((n) => <span key={n} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px]">{n}</span>) : <span className="text-slate-400 italic text-[11px]">Sin configurar</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] mb-1">Cargos ({cargos.length}):</span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {cargos.length > 0 ? cargos.map((c) => {
                        const condCargo = cargosCondiciones.find((cc) => cc.cargo === c);
                        return (
                          <span key={c} className={`px-2 py-0.5 rounded border font-mono text-[10px] ${condCargo ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            {c}{condCargo ? ` (${condCargo.operador}${condCargo.horas})` : ''}
                          </span>
                        );
                      }) : <span className="text-slate-400 italic text-[11px]">Ningún cargo</span>}
                    </div>
                  </div>
                  {filtro?.descripcion && <div className="text-[11px] text-slate-500 italic">&quot;{filtro.descripcion}&quot;</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE EDICIÓN */}
      {/* ============================================================ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#937527]">Configuración en Cascada</span>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {especialidades.find((e) => e.id === editingItem.especialidad_oficial_id)?.nombre}
                </h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de progreso */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              {[
                { paso: 1, label: 'Subsistema', done: editingItem.subsistemas.length > 0 },
                { paso: 2, label: 'Nivel', done: editingItem.niveles.length > 0 },
                { paso: 3, label: 'Cargos', done: editingItem.cargos.length > 0 },
                { paso: 4, label: 'Condición', done: true },
              ].map(({ paso, label, done }, i) => (
                <React.Fragment key={paso}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-emerald-500 text-white' : pasoActual === paso ? 'bg-[#c9a751] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {done ? '✓' : paso}
                    </span>
                    <span className={`text-[11px] font-semibold ${done ? 'text-emerald-700' : pasoActual === paso ? 'text-[#937527]' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 3 && <span className="text-slate-300 text-xs">→</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">

              {/* PASO 1: SUBSISTEMA */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${pasoActual === 1 ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${editingItem.subsistemas.length > 0 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                      {editingItem.subsistemas.length > 0 ? '✓' : '1'}
                    </span>
                    Selecciona Subsistema(s):
                  </label>
                  <span className="text-[11px] text-slate-500">{editingItem.subsistemas.length} sel.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBSISTEMAS_DISPONIBLES.map((sub) => {
                    const sel = editingItem.subsistemas.includes(sub);
                    return (
                      <button key={sub} type="button" onClick={() => toggleSubsistema(sub)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1.5 transition-colors ${sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>
                        {sel && <CheckIcon className="w-3.5 h-3.5" />}{sub}
                      </button>
                    );
                  })}
                </div>
                {editingItem.subsistemas.length === 0 && <p className="text-[11px] text-blue-700 font-medium">⚠ Selecciona al menos un subsistema.</p>}
              </div>

              {/* PASO 2: NIVEL */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${editingItem.subsistemas.length === 0 ? 'opacity-40 pointer-events-none border-slate-200 bg-slate-50/30' : pasoActual === 2 ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-200' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${editingItem.niveles.length > 0 ? 'bg-emerald-500 text-white' : editingItem.subsistemas.length > 0 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                      {editingItem.niveles.length > 0 ? '✓' : '2'}
                    </span>
                    Selecciona Nivel(es):
                  </label>
                  <span className="text-[11px] text-slate-500">{editingItem.niveles.length} / {nivelesDisponibles.length} disp.</span>
                </div>
                {nivelesDisponibles.length === 0 ? (
                  <p className="text-[11px] text-amber-700 italic">Selecciona un subsistema primero.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                    {nivelesDisponibles.map((niv) => {
                      const sel = editingItem.niveles.includes(niv);
                      return (
                        <label key={niv} className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${sel ? 'bg-amber-100 border-[#c9a751] font-bold text-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={sel} onChange={() => toggleNivel(niv)} className="rounded text-[#c9a751] focus:ring-[#c9a751]" />
                          <span className="truncate" title={niv}>{niv}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {editingItem.subsistemas.length > 0 && editingItem.niveles.length === 0 && nivelesDisponibles.length > 0 && (
                  <p className="text-[11px] text-amber-700 font-medium">⚠ Selecciona al menos un nivel para ver los cargos.</p>
                )}
              </div>

              {/* PASO 3: CARGOS */}
              <div className={`p-4 rounded-xl border space-y-3 transition-all ${editingItem.niveles.length === 0 ? 'opacity-40 pointer-events-none border-slate-200 bg-slate-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${editingItem.cargos.length > 0 ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-white'}`}>
                      {editingItem.cargos.length > 0 ? '✓' : '3'}
                    </span>
                    Cargos en la combinación ({cargosDisponibles.length}):
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">{editingItem.cargos.length} marcados</span>
                    <button type="button" onClick={handleSelectAllVisible} className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold underline">Marcar visibles</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleDeselectAllVisible} className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold underline">Desmarcar</button>
                  </div>
                </div>

                {editingItem.niveles.length === 0 ? (
                  <p className="text-[11px] text-purple-700 italic py-2">Completa los pasos 1 y 2 primero.</p>
                ) : cargosDisponibles.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs bg-white rounded-lg border border-slate-200">Sin cargos para esta combinación.</div>
                ) : (
                  <>
                    <p className="text-[11px] text-purple-800/80">
                      Cargos de <strong>{editingItem.subsistemas.join(' + ')}</strong> / <strong>{editingItem.niveles.join(' + ')}</strong>. Marca los que aplican y opcionalmente configura su condición individual:
                    </p>
                    <div className="relative">
                      <input type="text" placeholder={`Buscar entre ${cargosDisponibles.length} cargos...`} value={cargoFilterSearch} onChange={(e) => setCargoFilterSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-8 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      <SearchIcon className="w-4 h-4 text-purple-400 absolute left-2.5 top-2.5" />
                      {cargoFilterSearch && <button onClick={() => setCargoFilterSearch('')} className="absolute right-2.5 top-2.5"><XIcon className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" /></button>}
                    </div>

                    {/* Subfiltros de visualización de cargos */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-purple-100/70 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setCargosTabFilter('all')}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            cargosTabFilter === 'all'
                              ? 'bg-white text-purple-950 shadow-xs'
                              : 'text-purple-700 hover:text-purple-900'
                          }`}
                        >
                          Todos ({cargosDisponibles.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCargosTabFilter('selected')}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            cargosTabFilter === 'selected'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'text-purple-700 hover:text-purple-900'
                          }`}
                        >
                          Marcados ({editingItem.cargos.filter((c) => cargosDisponibles.includes(c)).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCargosTabFilter('with_condition')}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            cargosTabFilter === 'with_condition'
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'text-purple-700 hover:text-purple-900'
                          }`}
                        >
                          Con condición ({editingItem.cargos_condiciones.length})
                        </button>
                      </div>

                      {editingItem.cargos.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllCargos}
                          className="text-[11px] text-red-600 hover:text-red-700 font-semibold hover:underline"
                        >
                          Limpiar todos ({editingItem.cargos.length})
                        </button>
                      )}
                    </div>

                    {(cargoFilterSearch || cargosTabFilter !== 'all') && (
                      <p className="text-[11px] text-purple-600 font-medium">
                        Mostrando {cargosFiltrados.length} de {cargosDisponibles.length} cargos
                      </p>
                    )}

                    <div className="max-h-64 overflow-y-auto border border-purple-200 rounded-lg bg-white divide-y divide-purple-100/60">
                      {cargosFiltrados.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs">Sin resultados.</div>
                      ) : cargosFiltrados.map((cargo) => {
                        const isChecked = editingItem.cargos.includes(cargo);
                        const condCargo = getCondicionCargo(cargo);
                        const isEditingThis = editingCargoCondicion === cargo;

                        return (
                          <div key={cargo}>
                            <div className={`flex items-center gap-2 px-3 py-2 transition-colors ${isChecked ? 'bg-purple-50/80' : 'hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={isChecked} onChange={() => toggleCargo(cargo)} className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 shrink-0" />
                              <span className={`font-mono text-[11px] leading-tight flex-1 ${isChecked ? 'font-semibold text-purple-950' : 'text-slate-700'}`}>{cargo}</span>
                              {/* Botón condición individual (solo si está marcado) */}
                              {isChecked && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {condCargo ? (
                                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                      {condCargo.operador} {condCargo.horas}h
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">usa global</span>
                                  )}
                                  <button type="button" onClick={() => isEditingThis ? setEditingCargoCondicion(null) : openCargoCondicionEditor(cargo)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors border ${isEditingThis ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                    title={condCargo ? 'Editar condición de este cargo' : 'Agregar condición específica'}>
                                    {condCargo ? 'Editar ✎' : '+ Cond.'}
                                  </button>
                                  {condCargo && (
                                    <button type="button" onClick={() => removeCargoCondicion(cargo)} title="Quitar condición individual" className="text-slate-400 hover:text-red-500 transition-colors">
                                      <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Mini editor de condición por cargo */}
                            {isEditingThis && (
                              <div className="mx-3 mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                                <p className="text-[11px] font-bold text-indigo-800">Condición específica para: <span className="font-mono">{cargo}</span></p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div>
                                    <label className="text-[10px] font-semibold text-indigo-700 block mb-0.5">Operador</label>
                                    <select value={tempOp} onChange={(e) => setTempOp(e.target.value as Operador)}
                                      className="text-xs border border-indigo-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                                      {OPERADORES.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold text-indigo-700 block mb-0.5">Horas</label>
                                    <input type="number" min="1" max="200" value={tempHoras} onChange={(e) => setTempHoras(Number(e.target.value))}
                                      className="w-20 text-xs border border-indigo-200 rounded px-2 py-1 bg-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                  </div>
                                  <div className="flex gap-1.5 mt-auto">
                                    <button type="button" onClick={saveCargoCondicion}
                                      className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-semibold rounded hover:bg-indigo-700 transition-colors flex items-center gap-1">
                                      <CheckIcon className="w-3 h-3" /> Aplicar
                                    </button>
                                    <button type="button" onClick={() => setEditingCargoCondicion(null)}
                                      className="px-2 py-1 bg-white text-slate-600 text-[11px] rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-indigo-600">
                                  Este cargo se incluirá solo si su carga horaria es <strong>{tempOp} {tempHoras} horas</strong>, ignorando la condición global.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Cargos guardados fuera del catálogo */}
                {cargosGuardadosFuera.length > 0 && (
                  <div className="pt-2 border-t border-purple-200/60 space-y-2">
                    <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangleIcon className="w-3.5 h-3.5" />
                      {cargosGuardadosFuera.length} cargo(s) guardados fuera de la combinación actual:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cargosGuardadosFuera.map((cargo) => {
                        const condCargo = getCondicionCargo(cargo);
                        return (
                          <div key={cargo} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                            <span className="font-mono text-[10px] text-amber-900">{cargo}{condCargo ? ` (${condCargo.operador}${condCargo.horas}h)` : ''}</span>
                            <button type="button" onClick={() => toggleCargo(cargo)} className="text-amber-500 hover:text-red-600 ml-0.5"><XIcon className="w-3 h-3" /></button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500">No existen en la combinación actual. Mantener o eliminar con ✕.</p>
                  </div>
                )}

                {/* Cargo personalizado */}
                <div className="pt-2 border-t border-purple-200/60 flex gap-2">
                  <input type="text" placeholder="¿Falta algún cargo? Escríbelo aquí..." value={inputCustomCargo}
                    onChange={(e) => setInputCustomCargo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCargo(); } }}
                    className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <button type="button" onClick={handleAddCustomCargo} className="px-3 py-1.5 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 text-xs flex items-center gap-1 shrink-0">
                    <PlusIcon className="w-3.5 h-3.5" />Agregar
                  </button>
                </div>
              </div>

              {/* PASO 4: CONDICIÓN GLOBAL */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#c9a751] text-white flex items-center justify-center text-[10px] font-bold">4</span>
                    Condición de Carga Global (opcional):
                  </label>
                  {/* Toggle para activar/desactivar condición global */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {condicionGlobalActiva ? 'Con restricción' : 'Sin restricción (todos)'}
                    </span>
                    <div
                      onClick={() => {
                        if (condicionGlobalActiva) {
                          setEditingItem({ ...editingItem, operador_carga: null, carga_especialidad: null });
                        } else {
                          setEditingItem({ ...editingItem, operador_carga: '<=', carga_especialidad: 48 });
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${condicionGlobalActiva ? 'bg-[#c9a751]' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${condicionGlobalActiva ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {condicionGlobalActiva ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Operador:</label>
                        <select value={editingItem.operador_carga || '<='}
                          onChange={(e) => setEditingItem({ ...editingItem, operador_carga: e.target.value as Operador })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#c9a751]">
                          {OPERADORES.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Horas:</label>
                        <input type="number" min="1" max="200" value={editingItem.carga_especialidad ?? 48}
                          onChange={(e) => setEditingItem({ ...editingItem, carga_especialidad: Number(e.target.value) })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#c9a751]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-amber-200/60">
                      <strong>Regla global:</strong> Pertenecen los registros con Carga Horaria{' '}
                      <strong className="text-slate-900">{editingItem.operador_carga} {editingItem.carga_especialidad} horas</strong>{' '}
                      en los {editingItem.cargos.length} cargos marcados <em>(los cargos con condición propia la ignoran)</em>.
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-amber-200/60 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-bold shrink-0">∞</span>
                    <span>
                      <strong className="text-slate-700">Sin restricción global</strong> — Se incluyen todos los registros de los cargos marcados sin importar sus horas.
                      Los cargos con <strong>condición individual</strong> ({editingItem.cargos_condiciones.length}) sí aplicarán su propia regla.
                    </span>
                  </div>
                )}

                {/* Resumen condiciones por cargo */}
                {editingItem.cargos_condiciones.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                    <p className="text-[11px] font-semibold text-indigo-800">Condiciones individuales configuradas ({editingItem.cargos_condiciones.length}):</p>
                    <div className="space-y-1">
                      {editingItem.cargos_condiciones.map((cc) => (
                        <div key={cc.cargo} className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                          <span className="font-mono text-[11px] text-indigo-900 flex-1 truncate" title={cc.cargo}>{cc.cargo}</span>
                          <span className="text-[11px] font-semibold text-indigo-700 ml-2 shrink-0">
                            {cc.operador} {cc.horas} hrs
                          </span>
                          <button type="button" onClick={() => removeCargoCondicion(cc.cargo)} className="ml-2 text-indigo-400 hover:text-red-500 transition-colors">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Estado y Descripción */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={editingItem.activo} onChange={(e) => setEditingItem({ ...editingItem, activo: e.target.checked })} className="rounded text-[#c9a751] focus:ring-[#c9a751]" />
                  Filtro Activo
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notas (Opcional):</label>
                <input type="text" placeholder="Ej: Solo aplica a colegios BTH..." value={editingItem.descripcion}
                  onChange={(e) => setEditingItem({ ...editingItem, descripcion: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a751]" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>{editingItem.cargos.length} cargo(s) · {editingItem.cargos_condiciones.length} condición(es) individual(es) · Global: {condicionGlobalActiva ? `${editingItem.operador_carga} ${editingItem.carga_especialidad}h` : 'Sin restricción'}</div>
                {pasoActual < 3 && <div className="text-amber-600 font-semibold">Completa el paso {pasoActual} para configurar los cargos</div>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="button" disabled={saving} onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#c9a751] hover:bg-[#b09141] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50">
                  <SaveIcon className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar Filtro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
