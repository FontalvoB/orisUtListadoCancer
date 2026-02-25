/**
 * Optimized utilities for Red de Prestadores matching and processing.
 * Includes caching for string normalization and network matching.
 */

// ────────────────────────────────────────────────────────────────
// RED NETWORK DEFINITION (copied for optimization)
// ────────────────────────────────────────────────────────────────

export interface RedNetworkEntry {
  prestador: string;
  consultaExterna: boolean;
  cx: boolean;
  internacion: boolean;
  municipio: string;
  departamento: string;
  region: 'NORTE' | 'CENTRAL' | 'VIEJO CALDAS' | 'OCCIDENTE' | 'SUR';
}

export const RED_NETWORK: RedNetworkEntry[] = [
  { prestador: 'CEHOCA CENTROS HOSPITALARIOS DEL CARIBE', consultaExterna: true,  cx: true,  internacion: true,  municipio: 'SANTA MARTA',   departamento: 'MAGDALENA',    region: 'NORTE' },
  { prestador: 'ODONTJOMAR',                             consultaExterna: true,  cx: false, internacion: false, municipio: 'VALLEDUPAR',    departamento: 'CESAR',        region: 'NORTE' },
  { prestador: 'DISAMA MEDIC',                           consultaExterna: true,  cx: true,  internacion: true,  municipio: 'BARRANQUILLA',  departamento: 'ATLANTICO',    region: 'NORTE' },
  { prestador: 'OINSAMED',                               consultaExterna: true,  cx: true,  internacion: true,  municipio: 'BARRANQUILLA',  departamento: 'ATLANTICO',    region: 'NORTE' },
  { prestador: 'NEUROCIENCIA',                           consultaExterna: true,  cx: false, internacion: false, municipio: 'MAGANGUE',      departamento: 'BOLIVAR',      region: 'NORTE' },
  { prestador: 'IPS EIYAJAA WANULU',                    consultaExterna: true,  cx: false, internacion: false, municipio: 'RIOHACHA',      departamento: 'GUAJIRA',      region: 'NORTE' },
  { prestador: 'MEDIC SAS',                              consultaExterna: true,  cx: false, internacion: true,  municipio: 'RIOHACHA',      departamento: 'GUAJIRA',      region: 'NORTE' },
  { prestador: 'INSTITUTO DE CANCEROLOGIA DE SUCRE LTDA',consultaExterna: true,  cx: false, internacion: true,  municipio: 'SINCELEJO',     departamento: 'SUCRE',        region: 'NORTE' },
  { prestador: 'UNIDAD MEDICA ONCOLOGICA ONCOLIFE IPS SAS', consultaExterna: true, cx: true, internacion: true, municipio: 'BOGOTA',       departamento: 'BOGOTA',       region: 'CENTRAL' },
  { prestador: 'UNIDAD MEDICA ONCOLOGICA ONCOLIFE IPS VILLAVICENCIO', consultaExterna: true, cx: false, internacion: false, municipio: 'VILLAVICENCIO', departamento: 'META', region: 'CENTRAL' },
  { prestador: 'UNIDAD MEDICA ONCOLOGICA ONCOLIFE ZIPAQUIRA', consultaExterna: true, cx: false, internacion: true, municipio: 'ZIPAQUIRA', departamento: 'CUNDINAMARCA', region: 'CENTRAL' },
  { prestador: 'CLINICA MEDILASER S.A.',                 consultaExterna: true,  cx: true,  internacion: true,  municipio: 'NEIVA',         departamento: 'HUILA',        region: 'CENTRAL' },
  { prestador: 'CLINICA MEDILASER S.A.S. SUCURSAL TUNJA',consultaExterna: true,  cx: true,  internacion: true,  municipio: 'TUNJA',         departamento: 'BOYACA',       region: 'VIEJO CALDAS' },
];

export const DEPT_TO_RED_REGION: Record<string, 'NORTE' | 'CENTRAL' | 'VIEJO CALDAS' | 'OCCIDENTE' | 'SUR' | 'OTRAS'> = {
  // NORTE (Caribe/Atlántico/Nordeste)
  ATLANTICO: 'NORTE',
  MAGDALENA: 'NORTE',
  CESAR: 'NORTE',
  BOLIVAR: 'NORTE',
  GUAJIRA: 'NORTE',
  'LA GUAJIRA': 'NORTE',
  SUCRE: 'NORTE',
  CORDOBA: 'NORTE',
  'SAN ANDRES': 'NORTE',
  'ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA': 'NORTE',
  
  // CENTRAL (Andes Orientales, Orinoquía, Altiplano Cundiboyacense)
  'BOGOTA': 'CENTRAL',
  'BOGOTA D.C.': 'CENTRAL',
  'BOGOTA DC': 'CENTRAL',
  CUNDINAMARCA: 'CENTRAL',
  META: 'CENTRAL',
  HUILA: 'CENTRAL',
  TOLIMA: 'CENTRAL',
  CASANARE: 'CENTRAL',
  VICHADA: 'CENTRAL',
  ARAUCA: 'CENTRAL',
  'NORTE DE SANTANDER': 'CENTRAL',
  SANTANDER: 'CENTRAL',
  
  // VIEJO CALDAS (Andes Occidentales/Centrales)
  BOYACA: 'VIEJO CALDAS',
  CALDAS: 'VIEJO CALDAS',
  RISARALDA: 'VIEJO CALDAS',
  QUINDIO: 'VIEJO CALDAS',
  
  // OCCIDENTE (Pacifico/Andes Occidentales)
  ANTIOQUIA: 'OCCIDENTE',
  CHOCO: 'OCCIDENTE',
  'VALLE DEL CAUCA': 'OCCIDENTE',
  CAUCA: 'OCCIDENTE',
  NARINO: 'OCCIDENTE',
  
  // SUR (Amazonía/Orinoquia Sur)
  AMAZONAS: 'SUR',
  PUTUMAYO: 'SUR',
  CAQUETA: 'SUR',
  GUAINA: 'SUR',
  VAUPE: 'SUR',
  GUAVIARE: 'SUR',
};

// ────────────────────────────────────────────────────────────────
// CACHING LAYER
// ────────────────────────────────────────────────────────────────

const normStrCache = new Map<string, string>();
const redMatchCache = new Map<string, RedNetworkEntry | null>();

/** Normalize string only once per unique input (cached). */
export const normStr = (s: string): string => {
  if (normStrCache.has(s)) return normStrCache.get(s)!;
  const normalized = s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  normStrCache.set(s, normalized);
  return normalized;
};

/**
 * Match nomIps against RED_NETWORK with caching.
 * Returns matching RedNetworkEntry or null if not found.
 */
export const matchesRedNetwork = (nomIps: string): RedNetworkEntry | null => {
  if (redMatchCache.has(nomIps)) return redMatchCache.get(nomIps) ?? null;
  
  const n = normStr(nomIps);
  const match = RED_NETWORK.find(e => {
    const rn = normStr(e.prestador);
    return n === rn || n.includes(rn) || rn.includes(n);
  }) ?? null;
  
  redMatchCache.set(nomIps, match);
  return match;
};

/**
 * Resolve red region for an IPS, prioritizing RED_NETWORK match, then dept mapping.
 */
export const resolveRedRegion = (
  nomIps: string,
  departamento: string,
): string => {
  const match = matchesRedNetwork(nomIps);
  if (match) return match.region;
  
  const depNorm = normStr(departamento);
  
  // Try direct lookup first
  if (DEPT_TO_RED_REGION[depNorm]) {
    return DEPT_TO_RED_REGION[depNorm];
  }
  
  // If not found, search for a normalized match in the keys
  for (const [key, region] of Object.entries(DEPT_TO_RED_REGION)) {
    const keyNorm = normStr(key);
    if (keyNorm === depNorm || depNorm.includes(keyNorm) || keyNorm.includes(depNorm)) {
      return region;
    }
  }
  
  // If still not found, return OTRAS
  return 'OTRAS';
};

/** Clear caches (call after reimport of IPS data). */
export const clearRedNetworkCache = () => {
  normStrCache.clear();
  redMatchCache.clear();
};

// ────────────────────────────────────────────────────────────────
// SERVICE TYPE DETECTION (cached)
// ────────────────────────────────────────────────────────────────

interface ServiceFlags {
  consultaExterna: boolean;
  cx: boolean;
  internacion: boolean;
}

const serviceTypeCache = new Map<string, ServiceFlags>();

/**
 * Detect available services from tipServicio string (cached).
 * Fast lookup instead of regex matching every time.
 */
export const detectServiceFlags = (tipServicio: string): ServiceFlags => {
  if (serviceTypeCache.has(tipServicio)) {
    return serviceTypeCache.get(tipServicio)!;
  }

  const svc = normStr(tipServicio);
  const flags: ServiceFlags = {
    consultaExterna:
      svc.includes('AMBULATORIO') ||
      svc.includes('CONSULTA') ||
      svc.includes('EXTERNO') ||
      svc.includes('EXTERNA'),
    cx: svc.includes('QUIRURGIC') || svc.includes('CIRUGIA') || svc.includes('CX'),
    internacion:
      svc.includes('INTERNACION') ||
      svc.includes('HOSPITALIZ') ||
      svc.includes('CAMA'),
  };

  serviceTypeCache.set(tipServicio, flags);
  return flags;
};

/**
 * Merge service flags efficiently.
 */
export const mergeServiceFlags = (
  current: ServiceFlags,
  newFlags: ServiceFlags,
): ServiceFlags => ({
  consultaExterna: current.consultaExterna || newFlags.consultaExterna,
  cx: current.cx || newFlags.cx,
  internacion: current.internacion || newFlags.internacion,
});

/** Clear service detection cache. */
export const clearServiceTypeCache = () => {
  serviceTypeCache.clear();
};
