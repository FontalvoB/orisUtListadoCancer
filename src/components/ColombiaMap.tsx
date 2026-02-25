import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import colombiaGeoData from '../data/colombia-departments.json';

// ── Types ──────────────────────────────────────────────────────────
interface DepartmentProperties {
  DPTO_CCDGO: string;
  DPTO_CNMBR: string;
  [key: string]: unknown;
}

interface DeptData {
  casos: number;
  valorTotal: number;
  pacientes: number;
  conTutela: number;
  sinTutela: number;
  tipoServicios: Record<string, number>;
  agrupadorServicios: Record<string, number>;
  hombres?: number;
  mujeres?: number;
}

interface EstablecimientoRow {
  name: string;
  value: number;
  pct: string;
}

interface RiskRow {
  riesgo: string;
  count: number;
  pct: string;
}

interface ColombiaMapProps {
  departmentData: Record<string, DeptData>;
  onDepartmentClick: (departmentName: string) => void;
  selectedDepartment?: string;
  nombreEstablecimientoData?: EstablecimientoRow[];
  riskData?: RiskRow[];
  onRiskClick?: (riesgo: string) => void;
  selectedRisk?: string;
  /** When true: swaps patient-oriented labels for IPS-network labels */
  ipsMode?: boolean;
}

// ── Name normaliser ────────────────────────────────────────────────
const normalizeName = (name: string): string =>
  name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,\s*D\.?C\.?/g, '')
    .replace(/ARCHIPIELAGO DE /g, '')
    .replace(/SAN ANDRES.*/, 'SAN ANDRES')
    .trim();

const matchDepartment = (
  geoName: string,
  dataKeys: string[],
): string | undefined => {
  const normalGeo = normalizeName(geoName);
  return dataKeys.find((k) => {
    const nk = normalizeName(k);
    return nk === normalGeo || normalGeo.includes(nk) || nk.includes(normalGeo);
  });
};

// ── Colour helpers ─────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const heatColor = (t: number): string => {
  if (t <= 0) return 'rgb(220,237,230)';
  if (t <= 0.25) {
    const s = t / 0.25;
    return `rgb(${Math.round(lerp(180, 255, s))},${Math.round(lerp(220, 220, s))},${Math.round(lerp(200, 140, s))})`;
  }
  if (t <= 0.5) {
    const s = (t - 0.25) / 0.25;
    return `rgb(${Math.round(lerp(255, 255, s))},${Math.round(lerp(220, 170, s))},${Math.round(lerp(140, 60, s))})`;
  }
  if (t <= 0.75) {
    const s = (t - 0.5) / 0.25;
    return `rgb(${Math.round(lerp(255, 240, s))},${Math.round(lerp(170, 100, s))},${Math.round(lerp(60, 40, s))})`;
  }
  const s = (t - 0.75) / 0.25;
  return `rgb(${Math.round(lerp(240, 200, s))},${Math.round(lerp(100, 40, s))},${Math.round(lerp(40, 40, s))})`;
};

// ── Zoom constants ─────────────────────────────────────────────────
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.25;

// ── Component ──────────────────────────────────────────────────────
export default function ColombiaMap({
  departmentData,
  onDepartmentClick,
  selectedDepartment,
  nombreEstablecimientoData = [],
  riskData = [],
  onRiskClick,
  selectedRisk,
  ipsMode = false,
}: ColombiaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    data: DeptData | null;
  } | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 540 });
  const [animReady, setAnimReady] = useState(false);
  const [detailDept, setDetailDept] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ── Responsive sizing ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.min(entry.contentRect.width, 560);
        setDimensions({ width: w, height: Math.round(w * 1.08) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Entrance animation ──
  useEffect(() => {
    const t = setTimeout(() => setAnimReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const geo = useMemo(
    () => colombiaGeoData as unknown as FeatureCollection<Geometry, DepartmentProperties>,
    [],
  );

  const dataKeys = useMemo(() => Object.keys(departmentData), [departmentData]);

  const maxCasos = useMemo(() => {
    const vals = Object.values(departmentData).map((d) => d.casos);
    return Math.max(1, ...vals);
  }, [departmentData]);

  const pathGen = useMemo(() => {
    const proj = geoMercator()
      .center([-73.5, 4.5])
      .scale(dimensions.width * 3.6)
      .translate([dimensions.width / 2, dimensions.height / 2]);
    return geoPath().projection(proj);
  }, [dimensions]);

  const centroids = useMemo(() => {
    const map: Record<string, [number, number]> = {};
    geo.features.forEach((f) => {
      const c = pathGen.centroid(f as never);
      if (c && isFinite(c[0]) && isFinite(c[1])) {
        map[f.properties.DPTO_CCDGO] = c;
      }
    });
    return map;
  }, [geo, pathGen]);

  // ── Wheel zoom ──
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((prev) => {
        const dir = e.deltaY < 0 ? 1 : -1;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + dir * ZOOM_STEP));
        if (next === prev) return prev;
        const scale = next / prev;
        setPan((p) => ({
          x: mx - scale * (mx - p.x),
          y: my - scale * (my - p.y),
        }));
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Drag to pan ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
      setTooltip(null);
    },
    [isPanning],
  );

  const onPointerUp = useCallback(() => setIsPanning(false), []);

  // ── Zoom buttons ──
  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP * 2)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP * 2)), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // ── Zoom to feature ──
  const zoomToFeature = useCallback(
    (feature: (typeof geo.features)[0]) => {
      const bounds = pathGen.bounds(feature as never);
      if (!bounds) return;
      const [[x0, y0], [x1, y1]] = bounds;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw <= 0 || bh <= 0) return;
      const padding = 2.2;
      const scaleX = dimensions.width / (bw * padding);
      const scaleY = dimensions.height / (bh * padding);
      const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM * 0.6);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      setZoom(newZoom);
      setPan({
        x: dimensions.width / 2 - cx * newZoom,
        y: dimensions.height / 2 - cy * newZoom,
      });
    },
    [pathGen, dimensions],
  );

  // ── Tooltip ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent, name: string, data: DeptData | null) => {
      if (isPanning) return;
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12, name, data });
    },
    [isPanning],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredId(null);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const legendStops = useMemo(() => {
    const n = 6;
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return { t, color: heatColor(t), label: Math.round(t * maxCasos) };
    });
  }, [maxCasos]);

  // ── Detail panel ──
  const generalData = useMemo(() => {
    const all = Object.values(departmentData);
    if (all.length === 0) return null;
    return {
      name: 'Colombia - General',
      casos:      all.reduce((s, d) => s + d.casos, 0),
      valorTotal: all.reduce((s, d) => s + d.valorTotal, 0),
      pacientes:  all.reduce((s, d) => s + d.pacientes, 0),
      conTutela:  all.reduce((s, d) => s + (d.conTutela ?? 0), 0),
      sinTutela:  all.reduce((s, d) => s + (d.sinTutela ?? 0), 0),
      hombres:    all.reduce((s, d) => s + (d.hombres ?? 0), 0),
      mujeres:    all.reduce((s, d) => s + (d.mujeres ?? 0), 0),
    };
  }, [departmentData]);

  const detailData = useMemo(() => {
    if (!detailDept) return null;
    const key = Object.keys(departmentData).find(k =>
      normalizeName(k) === normalizeName(detailDept) ||
      normalizeName(detailDept).includes(normalizeName(k)) ||
      normalizeName(k).includes(normalizeName(detailDept))
    );
    return key ? { name: key, ...departmentData[key] } : null;
  }, [detailDept, departmentData]);

  const panelData = detailDept && detailData ? detailData : generalData;

  const prettyName = (raw: string) =>
    raw
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .replace('Bogota,', 'Bogotá')
      .replace('D.c.', 'D.C.')
      .replace('Archipielago De ', '')
      .replace(', Providencia Y Santa Catalina', '');

  const invZoom = 1 / zoom;
  const labelFontName = Math.max(7, Math.round(11 * invZoom));
  const labelFontCount = Math.max(6, Math.round(10 * invZoom));
  const strokeScale = invZoom;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="colombia-map-wrapper" ref={containerRef}>

      {/* Header */}
      <div className="chart-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>🗺️</span>
            {ipsMode ? 'Distribución IPS por Departamento' : 'Mapa de Casos por Departamento'}
          </div>
          <div className="chart-subtitle">
            Scroll para zoom · Arrastra para mover · Clic para {ipsMode ? 'filtrar por región' : 'filtrar'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selectedDepartment && (
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              onClick={() => { onDepartmentClick(''); setDetailDept(null); resetView(); }}
            >
              ✕ Quitar filtro
            </button>
          )}
        </div>
      </div>

      {/* Map + Detail layout */}
      <div className={`colombia-map-layout ${panelData ? 'with-detail' : ''}`}>

        {/* Map container */}
        <div
          className="colombia-map-container"
          ref={mapContainerRef}
          style={{ position: 'relative', cursor: isPanning ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Zoom controls */}
          <div className="map-zoom-controls">
            <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} title="Acercar">+</button>
            <div className="map-zoom-level">{Math.round(zoom * 100)}%</div>
            <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} title="Alejar">−</button>
            <button onClick={resetView} title="Restablecer vista" className="map-zoom-reset">⟲</button>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            width="100%"
            style={{ overflow: 'hidden', maxHeight: '540px', userSelect: 'none' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="mapShadow" x="-5%" y="-5%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.12" />
              </filter>
              <filter id="hoverGlow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0d9488" floodOpacity="0.45" />
              </filter>
              <filter id="selectedGlow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#0d9488" floodOpacity="0.6" />
              </filter>
              <filter id="bevel">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                <feSpecularLighting
                  in="blur" surfaceScale="3" specularConstant="0.5"
                  specularExponent="15" result="specular"
                >
                  <fePointLight x="-100" y="-200" z="300" />
                </feSpecularLighting>
                <feComposite in="specular" in2="SourceAlpha" operator="in" result="specular_cropped" />
                <feComposite
                  in="SourceGraphic" in2="specular_cropped"
                  operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0"
                />
              </filter>
              <radialGradient id="bgGlow" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.04" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <clipPath id="mapClip">
                <rect x="0" y="0" width={dimensions.width} height={dimensions.height} />
              </clipPath>
            </defs>

            <rect x="0" y="0" width={dimensions.width} height={dimensions.height} fill="url(#bgGlow)" rx="16" />

            <g clipPath="url(#mapClip)">
              <g
                style={{ transition: isPanning ? 'none' : 'transform 0.5s cubic-bezier(0.4,0,0.2,1)' }}
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              >
                {/* Shadow layer */}
                <g filter="url(#mapShadow)" opacity={animReady ? 1 : 0} style={{ transition: 'opacity 0.8s ease' }}>
                  {geo.features.map((feature) => {
                    const d = pathGen(feature as never);
                    if (!d) return null;
                    return (
                      <path
                        key={`shadow-${feature.properties.DPTO_CCDGO}`}
                        d={d}
                        fill="#94a3b8"
                        opacity={0.12}
                        transform="translate(2,3)"
                      />
                    );
                  })}
                </g>

                {/* Departments */}
                <g filter="url(#bevel)">
                  {geo.features.map((feature, idx) => {
                    const d = pathGen(feature as never);
                    if (!d) return null;
                    const geoName = feature.properties.DPTO_CNMBR;
                    const matchedKey = matchDepartment(geoName, dataKeys);
                    const data = matchedKey ? departmentData[matchedKey] : null;
                    const t = data ? Math.min(data.casos / maxCasos, 1) : 0;
                    const fill = data ? heatColor(t) : '#e2e8f0';
                    const isHovered = hoveredId === feature.properties.DPTO_CCDGO;
                    const isSelected = selectedDepartment
                      ? normalizeName(selectedDepartment) === normalizeName(geoName) ||
                        (matchedKey
                          ? normalizeName(selectedDepartment) === normalizeName(matchedKey)
                          : false)
                      : false;

                    return (
                      <path
                        key={feature.properties.DPTO_CCDGO}
                        className={isSelected ? 'dept-selected' : ''}
                        d={d}
                        fill={fill}
                        stroke={isSelected ? '#0d9488' : isHovered ? '#0d9488' : '#ffffff'}
                        strokeWidth={(isSelected ? 2.5 : isHovered ? 2 : 0.8) * strokeScale}
                        filter={
                          isSelected
                            ? 'url(#selectedGlow)'
                            : isHovered
                            ? 'url(#hoverGlow)'
                            : 'none'
                        }
                        style={{
                          cursor: isPanning ? 'grabbing' : 'pointer',
                          opacity: animReady ? 1 : 0,
                          transition: `opacity 0.35s ease ${idx * 0.025}s, fill 0.2s, stroke 0.2s, stroke-width 0.2s, filter 0.5s ease`,
                        }}
                        onMouseEnter={() => setHoveredId(feature.properties.DPTO_CCDGO)}
                        onMouseMove={(e) => handleMouseMove(e, prettyName(geoName), data)}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                          const dist =
                            Math.abs(e.clientX - panStart.current.x) +
                            Math.abs(e.clientY - panStart.current.y);
                          if (dist < 5) {
                            onDepartmentClick(matchedKey || geoName);
                            setDetailDept(matchedKey || geoName);
                            zoomToFeature(feature);
                          }
                        }}
                      />
                    );
                  })}
                </g>

                {/* Labels */}
                {animReady &&
                  geo.features.map((feature) => {
                    const geoName = feature.properties.DPTO_CNMBR;
                    const matchedKey = matchDepartment(geoName, dataKeys);
                    const data = matchedKey ? departmentData[matchedKey] : null;
                    const c = centroids[feature.properties.DPTO_CCDGO];
                    if (!c) return null;
                    const hasData = data && data.casos > 0;
                    return (
                      <g
                        key={`label-${feature.properties.DPTO_CCDGO}`}
                        style={{ pointerEvents: 'none' }}
                      >
                        <text
                          x={c[0]}
                          y={c[1] - (hasData ? 5 : 0) * invZoom}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize={labelFontName}
                          fontWeight="700"
                          style={{ textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff' }}
                        >
                          {prettyName(geoName).substring(0, 20)}
                        </text>
                        {hasData && (
                          <text
                            x={c[0]}
                            y={c[1] + 6 * invZoom}
                            textAnchor="middle"
                            fill="#0d9488"
                            fontSize={labelFontCount}
                            fontWeight="800"
                            style={{ textShadow: '0 0 3px #fff, 0 0 3px #fff' }}
                          >
                            {data.casos.toLocaleString()}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            </g>
          </svg>

          {/* Tooltip */}
          {tooltip && !isPanning && (
            <div
              className="colombia-map-tooltip"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
            >
              <div className="map-tooltip-name">{tooltip.name}</div>
              {tooltip.data ? (
                <>
                  <div className="map-tooltip-row">
                    <span>{ipsMode ? 'IPS Totales:' : 'Casos:'}</span>
                    <strong>{tooltip.data.casos.toLocaleString()}</strong>
                  </div>
                  {ipsMode ? (
                    <>
                      <div className="map-tooltip-row">
                        <span>En Red:</span>
                        <strong style={{ color: '#0d9488' }}>{tooltip.data.pacientes.toLocaleString()}</strong>
                      </div>
                      <div className="map-tooltip-row">
                        <span>Fuera de Red:</span>
                        <strong style={{ color: '#ef4444' }}>{tooltip.data.sinTutela.toLocaleString()}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="map-tooltip-row">
                        <span>Pacientes:</span>
                        <strong>{tooltip.data.pacientes.toLocaleString()}</strong>
                      </div>
                      <div className="map-tooltip-row">
                        <span>Valor:</span>
                        <strong>{formatCurrency(tooltip.data.valorTotal)}</strong>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="map-tooltip-row" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Sin registros
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {panelData && (
          <div className="map-detail-panel">

            {/* Header con cards de sexo */}
            <div className="map-detail-header">
              <div>
                <div className="map-detail-title">
                  {detailDept ? prettyName(panelData.name) : 'Resumen General'}
                </div>
                <div className="map-detail-subtitle">
                  {detailDept ? 'Desglose departamental' : 'Todos los departamentos'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {!ipsMode ? (
                  <>
                {/* Card Hombres */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'rgba(59,130,246,0.08)', borderRadius: 10,
                  padding: '5px 10px', minWidth: 58,
                  border: '1px solid rgba(59,130,246,0.18)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="14" r="5" />
                    <line x1="19" y1="5" x2="14.14" y2="9.86" />
                    <polyline points="15 5 19 5 19 9" />
                  </svg>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3b82f6', marginTop: 2 }}>
                    {(panelData.hombres ?? 0).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '0.6rem', color: '#64748b', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    Hombres
                  </div>
                </div>

                {/* Card Mujeres */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'rgba(236,72,153,0.08)', borderRadius: 10,
                  padding: '5px 10px', minWidth: 58,
                  border: '1px solid rgba(236,72,153,0.18)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="5" />
                    <line x1="12" y1="13" x2="12" y2="21" />
                    <line x1="9" y1="18" x2="15" y2="18" />
                  </svg>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ec4899', marginTop: 2 }}>
                    {(panelData.mujeres ?? 0).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '0.6rem', color: '#64748b', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    Mujeres
                  </div>
                </div>
                  </>
                ) : (
                  <>
                    {/* IPS mode: En Red / Fuera de Red */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: 'rgba(13,148,136,0.08)', borderRadius: 10,
                      padding: '5px 10px', minWidth: 58,
                      border: '1px solid rgba(13,148,136,0.2)',
                    }}>
                      <div style={{ fontSize: '1rem', lineHeight: 1 }}>✔</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d9488', marginTop: 2 }}>
                        {(panelData.pacientes).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>En Red</div>
                    </div>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: 'rgba(239,68,68,0.08)', borderRadius: 10,
                      padding: '5px 10px', minWidth: 58,
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <div style={{ fontSize: '1rem', lineHeight: 1 }}>✘</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                        {(panelData.sinTutela ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fuera Red</div>
                    </div>
                  </>
                )}

                {detailDept && (
                  <button
                    className="map-detail-close"
                    onClick={() => { setDetailDept(null); resetView(); }}
                    title="Volver a vista general"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* KPI row */}
            <div className="map-detail-kpis">
              <div className="map-detail-kpi" style={{ animationDelay: '0.1s' }}>
                <div className="map-detail-kpi-value">{panelData.casos.toLocaleString()}</div>
                <div className="map-detail-kpi-label">{ipsMode ? 'IPS Totales' : 'Casos Totales'}</div>
              </div>
              <div className="map-detail-kpi" style={{ animationDelay: '0.2s' }}>
                <div className="map-detail-kpi-value">{panelData.pacientes.toLocaleString()}</div>
                <div className="map-detail-kpi-label">{ipsMode ? 'En Red' : 'Pacientes'}</div>
              </div>
              {!ipsMode && (
              <div className="map-detail-kpi" style={{ animationDelay: '0.3s' }}>
                <div className="map-detail-kpi-value">{formatCurrency(panelData.valorTotal)}</div>
                <div className="map-detail-kpi-label">Valor Total</div>
              </div>
              )}
            </div>

            {/* N° De Riesgo */}
            {riskData.length > 0 && (
              <div className="map-detail-section">
                <div
                  className="map-detail-section-title"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>N° De Riesgo</span>
                  {selectedRisk && (
                    <span
                      onClick={() => onRiskClick?.('')}
                      style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        background: 'rgba(13,148,136,0.1)', color: '#0d9488',
                        borderRadius: 20, padding: '2px 8px', cursor: 'pointer',
                      }}
                    >
                      ✕ Limpiar
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                  gap: '0.4rem',
                  marginTop: '0.5rem',
                }}>
                  {riskData.map((item) => {
                    const isSelected = selectedRisk === item.riesgo;
                    return (
                      <div
                        key={item.riesgo}
                        onClick={() => onRiskClick?.(item.riesgo)}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '0.5rem 0.3rem 0.45rem',
                          borderRadius: 10,
                          border: isSelected ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(13,148,136,0.07)' : '#f8fafc',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                          boxShadow: isSelected ? '0 0 0 3px rgba(13,148,136,0.12)' : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLDivElement).style.background = '#f0fdf4';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected)
                            (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
                        }}
                      >
                        {/* Barra de progreso en la base */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0, left: 0,
                          height: '3px',
                          width: `${item.pct}%`,
                          background: isSelected ? '#0d9488' : '#cbd5e1',
                          borderRadius: '0 0 10px 10px',
                          transition: 'width 0.4s ease',
                        }} />
                        <div style={{
                          fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1,
                        }}>
                          Riesgo
                        </div>
                        <div style={{
                          fontSize: '1.1rem', fontWeight: 800,
                          color: isSelected ? '#0d9488' : '#0f172a',
                          lineHeight: 1.2, marginTop: 2,
                        }}>
                          {item.riesgo}
                        </div>
                        <div style={{
                          fontSize: '0.72rem', fontWeight: 700,
                          color: isSelected ? '#0d9488' : '#475569',
                          marginTop: 3,
                        }}>
                          {item.count.toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '0.62rem', color: '#94a3b8',
                          fontWeight: 500, marginTop: 1, marginBottom: 4,
                        }}>
                          {item.pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabla de Establecimientos */}
            <div className="map-detail-section">
              <div
                className="map-detail-section-title"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Establecimientos</span>
                {nombreEstablecimientoData.length > 0 && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    background: 'rgba(13,148,136,0.1)', color: '#0d9488',
                    borderRadius: 20, padding: '2px 8px',
                  }}>
                    {nombreEstablecimientoData.length}
                  </span>
                )}
              </div>

              {nombreEstablecimientoData.length === 0 ? (
                <div className="map-detail-empty">Sin datos de establecimientos</div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: 420, marginTop: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{
                          textAlign: 'left', padding: '0.4rem 0.5rem',
                          color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Establecimiento
                        </th>
                        <th style={{
                          textAlign: 'right', padding: '0.4rem 0.5rem',
                          color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Cant.
                        </th>
                        <th style={{
                          textAlign: 'right', padding: '0.4rem 0.5rem',
                          color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nombreEstablecimientoData.map((item, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{
                            padding: '0.4rem 0.5rem', color: '#0f172a',
                            fontWeight: 500, lineHeight: 1.3,
                          }}>
                            <span title={item.name}>
                              {item.name.length > 28 ? item.name.substring(0, 28) + '…' : item.name}
                            </span>
                          </td>
                          <td style={{
                            padding: '0.4rem 0.5rem', textAlign: 'right',
                            color: '#0d9488', fontWeight: 700,
                          }}>
                            {item.value.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '0.4rem 0.5rem', textAlign: 'right',
                            color: '#94a3b8', fontSize: '0.75rem',
                          }}>
                            {item.pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
      {/* END colombia-map-layout */}

      {/* Legend */}
      <div className="colombia-map-legend">
        <span className="legend-label">Menos casos</span>
        <div className="legend-bar">
          {legendStops.map((s, i) => (
            <div
              key={i}
              className="legend-segment"
              style={{ background: s.color }}
              title={`${s.label} casos`}
            />
          ))}
        </div>
        <span className="legend-label">Más casos</span>
        <span className="legend-max">({maxCasos.toLocaleString()} max)</span>
      </div>

      {/* Top Departamentos */}
      <div className="colombia-map-ranking">
        <div className="ranking-title">🏆 Top Departamentos</div>
        {Object.entries(departmentData)
          .sort((a, b) => b[1].casos - a[1].casos)
          .slice(0, 8)
          .map(([name, d], idx) => {
            const pct = maxCasos > 0 ? (d.casos / maxCasos) * 100 : 0;
            return (
              <div
                key={name}
                className={`ranking-item ${
                  selectedDepartment &&
                  normalizeName(selectedDepartment) === normalizeName(name)
                    ? 'ranking-active'
                    : ''
                }`}
                onClick={() => onDepartmentClick(name)}
                style={{ animationDelay: `${0.6 + idx * 0.07}s` }}
              >
                <div className="ranking-position">#{idx + 1}</div>
                <div className="ranking-info">
                  <div className="ranking-name">{name}</div>
                  <div className="ranking-bar-bg">
                    <div
                      className="ranking-bar-fill"
                      style={{ width: `${pct}%`, background: heatColor(pct / 100) }}
                    />
                  </div>
                </div>
                <div className="ranking-count">{d.casos.toLocaleString()}</div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
