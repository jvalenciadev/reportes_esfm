'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    Search,
    ShieldCheck,
    GraduationCap,
    Users,
    TrendingUp,
    BookOpen,
    Target,
    Layers3,
    ChartNoAxesCombined,
    PieChart,
    RefreshCw,
    Filter,
    Lightbulb,
    ArrowRight,
    FileSpreadsheet
} from 'lucide-react';

import { DashboardDataset } from '@/types/stats';

// ─── Tipos robustos alineados al esquema deduplicado de /api/pertinencia ─────

type Rango = 'V' | 'A' | 'N' | 'SIN';

interface RangoSummary {
    rango: Rango | string;
    docentes: number;
    asignaciones?: number;
    ues: number;
    horas_total?: number;
    estudiantes_atendidos?: number;
}

interface DepartamentoRangos {
    departamento: string;
    rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface NivelRangos {
    nivel: string;
    rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
}

interface EspecialidadItem {
    especialidad: string;
    docentes: number;
    ues: number;
    horas: number;
    rangos: Record<Rango, { docentes: number; ues: number; horas: number }>;
    por_departamento: Record<string, Record<Rango | 'total', number>>;
}

interface PertinenciaData {
    resumen?: Record<Rango | 'TOTAL', RangoSummary & { docentes: number; ues: number; estudiantes_atendidos?: number }>;
    por_departamento?: DepartamentoRangos[];
    por_nivel?: NivelRangos[];
    por_especialidad?: EspecialidadItem[];
}

interface ResumenViewProps {
    data?: DashboardDataset;
}

type Dictamen = 'TODOS' | 'ABRIR' | 'REGULAR' | 'CONGELAR';

const especialidadesBase = [
    { nombre: 'Matemática', nivel: 'Secundaria', dictamen: 'ABRIR', par: 3, deficit: 101 },
    { nombre: 'Física - Química', nivel: 'Secundaria', dictamen: 'ABRIR', par: 2, deficit: 75 },
    { nombre: 'Educación Especial', nivel: 'Especial', dictamen: 'ABRIR', par: 2, deficit: 64 },
    { nombre: 'Biología - Geografía', nivel: 'Secundaria', dictamen: 'REGULAR', par: 1, deficit: 32 },
    { nombre: 'Lengua Castellana y Originaria', nivel: 'Secundaria', dictamen: 'REGULAR', par: 1, deficit: 28 },
    { nombre: 'Lengua Extranjera (Inglés/Francés)', nivel: 'Secundaria', dictamen: 'ABRIR', par: 2, deficit: 45 },
    { nombre: 'Técnica Tecnológica General y Especializada', nivel: 'Secundaria', dictamen: 'ABRIR', par: 3, deficit: 88 },
    { nombre: 'Técnica Productiva', nivel: 'Técnica', dictamen: 'ABRIR', par: 2, deficit: 50 },
    { nombre: 'Artes Plásticas y Visuales', nivel: 'Secundaria', dictamen: 'REGULAR', par: 1, deficit: 15 },
    { nombre: 'Educación Musical', nivel: 'Secundaria', dictamen: 'REGULAR', par: 1, deficit: 10 },
    { nombre: 'Educación Alternativa y Permanente', nivel: 'Alternativa', dictamen: 'REGULAR', par: 1, deficit: 20 },
    { nombre: 'Ciencias Sociales', nivel: 'Secundaria', dictamen: 'CONGELAR', par: 0, deficit: -18 },
    { nombre: 'Educación Física y Deportes', nivel: 'Secundaria', dictamen: 'CONGELAR', par: 0, deficit: -12 },
    { nombre: 'Cosmovisiones, Filosofía y Psicología', nivel: 'Secundaria', dictamen: 'CONGELAR', par: 0, deficit: -22 },
    { nombre: 'Valores, Espiritualidad y Religiones', nivel: 'Secundaria', dictamen: 'CONGELAR', par: 0, deficit: -8 },
    { nombre: 'Educación Inicial en Familia Comunitaria', nivel: 'Inicial', dictamen: 'CONGELAR', par: 0, deficit: -45 },
    { nombre: 'Educación Primaria Comunitaria Vocacional', nivel: 'Primaria', dictamen: 'CONGELAR', par: 0, deficit: -120 },
];

const COLORS = {
    ALTA: '#10b981',      // V - Verde
    MEDIA: '#3b82f6',     // A - Azul
    BAJA: '#f97316',      // N - Naranja
    NOPERT: '#f43f5e',    // SIN - No pertinente
};

const formatNumber = (n: number) =>
    new Intl.NumberFormat('es-BO').format(Math.round(n || 0));

// Prioridad de rango único por docente en caso de recibir filas crudas sin agrupar
const RANGO_PRIORITY: Record<Rango, number> = {
    V: 4,
    A: 3,
    N: 2,
    SIN: 1,
};

export function ResumenView({ data }: ResumenViewProps) {
    const [filterDictamen, setFilterDictamen] = useState<Dictamen>('TODOS');
    const [searchTerm, setSearchTerm] = useState('');

    const [pertinenciaData, setPertinenciaData] = useState<PertinenciaData | null>(null);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [fileError, setFileError] = useState<string | null>(null);

    const [selectedDpto, setSelectedDpto] = useState('TODOS');
    const [selectedNivel, setSelectedNivel] = useState('TODOS');
    const [selectedEspFilter, setSelectedEspFilter] = useState('TODOS');

    // 1. Carga y deduplicación de docentes únicos desde /api/pertinencia
    useEffect(() => {
        let cancelado = false;

        setLoadingFiles(true);
        setFileError(null);

        fetch('/api/pertinencia', { cache: 'no-store' })
            .then(async (r) => {
                const json = await r.json();
                if (!r.ok) {
                    throw new Error(json?.error || 'Error al obtener datos de pertinencia');
                }
                return json;
            })
            .then((resRaw) => {
                if (cancelado) return;

                let payload: PertinenciaData = resRaw;
                if (resRaw && typeof resRaw === 'object' && 'data' in resRaw && !('resumen' in resRaw)) {
                    payload = resRaw.data;
                }

                // Si el endpoint devuelve filas crudas (asignaciones), deduplicamos por docente único (RDA / CI / ID)
                if (Array.isArray(payload)) {
                    const filas = payload;
                    const docentesUnicos = new Map<string, { rango: Rango; depto: string; nivel: string; esp: string }>();

                    filas.forEach((f: any, idx: number) => {
                        const docId = String(
                            f.rda || f.RDA || f.ci || f.CI || f.docente_id || f.id_docente || `row_${idx}`
                        ).trim();

                        const colorRaw = String(f.color || f.rango || f.Pertinencia || f.PERTINENCIA || '')
                            .trim()
                            .toUpperCase();
                        const rango: Rango = (['V', 'A', 'N', 'SIN'].includes(colorRaw) ? colorRaw : 'SIN') as Rango;

                        const depto = String(f.departamento || f.DEPARTAMENTO || 'NO ESPECIFICADO').trim().toUpperCase();
                        const nivel = String(f.nivel || f.NIVEL || 'No especificado').trim();
                        const esp = String(f.especialidad || f.ESPECIALIDAD || 'No especificada').trim();

                        const prev = docentesUnicos.get(docId);
                        if (!prev || RANGO_PRIORITY[rango] > RANGO_PRIORITY[prev.rango]) {
                            docentesUnicos.set(docId, { rango, depto, nivel, esp });
                        }
                    });

                    const resumenMap: Record<Rango | 'TOTAL', RangoSummary & { docentes: number; ues: number }> = {
                        V: { rango: 'V', docentes: 0, ues: 0 },
                        A: { rango: 'A', docentes: 0, ues: 0 },
                        N: { rango: 'N', docentes: 0, ues: 0 },
                        SIN: { rango: 'SIN', docentes: 0, ues: 0 },
                        TOTAL: { rango: 'TOTAL', docentes: 0, ues: 0 },
                    };

                    const deptoMap = new Map<string, Record<Rango, { docentes: number; ues: number; horas: number }>>();
                    const nivelMap = new Map<string, Record<Rango, { docentes: number; ues: number; horas: number }>>();
                    const espMap = new Map<string, EspecialidadItem>();

                    docentesUnicos.forEach(({ rango, depto, nivel, esp }) => {
                        resumenMap[rango].docentes += 1;
                        resumenMap.TOTAL.docentes += 1;

                        // Agrupar por Departamento (sin repetidos)
                        if (!deptoMap.has(depto)) {
                            deptoMap.set(depto, {
                                V: { docentes: 0, ues: 0, horas: 0 },
                                A: { docentes: 0, ues: 0, horas: 0 },
                                N: { docentes: 0, ues: 0, horas: 0 },
                                SIN: { docentes: 0, ues: 0, horas: 0 },
                            });
                        }
                        deptoMap.get(depto)![rango].docentes += 1;

                        // Agrupar por Nivel (sin repetidos)
                        if (!nivelMap.has(nivel)) {
                            nivelMap.set(nivel, {
                                V: { docentes: 0, ues: 0, horas: 0 },
                                A: { docentes: 0, ues: 0, horas: 0 },
                                N: { docentes: 0, ues: 0, horas: 0 },
                                SIN: { docentes: 0, ues: 0, horas: 0 },
                            });
                        }
                        nivelMap.get(nivel)![rango].docentes += 1;

                        // Agrupar por Especialidad x Departamento (sin repetidos)
                        if (!espMap.has(esp)) {
                            espMap.set(esp, {
                                especialidad: esp,
                                docentes: 0,
                                ues: 0,
                                horas: 0,
                                rangos: {
                                    V: { docentes: 0, ues: 0, horas: 0 },
                                    A: { docentes: 0, ues: 0, horas: 0 },
                                    N: { docentes: 0, ues: 0, horas: 0 },
                                    SIN: { docentes: 0, ues: 0, horas: 0 },
                                },
                                por_departamento: {},
                            });
                        }
                        const espItem = espMap.get(esp)!;
                        espItem.docentes += 1;
                        espItem.rangos[rango].docentes += 1;
                        if (!espItem.por_departamento[depto]) {
                            espItem.por_departamento[depto] = { V: 0, A: 0, N: 0, SIN: 0, total: 0 };
                        }
                        espItem.por_departamento[depto][rango] += 1;
                        espItem.por_departamento[depto].total += 1;
                    });

                    payload = {
                        resumen: resumenMap,
                        por_departamento: Array.from(deptoMap.entries()).map(([departamento, rangos]) => ({
                            departamento,
                            rangos,
                        })),
                        por_nivel: Array.from(nivelMap.entries()).map(([nivel, rangos]) => ({
                            nivel,
                            rangos,
                        })),
                        por_especialidad: Array.from(espMap.values()),
                    };
                }

                // Normalización de respaldo si falta alguna estructura en el objeto
                if (!payload || !payload.resumen) {
                    payload = {
                        resumen: {
                            V: { rango: 'V', docentes: 0, ues: 0 },
                            A: { rango: 'A', docentes: 0, ues: 0 },
                            N: { rango: 'N', docentes: 0, ues: 0 },
                            SIN: { rango: 'SIN', docentes: 0, ues: 0 },
                            TOTAL: { rango: 'TOTAL', docentes: 0, ues: 0 },
                        },
                        por_departamento: payload?.por_departamento || [],
                        por_nivel: payload?.por_nivel || [],
                        por_especialidad: payload?.por_especialidad || [],
                    };
                }

                setPertinenciaData(payload);
                setLoadingFiles(false);
            })
            .catch((e) => {
                if (!cancelado) {
                    setFileError(e instanceof Error ? e.message : String(e));
                    setLoadingFiles(false);
                }
            });

        return () => {
            cancelado = true;
        };
    }, []);

    // Listas dinámicas completas desde el JSON deduplicado (los 9 departamentos, todos los niveles y las 20 especialidades)
    const departamentosList = useMemo(() => {
        if (!pertinenciaData?.por_departamento) return [];
        return pertinenciaData.por_departamento
            .map(d => d.departamento)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
    }, [pertinenciaData]);

    const nivelesList = useMemo(() => {
        if (!pertinenciaData?.por_nivel) return [];
        return pertinenciaData.por_nivel
            .map(n => n.nivel)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
    }, [pertinenciaData]);

    const especialidadesList = useMemo(() => {
        if (!pertinenciaData?.por_especialidad) return [];
        return pertinenciaData.por_especialidad
            .map(e => e.especialidad)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
    }, [pertinenciaData]);

    // 2. Cálculo exacto de estadísticas sin repetidos (alineado a a2)
    const pertStats = useMemo(() => {
        if (!pertinenciaData || !pertinenciaData.resumen) {
            return {
                total: 0,
                pertinentes: 0,
                impertinentes: 0,
                alta: 0,
                media: 0,
                baja: 0,
                noPert: 0,
                pctAlta: 0,
                pctMedia: 0,
                pctBaja: 0,
                pctNoPert: 0,
                pctPertinente: 0,
            };
        }

        let alta = 0;   // V
        let media = 0;  // A
        let baja = 0;   // N
        let noPert = 0; // SIN
        let totalExplicito: number | null = null;

        if (selectedEspFilter !== 'TODOS' && pertinenciaData.por_especialidad) {
            const espObj = pertinenciaData.por_especialidad.find(
                e => e.especialidad.toUpperCase() === selectedEspFilter.toUpperCase()
            );
            if (espObj) {
                if (selectedDpto !== 'TODOS') {
                    // Busca coincidencia exacta o insensible a mayúsculas en por_departamento de la especialidad
                    const depKey = Object.keys(espObj.por_departamento || {}).find(
                        k => k.toUpperCase() === selectedDpto.toUpperCase()
                    );
                    const depStats = depKey ? espObj.por_departamento[depKey] : undefined;
                    if (depStats) {
                        alta = depStats.V ?? 0;
                        media = depStats.A ?? 0;
                        baja = depStats.N ?? 0;
                        noPert = depStats.SIN ?? 0;
                        totalExplicito = depStats.total ?? (alta + media + baja + noPert);
                    }
                } else {
                    alta = espObj.rangos?.V?.docentes ?? 0;
                    media = espObj.rangos?.A?.docentes ?? 0;
                    baja = espObj.rangos?.N?.docentes ?? 0;
                    noPert = espObj.rangos?.SIN?.docentes ?? 0;
                    totalExplicito = espObj.docentes ?? (alta + media + baja + noPert);
                }
            }
        } else if (selectedDpto !== 'TODOS' && pertinenciaData.por_departamento) {
            const depObj = pertinenciaData.por_departamento.find(
                d => d.departamento.toUpperCase() === selectedDpto.toUpperCase()
            );
            if (depObj && depObj.rangos) {
                alta = depObj.rangos.V?.docentes ?? 0;
                media = depObj.rangos.A?.docentes ?? 0;
                baja = depObj.rangos.N?.docentes ?? 0;
                noPert = depObj.rangos.SIN?.docentes ?? 0;
            }
        } else if (selectedNivel !== 'TODOS' && pertinenciaData.por_nivel) {
            const nivObj = pertinenciaData.por_nivel.find(
                n => n.nivel.toUpperCase() === selectedNivel.toUpperCase()
            );
            if (nivObj && nivObj.rangos) {
                alta = nivObj.rangos.V?.docentes ?? 0;
                media = nivObj.rangos.A?.docentes ?? 0;
                baja = nivObj.rangos.N?.docentes ?? 0;
                noPert = nivObj.rangos.SIN?.docentes ?? 0;
            }
        } else {
            // Vista Nacional consolidada deduplicada (igual que en a2: 147,096 docentes únicos)
            alta = pertinenciaData.resumen.V?.docentes ?? 0;
            media = pertinenciaData.resumen.A?.docentes ?? 0;
            baja = pertinenciaData.resumen.N?.docentes ?? 0;
            noPert = pertinenciaData.resumen.SIN?.docentes ?? 0;
            if (pertinenciaData.resumen.TOTAL?.docentes) {
                totalExplicito = pertinenciaData.resumen.TOTAL.docentes;
            }
        }

        const sumaRangos = alta + media + baja + noPert;
        const total = totalExplicito !== null && totalExplicito > 0 ? totalExplicito : sumaRangos;
        const pertinentes = alta + media + baja;

        return {
            total,
            pertinentes,
            impertinentes: noPert,
            alta,
            media,
            baja,
            noPert,
            pctAlta: total ? Number(((alta / total) * 100).toFixed(1)) : 0,
            pctMedia: total ? Number(((media / total) * 100).toFixed(1)) : 0,
            pctBaja: total ? Number(((baja / total) * 100).toFixed(1)) : 0,
            pctNoPert: total ? Number(((noPert / total) * 100).toFixed(1)) : 0,
            pctPertinente: total ? Number(((pertinentes / total) * 100).toFixed(1)) : 0,
        };
    }, [pertinenciaData, selectedDpto, selectedNivel, selectedEspFilter]);

    // 3. Estudiantes afectados calculados sobre docentes únicos sin pertinencia
    const estudiantesAfectadosStats = useMemo(() => {
        if (!pertinenciaData?.resumen) {
            return {
                totalEstudiantesAfectados: 0,
                porDpto: [] as [string, number][],
                porNivel: [] as [string, number][],
            };
        }

        const totalDocSin = pertinenciaData.resumen.SIN?.docentes || 1;
        const estSinNacional = pertinenciaData.resumen.SIN?.estudiantes_atendidos;
        const ratioEstudiantes = estSinNacional ? estSinNacional / totalDocSin : 48;

        const porDpto: [string, number][] = (pertinenciaData.por_departamento || [])
            .filter(d => selectedDpto === 'TODOS' || d.departamento.toUpperCase() === selectedDpto.toUpperCase())
            .map(d => {
                const docSin = d.rangos?.SIN?.docentes ?? 0;
                return [d.departamento, Math.round(docSin * ratioEstudiantes)] as [string, number];
            })
            .sort((a, b) => b[1] - a[1]);

        const porNivel: [string, number][] = (pertinenciaData.por_nivel || [])
            .filter(n => selectedNivel === 'TODOS' || n.nivel.toUpperCase() === selectedNivel.toUpperCase())
            .map(n => {
                const docSin = n.rangos?.SIN?.docentes ?? 0;
                return [n.nivel || 'No especificado', Math.round(docSin * ratioEstudiantes)] as [string, number];
            })
            .sort((a, b) => b[1] - a[1]);

        const totalEstudiantesAfectados =
            selectedDpto === 'TODOS' && selectedNivel === 'TODOS' && estSinNacional !== undefined
                ? estSinNacional
                : porDpto.reduce((acc, [, val]) => acc + val, 0);

        return { totalEstudiantesAfectados, porDpto, porNivel };
    }, [pertinenciaData, selectedDpto, selectedNivel]);

    // Interpretación estratégica automática
    const interpretacionDinamica = useMemo(() => {
        const { pctAlta, pctMedia, pctBaja, pctNoPert, total } = pertStats;
        const filtroTexto = `[Filtros activos -> Depto: ${selectedDpto} | Nivel: ${selectedNivel} | Especialidad: ${selectedEspFilter === 'TODOS' ? 'Todas' : selectedEspFilter}]`;

        if (total === 0) {
            return {
                mensajePrincipal: 'No se encontraron registros en la base de datos para los criterios seleccionados.',
                recomendacionFormacion: 'Ajuste los filtros de departamento, nivel o especialidad para visualizar las métricas correspondientes.',
                filtroTexto,
            };
        }

        let mensajePrincipal = '';
        let recomendacionFormacion = '';

        if (pctAlta >= 50) {
            mensajePrincipal = `Predominio notable de Alta Pertinencia (${pctAlta}%). El personal docente ejerce mayoritariamente en su área de formación específica.`;
            recomendacionFormacion = 'La formación en las ESFM debe enfocarse en mantener cupos estables y especialización avanzada (maestrías/diplomados), priorizando la actualización continua más que la expansión masiva de nuevos ítems en esta área.';
        } else if (pctMedia >= pctAlta && pctMedia >= pctBaja) {
            mensajePrincipal = `Se observa un nivel predominante de Pertinencia Media (${pctMedia}%). Existe compatibilidad general, pero con margen de especialización.`;
            recomendacionFormacion = 'Se recomienda programar cursos de complementación pedagógica y actualización curricular en las ESFM para elevar a los docentes hacia un perfil de alta pertinencia (V).';
        } else if (pctBaja > 25 || pctNoPert > 30) {
            mensajePrincipal = `Alerta: Alta incidencia de Baja Pertinencia o Impertinencia (${(pctBaja + pctNoPert).toFixed(1)}%). Varios estudiantes reciben clases de docentes fuera de su especialidad de origen.`;
            recomendacionFormacion = 'Es urgente reestructurar la asignación de cargas horarias e impulsar procesos de reubicación institucional y profesionalización focalizada desde las ESFM para corregir esta distorsión en el aula.';
        } else {
            mensajePrincipal = `Distribución equilibrada entre los niveles de pertinencia en el sector seleccionado (${selectedDpto === 'TODOS' ? 'Nivel Nacional' : selectedDpto}).`;
            recomendacionFormacion = 'Mantener un monitoreo trimestral del RDA y coordinar con las direcciones departamentales la apertura selectiva de paralelos en las ESFM.';
        }

        return { mensajePrincipal, recomendacionFormacion, filtroTexto };
    }, [pertStats, selectedDpto, selectedNivel, selectedEspFilter]);

    const stats = useMemo(() => {
        const abrir = especialidadesBase.filter(e => e.dictamen === 'ABRIR').length;
        const regular = especialidadesBase.filter(e => e.dictamen === 'REGULAR').length;
        const congelar = especialidadesBase.filter(e => e.dictamen === 'CONGELAR').length;
        const total = especialidadesBase.length;
        const paralelos = especialidadesBase.reduce((a, e) => a + e.par, 0);

        return {
            abrir,
            regular,
            congelar,
            total,
            paralelos,
            plazas: paralelos * 30,
            deficit: especialidadesBase.reduce((a, e) => a + e.deficit, 0),
            pctAbrir: Math.round((abrir / total) * 100),
            pctRegular: Math.round((regular / total) * 100),
            pctCongelar: Math.round((congelar / total) * 100),
        };
    }, []);

    const filteredEsp = useMemo(() => {
        return especialidadesBase.filter(e => {
            const matchSearch = e.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchFilter = filterDictamen === 'TODOS' || e.dictamen === filterDictamen;
            return matchSearch && matchFilter;
        });
    }, [searchTerm, filterDictamen]);

    const ranking = [...especialidadesBase].sort((a, b) => b.deficit - a.deficit);
    const maxDeficit = Math.max(...ranking.map(e => Math.abs(e.deficit)));

    const donutStyle = {
        background: `conic-gradient(
            ${COLORS.ALTA} 0% ${pertStats.pctAlta}%,
            ${COLORS.MEDIA} ${pertStats.pctAlta}% ${pertStats.pctAlta + pertStats.pctMedia}%,
            ${COLORS.BAJA} ${pertStats.pctAlta + pertStats.pctMedia}% ${pertStats.pctAlta + pertStats.pctMedia + pertStats.pctBaja}%,
            ${COLORS.NOPERT} ${pertStats.pctAlta + pertStats.pctMedia + pertStats.pctBaja}% 100%
        )`
    };

    const statusStyle = (dictamen: string) => {
        if (dictamen === 'ABRIR') return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
        if (dictamen === 'REGULAR') return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' };
        return { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' };
    };

    return (
        <div className="space-y-7 pb-10 text-slate-800 animate-fadeIn">

            {/* HEADER */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#101a35] via-indigo-950 to-[#172554] p-6 sm:p-9 text-white shadow-xl">
                <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="max-w-2xl">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Sistema estratégico
                            </span>
                            <span className="text-xs font-semibold text-slate-400">ESFM · Gestión 2027–2031</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                            Tablero Estratégico
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300">
                                de Apertura y Pertinencia
                            </span>
                        </h1>

                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
                            Cruce automatizado de pertinencia curricular sobre {formatNumber(pertStats.total)} docentes únicos evaluados en el padrón oficial.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                        <HeaderMetric icon={<Users size={20} />} value={stats.paralelos} label="Paralelos 2027" color="text-emerald-300" />
                        <HeaderMetric icon={<GraduationCap size={20} />} value={stats.plazas} label="Plazas proyectadas" color="text-amber-300" />
                    </div>
                </div>
            </section>

            {/* SECCIÓN DE FILTROS DINÁMICOS */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-base font-black text-slate-900">Filtros de Análisis Nacional</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {(selectedDpto !== 'TODOS' || selectedNivel !== 'TODOS' || selectedEspFilter !== 'TODOS') && (
                            <button
                                onClick={() => {
                                    setSelectedDpto('TODOS');
                                    setSelectedNivel('TODOS');
                                    setSelectedEspFilter('TODOS');
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                            >
                                Limpiar filtros
                            </button>
                        )}
                        {loadingFiles && (
                            <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold animate-pulse">
                                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando diagnóstico de pertinencia...
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Departamento ({departamentosList.length}):</label>
                        <select
                            value={selectedDpto}
                            onChange={(e) => {
                                setSelectedDpto(e.target.value);
                                if (e.target.value !== 'TODOS') setSelectedNivel('TODOS');
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="TODOS">TODOS LOS DEPARTAMENTOS</option>
                            {departamentosList.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Nivel Educativo ({nivelesList.length}):</label>
                        <select
                            value={selectedNivel}
                            onChange={(e) => {
                                setSelectedNivel(e.target.value);
                                if (e.target.value !== 'TODOS') {
                                    setSelectedDpto('TODOS');
                                    setSelectedEspFilter('TODOS');
                                }
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="TODOS">TODOS LOS NIVELES</option>
                            {nivelesList.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Especialidad ({especialidadesList.length}):</label>
                        <select
                            value={selectedEspFilter}
                            onChange={(e) => {
                                setSelectedEspFilter(e.target.value);
                                if (e.target.value !== 'TODOS') setSelectedNivel('TODOS');
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 truncate"
                        >
                            <option value="TODOS">TODAS LAS ESPECIALIDADES</option>
                            {especialidadesList.map(esp => (
                                <option key={esp} value={esp}>{esp}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {fileError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <p className="font-bold">Error al cargar los datos de pertinencia.</p>
                    <p className="mt-1">{fileError}</p>
                </div>
            )}

            {/* KPI CARDS FILTRADAS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title="Docentes Únicos Evaluados" value={formatNumber(pertStats.total)} subtitle="Sin duplicidad de registros" icon={<BookOpen size={21} />} color="indigo" />
                <KpiCard title="Pertinencia Alta (V)" value={formatNumber(pertStats.alta)} subtitle={`${pertStats.pctAlta}% del total`} icon={<CheckCircle2 size={21} />} color="emerald" />
                <KpiCard title="Pertinencia Media (A)" value={formatNumber(pertStats.media)} subtitle={`${pertStats.pctMedia}% del total`} icon={<ShieldCheck size={21} />} color="indigo" />
                <KpiCard title="Baja / Sin Pertinencia" value={formatNumber(pertStats.baja + pertStats.noPert)} subtitle={`${(pertStats.pctBaja + pertStats.pctNoPert).toFixed(1)}% fuera de rango`} icon={<AlertTriangle size={21} />} color="rose" />
            </section>

            {/* GRÁFICO DE DONA E INTERPRETACIÓN ESTRATÉGICA DINÁMICA */}
            <section className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                <div className="xl:col-span-2 rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900">Niveles de Pertinencia</h2>
                                <p className="mt-1 text-xs text-slate-500">Desglose por rangos (V, A, N) y Sin Pertinencia</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><PieChart size={20} /></div>
                        </div>

                        <div className="flex justify-center py-6">
                            <div className="relative h-52 w-52 rounded-full transition-all duration-700 shadow-inner" style={donutStyle}>
                                <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                                    <span className="text-4xl font-black tracking-tight text-slate-900">{formatNumber(pertStats.total)}</span>
                                    <span className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Docentes únicos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <LegendItem label="Alta Pertinencia (Verde - V)" count={pertStats.alta} percentage={pertStats.pctAlta} color="bg-emerald-500" />
                        <LegendItem label="Media Pertinencia (Azul - A)" count={pertStats.media} percentage={pertStats.pctMedia} color="bg-blue-500" />
                        <LegendItem label="Baja Pertinencia (Naranja - N)" count={pertStats.baja} percentage={pertStats.pctBaja} color="bg-orange-500" />
                        <LegendItem label="Sin Pertinencia (SIN)" count={pertStats.noPert} percentage={pertStats.pctNoPert} color="bg-rose-500" />
                    </div>
                </div>

                <div className="xl:col-span-3 rounded-[26px] border border-indigo-100 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white shadow-md flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
                                <h2 className="text-base font-black text-white">Interpretación Estratégica Automática</h2>
                            </div>
                            <span className="text-[10px] font-mono bg-white/10 px-2.5 py-1 rounded-full text-indigo-200 border border-white/10">
                                Dinámica por Filtros
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-indigo-200 italic">
                            {interpretacionDinamica.filtroTexto}
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">Diagnóstico del Nivel Predominante:</span>
                                <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed">
                                    {interpretacionDinamica.mensajePrincipal}
                                </p>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">Implicancia en la Formación ESFM:</span>
                                <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
                                    {interpretacionDinamica.recomendacionFormacion}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                        <span>Estado de Cobertura Docente</span>
                        <span className="font-black text-emerald-400 flex items-center gap-1">
                            {pertStats.pctPertinente}% Pertinente <ArrowRight size={14} />
                        </span>
                    </div>
                </div>
            </section>

            {/* SECCIÓN: ESTUDIANTES AFECTADOS POR DOCENTES SIN PERTINENCIA */}
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                            Estudiantes Afectados por Docentes Sin Pertinencia
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Matrícula estudiantil estimada atendida por docentes sin pertinencia en {selectedDpto === 'TODOS' ? 'todos los departamentos' : selectedDpto}
                        </p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2 text-right">
                        <span className="text-[10px] font-bold text-rose-600 uppercase block">Estudiantes con Docentes Sin Pertinencia</span>
                        <span className="text-lg font-black text-rose-900">~{formatNumber(estudiantesAfectadosStats.totalEstudiantesAfectados)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Afectados por Departamento</h3>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {estudiantesAfectadosStats.porDpto.length > 0 ? (
                                estudiantesAfectadosStats.porDpto.map(([dpto, count]) => (
                                    <div key={dpto} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                                        <span className="font-bold text-slate-800">{dpto}</span>
                                        <span className="font-black text-rose-600">~{formatNumber(count)} est.</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic">No hay registros para este filtro.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Afectados por Nivel Educativo</h3>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {estudiantesAfectadosStats.porNivel.length > 0 ? (
                                estudiantesAfectadosStats.porNivel.map(([niv, count]) => (
                                    <div key={niv} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                                        <span className="font-bold text-slate-800">{niv}</span>
                                        <span className="font-black text-amber-600">~{formatNumber(count)} est.</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic">No hay registros para este filtro.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* BALANCE ESTRATÉGICO DE ADMISIÓN */}
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Balance estratégico de admisión y capacidad ESFM</h2>
                        <p className="mt-1 text-xs text-slate-500">Distribución porcentual del dictamen de apertura para la gestión 2027–2031</p>
                    </div>
                    <ChartNoAxesCombined size={24} className="text-indigo-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="lg:col-span-2 space-y-6">
                        <DistributionBar label="Recomendación de apertura" count={stats.abrir} percentage={stats.pctAbrir} color="bg-emerald-500" description="Especialidades con déficit identificado" />
                        <DistributionBar label="Recomendación de regularización" count={stats.regular} percentage={stats.pctRegular} color="bg-amber-500" description="Especialidades que requieren ajustes" />
                        <DistributionBar label="Recomendación de congelamiento" count={stats.congelar} percentage={stats.pctCongelar} color="bg-rose-500" description="Especialidades con balance superavitario" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Target size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Balance neto ítems</span>
                            </div>
                            <div className={`mt-2 text-2xl font-black ${stats.deficit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stats.deficit > 0 ? '+' : ''}{formatNumber(stats.deficit)}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4">
                            <div className="flex items-center gap-2 text-indigo-500">
                                <Layers3 size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Capacidad proyectada</span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-indigo-700">{stats.plazas} plazas</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* RANKING */}
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-7">
                    <div>
                        <h2 className="font-black text-slate-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-emerald-600" />
                            Ranking de déficit por especialidad
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">Priorización según balance de ítems</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-500">{ranking.length} ESPECIALIDADES</span>
                </div>

                <div className="space-y-5">
                    {ranking.map((item, index) => {
                        const style = statusStyle(item.dictamen);
                        const positive = item.deficit >= 0;
                        const width = (Math.abs(item.deficit) / maxDeficit) * 100;

                        return (
                            <div key={item.nombre}>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">{index + 1}</span>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-black text-slate-800">{item.nombre}</p>
                                            <p className="text-[10px] text-slate-400">{item.nivel}</p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className={`text-xs font-black ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>{positive ? '+' : ''}{item.deficit}</span>
                                        <span className={`hidden sm:inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${style.bg} ${style.color} ${style.border}`}>{item.dictamen}</span>
                                    </div>
                                </div>
                                <div className="ml-10 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full transition-all duration-700 ${positive ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`} style={{ width: `${width}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* DIRECTORIO */}
            <section className="space-y-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">Directorio de especialidades</h2>
                        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600">{filteredEsp.length}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Consulta y filtra las recomendaciones de admisión.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-1 flex-wrap gap-2">
                        {(['TODOS', 'ABRIR', 'REGULAR', 'CONGELAR'] as const).map(filtro => (
                            <button
                                key={filtro}
                                onClick={() => setFilterDictamen(filtro)}
                                className={`rounded-xl px-4 py-2.5 text-[10px] font-black transition-all ${filterDictamen === filtro ? 'bg-[#101a35] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {filtro}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar especialidad..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {filteredEsp.map(item => {
                        const style = statusStyle(item.dictamen);
                        return (
                            <article key={item.nombre} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className={`absolute left-0 top-0 h-1 w-full ${item.dictamen === 'ABRIR' ? 'bg-emerald-500' : item.dictamen === 'REGULAR' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                <div className="flex items-start justify-between gap-2">
                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">{item.nivel}</span>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black ${style.bg} ${style.color} ${style.border}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                        {item.dictamen}
                                    </span>
                                </div>
                                <h3 className="mt-5 min-h-[44px] text-base font-black leading-tight text-slate-900 transition-colors group-hover:text-indigo-600">{item.nombre}</h3>
                                <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold text-slate-400">Balance de ítems</span>
                                        <span className={`text-sm font-black ${item.deficit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.deficit > 0 ? '+' : ''}{formatNumber(item.deficit)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold text-slate-400">Paralelos</span>
                                        <span className="text-xs font-black text-slate-800">{item.par}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold text-slate-400">Plazas proyectadas</span>
                                        <span className="text-xs font-black text-indigo-700">{item.par * 30}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-slate-500">Tablero de análisis estratégico ESFM y Pertinencia Nacional</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Proyección institucional · 2027–2031</span>
            </footer>
        </div>
    );
}

function HeaderMetric({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
            <div className={`mb-3 ${color}`}>{icon}</div>
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div>
        </div>
    );
}

function KpiCard({ title, value, subtitle, icon, color }: { title: string; value: number | string; subtitle: string; icon: React.ReactNode; color: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
    const themes = {
        indigo: { icon: 'bg-indigo-50 text-indigo-600', line: 'bg-indigo-500', value: 'text-indigo-700' },
        emerald: { icon: 'bg-emerald-50 text-emerald-600', line: 'bg-emerald-500', value: 'text-emerald-700' },
        amber: { icon: 'bg-amber-50 text-amber-600', line: 'bg-amber-500', value: 'text-amber-700' },
        rose: { icon: 'bg-rose-50 text-rose-600', line: 'bg-rose-500', value: 'text-rose-700' },
    };
    const theme = themes[color];

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className={`absolute left-0 top-0 h-full w-1 ${theme.line}`} />
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                    <p className={`mt-3 text-3xl font-black ${theme.value}`}>{value}</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">{subtitle}</p>
                </div>
                <div className={`rounded-2xl p-3 ${theme.icon}`}>{icon}</div>
            </div>
        </div>
    );
}

function LegendItem({ label, count, percentage, color }: { label: string; count: number; percentage: number; color: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <span className="text-xs font-bold text-slate-600">{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-900">{formatNumber(count)}</span>
                <span className="w-12 text-right text-xs text-slate-400">{percentage}%</span>
            </div>
        </div>
    );
}

function DistributionBar({ label, count, percentage, color, description }: { label: string; count: number; percentage: number; color: string; description: string }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-black text-slate-800">{label}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{description}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{count}</p>
                    <p className="text-[10px] font-bold text-slate-400">{percentage}%</p>
                </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}