import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import colombiaGeoData from '../data/colombia-departments.json';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
}

interface ColombiaMapProps {
  departmentData: Record<string, DeptData>;
  onDepartmentClick: (departmentName: string) => void;
  selectedDepartment?: string;
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

  // ── Zoom & Pan state ──
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

  // ── GeoJSON data ──
  const geo = useMemo(
    () => colombiaGeoData as unknown as FeatureCollection<Geometry, DepartmentProperties>,
    [],
  );

  const dataKeys = useMemo(() => Object.keys(departmentData), [departmentData]);
  const maxCasos = useMemo(() => {
    const vals = Object.values(departmentData).map((d) => d.casos);
    return Math.max(1, ...vals);
  }, [departmentData]);

  // ── Projection + path generator ──
  const pathGen = useMemo(() => {
    const proj = geoMercator()
      .center([-73.5, 4.5])
      .scale(dimensions.width * 3.6)
      .translate([dimensions.width / 2, dimensions.height / 2]);
    return geoPath().projection(proj);
  }, [dimensions]);

  // ── Centroids for labels ──
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

  // ── Wheel zoom (centered on cursor) ──
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

  // ── Mouse drag to pan ──
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

  const onPointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Zoom button handlers ──
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP * 2));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP * 2));
  }, []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Zoom to a specific feature (department) ──
  const zoomToFeature = useCallback(
    (feature: (typeof geo.features)[0]) => {
      const bounds = pathGen.bounds(feature as never);
      if (!bounds) return;
      const [[x0, y0], [x1, y1]] = bounds;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw <= 0 || bh <= 0) return;

      const padding = 2.2; // more margin so the zoom is gentler
      const scaleX = dimensions.width / (bw * padding);
      const scaleY = dimensions.height / (bh * padding);
      const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM * 0.6);

      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const newPanX = dimensions.width / 2 - cx * newZoom;
      const newPanY = dimensions.height / 2 - cy * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [pathGen, dimensions],
  );

  // ── Tooltip handler ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent, name: string, data: DeptData | null) => {
      if (isPanning) return;
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 12,
        name,
        data,
      });
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

  // ── Detail panel data ──
  const detailData = useMemo(() => {
    if (!detailDept) return null;
    // Find matching key
    const key = Object.keys(departmentData).find(k =>
      normalizeName(k) === normalizeName(detailDept) ||
      normalizeName(detailDept).includes(normalizeName(k)) ||
      normalizeName(k).includes(normalizeName(detailDept))
    );
    return key ? { name: key, ...departmentData[key] } : null;
  }, [detailDept, departmentData]);

  const prettyName = (raw: string) => {
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .replace('Bogota,', 'Bogotá')
      .replace('D.c.', 'D.C.')
      .replace('Archipielago De ', '')
      .replace(', Providencia Y Santa Catalina', '');
  };

  // ── Label logic ──
  const invZoom = 1 / zoom;
  const labelFontName = Math.max(7, Math.round(11 * invZoom));
  const labelFontCount = Math.max(6, Math.round(10 * invZoom));
  const strokeScale = invZoom;

  return (
    <div className="colombia-map-wrapper" ref={containerRef}>
      {/* ── Header ── */}
      <div className="chart-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>🗺️</span>
            Mapa de Casos por Departamento
          </div>
          <div className="chart-subtitle">
            Scroll para zoom · Arrastra para mover · Clic para filtrar
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

      {/* ── Map + Detail layout ── */}
      <div className={`colombia-map-layout ${detailDept ? 'with-detail' : ''}`}>

      {/* ── Map ── */}
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
            <filter id="dimBlur" x="-5%" y="-5%" width="110%" height="110%">
              <feColorMatrix type="saturate" values="0.5" />
            </filter>
            <filter id="bevel">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
              <feSpecularLighting in="blur" surfaceScale="3" specularConstant="0.5" specularExponent="15" result="specular">
                <fePointLight x="-100" y="-200" z="300" />
              </feSpecularLighting>
              <feComposite in="specular" in2="SourceAlpha" operator="in" result="specular_cropped" />
              <feComposite in="SourceGraphic" in2="specular_cropped" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0" />
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

          {/* Zoomable + pannable group */}
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
                      (matchedKey ? normalizeName(selectedDepartment) === normalizeName(matchedKey) : false)
                    : false;

                  return (
                    <path
                      key={feature.properties.DPTO_CCDGO}
                      className={isSelected ? 'dept-selected' : ''}
                      d={d}
                      fill={fill}
                      stroke={isSelected ? '#0d9488' : isHovered ? '#0d9488' : '#ffffff'}
                      strokeWidth={(isSelected ? 2.5 : isHovered ? 2 : 0.8) * strokeScale}
                      filter={isSelected ? 'url(#selectedGlow)' : isHovered ? 'url(#hoverGlow)' : 'none'}
                      style={{
                        cursor: isPanning ? 'grabbing' : 'pointer',
                        opacity: animReady ? 1 : 0,
                        transition: `opacity 0.35s ease ${idx * 0.025}s, fill 0.2s, stroke 0.2s, stroke-width 0.2s, filter 0.5s ease`,
                      }}
                      onMouseEnter={() => setHoveredId(feature.properties.DPTO_CCDGO)}
                      onMouseMove={(e) => handleMouseMove(e, prettyName(geoName), data)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => {
                        const dist = Math.abs(e.clientX - panStart.current.x) + Math.abs(e.clientY - panStart.current.y);
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
                    <g key={`label-${feature.properties.DPTO_CCDGO}`} style={{
                      pointerEvents: 'none',
                    }}>
                      <text
                        x={c[0]}
                        y={c[1] - (hasData ? 5 : 0) * invZoom}
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize={labelFontName}
                        fontWeight="700"
                        style={{
                          textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff',
                        }}
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
                          style={{
                            textShadow: '0 0 3px #fff, 0 0 3px #fff',
                          }}
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

        {/* ── Tooltip ── */}
        {tooltip && !isPanning && (
          <div
            className="colombia-map-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="map-tooltip-name">{tooltip.name}</div>
            {tooltip.data ? (
              <>
                <div className="map-tooltip-row">
                  <span>Casos:</span>
                  <strong>{tooltip.data.casos.toLocaleString()}</strong>
                </div>
                <div className="map-tooltip-row">
                  <span>Pacientes:</span>
                  <strong>{tooltip.data.pacientes.toLocaleString()}</strong>
                </div>
                <div className="map-tooltip-row">
                  <span>Valor:</span>
                  <strong>{formatCurrency(tooltip.data.valorTotal)}</strong>
                </div>
              </>
            ) : (
              <div className="map-tooltip-row" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                Sin registros
              </div>
            )}
          </div>
        )}
      </div>

        {/* ── Detail Panel ── */}
        {detailDept && detailData && (
          <div className="map-detail-panel">
            <div className="map-detail-header">
              <div>
                <div className="map-detail-title">{prettyName(detailData.name)}</div>
                <div className="map-detail-subtitle">Desglose departamental</div>
              </div>
              <button className="map-detail-close" onClick={() => setDetailDept(null)} title="Cerrar panel">✕</button>
            </div>

            {/* KPI row */}
            <div className="map-detail-kpis">
              <div className="map-detail-kpi" style={{ animationDelay: '0.1s' }}>
                <div className="map-detail-kpi-value">{detailData.casos.toLocaleString()}</div>
                <div className="map-detail-kpi-label">Casos Totales</div>
              </div>
              <div className="map-detail-kpi" style={{ animationDelay: '0.2s' }}>
                <div className="map-detail-kpi-value">{detailData.pacientes.toLocaleString()}</div>
                <div className="map-detail-kpi-label">Pacientes</div>
              </div>
              <div className="map-detail-kpi" style={{ animationDelay: '0.3s' }}>
                <div className="map-detail-kpi-value">{formatCurrency(detailData.valorTotal)}</div>
                <div className="map-detail-kpi-label">Valor Total</div>
              </div>
            </div>

            {/* Tutela Donut */}
            <div className="map-detail-section">
              <div className="map-detail-section-title">Tutela</div>
              <div className="map-detail-tutela">
                <svg viewBox="0 0 120 120" width="110" height="110" className="tutela-chart">
                  {(() => {
                    const total = detailData.conTutela + detailData.sinTutela;
                    const pctCon = total > 0 ? detailData.conTutela / total : 0;
                    const pctSin = total > 0 ? detailData.sinTutela / total : 0;
                    const r = 48;
                    const cx = 60;
                    const cy = 60;
                    const circ = 2 * Math.PI * r;
                    return (
                      <>
                        {/* Sin tutela (gray arc) */}
                        <circle
                          cx={cx} cy={cy} r={r}
                          fill="none" stroke="#e2e8f0" strokeWidth="14"
                          strokeDasharray={`${circ * pctSin} ${circ}`}
                          strokeDashoffset={circ}
                          transform={`rotate(-90 ${cx} ${cy})`}
                          className="tutela-arc-sin"
                          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s' }}
                        />
                        {/* Con tutela (red arc) */}
                        <circle
                          cx={cx} cy={cy} r={r}
                          fill="none" stroke="#ef4444" strokeWidth="14"
                          strokeDasharray={`${circ * pctCon} ${circ}`}
                          strokeDashoffset={circ}
                          transform={`rotate(-90 ${cx} ${cy})`}
                          strokeLinecap="round"
                          className="tutela-arc-con"
                          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s' }}
                        />
                        {/* Overlay for dash animation */}
                        <g className="tutela-arc-overlay" style={{ animation: 'fadeInTutela 0.5s ease 0.4s forwards', opacity: 0 }}>
                          <circle
                            cx={cx} cy={cy} r={r}
                            fill="none" stroke="url(#tutelaGlow)" strokeWidth="16"
                            strokeDasharray={`${circ * pctCon} ${circ}`}
                            strokeDashoffset={-circ * pctSin}
                            transform={`rotate(-90 ${cx} ${cy})`}
                            strokeLinecap="round"
                            style={{ filter: 'blur(4px)', opacity: 0.5 }}
                          />
                        </g>
                        <defs>
                          <radialGradient id="tutelaGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <text x={cx} y={cy - 4} textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="800">
                          {total > 0 ? `${Math.round(pctCon * 100)}%` : '0%'}
                        </text>
                        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="500">
                          con tutela
                        </text>
                      </>
                    );
                  })()}
                </svg>
                <div className="map-detail-tutela-legend">
                  <div className="tutela-legend-item">
                    <span className="tutela-dot" style={{ background: '#ef4444' }} />
                    <span>Con tutela</span>
                    <strong>{detailData.conTutela.toLocaleString()}</strong>
                  </div>
                  <div className="tutela-legend-item">
                    <span className="tutela-dot" style={{ background: '#e2e8f0' }} />
                    <span>Sin tutela</span>
                    <strong>{detailData.sinTutela.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Tipo Servicio Bar Chart */}
            <div className="map-detail-section">
              <div className="map-detail-section-title">Tipo de Servicio</div>
              {(() => {
                const BAR_PALETTE: [string, string][] = [
                  ['#14b8a6', '#0d9488'], // teal
                  ['#60a5fa', '#3b82f6'], // blue
                  ['#a78bfa', '#8b5cf6'], // violet
                  ['#fbbf24', '#f59e0b'], // amber
                  ['#f472b6', '#ec4899'], // pink
                  ['#22d3ee', '#06b6d4'], // cyan
                  ['#4ade80', '#22c55e'], // green
                  ['#fb923c', '#f97316'], // orange
                  ['#818cf8', '#6366f1'], // indigo
                  ['#e879f9', '#d946ef'], // fuchsia
                ];
                const chartData = Object.entries(detailData.tipoServicios)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, value], i) => ({
                    name,
                    value,
                    fill: BAR_PALETTE[i % BAR_PALETTE.length][1],
                    gradient: BAR_PALETTE[i % BAR_PALETTE.length],
                  }));
                const total = chartData.reduce((sum, item) => sum + item.value, 0);
                if (total === 0) return <div className="map-detail-empty">Sin datos</div>;

                return (
                  <div className="map-detail-chart-wrapper">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 25, right: 20, bottom: 80, left: 10 }}
                        barCategoryGap="18%"
                        barSize={chartData.length <= 3 ? 60 : undefined}
                      >
                        <defs>
                          {/* Dynamic gradients matching pie chart palette */}
                          {chartData.map((item, i) => (
                            <linearGradient key={`bar-g-${i}`} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={item.gradient[0]} stopOpacity={1} />
                              <stop offset="100%" stopColor={item.gradient[1]} stopOpacity={0.8} />
                            </linearGradient>
                          ))}
                          {/* Glow filter for bars */}
                          <filter id="barGlow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                          {/* Shadow filter for bars */}
                          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.18" />
                          </filter>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="0" 
                          stroke="#f1f5f9" 
                          horizontal={true}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
                          axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          tickLine={false}
                          angle={-35}
                          textAnchor="end"
                          height={100}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                          axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(12px)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
                            padding: '14px 18px',
                          }}
                          labelStyle={{ 
                            color: '#0f172a', 
                            fontSize: 13, 
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                          formatter={(value) => [
                            <span key="v" style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{Number(value).toLocaleString()}</span>,
                            <span key="l" style={{ color: '#64748b', fontSize: 12 }}>Casos</span>
                          ]}
                          cursor={{
                            fill: 'rgba(13, 148, 136, 0.06)',
                            radius: 8,
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[12, 12, 0, 0]}
                          animationBegin={200}
                          animationDuration={1400}
                          animationEasing="ease-out"
                          isAnimationActive={true}
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth={1}
                        >
                          {chartData.map((_, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={`url(#bar-grad-${idx})`}
                              style={{ filter: 'url(#barGlow)', transition: 'all 0.3s ease' }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Summary stats */}
                    <div className="map-detail-service-stats">
                      {chartData.map((item, i) => (
                        <div key={item.name} className="stat-item" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                          <div className="stat-dot" style={{
                            background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
                            boxShadow: `0 0 10px ${item.fill}55, 0 0 0 3px rgba(255,255,255,0.5)`,
                          }} />
                          <div className="stat-info">
                            <div className="stat-label">{item.name}</div>
                            <div className="stat-value">{item.value.toLocaleString()}</div>
                          </div>
                          <div className="stat-pct">{((item.value / total) * 100).toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Agrupador de Servicios Pie Chart */}
            <div className="map-detail-section">
              <div className="map-detail-section-title">Agrupador de Servicios</div>
              {(() => {
                const agr = detailData.agrupadorServicios;
                const pieData = Object.entries(agr)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, value]) => ({ name, value }));
                const totalAgr = pieData.reduce((sum, d) => sum + d.value, 0);
                if (totalAgr === 0) return <div className="map-detail-empty">Sin datos</div>;

                const PIE_COLORS = [
                  ['#14b8a6', '#0d9488'], // teal
                  ['#60a5fa', '#3b82f6'], // blue
                  ['#fbbf24', '#f59e0b'], // amber
                  ['#f87171', '#ef4444'], // red
                  ['#a78bfa', '#8b5cf6'], // violet
                  ['#22d3ee', '#06b6d4'], // cyan
                  ['#4ade80', '#22c55e'], // green
                  ['#f472b6', '#ec4899'], // pink
                  ['#fb923c', '#f97316'], // orange
                  ['#818cf8', '#6366f1'], // indigo
                ];
                const PIE_FLAT = PIE_COLORS.map(c => c[1]);
                return (
                  <div className="map-detail-pie-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <defs>
                          {PIE_COLORS.map(([light, dark], i) => (
                            <linearGradient key={`pg-${i}`} id={`pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={light} stopOpacity={1} />
                              <stop offset="100%" stopColor={dark} stopOpacity={0.85} />
                            </linearGradient>
                          ))}
                          <filter id="pieGlow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                          <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.18" />
                          </filter>
                        </defs>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={105}
                          paddingAngle={4}
                          dataKey="value"
                          cornerRadius={6}
                          animationBegin={200}
                          animationDuration={1400}
                          animationEasing="ease-out"
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth={2}
                          label={({ name, percent, cx: lx, cy: ly, midAngle, outerRadius: or }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = (or as number) + 22;
                            const x = (lx as number) + radius * Math.cos(-midAngle * RADIAN);
                            const y = (ly as number) + radius * Math.sin(-midAngle * RADIAN);
                            const displayName = name.length > 12 ? name.substring(0, 10) + '…' : name;
                            return (
                              <text x={x} y={y} textAnchor={x > (lx as number) ? 'start' : 'end'}
                                dominantBaseline="central"
                                style={{ fontSize: 11, fontWeight: 600, fill: '#475569', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                                {displayName} {(percent * 100).toFixed(0)}%
                              </text>
                            );
                          }}
                          labelLine={{
                            stroke: '#94a3b8',
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                          }}
                          style={{ filter: 'url(#pieShadow)', cursor: 'pointer' }}
                        >
                          {pieData.map((_, i) => (
                            <Cell
                              key={`pie-${i}`}
                              fill={`url(#pie-grad-${i % PIE_COLORS.length})`}
                              style={{ filter: 'url(#pieGlow)', transition: 'all 0.3s ease' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(12px)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
                            padding: '14px 18px',
                          }}
                          labelStyle={{ color: '#0f172a', fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                          formatter={(value: number) => [
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{value.toLocaleString()}</span>,
                            <span style={{ color: '#64748b', fontSize: 12 }}>Registros</span>
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend items */}
                    <div className="map-detail-pie-legend">
                      {pieData.map((item, i) => (
                        <div key={item.name} className="pie-legend-item" style={{ animationDelay: `${i * 80}ms` }}>
                          <span className="pie-legend-dot" style={{ background: `linear-gradient(135deg, ${PIE_COLORS[i % PIE_COLORS.length][0]}, ${PIE_COLORS[i % PIE_COLORS.length][1]})`, boxShadow: `0 0 8px ${PIE_FLAT[i % PIE_FLAT.length]}55` }} />
                          <span className="pie-legend-name">{item.name}</span>
                          <span className="pie-legend-value">{item.value.toLocaleString()}</span>
                          <span className="pie-legend-pct">{((item.value / totalAgr) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div> {/* END colombia-map-layout */}

      {/* ── Legend ── */}
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

      {/* ── Top departments ── */}
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
                  selectedDepartment && normalizeName(selectedDepartment) === normalizeName(name) ? 'ranking-active' : ''
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
