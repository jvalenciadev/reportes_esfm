'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCapIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  SearchIcon,
  AlertTriangleIcon,
  PlusIcon,
  LayersIcon,
} from '../ui/Icons';

interface EspecialidadOficial {
  id: number;
  nombre: string;
}

interface ReglaMateria {
  id: number;
  especialidad_id: number;
  subsistema: string | null;
  nivel: string | null;
  grado: number | null;
  materia: string;
  tipo_coincidencia: 'EXACTA' | 'CONTIENE';
  activo: boolean;
  created_at?: string;
  especialidades_oficiales?: {
    id: number;
    nombre: string;
  };
}

const SUBSISTEMAS = ['EDUCACIÓN REGULAR', 'EDUCACIÓN ALTERNATIVA', 'EDUCACIÓN ESPECIAL'];
const NIVELES = ['INICIAL', 'PRIMARIA', 'SECUNDARIA', 'SECUNDARIA (BTH)'];

export function FiltrosMateriaManager() {
  const [especialidades, setEspecialidades] = useState<EspecialidadOficial[]>([]);
  const [selectedEspId, setSelectedEspId] = useState<number>(1);
  const [reglas, setReglas] = useState<ReglaMateria[]>([]);
  const [materiasSugeridas, setMateriasSugeridas] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchEsp, setSearchEsp] = useState<string>('');

  // Formulario nueva regla
  const [materiaInput, setMateriaInput] = useState<string>('');
  const [subsistemaInput, setSubsistemaInput] = useState<string>('EDUCACIÓN REGULAR');
  const [nivelInput, setNivelInput] = useState<string>('SECUNDARIA');
  const [gradoInput, setGradoInput] = useState<string>('');
  const [coincidenciaInput, setCoincidenciaInput] = useState<'EXACTA' | 'CONTIENE'>('CONTIENE');

  // 1. Cargar especialidades oficiales
  const loadEspecialidades = useCallback(async () => {
    try {
      const res = await fetch('/api/filtros-materia?action=especialidades');
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(data);
        if (data.length > 0 && !selectedEspId) {
          setSelectedEspId(data[0].id);
        }
      }
    } catch (e: any) {
      console.error('Error cargando especialidades:', e);
    }
  }, [selectedEspId]);

  // 2. Cargar materias sugeridas de la base de datos
  const loadMateriasSugeridas = useCallback(async () => {
    try {
      const res = await fetch('/api/filtros-materia?action=materias_disponibles');
      if (res.ok) {
        const data = await res.json();
        setMateriasSugeridas(data);
      }
    } catch (e: any) {
      console.error('Error cargando materias sugeridas:', e);
    }
  }, []);

  // 3. Cargar reglas de mapeo de la especialidad activa
  const loadReglas = useCallback(async (espId: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/filtros-materia?especialidad_id=${espId}`);
      if (res.ok) {
        const data = await res.json();
        setReglas(Array.isArray(data) ? data : []);
      } else {
        setReglas([]);
      }
    } catch (e: any) {
      setErrorMsg('Error consultando reglas de materias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEspecialidades();
    loadMateriasSugeridas();
  }, [loadEspecialidades, loadMateriasSugeridas]);

  useEffect(() => {
    if (selectedEspId) {
      loadReglas(selectedEspId);
    }
  }, [selectedEspId, loadReglas]);

  const especialidadActual = useMemo(() => {
    return especialidades.find((e) => e.id === selectedEspId);
  }, [especialidades, selectedEspId]);

  const filteredEspecialidades = useMemo(() => {
    if (!searchEsp.trim()) return especialidades;
    const q = searchEsp.toLowerCase();
    return especialidades.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [especialidades, searchEsp]);

  // Agregar nueva regla
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiaInput.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/filtros-materia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          especialidad_id: selectedEspId,
          materia: materiaInput.trim(),
          subsistema: subsistemaInput || null,
          nivel: nivelInput || null,
          grado: gradoInput ? Number(gradoInput) : null,
          tipo_coincidencia: coincidenciaInput,
          activo: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || 'Error al guardar regla');
      }

      setMateriaInput('');
      setSuccessMsg('Regla de materia guardada exitosamente');
      loadReglas(selectedEspId);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar regla');
    } finally {
      setSaving(false);
    }
  };

  // Alternar activo/inactivo
  const handleToggleActivo = async (regla: ReglaMateria) => {
    try {
      const res = await fetch('/api/filtros-materia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: regla.id,
          activo: !regla.activo,
        }),
      });
      if (res.ok) {
        loadReglas(selectedEspId);
      }
    } catch (e: any) {
      console.error('Error al actualizar regla:', e);
    }
  };

  // Eliminar regla
  const handleDeleteRule = async (id: number) => {
    if (!confirm('¿Confirma eliminar esta regla de mapeo?')) return;
    try {
      const res = await fetch(`/api/filtros-materia?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadReglas(selectedEspId);
      }
    } catch (e: any) {
      console.error('Error al eliminar regla:', e);
    }
  };

  // Preset inteligente según nombre de especialidad
  const handleApplyPreset = () => {
    if (!especialidadActual) return;
    const name = especialidadActual.nombre.toUpperCase();
    if (name.includes('MATEMÁTICA')) {
      setMateriaInput('MATEMÁTICA');
      setNivelInput('SECUNDARIA');
    } else if (name.includes('LENGUA CASTELLANA')) {
      setMateriaInput('COMUNICACIÓN Y LENGUAJES');
      setNivelInput('SECUNDARIA');
    } else if (name.includes('INICIAL')) {
      setMateriaInput('EDUCACIÓN INICIAL');
      setNivelInput('INICIAL');
    } else if (name.includes('PRIMARIA')) {
      setMateriaInput('EDUCACIÓN PRIMARIA');
      setNivelInput('PRIMARIA');
    } else if (name.includes('FÍSICA')) {
      setMateriaInput('FÍSICA');
      setNivelInput('SECUNDARIA');
    } else if (name.includes('QUÍMICA')) {
      setMateriaInput('QUÍMICA');
      setNivelInput('SECUNDARIA');
    } else if (name.includes('BIOLOGÍA')) {
      setMateriaInput('BIOLOGÍA');
      setNivelInput('SECUNDARIA');
    } else if (name.includes('CARPINTERÍA')) {
      setMateriaInput('CARPINTERÍA');
      setNivelInput('SECUNDARIA (BTH)');
    } else if (name.includes('MECÁNICA INDUSTRIAL')) {
      setMateriaInput('MECÁNICA INDUSTRIAL');
      setNivelInput('SECUNDARIA (BTH)');
    } else {
      setMateriaInput(name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Explicativo */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                CRUD Granular SIE
              </span>
              <span className="text-xs text-blue-200 font-medium">Reemplazo de Cargo por Materia</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1">Configurador de Materias Curriculares</h2>
            <p className="text-xs md:text-sm text-blue-100/90 mt-1 max-w-3xl">
              Asigna qué asignaturas y materias del SIE alimentan el cálculo de horas y déficit de cada Especialidad Oficial. 
              El motor agrupa por coincidencia exacta o contiene para consolidar las horas de la Unidad Educativa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/15 text-center">
              <div className="text-2xl font-black text-amber-300">{especialidades.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">Especialidades</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/15 text-center">
              <div className="text-2xl font-black text-emerald-300">{reglas.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">Reglas Activas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Lista de Especialidades (Izquierda) + Reglas de Materias (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Especialidades Oficiales */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col h-[700px]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCapIcon className="w-4 h-4 text-indigo-600" />
              Especialidades Oficiales
            </h3>
            <span className="text-xs font-bold text-slate-400">({filteredEspecialidades.length})</span>
          </div>

          <div className="relative mb-3">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar especialidad..."
              value={searchEsp}
              onChange={(e) => setSearchEsp(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
            {filteredEspecialidades.map((esp) => {
              const isSelected = esp.id === selectedEspId;
              return (
                <button
                  key={esp.id}
                  onClick={() => setSelectedEspId(esp.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 text-xs font-bold ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {esp.id}
                    </span>
                    <span className="line-clamp-2 leading-tight">{esp.nombre}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Reglas y Formulario CRUD */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cabecera de Especialidad Seleccionada */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Configurando Especialidad #{selectedEspId}
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">
                {especialidadActual?.nombre || 'Seleccione una especialidad'}
              </h3>
            </div>
            <button
              onClick={handleApplyPreset}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
            >
              Sugerir Materia Base
            </button>
          </div>

          {/* Formulario Nueva Regla */}
          <form
            onSubmit={handleAddRule}
            className="bg-slate-50 rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PlusIcon className="w-4 h-4 text-emerald-600" />
                Vincular Nueva Materia Curricular
              </h4>
              <span className="text-[11px] text-slate-500">Materia evaluada en el registro de la UE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Input Materia */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Nombre de Materia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MATEMÁTICA, QUÍMICA, etc."
                  value={materiaInput}
                  onChange={(e) => setMateriaInput(e.target.value)}
                  list="sugerencias-materias"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold uppercase"
                />
                <datalist id="sugerencias-materias">
                  {materiasSugeridas.map((m, idx) => (
                    <option key={idx} value={m} />
                  ))}
                </datalist>
              </div>

              {/* Select Nivel */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Nivel</label>
                <select
                  value={nivelInput}
                  onChange={(e) => setNivelInput(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">TODOS</option>
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Coincidencia */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Coincidencia</label>
                <select
                  value={coincidenciaInput}
                  onChange={(e) => setCoincidenciaInput(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="CONTIENE">CONTIENE (Flexible)</option>
                  <option value="EXACTA">EXACTA (=)</option>
                </select>
              </div>

              {/* Select Subsistema */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Subsistema</label>
                <select
                  value={subsistemaInput}
                  onChange={(e) => setSubsistemaInput(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">TODOS</option>
                  {SUBSISTEMAS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Grado */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Grado (Opcional)</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  placeholder="1 a 6 (Vacío = Todos)"
                  value={gradoInput}
                  onChange={(e) => setGradoInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {/* Botón Guardar */}
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={saving || !materiaInput.trim()}
                  className="w-full py-2 px-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {saving ? 'Guardando...' : 'Agregar Regla'}
                </button>
              </div>
            </div>

            {/* Mensajes de Estado */}
            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-600" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-rose-600" />
                {errorMsg}
              </div>
            )}
          </form>

          {/* Lista de Reglas Registradas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayersIcon className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Materias Asignadas ({reglas.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Afecta el cálculo en tiempo real de la matriz
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Cargando reglas...</div>
            ) : reglas.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="text-sm font-bold text-slate-500">
                  Sin materias asignadas para esta especialidad
                </div>
                <div className="text-xs text-slate-400 max-w-md mx-auto">
                  Agregue una materia arriba o presione &quot;Sugerir Materia Base&quot; para vincular las horas curriculares correspondientes.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {reglas.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                      !r.activo ? 'opacity-50 bg-slate-50/50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{r.materia}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            r.tipo_coincidencia === 'EXACTA'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {r.tipo_coincidencia}
                        </span>
                        {!r.activo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            INACTIVA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Subsistema: <b>{r.subsistema || 'TODOS'}</b></span>
                        <span>Nivel: <b>{r.nivel || 'TODOS'}</b></span>
                        {r.grado && <span>Grado: <b>{r.grado}°</b></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActivo(r)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          r.activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {r.activo ? 'Activa' : 'Pausada'}
                      </button>
                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar regla"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
