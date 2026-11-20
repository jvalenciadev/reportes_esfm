'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Link2, Search, Plus, Trash2, CheckCircle2,
  Sparkles, BookOpen, Layers, Users,
  ShieldCheck, Clock, CheckSquare, Square
} from 'lucide-react';

interface EspecialidadOficial {
  id: number;
  nombre: string;
  hora_item: number;
}

interface EspecialidadFormacion {
  cod_especialidad: number;
  especialidad_formacion: string;
  total_docentes: number;
  nivel_referencial?: string;
}

interface RelacionEspecialidad {
  id: number;
  especialidad_oficial_id: number;
  cod_especialidad_formacion: number;
  tipo_relacion: 'DIRECTA' | 'AFIN' | 'EQUIVALENTE' | 'TRANSVERSAL' | 'TRANSVERSAL_COMPARTIDA';
  ponderacion_pertinencia: 'ALTA' | 'MEDIA' | 'BAJA';
  factor_ponderacion?: number;
  es_titular?: boolean;
  observaciones?: string;
  created_at?: string;
}

const fmt = (n: number) => n.toLocaleString('es-BO');

export default function AdminEspecialidadesRelacionesPage() {
  const [oficiales, setOficiales] = useState<EspecialidadOficial[]>([]);
  const [formaciones, setFormaciones] = useState<EspecialidadFormacion[]>([]);
  const [relaciones, setRelaciones] = useState<RelacionEspecialidad[]>([]);
  const [loading, setLoading] = useState(true);

  // Selección activa
  const [selectedOficialId, setSelectedOficialId] = useState<number>(3); // Default Matemática

  // Búsqueda y filtros del catálogo de 729 formaciones
  const [searchFormacion, setSearchFormacion] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'SIN_VINCULAR' | 'VINCULADAS'>('SIN_VINCULAR');
  const [tipoRelacionInput, setTipoRelacionInput] = useState<'DIRECTA' | 'AFIN' | 'EQUIVALENTE' | 'TRANSVERSAL' | 'TRANSVERSAL_COMPARTIDA'>('DIRECTA');
  const [factorInput, setFactorInput] = useState<number>(1.0);

  // Selección múltiple para asignación en lote
  const [selectedCodigos, setSelectedCodigos] = useState<number[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOficiales, resFormaciones, resRelaciones] = await Promise.all([
        fetch('/api/admin/especialidades-oficiales').then(r => r.json()),
        fetch('/api/admin/especialidades-formacion').then(r => r.json()),
        fetch('/api/admin/relacion-especialidad').then(r => r.json()),
      ]);

      setOficiales(Array.isArray(resOficiales) ? resOficiales : []);
      setFormaciones(Array.isArray(resFormaciones) ? resFormaciones : []);
      setRelaciones(Array.isArray(resRelaciones) ? resRelaciones : []);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mapa rápido de formaciones por código
  const formacionesMap = useMemo(() => {
    const map = new Map<number, EspecialidadFormacion>();
    for (const f of formaciones) {
      map.set(f.cod_especialidad, f);
    }
    return map;
  }, [formaciones]);

  // Relaciones agrupadas por especialidad oficial
  const relacionesPorOficial = useMemo(() => {
    const map = new Map<number, RelacionEspecialidad[]>();
    for (const r of relaciones) {
      const list = map.get(r.especialidad_oficial_id) || [];
      list.push(r);
      map.set(r.especialidad_oficial_id, list);
    }
    return map;
  }, [relaciones]);

  // Códigos de formación ya vinculados globalmente o a la actual
  const codigosVinculadosActual = useMemo(() => {
    const list = relacionesPorOficial.get(selectedOficialId) || [];
    return new Set(list.map(r => r.cod_especialidad_formacion));
  }, [relacionesPorOficial, selectedOficialId]);

  const codigosVinculadosGlobal = useMemo(() => {
    return new Set(relaciones.map(r => r.cod_especialidad_formacion));
  }, [relaciones]);

  // Gran total auditado del padrón oficial según catálogo cargado
  const granTotalPadron = useMemo(() => {
    return formaciones.reduce((acc, f) => acc + (f.total_docentes || 0), 0) || 167413;
  }, [formaciones]);

  // Total de docentes en las formaciones seleccionadas con checkbox
  const totalDocentesSeleccionados = useMemo(() => {
    return selectedCodigos.reduce((acc, cod) => {
      const f = formacionesMap.get(cod);
      return acc + (f?.total_docentes || 0);
    }, 0);
  }, [selectedCodigos, formacionesMap]);

  // Total docentes mapeados ponderados a nivel nacional (evitando duplicar secundarias)
  const totalDocentesMapeadosGlobal = useMemo(() => {
    let sum = 0;
    for (const r of relaciones) {
      const f = formacionesMap.get(r.cod_especialidad_formacion);
      if (f) sum += f.total_docentes * (r.factor_ponderacion !== undefined ? Number(r.factor_ponderacion) : 1.0);
    }
    return Math.round(sum);
  }, [relaciones, formacionesMap]);

  // Filtrado de Especialidades Oficiales
  const oficialesOrdenadas = useMemo(() => {
    return [...oficiales].sort((a, b) => a.id - b.id);
  }, [oficiales]);
  const selectedOficial = useMemo(() => {
    return oficiales.find(o => o.id === selectedOficialId) || oficiales[0];
  }, [oficiales, selectedOficialId]);

  // Relaciones activas de la especialidad seleccionada
  const activeRelaciones = useMemo(() => {
    return relacionesPorOficial.get(selectedOficialId) || [];
  }, [relacionesPorOficial, selectedOficialId]);

  // Métricas de cobertura de la especialidad seleccionada (con cálculo ponderado)
  const metricasActual = useMemo(() => {
    let docentesTotalBruto = 0;
    let docentesEquivalentes = 0;
    for (const r of activeRelaciones) {
      const f = formacionesMap.get(r.cod_especialidad_formacion);
      if (f) {
        docentesTotalBruto += f.total_docentes;
        const factor = r.factor_ponderacion !== undefined ? Number(r.factor_ponderacion) : 1.0;
        docentesEquivalentes += f.total_docentes * factor;
      }
    }
    return {
      docentesTotalBruto,
      docentesEquivalentes: Math.round(docentesEquivalentes),
      cantidadFormaciones: activeRelaciones.length,
    };
  }, [activeRelaciones, formacionesMap]);

  // Sugerencias inteligentes: formaciones que contengan palabras clave de la especialidad oficial
  const sugerenciasInteligentes = useMemo(() => {
    if (!selectedOficial) return [];

    const stopWords = new Set(['DE', 'Y', 'EN', 'LA', 'EL', 'LOS', 'LAS', 'PARA', 'CON', 'DEL']);
    const keywords = selectedOficial.nombre
      .toUpperCase()
      .split(/[\s,:-]+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    if (keywords.length === 0) return [];

    return formaciones.filter(f => {
      if (codigosVinculadosActual.has(f.cod_especialidad)) return false;
      const nomUpper = f.especialidad_formacion.toUpperCase();
      return keywords.some(kw => nomUpper.includes(kw));
    }).slice(0, 8);
  }, [selectedOficial, formaciones, codigosVinculadosActual]);

  // Catálogo de formaciones filtrado para vinculación manual
  const formacionesFiltradas = useMemo(() => {
    return formaciones.filter(f => {
      const matchSearch =
        searchFormacion === '' ||
        String(f.cod_especialidad).includes(searchFormacion) ||
        f.especialidad_formacion.toLowerCase().includes(searchFormacion.toLowerCase());

      if (!matchSearch) return false;

      const estaVinculada = codigosVinculadosActual.has(f.cod_especialidad);
      if (filtroEstado === 'SIN_VINCULAR') return !estaVinculada;
      if (filtroEstado === 'VINCULADAS') return estaVinculada;
      return true;
    });
  }, [formaciones, searchFormacion, filtroEstado, codigosVinculadosActual]);

  // Acciones CRUD
  const handleVincularBatch = async (codigos: number[], tipo = tipoRelacionInput, factor = factorInput) => {
    if (!selectedOficial || codigos.length === 0) return;
    setSavingBatch(true);

    const payload = codigos.map(cod => ({
      especialidad_oficial_id: selectedOficial.id,
      cod_especialidad_formacion: cod,
      tipo_relacion: tipo,
      ponderacion_pertinencia: tipo === 'DIRECTA' ? 'ALTA' : 'MEDIA',
      factor_ponderacion: factor,
      es_titular: factor >= 1.0,
      observaciones: factor < 1.0 ? `Subdivisión ponderada ${(factor * 100).toFixed(1)}%` : undefined,
    }));

    try {
      const res = await fetch('/api/admin/relacion-especialidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Se vincularon ${codigos.length} especialidades de formación.`);
        setSelectedCodigos([]);
        // Recargar relaciones
        const resRel = await fetch(`/api/admin/relacion-especialidad`).then(r => r.json());
        setRelaciones(Array.isArray(resRel) ? resRel : []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error al guardar relaciones');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleEliminarRelacion = async (relId: number) => {
    try {
      const res = await fetch(`/api/admin/relacion-especialidad?id=${relId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Relación eliminada');
        setRelaciones(prev => prev.filter(r => r.id !== relId));
      }
    } catch (e) {
      console.error(e);
      showToast('Error al eliminar');
    }
  };

  // Toggle checkbox en lote
  const toggleSeleccion = (cod: number) => {
    setSelectedCodigos(prev =>
      prev.includes(cod) ? prev.filter(c => c !== cod) : [...prev, cod]
    );
  };

  const seleccionarTodosVisibles = () => {
    const codsVisibles = formacionesFiltradas.slice(0, 30).map(f => f.cod_especialidad);
    const todosSeleccionados = codsVisibles.every(c => selectedCodigos.includes(c));
    if (todosSeleccionados) {
      setSelectedCodigos(prev => prev.filter(c => !codsVisibles.includes(c)));
    } else {
      setSelectedCodigos(prev => Array.from(new Set([...prev, ...codsVisibles])));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold tracking-wide">Cargando catálogo maestro y relaciones...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8">
      {/* Toast Notificación */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header Principal con KPIs Globales de Conciliación ─────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-xs">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Mapeador N:N de Especialidades ESFM vs Formaciones SEP
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conciliación del Padrón Oficial Auditado: <strong className="text-slate-800">{fmt(granTotalPadron)}</strong> docentes registrados en {formaciones.length} Especialidades SEP.
                </p>
              </div>
            </div>
          </div>

          {/* Micro KPIs de Cuadre */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Padrón Total</span>
              <span className="text-sm font-black text-slate-900">{fmt(granTotalPadron)}</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Oferta ESFM</span>
              <span className="text-sm font-black text-slate-900">{oficiales.length} esp.</span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Docentes Mapeados</span>
              <span className="text-sm font-black text-emerald-800">
                {fmt(totalDocentesMapeadosGlobal)} <span className="text-[10px] font-normal text-emerald-600">({((totalDocentesMapeadosGlobal / granTotalPadron) * 100).toFixed(1)}%)</span>
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Pendientes</span>
              <span className="text-sm font-black text-amber-800">
                {fmt(Math.max(0, granTotalPadron - totalDocentesMapeadosGlobal))}
              </span>
            </div>
          </div>
        </div>

        {/* ── Distribución en 2 Columnas ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── COLUMNA 1: Especialidades Oficiales ESFM (5 Cols) ─────────────── */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[760px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wide">
                  Especialidades Oficiales ESFM ({oficiales.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Selecciona para mapear</span>
            </div>

            <div className="p-3 overflow-y-auto divide-y divide-slate-100 space-y-1">
              {oficiales.map((esp) => {
                const isSelected = esp.id === selectedOficialId;
                const rels = relacionesPorOficial.get(esp.id) || [];
                const totalDoc = rels.reduce((acc, r) => {
                  const f = formacionesMap.get(r.cod_especialidad_formacion);
                  const factor = r.factor_ponderacion !== undefined ? Number(r.factor_ponderacion) : 1.0;
                  return acc + (f ? f.total_docentes * factor : 0);
                }, 0);

                return (
                  <button
                    key={esp.id}
                    onClick={() => {
                      setSelectedOficialId(esp.id);
                      setSelectedCodigos([]);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all border flex items-center justify-between gap-3 ${isSelected
                        ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                          ID {esp.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {esp.hora_item} hrs
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                        {esp.nombre}
                      </h4>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black text-emerald-700 block">
                        {fmt(Math.round(totalDoc))}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block">
                        {rels.length} formaciones
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── COLUMNA 2: Mapeador y Formaciones Relacionadas (7 Cols) ────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Cabecera de Especialidad Activa + Métricas */}
            {selectedOficial && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Especialidad Oficial Activa
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-1.5">
                      {selectedOficial.nombre}
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      Ítem curricular: {selectedOficial.hora_item} horas semanales
                    </span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center sm:text-right flex-shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">Docentes Ponderados</span>
                    <span className="text-xl font-black text-emerald-900 tabular-nums">
                      {fmt(metricasActual.docentesEquivalentes)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                      {metricasActual.cantidadFormaciones} formaciones vinculadas ({fmt(metricasActual.docentesTotalBruto)} en bruto)
                    </span>
                  </div>
                </div>

                {/* ── Sugerencias Inteligentes de Vinculación ────────────────── */}
                {sugerenciasInteligentes.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Sugerencias Detectadas en el Padrón ({sugerenciasInteligentes.length})
                      </span>
                      <button
                        onClick={() => handleVincularBatch(sugerenciasInteligentes.map(s => s.cod_especialidad), 'DIRECTA')}
                        disabled={savingBatch}
                        className="px-2.5 py-1 text-[10px] font-black bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-2xs"
                      >
                        Vincular todas las sugeridas
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sugerenciasInteligentes.map(sug => (
                        <button
                          key={sug.cod_especialidad}
                          onClick={() => handleVincularBatch([sug.cod_especialidad], 'DIRECTA')}
                          className="px-2.5 py-1 bg-white border border-amber-300 rounded-xl text-[11px] font-bold text-slate-800 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3 text-amber-700" />
                          <span>{sug.especialidad_formacion}</span>
                          <span className="text-[10px] text-amber-800 font-black">({fmt(sug.total_docentes)})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Lista de Formaciones Ya Relacionadas ────────────────────── */}
                <div className="mt-4">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    Formaciones del Padrón Relacionadas ({activeRelaciones.length})
                  </h3>

                  {activeRelaciones.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                      No hay formaciones del padrón vinculadas a esta especialidad oficial todavía.
                      Usa el buscador inferior o las sugerencias para asociar.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/40">
                      {activeRelaciones.map(rel => {
                        const formacion = formacionesMap.get(rel.cod_especialidad_formacion);
                        return (
                          <div
                            key={rel.id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-white transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                  Cód. {rel.cod_especialidad_formacion}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {rel.tipo_relacion}
                                </span>
                                {rel.factor_ponderacion !== undefined && Number(rel.factor_ponderacion) < 1.0 && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    Subdivisión {Number(rel.factor_ponderacion) === 0.125 ? '1/8 (12.5%)' : `${(Number(rel.factor_ponderacion) * 100).toFixed(1)}%`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate mt-1">
                                {formacion?.especialidad_formacion || 'Cargando título...'}
                              </p>
                              {rel.observaciones && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{rel.observaciones}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800 tabular-nums block">
                                  {fmt(Math.round((formacion?.total_docentes || 0) * (rel.factor_ponderacion !== undefined ? Number(rel.factor_ponderacion) : 1.0)))} doc.
                                </span>
                                {rel.factor_ponderacion !== undefined && Number(rel.factor_ponderacion) < 1.0 && (
                                  <span className="text-[9px] text-slate-400 block">
                                    de {fmt(formacion?.total_docentes || 0)} totales
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleEliminarRelacion(rel.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar relación"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Explorador y Buscador de las 729 Especialidades SEP ─────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    Catálogo de Formaciones del Padrón Docente ({formacionesFiltradas.length} de {formaciones.length} Especialidades SEP)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Suma total en catálogo: <strong className="text-slate-800">{fmt(granTotalPadron)}</strong> maestros. Selecciona las que deseas vincular a «{selectedOficial?.nombre}».
                  </p>
                </div>
              </div>

              {/* ── BANDEJA DE FORMACIONES SELECCIONADAS (APARECE AL MARCAR CASILLAS) ── */}
              {selectedCodigos.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-500/80 shadow-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs">
                        {selectedCodigos.length}
                      </div>
                      <div>
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wide block">
                          Formaciones Seleccionadas para Vincular
                        </span>
                        <span className="text-xs font-black text-emerald-700">
                          Total acumulado: {fmt(totalDocentesSeleccionados)} maestros reales
                          {factorInput < 1.0 && (
                            <span className="text-slate-500 font-semibold ml-1">
                              ({fmt(Math.round(totalDocentesSeleccionados * factorInput))} ponderados a {(factorInput * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCodigos([])}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-emerald-100/60 rounded-xl transition-colors"
                      >
                        ✕ Desmarcar todas
                      </button>
                    </div>
                  </div>

                  {/* Lista de Chips de lo que seleccionaste */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/70 rounded-xl border border-emerald-200/60">
                    {selectedCodigos.map(cod => {
                      const f = formacionesMap.get(cod);
                      return (
                        <span
                          key={cod}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-slate-800 shadow-2xs"
                        >
                          <span className="font-mono text-[10px] text-emerald-700 font-black">Cód.{cod}</span>
                          <span className="max-w-[200px] truncate">{f?.especialidad_formacion || 'Cargando...'}</span>
                          <span className="text-emerald-900 font-black">({fmt(f?.total_docentes || 0)})</span>
                          <button
                            onClick={() => toggleSeleccion(cod)}
                            className="ml-1 text-slate-400 hover:text-red-600 font-black"
                            title="Desmarcar"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {/* Controles y Botón de Vinculación */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-emerald-200/60">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      <select
                        value={tipoRelacionInput}
                        onChange={(e) => setTipoRelacionInput(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="DIRECTA">Tipo: DIRECTA (100% Idónea)</option>
                        <option value="AFIN">Tipo: AFÍN (Área similar)</option>
                        <option value="TRANSVERSAL_COMPARTIDA">Tipo: TRANSVERSAL COMPARTIDA</option>
                        <option value="EQUIVALENTE">Tipo: EQUIVALENTE</option>
                      </select>

                      <select
                        value={factorInput}
                        onChange={(e) => setFactorInput(Number(e.target.value))}
                        className="px-2.5 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value={1.0}>Factor: 100% (Titular Exclusiva)</option>
                        <option value={0.125}>Factor: 1/8 (12.5% - Subdivisión BTH)</option>
                        <option value={0.5}>Factor: 1/2 (50.0% - Mitad)</option>
                        <option value={0.25}>Factor: 1/4 (25.0% - Cuarto)</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleVincularBatch(selectedCodigos, tipoRelacionInput, factorInput)}
                      disabled={savingBatch}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-black bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Vincular ({selectedCodigos.length}) a «{selectedOficial?.nombre}»
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filtros y Buscador */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por código (ej: 1228) o texto de especialidad..."
                    value={searchFormacion}
                    onChange={(e) => setSearchFormacion(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as any)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="SIN_VINCULAR">Solo no vinculadas a esta</option>
                  <option value="VINCULADAS">Solo vinculadas a esta</option>
                  <option value="TODOS">Ver todas ({formaciones.length})</option>
                </select>

                <select
                  value={tipoRelacionInput}
                  onChange={(e) => setTipoRelacionInput(e.target.value as any)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="DIRECTA">Tipo: DIRECTA (100% idónea)</option>
                  <option value="AFIN">Tipo: AFÍN (área similar)</option>
                  <option value="EQUIVALENTE">Tipo: EQUIVALENTE</option>
                  <option value="TRANSVERSAL">Tipo: TRANSVERSAL</option>
                </select>
              </div>

              {/* Tabla de Selección */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          onClick={seleccionarTodosVisibles}
                          className="text-slate-400 hover:text-slate-600"
                          title="Seleccionar primeros 30"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="py-2.5 px-3 w-16">Cód</th>
                      <th className="py-2.5 px-4">Especialidad de Formación en Padrón</th>
                      <th className="py-2.5 px-3 text-right">Docentes</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formacionesFiltradas.slice(0, 50).map((f) => {
                      const isLinked = codigosVinculadosActual.has(f.cod_especialidad);
                      const isChecked = selectedCodigos.includes(f.cod_especialidad);

                      return (
                        <tr
                          key={f.cod_especialidad}
                          className={`hover:bg-slate-50 transition-colors ${isLinked ? 'bg-emerald-50/30' : isChecked ? 'bg-blue-50/50' : ''
                            }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            {!isLinked && (
                              <button
                                onClick={() => toggleSeleccion(f.cod_especialidad)}
                                className="text-slate-400 hover:text-emerald-700"
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500 text-[11px]">
                            {f.cod_especialidad}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {f.especialidad_formacion}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums">
                            {fmt(f.total_docentes)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isLinked ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Vinculada
                              </span>
                            ) : (
                              <button
                                onClick={() => handleVincularBatch([f.cod_especialidad])}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Vincular
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {formacionesFiltradas.length > 50 && (
                <div className="text-center text-[11px] text-slate-400 font-medium">
                  Mostrando las primeras 50 especialidades por volumen de docentes. Usa el buscador para filtrar entre las {formacionesFiltradas.length}.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
