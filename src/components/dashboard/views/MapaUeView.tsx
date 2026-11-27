'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  School,
  Users,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ExternalLink,
  Download,
  Compass,
  CheckCircle2,
  X,
  Target,
  RefreshCw,
  Building2,
  Star,
  GraduationCap,
  BookOpen,
  Moon,
  ChevronRight,
  Info,
  HelpCircle,
  Check,
  Clock,
  Hourglass,
  SlidersHorizontal,
  UserCheck,
  Calendar,
  Briefcase
} from 'lucide-react';

interface UeCompact {
  c: number;        // cod_ue
  d: string;        // departamento
  dt: string;       // distrito
  u: string;        // ue
  s: string;        // subsistema
  n: string;        // nivel_autorizado
  t: string;        // turno
  dp: string;       // dependencia
  dir: string;      // direccion
  x: number;        // lat
  y: number;        // lng
  tot: number;      // total docentes
  v: number;        // alta
  a: number;        // media
  nb: number;       // baja
  sin: number;      // sin pertinencia
  pct: number;      // % alta
  np: number;       // no prejubilados no pertinentes
  pj: number;       // prejubilados
  jub: number;      // jubilacion oficial (columna JUBILACION)
  est: number;      // estudiantes
  url: string;      // url maps
}

export type LevelIconName =
  | 'check-circle'
  | 'compass'
  | 'alert-circle'
  | 'alert-triangle'
  | 'shield-alert'
  | 'star'
  | 'graduation-cap'
  | 'book-open'
  | 'moon'
  | 'building'
  | 'users'
  | 'clock'
  | 'hourglass'
  | 'user-check'
  | 'calendar'
  | 'briefcase';

export interface FilterLevel {
  id: string;
  name: string;
  shortLabel: string;
  group: 'pertinencia' | 'estructura' | 'prejubilacion' | 'jubilacion';
  colorHex: string;
  dotBg: string;
  badgeActive: string;
  iconName: LevelIconName;
  desc: string;
  match: (u: UeCompact) => boolean;
}

export function RenderLevelIcon({ name, className = 'w-3.5 h-3.5' }: { name: LevelIconName; className?: string }) {
  switch (name) {
    case 'check-circle':
      return <CheckCircle2 className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'alert-circle':
      return <AlertCircle className={className} />;
    case 'alert-triangle':
      return <AlertTriangle className={className} />;
    case 'shield-alert':
      return <ShieldAlert className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'graduation-cap':
      return <GraduationCap className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'clock':
      return <Clock className={className} />;
    case 'hourglass':
      return <Hourglass className={className} />;
    case 'user-check':
      return <UserCheck className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    default:
      return <Check className={className} />;
  }
}

export const FILTER_LEVELS: FilterLevel[] = [
  {
    id: 'v_alta',
    name: 'Alta Pertinencia (≥75%)',
    shortLabel: 'Alta (≥75%)',
    group: 'pertinencia',
    colorHex: '#10b981',
    dotBg: 'bg-emerald-500',
    badgeActive: 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30',
    iconName: 'check-circle',
    desc: 'Planteles con ≥75% de alta pertinencia y sin docentes activos no pertinentes',
    match: (u) => u.pct >= 75 && u.np === 0,
  },
  {
    id: 'v_media',
    name: 'Pertinencia Moderada (50%−74%)',
    shortLabel: 'Moderada (50-74%)',
    group: 'pertinencia',
    colorHex: '#2563eb',
    dotBg: 'bg-blue-600',
    badgeActive: 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30',
    iconName: 'compass',
    desc: 'Planteles en rango regular de 50% a 74% de pertinencia alta o con docentes de formación afín (Media)',
    match: (u) => ((u.pct >= 50 && u.pct < 75) || (u.a > 0 && u.nb === 0 && u.sin === 0) || (((u.v + u.a) / (u.tot || 1) >= 0.5) && u.nb === 0 && u.sin === 0)) && u.np === 0,
  },
  {
    id: 'v_baja',
    name: 'Baja / Prioritaria (<50%)',
    shortLabel: 'Baja (<50%)',
    group: 'pertinencia',
    colorHex: '#f59e0b',
    dotBg: 'bg-amber-500',
    badgeActive: 'bg-amber-500 text-white border-amber-400 shadow-sm shadow-amber-500/30',
    iconName: 'alert-circle',
    desc: 'Menor al 50% de docentes en su especialidad (con docentes en baja/sin pertinencia)',
    match: (u) => u.pct < 50 && !(u.a > 0 && u.nb === 0 && u.sin === 0) && u.np === 0,
  },
  {
    id: 'critica',
    name: 'Crítica: No Prejubilados No Pertinentes (1 a 4)',
    shortLabel: 'Crítica (1-4 No Pert.)',
    group: 'pertinencia',
    colorHex: '#ef4444',
    dotBg: 'bg-rose-600 animate-pulse',
    badgeActive: 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-500/40 ring-1 ring-rose-400',
    iconName: 'alert-triangle',
    desc: 'UEs con 1 a 4 maestros activos enseñando fuera de su formación de egreso',
    match: (u) => u.np >= 1 && u.np < 5,
  },
  {
    id: 'hiper_critica',
    name: 'Hiper-Crítica: Foco de Intervención (≥5)',
    shortLabel: 'Foco Rojo (≥5 No Pert.)',
    group: 'pertinencia',
    colorHex: '#9333ea',
    dotBg: 'bg-purple-600 animate-bounce',
    badgeActive: 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/50 ring-2 ring-purple-400',
    iconName: 'shield-alert',
    desc: 'Máxima urgencia nacional: UEs con 5 o más docentes activos fuera de especialidad',
    match: (u) => u.np >= 5,
  },
  {
    id: 'perfecta',
    name: 'Pertinencia Plena (100% V)',
    shortLabel: 'Plena (100% V)',
    group: 'pertinencia',
    colorHex: '#059669',
    dotBg: 'bg-emerald-600',
    badgeActive: 'bg-emerald-800 text-amber-300 border-amber-400 shadow-sm shadow-emerald-900/40 ring-1 ring-amber-400',
    iconName: 'star',
    desc: '100% del plantel docente con formación estricta en su especialidad',
    match: (u) => u.pct === 100 && u.tot > 0,
  },
  {
    id: 'secundaria_bth',
    name: 'Nivel Secundaria y BTH',
    shortLabel: 'Secundaria / BTH',
    group: 'estructura',
    colorHex: '#4f46e5',
    dotBg: 'bg-indigo-600',
    badgeActive: 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30',
    iconName: 'graduation-cap',
    desc: 'Unidades que imparten educación Secundaria Comunitaria Productiva o BTH',
    match: (u) => /SECUNDARIA|BTH|TECNICO/i.test(u.n),
  },
  {
    id: 'inicial_primaria',
    name: 'Nivel Inicial y Primaria',
    shortLabel: 'Inicial / Primaria',
    group: 'estructura',
    colorHex: '#0891b2',
    dotBg: 'bg-cyan-600',
    badgeActive: 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/30',
    iconName: 'book-open',
    desc: 'Educación Inicial en Familia Comunitaria y Primaria Comunitaria Vocacional',
    match: (u) => /INICIAL|PRIMARIA/i.test(u.n),
  },
  {
    id: 'nocturno_alt',
    name: 'Turno Noche / Alternativa',
    shortLabel: 'Noche / Alternativa',
    group: 'estructura',
    colorHex: '#334155',
    dotBg: 'bg-slate-700',
    badgeActive: 'bg-slate-800 text-white border-slate-600 shadow-sm shadow-slate-900/30',
    iconName: 'moon',
    desc: 'Turno vespertino/nocturno o subsistema de Educación Alternativa y Adultos',
    match: (u) => /NOCHE|NOCTURNO/i.test(u.t) || /Alternativa/i.test(u.s),
  },
  {
    id: 'gran_plantel',
    name: 'Gran Plantel (≥25 Docentes)',
    shortLabel: 'Plantel ≥25 Doc.',
    group: 'estructura',
    colorHex: '#0f766e',
    dotBg: 'bg-teal-700',
    badgeActive: 'bg-teal-700 text-white border-teal-600 shadow-sm shadow-teal-700/30',
    iconName: 'building',
    desc: 'Centros escolares y megacolegios con plantel docente de 25 o más maestros',
    match: (u) => u.tot >= 25,
  },
  // ── Grupo: Prejubilación (Columna Oficial PreJubilacion = SI) ────────────
  {
    id: 'pj_baja',
    name: 'Prejubilación Baja (1-4 Docentes)',
    shortLabel: 'Prejub. Baja (1-4)',
    group: 'prejubilacion',
    colorHex: '#d97706',
    dotBg: 'bg-amber-600',
    badgeActive: 'bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-600/30',
    iconName: 'users',
    desc: 'UEs con 1 a 4 docentes en proceso o condición de prejubilación',
    match: (u) => u.pj >= 1 && u.pj < 5,
  },
  {
    id: 'pj_media',
    name: 'Prejubilación Media (5-9 Docentes)',
    shortLabel: 'Prejub. Media (5-9)',
    group: 'prejubilacion',
    colorHex: '#ea580c',
    dotBg: 'bg-orange-600 animate-pulse',
    badgeActive: 'bg-orange-600 text-white border-orange-500 shadow-sm shadow-orange-600/40 ring-1 ring-orange-400',
    iconName: 'clock',
    desc: 'UEs con 5 a 9 docentes en condición de prejubilación',
    match: (u) => u.pj >= 5 && u.pj < 10,
  },
  {
    id: 'pj_alta',
    name: 'Prejubilación Alta (≥10 Docentes)',
    shortLabel: 'Prejub. Alta (≥10)',
    group: 'prejubilacion',
    colorHex: '#9a3412',
    dotBg: 'bg-orange-900 animate-bounce',
    badgeActive: 'bg-orange-900 text-amber-200 border-orange-700 shadow-md shadow-orange-900/50 ring-2 ring-orange-600',
    iconName: 'hourglass',
    desc: 'UEs con 10 o más docentes prejubilados — planificación inminente de plazas',
    match: (u) => u.pj >= 10,
  },
  // ── Grupo: Jubilación (Padrón Oficial - Columna JUBILACION = SI) ───────────
  {
    id: 'jub_baja',
    name: 'Jubilación Baja (1-4 Docentes)',
    shortLabel: 'Jubil. Baja (1-4)',
    group: 'jubilacion',
    colorHex: '#7c3aed',
    dotBg: 'bg-violet-600',
    badgeActive: 'bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-600/30',
    iconName: 'user-check',
    desc: 'UEs con 1 a 4 docentes en nómina oficial de jubilación',
    match: (u) => (u.jub || 0) >= 1 && (u.jub || 0) < 5,
  },
  {
    id: 'jub_media',
    name: 'Jubilación Media (5-9 Docentes)',
    shortLabel: 'Jubil. Media (5-9)',
    group: 'jubilacion',
    colorHex: '#6d28d9',
    dotBg: 'bg-purple-700 animate-pulse',
    badgeActive: 'bg-purple-700 text-white border-purple-600 shadow-sm shadow-purple-700/40 ring-1 ring-purple-400',
    iconName: 'calendar',
    desc: 'UEs con 5 a 9 docentes en nómina oficial de jubilación',
    match: (u) => (u.jub || 0) >= 5 && (u.jub || 0) < 10,
  },
  {
    id: 'jub_alta',
    name: 'Jubilación Alta (≥10 Docentes)',
    shortLabel: 'Jubil. Alta (≥10)',
    group: 'jubilacion',
    colorHex: '#4c1d95',
    dotBg: 'bg-purple-950 animate-bounce',
    badgeActive: 'bg-purple-950 text-purple-200 border-purple-800 shadow-md shadow-purple-950/50 ring-2 ring-purple-600',
    iconName: 'briefcase',
    desc: 'UEs con 10 o más docentes en nómina oficial de jubilación — reemplazo prioritario',
    match: (u) => (u.jub || 0) >= 10,
  },
];

const DEPT_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  TODOS: { center: [-16.7, -64.7], zoom: 6 },
  'BENI': { center: [-14.3, -65.3], zoom: 7 },
  'CHUQUISACA': { center: [-19.8, -64.3], zoom: 8 },
  'COCHABAMBA': { center: [-17.4, -65.9], zoom: 8 },
  'LA PAZ': { center: [-15.8, -68.3], zoom: 7 },
  'ORURO': { center: [-18.5, -67.5], zoom: 8 },
  'PANDO': { center: [-11.3, -67.8], zoom: 8 },
  'POTOSI': { center: [-20.3, -66.2], zoom: 7 },
  'SANTA CRUZ': { center: [-17.5, -61.8], zoom: 7 },
  'TARIJA': { center: [-21.6, -64.3], zoom: 8 },
};

const TILES: Record<string, { url: string; attr: string; maxZoom: number }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  },
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attr: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19
  },
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 18
  }
};

export default function MapaUeView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersClusterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);

  const [ues, setUes] = useState<UeCompact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros reactivos
  const [selectedDepto, setSelectedDepto] = useState<string>('TODOS');
  const [selectedDistrito, setSelectedDistrito] = useState<string>('TODOS');
  const [selectedSubsistema, setSelectedSubsistema] = useState<string>('TODOS');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tileProvider, setTileProvider] = useState<'osm' | 'carto' | 'esri'>('osm');

  // Selección múltiple de niveles (puede seleccionar 1 o más de los 10 niveles)
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  // Detalle de UE seleccionada (Drawer)
  const [selectedUe, setSelectedUe] = useState<UeCompact | null>(null);
  const [leafletReady, setLeafletReady] = useState<boolean>(false);

  // 1. Cargar librerías Leaflet + MarkerCluster dinámicamente en el navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L && (window as any).L.markerClusterGroup) {
      setLeafletReady(true);
      return;
    }

    // Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // MarkerCluster CSS
    if (!document.getElementById('markercluster-css')) {
      const link = document.createElement('link');
      link.id = 'markercluster-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(link);

      const linkDefault = document.createElement('link');
      linkDefault.id = 'markercluster-default-css';
      linkDefault.rel = 'stylesheet';
      linkDefault.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      document.head.appendChild(linkDefault);
    }

    // Estilos de Balizas Notorias y Animaciones de Radar
    if (!document.getElementById('notorious-beacon-styles')) {
      const style = document.createElement('style');
      style.id = 'notorious-beacon-styles';
      style.textContent = `
        @keyframes radar-beacon-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.9), 0 3px 8px rgba(0,0,0,0.5); }
          65% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0), 0 3px 8px rgba(0,0,0,0.5); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 3px 8px rgba(0,0,0,0.5); }
        }
        @keyframes radar-beacon-purple {
          0% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.95), 0 4px 12px rgba(0,0,0,0.6); }
          60% { box-shadow: 0 0 0 18px rgba(147, 51, 234, 0), 0 4px 12px rgba(0,0,0,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0), 0 4px 12px rgba(0,0,0,0.6); }
        }
        .notorious-pin-node {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .notorious-pin-node:hover {
          transform: scale(1.4) !important;
          z-index: 99999 !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Leaflet JS
    const scriptL = document.createElement('script');
    scriptL.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptL.async = true;
    scriptL.onload = () => {
      // MarkerCluster JS
      const scriptMC = document.createElement('script');
      scriptMC.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
      scriptMC.async = true;
      scriptMC.onload = () => {
        setLeafletReady(true);
      };
      document.body.appendChild(scriptMC);
    };
    document.body.appendChild(scriptL);
  }, []);

  // 2. Cargar datos compactos de UEs
  useEffect(() => {
    fetch(`/api/pertinencia/mapa-ue?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Error al consultar datos espaciales');
        return res.json();
      })
      .then((data: UeCompact[]) => {
        setUes(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // 3. Inicializar Mapa Base
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    const initial = DEPT_CENTERS.TODOS;
    const map = L.map(mapContainerRef.current, {
      center: initial.center,
      zoom: initial.zoom,
      minZoom: 5,
      maxZoom: 18,
      preferCanvas: true
    });

    const activeTile = TILES[tileProvider];
    const tileLayer = L.tileLayer(activeTile.url, {
      attribution: activeTile.attr,
      maxZoom: activeTile.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady, tileProvider]);

  // Cambiar proveedor de mapa base
  const handleTileChange = (prov: 'osm' | 'carto' | 'esri') => {
    setTileProvider(prov);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (mapInstanceRef.current && L && TILES[prov]) {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      const t = TILES[prov];
      tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: t.maxZoom }).addTo(mapInstanceRef.current);
    }
  };

  // 4. Lista de distritos filtrados según departamento
  const distritosDisponibles = useMemo(() => {
    if (selectedDepto === 'TODOS') return [];
    const setD = new Set<string>();
    for (const u of ues) {
      if (u.d === selectedDepto && u.dt) {
        setD.add(u.dt);
      }
    }
    return Array.from(setD).sort();
  }, [ues, selectedDepto]);

  // 5. Conteo reactivo de UEs por cada uno de los 10 niveles en el ámbito territorial actual
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FILTER_LEVELS.forEach((lvl) => {
      counts[lvl.id] = 0;
    });

    for (const u of ues) {
      if (selectedDepto !== 'TODOS' && u.d !== selectedDepto) continue;
      if (selectedDistrito !== 'TODOS' && u.dt !== selectedDistrito) continue;
      if (selectedSubsistema !== 'TODOS' && u.s !== selectedSubsistema) continue;

      for (const lvl of FILTER_LEVELS) {
        if (lvl.match(u)) {
          counts[lvl.id] = (counts[lvl.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [ues, selectedDepto, selectedDistrito, selectedSubsistema]);

  // 6. Filtrar UEs en memoria según criterios activos y selección múltiple de niveles
  const filteredUes = useMemo(() => {
    const selectedPertLevels = selectedLevels.filter((id) => {
      const lvl = FILTER_LEVELS.find((l) => l.id === id);
      return lvl?.group === 'pertinencia';
    });
    const selectedEstructuraLevels = selectedLevels.filter((id) => {
      const lvl = FILTER_LEVELS.find((l) => l.id === id);
      return lvl?.group === 'estructura';
    });
    const selectedPrejubLevels = selectedLevels.filter((id) => {
      const lvl = FILTER_LEVELS.find((l) => l.id === id);
      return lvl?.group === 'prejubilacion';
    });
    const selectedJubLevels = selectedLevels.filter((id) => {
      const lvl = FILTER_LEVELS.find((l) => l.id === id);
      return lvl?.group === 'jubilacion';
    });

    return ues.filter((u) => {
      if (selectedDepto !== 'TODOS' && u.d !== selectedDepto) return false;
      if (selectedDistrito !== 'TODOS' && u.dt !== selectedDistrito) return false;
      if (selectedSubsistema !== 'TODOS' && u.s !== selectedSubsistema) return false;
      if (onlyCritical && u.np <= 0) return false;

      // Pertinencia (OR dentro del grupo)
      if (selectedPertLevels.length > 0) {
        const matchesAnyPert = selectedPertLevels.some((id) => {
          const lvl = FILTER_LEVELS.find((l) => l.id === id);
          return lvl?.match(u);
        });
        if (!matchesAnyPert) return false;
      }

      // Estructura/Tipología (OR dentro del grupo)
      if (selectedEstructuraLevels.length > 0) {
        const matchesAnyEst = selectedEstructuraLevels.some((id) => {
          const lvl = FILTER_LEVELS.find((l) => l.id === id);
          return lvl?.match(u);
        });
        if (!matchesAnyEst) return false;
      }

      // Prejubilación (OR dentro del grupo)
      if (selectedPrejubLevels.length > 0) {
        const matchesAnyPj = selectedPrejubLevels.some((id) => {
          const lvl = FILTER_LEVELS.find((l) => l.id === id);
          return lvl?.match(u);
        });
        if (!matchesAnyPj) return false;
      }

      // Jubilación Oficial (OR dentro del grupo)
      if (selectedJubLevels.length > 0) {
        const matchesAnyJub = selectedJubLevels.some((id) => {
          const lvl = FILTER_LEVELS.find((l) => l.id === id);
          return lvl?.match(u);
        });
        if (!matchesAnyJub) return false;
      }

      // Búsqueda de texto en vivo
      if (searchQuery.trim().length > 1) {
        const q = searchQuery.toLowerCase();
        if (!u.u.toLowerCase().includes(q) && !String(u.c).includes(q) && !u.dt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ues, selectedDepto, selectedDistrito, selectedSubsistema, onlyCritical, selectedLevels, searchQuery]);

  // Totales de la selección visible
  const selectionStats = useMemo(() => {
    let totalDocentes = 0;
    let totalNoPertinentes = 0;
    let totalUesCriticas = 0;
    let totalPrejubilados = 0;
    let totalJubilacion = 0;

    for (const u of filteredUes) {
      totalDocentes += u.tot;
      totalNoPertinentes += u.np;
      if (u.np > 0) totalUesCriticas++;
      totalPrejubilados += u.pj;
      totalJubilacion += (u.jub || 0);
    }

    return {
      totalUes: filteredUes.length,
      totalDocentes,
      totalNoPertinentes,
      totalUesCriticas,
      totalPrejubilados,
      totalJubilacion
    };
  }, [filteredUes]);

  // Manejo de selección de niveles (toggle uno o más)
  const handleToggleLevel = (id: string) => {
    setSelectedLevels((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLevels = () => {
    setSelectedLevels(FILTER_LEVELS.map((l) => l.id));
  };

  const handleClearLevels = () => {
    setSelectedLevels([]);
    setOnlyCritical(false);
  };

  const handleSelectCriticalFocus = () => {
    setSelectedLevels(['critica', 'hiper_critica']);
  };

  const handleSelectOptimal = () => {
    setSelectedLevels(['v_alta', 'perfecta']);
  };

  // 7. Actualizar marcadores en el mapa con marcadores altamente notorios
  // ⚠️  NO centrar el mapa aquí — el centrado es responsabilidad exclusiva de los
  //     useEffect de navegación de abajo, para que los filtros de nivel/búsqueda
  //     no provoquen un salto de cámara involuntario.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!map || !L || !L.markerClusterGroup) return;

    if (markersClusterRef.current) {
      map.removeLayer(markersClusterRef.current);
      markersClusterRef.current = null;
    }

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 15,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    // Creador de pines visualmente notorios
    const createNotoriousMarker = (u: UeCompact) => {
      let colorHex = '#10b981';
      let size = 13;
      let border = '2px solid #ffffff';
      let shadow = '0 2px 6px rgba(16,185,129,0.5)';
      let animationCss = '';
      let innerContent = '';

      if (u.np >= 5) {
        // Hiper-Crítica impertinencia → Púrpura baliza
        colorHex = '#9333ea';
        size = 24;
        border = '2.5px solid #ffffff';
        shadow = '0 0 18px rgba(147, 51, 234, 0.95), 0 3px 8px rgba(0,0,0,0.5)';
        animationCss = 'animation: radar-beacon-purple 1.6s infinite;';
        innerContent = `<span style="color: #ffffff; font-size: 11px; font-weight: 900; line-height: 1;">${u.np}</span>`;
      } else if (u.np >= 1) {
        // Crítica impertinencia → Rojo carmesí
        colorHex = '#ef4444';
        size = 20;
        border = '2px solid #ffffff';
        shadow = '0 0 14px rgba(239, 68, 68, 0.9), 0 3px 6px rgba(0,0,0,0.4)';
        animationCss = 'animation: radar-beacon-red 1.8s infinite;';
        innerContent = `<span style="color: #ffffff; font-size: 10px; font-weight: 900; line-height: 1;">${u.np}</span>`;
      } else if ((u.jub || 0) >= 10 && (selectedLevels.some(l => l.startsWith('jub_')) || u.pj === 0)) {
        // Alta Jubilación ≥10 → Púrpura oscuro
        colorHex = '#4c1d95';
        size = 20;
        border = '2px solid #e9d5ff';
        shadow = '0 0 12px rgba(76, 29, 149, 0.9), 0 3px 6px rgba(0,0,0,0.4)';
        animationCss = 'animation: radar-beacon-purple 2s infinite;';
        innerContent = `<span style="color: #e9d5ff; font-size: 10px; font-weight: 900; line-height: 1;">${u.jub}</span>`;
      } else if ((u.jub || 0) >= 5 && (selectedLevels.some(l => l.startsWith('jub_')) || u.pj === 0)) {
        // Media Jubilación 5-9 → Violeta
        colorHex = '#7c3aed';
        size = 17;
        border = '2px solid #ffffff';
        shadow = '0 0 10px rgba(124, 58, 237, 0.7), 0 2px 5px rgba(0,0,0,0.3)';
        animationCss = 'animation: radar-beacon-purple 2.4s infinite;';
        innerContent = `<span style="color: #ffffff; font-size: 9px; font-weight: 900; line-height: 1;">${u.jub}</span>`;
      } else if (u.pj >= 10) {
        // Alta Prejubilación ≥10 → Naranja oscuro
        colorHex = '#9a3412';
        size = 20;
        border = '2px solid #fed7aa';
        shadow = '0 0 12px rgba(154, 52, 18, 0.9), 0 3px 6px rgba(0,0,0,0.4)';
        animationCss = 'animation: radar-beacon-red 2s infinite;';
        innerContent = `<span style="color: #ffffff; font-size: 9px; font-weight: 900; line-height: 1;">pj</span>`;
      } else if (u.pj >= 5) {
        // Media Prejubilación 5-9 → Naranja
        colorHex = '#ea580c';
        size = 19;
        border = '2px solid #ffffff';
        shadow = '0 0 10px rgba(234, 88, 12, 0.7), 0 2px 5px rgba(0,0,0,0.3)';
        animationCss = 'animation: radar-beacon-red 2.4s infinite;';
        innerContent = `<span style="color: #ffffff; font-size: 9px; font-weight: 900; line-height: 1;">pj</span>`;
      } else if (u.pj >= 1) {
        // Baja Prejubilación 1-4 → Naranja notorio que dice "pj"
        colorHex = '#f97316';
        size = 18;
        border = '2px solid #ffffff';
        shadow = '0 2px 8px rgba(249, 115, 22, 0.8), 0 1px 3px rgba(0,0,0,0.3)';
        innerContent = `<span style="color: #ffffff; font-size: 9px; font-weight: 900; line-height: 1; letter-spacing: -0.5px;">pj</span>`;
      } else if (u.pct === 100 && u.tot > 0) {
        // Plena 100% → Verde con halo dorado
        colorHex = '#059669';
        size = 17;
        border = '2px solid #fde047';
        shadow = '0 0 10px rgba(5, 150, 105, 0.8)';
        innerContent = `<span style="color: #fde047; font-size: 10px; line-height: 1;">★</span>`;
      } else if (u.pct >= 75) {
        // Alta pertinencia (≥75%) → Verde esmeralda
        colorHex = '#10b981';
        size = 16;
        border = '2px solid #ffffff';
        shadow = '0 2px 6px rgba(16, 185, 129, 0.6)';
        innerContent = `<span style="color: #ffffff; font-size: 9px; font-weight: 900; line-height: 1;">✓</span>`;
      } else if (
        u.pct >= 50 ||
        (u.a > 0 && u.nb === 0 && u.sin === 0) ||
        (((u.v + u.a) / (u.tot || 1)) >= 0.5 && u.nb === 0 && u.sin === 0)
      ) {
        // Pertinencia Media / Moderada → Azul cobalto notorio con "A"
        colorHex = '#2563eb';
        size = 18;
        border = '2px solid #ffffff';
        shadow = '0 2px 8px rgba(37, 99, 235, 0.8), 0 1px 3px rgba(0,0,0,0.3)';
        innerContent = `<span style="color: #ffffff; font-size: 10px; font-weight: 900; line-height: 1;">A</span>`;
      } else {
        // Baja pertinencia (<50%) → Naranja cálido
        colorHex = '#f59e0b';
        size = 17;
        border = '2px solid #ffffff';
        shadow = '0 2px 8px rgba(245, 158, 11, 0.7)';
        innerContent = `<span style="background: white; width: 5px; height: 5px; border-radius: 50%;"></span>`;
      }

      const anchor = Math.round(size / 2);

      return L.divIcon({
        className: 'notorious-pin-wrapper',
        html: `
          <div class="notorious-pin-node" style="
            background: ${colorHex};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: ${border};
            box-shadow: ${shadow};
            display: flex;
            align-items: center;
            justify-content: center;
            ${animationCss}
          ">
            ${innerContent}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor]
      });
    };

    filteredUes.forEach((u) => {
      const icon = createNotoriousMarker(u);
      const marker = L.marker([u.x, u.y], { icon });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 210px; line-height: 1.45; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 2px;">
            <span style="font-size: 10px; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">SIE ${u.c}</span>
            <span style="font-size: 10px; font-weight: 700; color: #64748b;">${u.t || 'Mañana'}</span>
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">${u.u}</div>
          <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">${u.dt} · ${u.d}</div>
          <div style="margin-top: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
              <span><strong>Alta Pertinencia:</strong></span>
              <span style="font-weight: 900; color: ${u.pct >= 75 ? '#059669' : (u.pct >= 50 || (u.a > 0 && u.nb === 0 && u.sin === 0)) ? '#2563eb' : '#d97706'};">${u.pct}%</span>
            </div>
            <div style="font-size: 11px; color: #475569;">Plantel: <strong>${u.tot} docentes</strong> (${u.v} alta${u.a > 0 ? `, ${u.a} media` : ''}${u.nb + u.sin > 0 ? `, ${u.nb + u.sin} no pert.` : ''})</div>
            ${(u.pj > 0 || (u.jub || 0) > 0) ? `
              <div style="margin-top: 4px; display: flex; gap: 4px; font-size: 10px; font-weight: 800;">
                ${u.pj > 0 ? `<span style="background: #ffedd5; color: #9a3412; padding: 1px 5px; border-radius: 4px;">Prejub: ${u.pj}</span>` : ''}
                ${(u.jub || 0) > 0 ? `<span style="background: #f3e8ff; color: #6b21a8; padding: 1px 5px; border-radius: 4px;">Jubilación: ${u.jub}</span>` : ''}
              </div>
            ` : ''}
            ${u.np > 0 ? `
              <div style="margin-top: 5px; padding: 5px 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 800;">
                  <span>ATENCIÓN REQUERIDA:</span>
                  <span>${u.np + (u.nb + u.sin - u.np > 0 ? u.nb + u.sin - u.np : 0)} fuera de especialidad</span>
                </div>
                <div style="display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap;">
                  <span style="background: #fecaca; color: #7f1d1d; padding: 1px 5px; border-radius: 3px; font-weight: 700;">${u.np} activos sin prejubilados</span>
                  ${(u.nb + u.sin - u.np) > 0 ? `<span style="background: #ffedd5; color: #9a3412; padding: 1px 5px; border-radius: 3px; font-weight: 700;">${u.nb + u.sin - u.np} prejubilado${u.nb + u.sin - u.np > 1 ? 's' : ''} no pertinente${u.nb + u.sin - u.np > 1 ? 's' : ''}</span>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          <div style="margin-top: 8px;">
            <div style="width: 100%; padding: 6px 10px; background: #0f172a; color: #ffffff; border-radius: 7px; font-weight: 700; font-size: 11px; text-align: center; cursor: pointer;">
              Ver Ficha Institucional
            </div>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedUe(u);
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    markersClusterRef.current = clusterGroup;
  }, [filteredUes]);
  // ↑ SOLO filteredUes — sin selectedDepto ni selectedDistrito para evitar
  //   que cambiar nivel/búsqueda dispare el flyTo

  // 8a. Navegar al DEPARTAMENTO cuando cambia (flyTo usando DEPT_CENTERS)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (selectedDepto === 'TODOS') {
      map.flyTo(DEPT_CENTERS.TODOS.center, DEPT_CENTERS.TODOS.zoom, { duration: 1.4 });
    } else if (DEPT_CENTERS[selectedDepto]) {
      const target = DEPT_CENTERS[selectedDepto];
      map.flyTo(target.center, target.zoom, { duration: 1.4 });
    }
  }, [selectedDepto]);
  // ↑ Se dispara SOLO cuando el usuario cambia el selector de departamento

  // 8b. Navegar al DISTRITO cuando cambia — fitBounds calculado desde las UEs del distrito
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (selectedDistrito === 'TODOS' || !selectedDepto || selectedDepto === 'TODOS') return;

    // Calcular bbox de las UEs que pertenecen al distrito seleccionado
    const distUes = ues.filter(
      (u) => u.d === selectedDepto && u.dt === selectedDistrito
    );
    if (distUes.length === 0) return;

    const lats = distUes.map((u) => u.x);
    const lngs = distUes.map((u) => u.y);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    const bounds = L.latLngBounds([[minLat, minLng], [maxLat, maxLng]]);
    // Padding suficiente para ver el borde del distrito sin quedar encajado
    map.flyToBounds(bounds, { padding: [60, 60], duration: 1.3, maxZoom: 13 });
  }, [selectedDistrito, selectedDepto, ues]);
  // ↑ Se dispara SOLO cuando cambia el selector de distrito

  // Enfocar una escuela específica desde el buscador
  const handleFocusUe = (u: UeCompact) => {
    setSelectedUe(u);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([u.x, u.y], 15, { duration: 1.5 });
    }
  };

  // Descargar consolidado offline
  const handleExportHtml = () => {
    window.open('/api/pertinencia/mapa-offline', '_blank');
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-900">
      {/* ── Mapa Interactivo Leaflet (Ocupa 100% del fondo a pantalla completa) ── */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ── Barra Superior Flotante Compacta (Estilo GIS Profesional) ─────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Controles de Búsqueda y Territorio */}
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 dark:border-slate-800 px-3 py-2 flex flex-wrap items-center gap-2">
          {/* Brand Badge */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-black text-slate-900 dark:text-white leading-none block">Cartografía SEP</span>
              <span className="text-[10px] text-slate-500 font-bold leading-none block">Bolivia</span>
            </div>
          </div>

          {/* Buscador Rápido */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SIE o UE..."
              className="w-36 sm:w-44 pl-8 pr-6 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector Departamento */}
          <select
            value={selectedDepto}
            onChange={(e) => {
              setSelectedDepto(e.target.value);
              setSelectedDistrito('TODOS');
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Bolivia (Todos)</option>
            {Object.keys(DEPT_CENTERS).filter(k => k !== 'TODOS').map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Selector Distrito */}
          <select
            value={selectedDistrito}
            onChange={(e) => setSelectedDistrito(e.target.value)}
            disabled={selectedDepto === 'TODOS' || distritosDisponibles.length === 0}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-bold focus:outline-hidden disabled:opacity-40 cursor-pointer max-w-[140px] truncate"
          >
            <option value="TODOS">Distrito ({distritosDisponibles.length})</option>
            {distritosDisponibles.map(dt => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>

          {/* Selector Subsistema */}
          <select
            value={selectedSubsistema}
            onChange={(e) => setSelectedSubsistema(e.target.value)}
            className="hidden md:block px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Subsistema: Todos</option>
            <option value="Regular">Regular</option>
            <option value="Alternativa y Especial">Alternativa / Especial</option>
          </select>
        </div>

        {/* Acciones, Botón de Capas/Niveles y Capas Base */}
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 dark:border-slate-800 px-3 py-2 flex items-center gap-2">
          {/* Botón para Abrir/Cerrar Panel de Capas y Niveles */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${isFilterPanelOpen || selectedLevels.length > 0
              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            title="Abrir desglose estratégico por niveles y prejubilación"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Niveles</span>
            {selectedLevels.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-blue-700 font-black">
                {selectedLevels.length}
              </span>
            )}
          </button>


          {/* Botón Detalle: Resumen de colores, números y racimos */}
          <button
            type="button"
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className={`px-2.5 py-1.5 text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isLegendOpen
              ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            title="Ver guía y resumen de colores, números y racimos de UEs"
          >
            <HelpCircle className={`w-3.5 h-3.5 ${isLegendOpen ? 'text-white' : 'text-indigo-600'} shrink-0`} />
            <span>Detalle</span>
          </button>

          {/* Selector de Capas OSM / Claro / Satélite */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => handleTileChange('osm')}
              className={`px-2 py-1 rounded-md transition-all ${tileProvider === 'osm' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              title="OpenStreetMap Estándar"
            >
              OSM
            </button>
            <button
              type="button"
              onClick={() => handleTileChange('carto')}
              className={`px-2 py-1 rounded-md transition-all ${tileProvider === 'carto' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              title="CartoDB Claro"
            >
              Claro
            </button>
            <button
              type="button"
              onClick={() => handleTileChange('esri')}
              className={`px-2 py-1 rounded-md transition-all ${tileProvider === 'esri' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              title="Satélite de Alta Resolución"
            >
              Satélite
            </button>
          </div>

          {/* Exportar Excel */}
          <a
            href="/api/pertinencia/exportar-ue"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Descargar Excel completo con coordenadas"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Total UEs Visibles */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{filteredUes.length.toLocaleString('es-BO')} UEs</span>
          </div>
        </div>
      </div>

      {/* ── Panel Flotante Desplegable de Niveles (No empuja el mapa) ─────────── */}
      {isFilterPanelOpen && (
        <div className="absolute top-16 left-3 z-20 w-[470px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100%-4.75rem)] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Cabecera del Panel Flotante */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Desglose Estratégico por Niveles
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Selecciona uno o más niveles para aislar en el mapa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Atajos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAllLevels}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={handleSelectCriticalFocus}
              className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold transition-colors cursor-pointer"
            >
              Foco Crítico
            </button>
            <button
              type="button"
              onClick={handleSelectOptimal}
              className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors cursor-pointer"
            >
              Alta Pertinencia
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevels(['pj_baja', 'pj_media', 'pj_alta'])}
              className="px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 font-bold transition-colors cursor-pointer"
            >
              Prejubilación
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevels(['jub_baja', 'jub_media', 'jub_alta'])}
              className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold transition-colors cursor-pointer"
            >
              Jubilación
            </button>
            {(selectedLevels.length > 0 || onlyCritical) && (
              <button
                type="button"
                onClick={handleClearLevels}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

          {/* ── Panel A: Pertinencia Docente ───────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-3 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Pertinencia Docente
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {FILTER_LEVELS.filter(l => l.group === 'pertinencia' || l.group === 'estructura').map((lvl) => {
                const isSelected = selectedLevels.includes(lvl.id);
                const count = levelCounts[lvl.id] || 0;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleToggleLevel(lvl.id)}
                    title={lvl.desc}
                    className={`flex flex-col p-1.5 rounded-xl text-left border transition-all cursor-pointer ${isSelected
                      ? lvl.badgeActive
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/90 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${lvl.dotBg}`}
                          style={{ backgroundColor: isSelected ? undefined : lvl.colorHex }}
                        />
                        <RenderLevelIcon
                          name={lvl.iconName}
                          className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-slate-600'}`}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-black px-1 rounded-md ${isSelected ? 'bg-black/20 text-white' : 'bg-white text-slate-800 border border-slate-200'
                          }`}
                      >
                        {count.toLocaleString('es-BO')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold mt-0.5 truncate leading-tight" title={lvl.name}>
                      {lvl.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel B: Prejubilación (Trámite Activo) ─────────────────── */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-3 rounded-full bg-orange-600" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Prejubilación (Columna Oficial PreJubilacion)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {FILTER_LEVELS.filter(l => l.group === 'prejubilacion').map((lvl) => {
                const isSelected = selectedLevels.includes(lvl.id);
                const count = levelCounts[lvl.id] || 0;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleToggleLevel(lvl.id)}
                    title={lvl.desc}
                    className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer gap-1.5 ${isSelected
                      ? lvl.badgeActive
                      : 'bg-orange-50/50 hover:bg-orange-50 border-orange-200/80 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${lvl.dotBg}`}
                        style={{ backgroundColor: isSelected ? undefined : lvl.colorHex }}
                      />
                      <RenderLevelIcon
                        name={lvl.iconName}
                        className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-orange-700'}`}
                      />
                      <span className="text-[10px] font-bold truncate" title={lvl.name}>
                        {lvl.shortLabel}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black shrink-0 px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-black/20 text-white' : 'bg-white text-orange-900 border border-orange-200'
                        }`}
                    >
                      {count.toLocaleString('es-BO')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel C: Jubilación (Padrón Oficial) ─────────────────────── */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-3 rounded-full bg-purple-600" />
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Jubilación (Padrón Oficial - Columna JUBILACIÓN)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {FILTER_LEVELS.filter(l => l.group === 'jubilacion').map((lvl) => {
                const isSelected = selectedLevels.includes(lvl.id);
                const count = levelCounts[lvl.id] || 0;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleToggleLevel(lvl.id)}
                    title={lvl.desc}
                    className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all cursor-pointer gap-1.5 ${isSelected
                      ? lvl.badgeActive
                      : 'bg-purple-50/50 hover:bg-purple-50 border-purple-200/80 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${lvl.dotBg}`}
                        style={{ backgroundColor: isSelected ? undefined : lvl.colorHex }}
                      />
                      <RenderLevelIcon
                        name={lvl.iconName}
                        className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-purple-700'}`}
                      />
                      <span className="text-[10px] font-bold truncate" title={lvl.name}>
                        {lvl.shortLabel}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black shrink-0 px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-black/20 text-white' : 'bg-white text-purple-900 border border-purple-200'
                        }`}
                    >
                      {count.toLocaleString('es-BO')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métricas de Impacto Institucional */}
          <div className="p-2 rounded-xl bg-slate-900 text-white text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">UEs Visibles:</span>
              <strong className="text-white font-black">{selectionStats.totalUes.toLocaleString('es-BO')}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Docentes en Plantel:</span>
              <strong className="text-white font-black">{selectionStats.totalDocentes.toLocaleString('es-BO')}</strong>
            </div>
            {selectionStats.totalNoPertinentes > 0 && (
              <div className="flex items-center justify-between text-rose-300">
                <span>Fuera de Especialidad:</span>
                <strong className="font-black text-rose-400">{selectionStats.totalNoPertinentes.toLocaleString('es-BO')}</strong>
              </div>
            )}
            <div className="flex items-center justify-between text-amber-300">
              <span>UEs Críticas:</span>
              <strong className="font-black">{selectionStats.totalUesCriticas.toLocaleString('es-BO')}</strong>
            </div>
            <div className="flex items-center justify-between text-orange-300">
              <span>Docentes Prejubilados:</span>
              <strong className="font-black">{selectionStats.totalPrejubilados.toLocaleString('es-BO')}</strong>
            </div>
            <div className="flex items-center justify-between text-purple-300">
              <span>Docentes Jubilación Oficial:</span>
              <strong className="font-black">{selectionStats.totalJubilacion.toLocaleString('es-BO')}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Flotante: Guía y Detalle de Colores, Números y Racimos ───────── */}
      {isLegendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setIsLegendOpen(false)}
        >
          <div
            className="w-full max-w-[500px] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/70 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Guía de Colores y Números del Mapa
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Interpretación de racimos (clusters) y pines individuales de UEs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Cerrar guía de detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">

          {/* Bloque 1: Racimos Geográficos (Zoom Alejado) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                1. Racimos de Unidades Educativas (Zoom Alejado)
              </span>
              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                Cantidad de UEs
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              El número dentro del círculo representa la <strong>cantidad de colegios agrupados</strong> en esa zona geográfica:
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-600 text-emerald-800 dark:text-emerald-300 font-black text-[10px] flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <span className="font-black text-emerald-900 dark:text-emerald-300 block">Verde (2 a 9 UEs)</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Baja densidad escolar (ej: micro-áreas rurales con 4 colegios).</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500/30 border-2 border-amber-600 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                    27
                  </span>
                  <div>
                    <span className="font-black text-amber-900 dark:text-amber-300 block">Amarillo / Ámbar (10 a 99 UEs)</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">Densidad municipal (ej: Santa Ana 27, Guayaramerín 81).</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-rose-500/30 border-2 border-rose-600 text-rose-800 dark:text-rose-300 font-black text-[10px] flex items-center justify-center shrink-0">
                    119
                  </span>
                  <div>
                    <span className="font-black text-rose-900 dark:text-rose-300 block">Naranja / Salmón (≥ 100 UEs)</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400">Alta concentración urbana (Trinidad 119, Cobija 115, Riberalta 137, La Paz 1.261).</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 2: Pines Individuales (Zoom Cercano) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                2. Pines Individuales de Colegio (Al Acercarse)
              </span>
              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                Estado Docente
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Al hacer clic en un racimo o acercar el mapa (zoom), se desglosa en los <strong>pines de cada colegio</strong>. El color y número indican la condición del plantel:
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0">
                  5
                </span>
                <div>
                  <span className="font-black text-purple-900 dark:text-purple-300">Púrpura Baliza:</span>
                  <span className="text-purple-700 dark:text-purple-400 ml-1">
                    Hipercrítico (≥5 maestros sin pertinencia o ≥10 jubilaciones).
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0">
                  2
                </span>
                <div>
                  <span className="font-black text-rose-900 dark:text-rose-300">Rojo Carmesí:</span>
                  <span className="text-rose-700 dark:text-rose-400 ml-1">
                    Crítico (1 a 4 docentes fuera de especialidad formativa).
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0">
                  pj
                </span>
                <div>
                  <span className="font-black text-orange-900 dark:text-orange-300">Naranja / Ámbar:</span>
                  <span className="text-orange-700 dark:text-orange-400 ml-1">
                    Docentes en edad de prejubilación (2026–2031) o Baja Pertinencia residual (&lt;50%).
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs shrink-0">
                  A
                </span>
                <div>
                  <span className="font-black text-blue-900 dark:text-blue-300">Azul Cobalto:</span>
                  <span className="text-blue-700 dark:text-blue-400 ml-1">
                    Pertinencia Media / Moderada (50% a 74%, ej. 1 alta + 1 media, o docentes en especialidad afín Media sin impertinencias como SIE 81960106).
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs shrink-0">
                  ✓
                </span>
                <div>
                  <span className="font-black text-emerald-900 dark:text-emerald-300">Verde con Icono de Bien (✓):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1">
                    Alta Pertinencia (≥75%). La gran mayoría del plantel docente (75% a 99%) enseña con título oficial en su especialidad.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 ring-1 ring-amber-300/50">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-amber-300 font-black text-[11px] flex items-center justify-center shadow-xs shrink-0 border border-amber-300">
                  ★
                </span>
                <div>
                  <span className="font-black text-emerald-900 dark:text-emerald-300">Verde con Estrella Dorada (★):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1">
                    Pertinencia Plena (100%). Excelencia docente: la totalidad de los maestros enseña estrictamente en su especialidad formativa.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Desglose Institucional */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 block">
              3. Desglose en Ficha Institucional (Clic en Pin)
            </span>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Al tocar un pin se abre la ficha con el <strong>Código SIE</strong>, matrícula, total de docentes y desglose por pertinencia (Alta, Media, Baja, Sin Pertinencia) y retiros previstos.
            </p>
          </div>
          </div>
          </div>
        </div>
      )}

      {/* Indicador de Carga */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-40 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-700">Cargando 16.204 Unidades Educativas de Bolivia...</span>
        </div>
      )}

      {/* ── Panel Drawer Lateral (Ficha de UE Seleccionada) ───────────────── */}
      {selectedUe && (
        <div className="absolute top-16 right-3 bottom-3 w-96 max-w-[calc(100vw-1.5rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
          {/* Cabecera del Panel */}
          <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                  SIE: {selectedUe.c}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200/70 text-slate-700">
                  {selectedUe.dp || 'Fiscal'}
                </span>
              </div>
              <h3 className="font-black text-sm text-slate-900 mt-1 truncate" title={selectedUe.u}>
                {selectedUe.u}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium block truncate">
                {selectedUe.dt} · {selectedUe.d}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUe(null)}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenido de la Ficha Técnica */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Alerta si tiene docentes no pertinentes */}
            {selectedUe.np > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Población Objetivo Activa</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Esta UE cuenta con <strong>{selectedUe.np} docentes</strong> en servicio activo <strong>no prejubilados</strong> fuera de su especialidad de egreso.
                </p>
                {(selectedUe.nb + selectedUe.sin - selectedUe.np) > 0 && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-800 font-semibold">
                      + {selectedUe.nb + selectedUe.sin - selectedUe.np} prejubilado{selectedUe.nb + selectedUe.sin - selectedUe.np > 1 ? 's' : ''} fuera de especialidad (gestionados por vía de retiro)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Indicadores de Pertinencia */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Diagnóstico de Pertinencia</span>
                <span className="font-black text-sm text-slate-900">{selectedUe.pct}%</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                <div style={{ width: `${selectedUe.tot > 0 ? (selectedUe.v / selectedUe.tot) * 100 : 0}%` }} className="bg-emerald-600 h-full" title="Alta" />
                <div style={{ width: `${selectedUe.tot > 0 ? (selectedUe.a / selectedUe.tot) * 100 : 0}%` }} className="bg-blue-600 h-full" title="Media" />
                <div style={{ width: `${selectedUe.tot > 0 ? (selectedUe.nb / selectedUe.tot) * 100 : 0}%` }} className="bg-amber-600 h-full" title="Baja" />
                <div style={{ width: `${selectedUe.tot > 0 ? (selectedUe.sin / selectedUe.tot) * 100 : 0}%` }} className="bg-slate-500 h-full" title="Sin" />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold pt-1">
                <div className="bg-white p-1 rounded-md border border-slate-200">
                  <span className="text-emerald-700 block font-black">{selectedUe.v}</span>
                  <span className="text-slate-400">Alta</span>
                </div>
                <div className="bg-white p-1 rounded-md border border-slate-200">
                  <span className="text-blue-700 block font-black">{selectedUe.a}</span>
                  <span className="text-slate-400">Media</span>
                </div>
                <div className="bg-white p-1 rounded-md border border-slate-200">
                  <span className="text-amber-700 block font-black">{selectedUe.nb}</span>
                  <span className="text-slate-400">Baja</span>
                </div>
                <div className="bg-white p-1 rounded-md border border-slate-200">
                  <span className="text-slate-700 block font-black">{selectedUe.sin}</span>
                  <span className="text-slate-400">Sin Pert.</span>
                </div>
              </div>
            </div>

            {/* Datos Institucionales */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Metadatos del Establecimiento
              </span>

              <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsistema:</span>
                  <span className="font-bold text-slate-800">{selectedUe.s}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nivel Autorizado:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[180px]" title={selectedUe.n}>
                    {selectedUe.n || 'No registrado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Turno:</span>
                  <span className="font-bold text-slate-800">{selectedUe.t || 'Mañana'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estudiantes:</span>
                  <span className="font-bold text-slate-800">{selectedUe.est.toLocaleString('es-BO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Docentes:</span>
                  <span className="font-bold text-slate-800">{selectedUe.tot} maestros</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prejubilados (Col. PreJubilacion):</span>
                  <span className="font-bold text-amber-700">{selectedUe.pj}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jubilación (Col. Jubilacion):</span>
                  <span className="font-bold text-purple-700">{selectedUe.jub || 0}</span>
                </div>
              </div>
            </div>

            {/* Dirección y Coordenadas */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Ubicación Geográfica
              </span>
              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {selectedUe.dir || 'Sin dirección registrada'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                <span>Lat: {selectedUe.x}</span>
                <span>Lng: {selectedUe.y}</span>
              </div>
            </div>

            {/* Botón de Enlace Externo a Google Maps */}
            <a
              href={selectedUe.url}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Google Maps Real</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
