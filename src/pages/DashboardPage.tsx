import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllCancerRecords, computeAllDistinctValues } from '../services/cancerService';
import { getAllArthritisRecords } from '../services/arthritisService';
import {
  HiDocumentReport, HiLocationMarker, HiUserGroup,
  HiFilter, HiX, HiRefresh, HiTrendingUp, HiCalendar,
  HiChartBar,
} from 'react-icons/hi';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ColombiaMap from '../components/ColombiaMap';

const CHART_COLORS = [
  '#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#22c55e', '#ec4899', '#f97316', '#6366f1',
];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 11,
  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)',
  padding: '8px 12px',
  background: '#ffffff',
  lineHeight: '1.5',
};

type RecordType = 'cancer' | 'arthritis' | 'all';

interface DashboardFilters {
  tipoRegistro: RecordType;
  epcDepartamento: string;
  tipoServicio: string;
  tipoContrato: string;
  estado: string;
  periodo: string;
  codDiagnostico: string;
  estadoAuditoria: string;
  ciudadPrestador: string;
  tipoDocumento: string;
  numeroFactura: string;
  epcCiudad: string;
  razonSocial: string;
  tutelaUsuario: string;
  codigoServicio: string;
  regionalNormalizada: string;
  numeroDERiesgos: string;
}

const emptyFilters: DashboardFilters = {
  tipoRegistro: 'all',
  epcDepartamento: '',
  tipoServicio: '',
  tipoContrato: '',
  estado: '',
  periodo: '',
  codDiagnostico: '',
  estadoAuditoria: '',
  ciudadPrestador: '',
  tipoDocumento: '',
  numeroFactura: '',
  epcCiudad: '',
  razonSocial: '',
  tutelaUsuario: '',
  codigoServicio: '',
  regionalNormalizada: '',
  numeroDERiesgos: '',
};

const PATIENT_PAGE_SIZES = [25, 50, 100];

export default function DashboardPage() {
  const { user } = useAuth();

  const [allCancerRecords, setAllCancerRecords] = useState<any[]>([]);
  const [allArthritisRecords, setAllArthritisRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [hoveredRegionIdx, setHoveredRegionIdx] = useState<number | null>(null);

  // ── Tabla de pacientes ──
  const [patientPage, setPatientPage] = useState(1);
  const [patientPageSize, setPatientPageSize] = useState(25);

  // ── Opciones de filtros ──
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [tiposServicio, setTiposServicio] = useState<string[]>([]);
  const [tiposContrato, setTiposContrato] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [estadosAuditoria, setEstadosAuditoria] = useState<string[]>([]);
  const [ciudadesPrestador, setCiudadesPrestador] = useState<string[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<string[]>([]);
  const [ciudadesPaciente, setCiudadesPaciente] = useState<string[]>([]);
  const [razonSociales, setRazonSociales] = useState<string[]>([]);
  const [codigosServicio, setCodigosServicio] = useState<string[]>([]);
  const [regionalizadas, setRegionalizadas] = useState<string[]>([]);

  // ============ CARGA DE DATOS ============
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const [cancerRecords, arthritisRecords] = await Promise.all([
        getAllCancerRecords(forceRefresh),
        getAllArthritisRecords(forceRefresh),
      ]);
      setAllCancerRecords(cancerRecords);
      setAllArthritisRecords(arthritisRecords);

      const allRec = [...cancerRecords, ...arthritisRecords];

      const distinct = computeAllDistinctValues(cancerRecords, [
        'epcDepartamento', 'tipoDocumento', 'epcCiudad', 'estado', 'regionalNormalizada',
      ] as any);

      const extraFields = [
        'tipoServicio', 'tipoContrato', 'periodo', 'codDiagnostico',
        'estadoAuditoria', 'ciudadPrestador', 'razonSocial', 'codigoServicio',
      ];
      extraFields.forEach(f => {
        const s = new Set<string>();
        allRec.forEach((r: any) => {
          const v = r[f];
          if (v != null && typeof v === 'string' && v.trim()) s.add(v.trim());
        });
        distinct[f] = Array.from(s).sort();
      });

      setDepartamentos(distinct['epcDepartamento'] ?? []);
      setTiposServicio(distinct['tipoServicio'] ?? []);
      setTiposContrato(distinct['tipoContrato'] ?? []);
      setEstados(distinct['estado'] ?? []);
      setPeriodos(distinct['periodo'] ?? []);
      setDiagnosticos(distinct['codDiagnostico'] ?? []);
      setEstadosAuditoria(distinct['estadoAuditoria'] ?? []);
      setCiudadesPrestador(distinct['ciudadPrestador'] ?? []);
      setTiposDocumento(distinct['tipoDocumento'] ?? []);
      setCiudadesPaciente(distinct['epcCiudad'] ?? []);
      setRazonSociales(distinct['razonSocial'] ?? []);
      setCodigosServicio(distinct['codigoServicio'] ?? []);
      setRegionalizadas(distinct['regionalNormalizada'] ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ============ RECORDS BASE ============
  const allRecords = useMemo(() => {
    if (filters.tipoRegistro === 'cancer') return allCancerRecords;
    if (filters.tipoRegistro === 'arthritis') return allArthritisRecords;
    return [...allCancerRecords, ...allArthritisRecords];
  }, [filters.tipoRegistro, allCancerRecords, allArthritisRecords]);

  // ============ FILTRADO ============
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (filters.epcDepartamento && r.epcDepartamento !== filters.epcDepartamento) return false;
      if (filters.tipoServicio && r.tipoServicio !== filters.tipoServicio) return false;
      if (filters.tipoContrato && r.tipoContrato !== filters.tipoContrato) return false;
      if (filters.estado && r.estado !== filters.estado) return false;
      if (filters.periodo && r.periodo !== filters.periodo) return false;
      if (filters.codDiagnostico && r.codDiagnostico !== filters.codDiagnostico) return false;
      if (filters.estadoAuditoria && r.estadoAuditoria !== filters.estadoAuditoria) return false;
      if (filters.ciudadPrestador && r.ciudadPrestador !== filters.ciudadPrestador) return false;
      if (filters.tipoDocumento && r.tipoDocumento !== filters.tipoDocumento) return false;
      if (filters.numeroFactura && !r.numeroFactura?.includes(filters.numeroFactura)) return false;
      if (filters.epcCiudad && r.epcCiudad !== filters.epcCiudad) return false;
      if (filters.razonSocial && r.razonSocial !== filters.razonSocial) return false;
      if (filters.tutelaUsuario && r.tutelaUsuario !== filters.tutelaUsuario) return false;
      if (filters.codigoServicio && r.codigoServicio !== filters.codigoServicio) return false;
      if (filters.regionalNormalizada && r.regionalNormalizada !== filters.regionalNormalizada) return false;
      if (filters.numeroDERiesgos && (r as any).numeroDERiesgos !== filters.numeroDERiesgos) return false;
      return true;
    });
  }, [allRecords, filters]);

  // ============ KPIs ============
  const kpis = useMemo(() => {
    const totalRegistros = filteredRecords.length;
    const departamentosUnicos = new Set(filteredRecords.map(r => r.epcDepartamento).filter(Boolean)).size;
    const pacientesUnicos = new Set(filteredRecords.map(r => r.numeroDocumento).filter(Boolean)).size;
    const ciudadesUnicas = new Set(filteredRecords.map(r => r.epcCiudad).filter(Boolean)).size;
    const edadPromedio = totalRegistros > 0
      ? filteredRecords.reduce((sum, r) => sum + (r.edad || 0), 0) / totalRegistros
      : 0;
    const conDiscapacidad = filteredRecords.filter(r => {
      const disc = (r.discapacidad || '').trim().toLowerCase();
      return disc && disc !== 'no' && disc !== 'no especificado' && disc !== '';
    }).length;
    return { totalRegistros, departamentosUnicos, pacientesUnicos, ciudadesUnicas, edadPromedio, conDiscapacidad };
  }, [filteredRecords]);

  // ============ GÉNERO Y DIVERSIDAD ============
  const generoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const sexo = (r.sexo || '').trim() || 'No especificado';
      counts[sexo] = (counts[sexo] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  const lgtbiqChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const lgtbiq = (r.lgtbiq || '').trim() || 'No especificado';
      counts[lgtbiq] = (counts[lgtbiq] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ CURSO DE VIDA ============
  const cursoDeVidaChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const curso = (r.cursoDeVida || '').trim() || 'No especificado';
      counts[curso] = (counts[curso] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ DISTRIBUCIÓN POR EDAD ============
  const edadChart = useMemo(() => {
    const grupos: Record<string, number> = {
      '0-5': 0, '6-12': 0, '13-17': 0, '18-25': 0, '26-35': 0,
      '36-45': 0, '46-55': 0, '56-65': 0, '66-75': 0, '76+': 0,
    };
    filteredRecords.forEach(r => {
      const edad = r.edad || 0;
      if (edad <= 5) grupos['0-5']++;
      else if (edad <= 12) grupos['6-12']++;
      else if (edad <= 17) grupos['13-17']++;
      else if (edad <= 25) grupos['18-25']++;
      else if (edad <= 35) grupos['26-35']++;
      else if (edad <= 45) grupos['36-45']++;
      else if (edad <= 55) grupos['46-55']++;
      else if (edad <= 65) grupos['56-65']++;
      else if (edad <= 75) grupos['66-75']++;
      else grupos['76+']++;
    });
    return Object.entries(grupos).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // ============ DISCAPACIDAD ============
  const discapacidadChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const disc = (r.discapacidad || '').trim() || 'No especificado';
      counts[disc] = (counts[disc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ GRUPOS ÉTNICOS ============
  const gruposEtnicosChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const grupo = (r.gruposEtnicos || '').trim() || 'No especificado';
      counts[grupo] = (counts[grupo] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredRecords]);

  // ============ ENFERMEDADES MÁS COMUNES ============
  const enfermedadesChart = useMemo(() => {
    const enfermedades = [
      { key: 'hipertensionHTA', name: 'Hipertensión (HTA)' },
      { key: 'diabetesMellitusDM', name: 'Diabetes Mellitus (DM)' },
      { key: 'vih', name: 'VIH' },
      { key: 'tuberculosis', name: 'Tuberculosis' },
      { key: 'asma', name: 'Asma' },
      { key: 'obesidad', name: 'Obesidad' },
      { key: 'artritis', name: 'Artritis' },
      { key: 'cancerCA', name: 'Cáncer (CA)' },
      { key: 'patologiasCardiacas', name: 'Patologías Cardíacas' },
      { key: 'trastornoSaludMental', name: 'Trastorno Salud Mental' },
      { key: 'epilepsia', name: 'Epilepsia' },
      { key: 'hipotiroidismo', name: 'Hipotiroidismo' },
    ];
    const counts: Record<string, number> = {};
    enfermedades.forEach(enf => { counts[enf.name] = 0; });
    filteredRecords.forEach(r => {
      enfermedades.forEach(enf => {
        const valor = (r as any)[enf.key];
        if (valor && (valor === '1' || valor === 1 || String(valor).toLowerCase() === 'si' || String(valor).toLowerCase() === 'sí')) {
          counts[enf.name]++;
        }
      });
    });
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ LOCALIZACIÓN: EPC_DEPARTAMENTO ============
  const departamentoPacientesChart = useMemo(() => {
    const pacientesPorDepto: Record<string, Set<string>> = {};
    filteredRecords.forEach(r => {
      const depto = r.epcDepartamento || 'Sin Departamento';
      const paciente = r.numeroDocumento || '';
      if (!pacientesPorDepto[depto]) pacientesPorDepto[depto] = new Set();
      if (paciente) pacientesPorDepto[depto].add(paciente);
    });
    return Object.entries(pacientesPorDepto)
      .map(([name, pacientes]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value: pacientes.size,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ LOCALIZACIÓN: EPC_CIUDAD ============
  const ciudadPacientesChart = useMemo(() => {
    const pacientesPorCiudad: Record<string, Set<string>> = {};
    filteredRecords.forEach(r => {
      const ciudad = r.epcCiudad || 'Sin Ciudad';
      const paciente = r.numeroDocumento || '';
      if (!pacientesPorCiudad[ciudad]) pacientesPorCiudad[ciudad] = new Set();
      if (paciente) pacientesPorCiudad[ciudad].add(paciente);
    });
    return Object.entries(pacientesPorCiudad)
      .map(([name, pacientes]) => ({
        name: name.length > 16 ? name.substring(0, 16) + '...' : name,
        value: pacientes.size,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ LOCALIZACIÓN: REGIONAL_NORMALIZADA ============
  const regionPacientesChart = useMemo(() => {
    const pacientesPorRegion: Record<string, Set<string>> = {};
    filteredRecords.forEach(r => {
      const region = r.regionalNormalizada || 'Sin Región';
      const paciente = r.numeroDocumento || '';
      if (!pacientesPorRegion[region]) pacientesPorRegion[region] = new Set();
      if (paciente) pacientesPorRegion[region].add(paciente);
    });
    return Object.entries(pacientesPorRegion)
      .map(([name, pacientes]) => ({ name, value: pacientes.size }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ NOMBRE_ESTABLECIMIENTO ============
  const nombreEstablecimientoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const nombre = ((r as any).nombreEstablecimiento || '').trim();
      if (nombre) counts[nombre] = (counts[nombre] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ TIPOS DE CÁNCER ============
  const cancerTypesChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const tipo = ((r as any).tipoDeCancer || '').trim();
      if (tipo) counts[tipo] = (counts[tipo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ INTERVENCIONES POR PROCESO ============
  const intervencionesChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const proceso = (
        (r as any).procesoRealizado ||
        (r as any).agrupadorServicios ||
        r.tipoServicio ||
        ''
      ).trim() || 'Sin proceso';
      counts[proceso] = (counts[proceso] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // ============ DISTRIBUCIÓN N° DE RIESGO ============
  const riskDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const riesgo = ((r as any).numeroDERiesgos || '').trim();
      if (riesgo) counts[riesgo] = (counts[riesgo] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([riesgo, count]) => ({
        riesgo,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => Number(a.riesgo) - Number(b.riesgo));
  }, [filteredRecords]);

  // ============ MAP DATA ============
  const recordsForMap = useMemo(() => {
    return allRecords.filter(r => {
      if (filters.tipoServicio && r.tipoServicio !== filters.tipoServicio) return false;
      if (filters.tipoContrato && r.tipoContrato !== filters.tipoContrato) return false;
      if (filters.estado && r.estado !== filters.estado) return false;
      if (filters.periodo && r.periodo !== filters.periodo) return false;
      if (filters.codDiagnostico && r.codDiagnostico !== filters.codDiagnostico) return false;
      if (filters.estadoAuditoria && r.estadoAuditoria !== filters.estadoAuditoria) return false;
      if (filters.ciudadPrestador && r.ciudadPrestador !== filters.ciudadPrestador) return false;
      if (filters.tipoDocumento && r.tipoDocumento !== filters.tipoDocumento) return false;
      if (filters.numeroFactura && !r.numeroFactura?.includes(filters.numeroFactura)) return false;
      if (filters.epcCiudad && r.epcCiudad !== filters.epcCiudad) return false;
      if (filters.razonSocial && r.razonSocial !== filters.razonSocial) return false;
      if (filters.tutelaUsuario && r.tutelaUsuario !== filters.tutelaUsuario) return false;
      if (filters.codigoServicio && r.codigoServicio !== filters.codigoServicio) return false;
      if (filters.regionalNormalizada && r.regionalNormalizada !== filters.regionalNormalizada) return false;
      return true;
    });
  }, [allRecords, filters]);

  const departmentMapData = useMemo(() => {
    const map: Record<string, {
      casos: number; valorTotal: number; pacientes: Set<string>;
      conTutela: number; sinTutela: number;
      hombres: number; mujeres: number;
      tipoServicios: Record<string, number>;
      agrupadorServicios: Record<string, number>;
    }> = {};

    recordsForMap.forEach(r => {
      const depto = r.epcDepartamento || 'Sin Departamento';
      if (!map[depto]) map[depto] = {
        casos: 0, valorTotal: 0, pacientes: new Set(),
        conTutela: 0, sinTutela: 0,
        hombres: 0, mujeres: 0,
        tipoServicios: {},
        agrupadorServicios: {},
      };
      map[depto].casos += 1;
      map[depto].valorTotal += r.valorTotal || 0;
      if (r.numeroDocumento) map[depto].pacientes.add(r.numeroDocumento);

      const sexo = (r.sexo || '').trim().toLowerCase();
      if (sexo === 'masculino') map[depto].hombres += 1;
      else if (sexo === 'femenino') map[depto].mujeres += 1;

      const tutUsuario = String(r.tutelaUsuario || '').toUpperCase().trim();
      const tutCampo = String(r.tutela || '').toUpperCase().trim();
      const esSinTutelaUsuario = tutUsuario === '' || tutUsuario === 'SIN TUTELA' || tutUsuario === 'NO' || tutUsuario === 'N' || tutUsuario === '0' || tutUsuario === 'FALSE';
      const esSinTutelaCampo = tutCampo === '' || tutCampo === 'SIN TUTELA' || tutCampo === 'NO' || tutCampo === 'N' || tutCampo === '0' || tutCampo === 'FALSE';
      if (!esSinTutelaUsuario || !esSinTutelaCampo) {
        map[depto].conTutela += 1;
      } else {
        map[depto].sinTutela += 1;
      }

      const ts = (r.tipoServicio || '').trim();
      if (ts) {
        const tsKey = ts.charAt(0).toUpperCase() + ts.slice(1).toLowerCase();
        map[depto].tipoServicios[tsKey] = (map[depto].tipoServicios[tsKey] || 0) + 1;
      } else {
        map[depto].tipoServicios['Sin tipo'] = (map[depto].tipoServicios['Sin tipo'] || 0) + 1;
      }

      const agr = (r.agrupadorServicios || '').trim();
      if (agr) {
        const agrKey = agr.charAt(0).toUpperCase() + agr.slice(1).toLowerCase();
        map[depto].agrupadorServicios[agrKey] = (map[depto].agrupadorServicios[agrKey] || 0) + 1;
      }
    });

    const result: Record<string, {
      casos: number; valorTotal: number; pacientes: number;
      conTutela: number; sinTutela: number;
      hombres: number; mujeres: number;
      tipoServicios: Record<string, number>;
      agrupadorServicios: Record<string, number>;
    }> = {};

    for (const [k, v] of Object.entries(map)) {
      result[k] = {
        casos: v.casos,
        valorTotal: v.valorTotal,
        pacientes: v.pacientes.size,
        conTutela: v.conTutela,
        sinTutela: v.sinTutela,
        hombres: v.hombres,
        mujeres: v.mujeres,
        tipoServicios: v.tipoServicios,
        agrupadorServicios: v.agrupadorServicios,
      };
    }
    return result;
  }, [recordsForMap]);

  // ============ TABLA DE PACIENTES ============
  const patientTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRecords.length / patientPageSize)),
    [filteredRecords.length, patientPageSize],
  );

  const patientPageData = useMemo(() => {
    const start = (patientPage - 1) * patientPageSize;
    return filteredRecords.slice(start, start + patientPageSize);
  }, [filteredRecords, patientPage, patientPageSize]);

  // Reset página al cambiar filtros o pageSize
  useEffect(() => { setPatientPage(1); }, [filters, patientPageSize]);

  // ============ FILTER HELPERS ============
  const activeFilterCount =
    Object.entries(filters).filter(([k, v]) => k !== 'tipoRegistro' && v).length +
    (filters.tipoRegistro !== 'all' ? 1 : 0);

  const clearFilters = () => setFilters(emptyFilters);

  const updateFilter = useCallback((key: keyof DashboardFilters, value: string | RecordType) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = (key: keyof DashboardFilters) => {
    updateFilter(key, key === 'tipoRegistro' ? 'all' : '');
  };

  const handleRiskClick = useCallback((riesgo: string) => {
    updateFilter('numeroDERiesgos', filters.numeroDERiesgos === riesgo ? '' : riesgo);
  }, [filters.numeroDERiesgos, updateFilter]);

  const handleMapDepartmentClick = useCallback((departmentName: string) => {
    if (!departmentName) {
      updateFilter('epcDepartamento', '');
    } else {
      const match = departamentos.find(d =>
        d.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          departmentName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        ) ||
        departmentName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          d.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
      );
      updateFilter('epcDepartamento', match || departmentName);
    }
  }, [departamentos, updateFilter]);

  const advancedFiltersActive = [
    filters.estadoAuditoria, filters.ciudadPrestador, filters.tipoDocumento,
    filters.numeroFactura, filters.epcCiudad, filters.razonSocial,
    filters.tutelaUsuario, filters.codigoServicio, filters.regionalNormalizada,
  ].filter(v => v).length > 0;

  // ============ LOADING / ERROR ============
  if (loading) {
    return (
      <div className="page">
        <div className="loading-inline">
          <div className="spinner" />
          <p style={{ fontWeight: 500 }}>Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => loadData(true)} className="btn btn-primary">
          <HiRefresh /> Reintentar
        </button>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>
            <HiChartBar size={28} className="icon-bounce"
              style={{ color: 'var(--brand)', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Dashboard {filters.tipoRegistro === 'cancer' ? 'Oncológico' : filters.tipoRegistro === 'arthritis' ? 'Artritis' : 'General'}
          </h1>
          <p className="page-subtitle">
            {'Bienvenido, '}
            <strong style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {user?.displayName ?? user?.email}
            </strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => loadData(true)} className="btn btn-secondary">
            <HiRefresh size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── Filtros principales ── */}
      <div className="dashboard-filters">
        <div className="filter-field">
          <label><HiFilter size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />Tipo</label>
          <select value={filters.tipoRegistro} onChange={e => updateFilter('tipoRegistro', e.target.value as RecordType)}>
            <option value="all">Todos</option>
            <option value="cancer">Cáncer</option>
            <option value="arthritis">Artritis</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Depto</label>
          <select value={filters.epcDepartamento} onChange={e => updateFilter('epcDepartamento', e.target.value)}>
            <option value="">Todos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Servicio</label>
          <select value={filters.tipoServicio} onChange={e => updateFilter('tipoServicio', e.target.value)}>
            <option value="">Todos</option>
            {tiposServicio.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Contrato</label>
          <select value={filters.tipoContrato} onChange={e => updateFilter('tipoContrato', e.target.value)}>
            <option value="">Todos</option>
            {tiposContrato.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Estado</label>
          <select value={filters.estado} onChange={e => updateFilter('estado', e.target.value)}>
            <option value="">Todos</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Periodo</label>
          <select value={filters.periodo} onChange={e => updateFilter('periodo', e.target.value)}>
            <option value="">Todos</option>
            {periodos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Diagnostico</label>
          <select value={filters.codDiagnostico} onChange={e => updateFilter('codDiagnostico', e.target.value)}>
            <option value="">Todos</option>
            {diagnosticos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-actions-row">
          <button
            onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            className="btn btn-outline"
            style={{ fontSize: '0.8125rem', padding: '0.4375rem 0.625rem' }}
          >
            {advancedFiltersOpen ? '▼' : '▶'} Avanzado{' '}
            {advancedFiltersActive && <span style={{ color: 'var(--brand)', fontWeight: 'bold' }}>●</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="btn btn-outline">
              <HiX /> Limpiar ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros avanzados ── */}
      {advancedFiltersOpen && (
        <div className="dashboard-filters-advanced">
          <div className="filter-field">
            <label>Estado Auditoria</label>
            <select value={filters.estadoAuditoria} onChange={e => updateFilter('estadoAuditoria', e.target.value)}>
              <option value="">Todos</option>
              {estadosAuditoria.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Ciudad Prestador</label>
            <select value={filters.ciudadPrestador} onChange={e => updateFilter('ciudadPrestador', e.target.value)}>
              <option value="">Todos</option>
              {ciudadesPrestador.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Tipo Documento</label>
            <select value={filters.tipoDocumento} onChange={e => updateFilter('tipoDocumento', e.target.value)}>
              <option value="">Todos</option>
              {tiposDocumento.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>N° Factura</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.numeroFactura}
              onChange={e => updateFilter('numeroFactura', e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label>Ciudad Paciente</label>
            <select value={filters.epcCiudad} onChange={e => updateFilter('epcCiudad', e.target.value)}>
              <option value="">Todos</option>
              {ciudadesPaciente.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Institucion</label>
            <select value={filters.razonSocial} onChange={e => updateFilter('razonSocial', e.target.value)}>
              <option value="">Todos</option>
              {razonSociales.slice(0, 50).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Cod. Servicio</label>
            <select value={filters.codigoServicio} onChange={e => updateFilter('codigoServicio', e.target.value)}>
              <option value="">Todos</option>
              {codigosServicio.slice(0, 100).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Regional</label>
            <select value={filters.regionalNormalizada} onChange={e => updateFilter('regionalNormalizada', e.target.value)}>
              <option value="">Todos</option>
              {regionalizadas.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Tutela Usuario</label>
            <select value={filters.tutelaUsuario} onChange={e => updateFilter('tutelaUsuario', e.target.value)}>
              <option value="">Todos</option>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Tags de filtros activos ── */}
      {activeFilterCount > 0 && (
        <div className="active-filters">
          {filters.tipoRegistro !== 'all' && (
            <span className="filter-tag">
              Tipo: {filters.tipoRegistro === 'cancer' ? 'Cáncer' : 'Artritis'}
              <button onClick={() => removeFilter('tipoRegistro')}><HiX size={12} /></button>
            </span>
          )}
          {filters.epcDepartamento && (
            <span className="filter-tag">
              Depto: {filters.epcDepartamento}
              <button onClick={() => removeFilter('epcDepartamento')}><HiX size={12} /></button>
            </span>
          )}
          {filters.tipoServicio && (
            <span className="filter-tag">
              Servicio: {filters.tipoServicio}
              <button onClick={() => removeFilter('tipoServicio')}><HiX size={12} /></button>
            </span>
          )}
          {filters.tipoContrato && (
            <span className="filter-tag">
              Contrato: {filters.tipoContrato}
              <button onClick={() => removeFilter('tipoContrato')}><HiX size={12} /></button>
            </span>
          )}
          {filters.estado && (
            <span className="filter-tag">
              Estado: {filters.estado}
              <button onClick={() => removeFilter('estado')}><HiX size={12} /></button>
            </span>
          )}
          {filters.periodo && (
            <span className="filter-tag">
              Periodo: {filters.periodo}
              <button onClick={() => removeFilter('periodo')}><HiX size={12} /></button>
            </span>
          )}
          {filters.codDiagnostico && (
            <span className="filter-tag">
              Dx: {filters.codDiagnostico}
              <button onClick={() => removeFilter('codDiagnostico')}><HiX size={12} /></button>
            </span>
          )}
          {filters.estadoAuditoria && (
            <span className="filter-tag">
              Auditoria: {filters.estadoAuditoria}
              <button onClick={() => removeFilter('estadoAuditoria')}><HiX size={12} /></button>
            </span>
          )}
          {filters.ciudadPrestador && (
            <span className="filter-tag">
              Ciudad Prest.: {filters.ciudadPrestador}
              <button onClick={() => removeFilter('ciudadPrestador')}><HiX size={12} /></button>
            </span>
          )}
          {filters.tipoDocumento && (
            <span className="filter-tag">
              Tipo Doc.: {filters.tipoDocumento}
              <button onClick={() => removeFilter('tipoDocumento')}><HiX size={12} /></button>
            </span>
          )}
          {filters.numeroFactura && (
            <span className="filter-tag">
              Factura: {filters.numeroFactura}
              <button onClick={() => removeFilter('numeroFactura')}><HiX size={12} /></button>
            </span>
          )}
          {filters.epcCiudad && (
            <span className="filter-tag">
              Cd. Pac.: {filters.epcCiudad}
              <button onClick={() => removeFilter('epcCiudad')}><HiX size={12} /></button>
            </span>
          )}
          {filters.razonSocial && (
            <span className="filter-tag">
              Institucion: {filters.razonSocial.substring(0, 15)}...
              <button onClick={() => removeFilter('razonSocial')}><HiX size={12} /></button>
            </span>
          )}
          {filters.codigoServicio && (
            <span className="filter-tag">
              Cod.Serv.: {filters.codigoServicio}
              <button onClick={() => removeFilter('codigoServicio')}><HiX size={12} /></button>
            </span>
          )}
          {filters.regionalNormalizada && (
            <span className="filter-tag">
              Regional: {filters.regionalNormalizada}
              <button onClick={() => removeFilter('regionalNormalizada')}><HiX size={12} /></button>
            </span>
          )}
          {filters.tutelaUsuario && (
            <span className="filter-tag">
              Tutela: {filters.tutelaUsuario}
              <button onClick={() => removeFilter('tutelaUsuario')}><HiX size={12} /></button>
            </span>
          )}
          {filters.numeroDERiesgos && (
            <span className="filter-tag">
              Riesgo N°: {filters.numeroDERiesgos}
              <button onClick={() => removeFilter('numeroDERiesgos')}><HiX size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(13,148,136,0.08)', color: 'var(--brand)', borderColor: 'rgba(13,148,136,0.2)' }}>
              <HiDocumentReport size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Registros</span>
              <div className="kpi-value">{kpis.totalRegistros.toLocaleString()}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--brand)' }} />
            <span className="kpi-sub">Total de registros</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <HiLocationMarker size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Ciudades</span>
              <div className="kpi-value">{kpis.ciudadesUnicas}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--success)' }} />
            <span className="kpi-sub">Ciudades únicas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--accent)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <HiUserGroup size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Pacientes</span>
              <div className="kpi-value">{kpis.pacientesUnicos.toLocaleString()}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--accent)' }} />
            <span className="kpi-sub">Documentos unicos</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <HiLocationMarker size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Departamentos</span>
              <div className="kpi-value">{kpis.departamentosUnicos}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--warning)' }} />
            <span className="kpi-sub">Regiones</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--info)', borderColor: 'rgba(139,92,246,0.2)' }}>
              <HiCalendar size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Edad Promedio</span>
              <div className="kpi-value">{kpis.edadPromedio.toFixed(1)}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--info)' }} />
            <span className="kpi-sub">Años</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <HiTrendingUp size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Con Discapacidad</span>
              <div className="kpi-value">{kpis.conDiscapacidad.toLocaleString()}</div>
            </div>
          </div>
          <div className="kpi-divider" />
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--danger)' }} />
            <span className="kpi-sub">
              {kpis.totalRegistros > 0 ? ((kpis.conDiscapacidad / kpis.totalRegistros) * 100).toFixed(1) : '0'}% del total
            </span>
          </div>
        </div>
      </div>

      {/* ── Mapa ── */}
      <ColombiaMap
        departmentData={departmentMapData}
        onDepartmentClick={handleMapDepartmentClick}
        selectedDepartment={filters.epcDepartamento}
        nombreEstablecimientoData={nombreEstablecimientoChart}
        riskData={riskDistributionData}
        onRiskClick={handleRiskClick}
        selectedRisk={filters.numeroDERiesgos}
      />

      {filteredRecords.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <HiDocumentReport size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.125rem' }}>
            Sin datos para mostrar
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: 400, margin: '0 auto' }}>
            {allRecords.length === 0
              ? 'No hay registros en la base de datos. Importa datos desde la sección de Registro Cáncer o Artritis.'
              : 'Los filtros seleccionados no coinciden con ningún registro. Ajusta los filtros.'}
          </p>
        </div>
      ) : (
        <div className="charts-section">

          {/* ── Género y Diversidad ── */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="chart-card" style={{ animationDelay: '0.1s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Distribución por Género</div>
                  <div className="chart-subtitle">Distribución de pacientes según sexo</div>
                </div>
                <span className="chart-badge">{generoChart.length} categorías</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>

                  <defs>
                    {[
                      ['#14b8a6', '#0d9488'], ['#60a5fa', '#3b82f6'], ['#fbbf24', '#f59e0b'],
                      ['#f87171', '#ef4444'], ['#a78bfa', '#8b5cf6'], ['#22d3ee', '#06b6d4'],
                      ['#4ade80', '#22c55e'], ['#f472b6', '#ec4899'], ['#fb923c', '#f97316'],
                      ['#818cf8', '#6366f1'],
                    ].map(([light, dark], i) => (
                      <linearGradient key={`gen-${i}`} id={`genero-pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={light} stopOpacity={1} />
                        <stop offset="100%" stopColor={dark} stopOpacity={0.85} />
                      </linearGradient>
                    ))}
                  </defs>

                  <Pie
                    data={generoChart} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={110}
                    paddingAngle={4} dataKey="value"
                    cornerRadius={6}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {generoChart.map((_, i) => (
                      <Cell key={`gen-cell-${i}`} fill={`url(#genero-pie-grad-${i % 10})`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.18s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Diversidad LGTBIQ</div>
                  <div className="chart-subtitle">Distribución de pacientes LGTBIQ</div>
                </div>
                <span className="chart-badge">{lgtbiqChart.length} categorías</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lgtbiqChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" radius={[0, 6, 6, 0]} barSize={30}>
                    {lgtbiqChart.map((_, i) => (
                      <Cell key={`lgtbiq-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Curso de Vida y Edad ── */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="chart-card" style={{ animationDelay: '0.26s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Curso de Vida</div>
                  <div className="chart-subtitle">Distribución por etapa de vida</div>
                </div>
                <span className="chart-badge">{cursoDeVidaChart.length} categorías</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {[
                      ['#14b8a6', '#0d9488'], ['#60a5fa', '#3b82f6'], ['#fbbf24', '#f59e0b'],
                      ['#f87171', '#ef4444'], ['#a78bfa', '#8b5cf6'], ['#22d3ee', '#06b6d4'],
                      ['#4ade80', '#22c55e'], ['#f472b6', '#ec4899'], ['#fb923c', '#f97316'],
                      ['#818cf8', '#6366f1'],
                    ].map(([light, dark], i) => (
                      <linearGradient key={`cv-${i}`} id={`curso-vida-pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={light} stopOpacity={1} />
                        <stop offset="100%" stopColor={dark} stopOpacity={0.85} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={cursoDeVidaChart} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={110}
                    paddingAngle={4} dataKey="value" cornerRadius={6}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {cursoDeVidaChart.map((_, i) => (
                      <Cell key={`cv-cell-${i}`} fill={`url(#curso-vida-pie-grad-${i % 10})`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.34s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Distribución por Edad</div>
                  <div className="chart-subtitle">Pacientes agrupados por rangos de edad</div>
                </div>
                <span className="chart-badge">{edadChart.length} rangos</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={edadChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" radius={[6, 6, 0, 0]} barSize={40}>
                    {edadChart.map((_, i) => (
                      <Cell key={`edad-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── EPC Departamento / EPC Ciudad / Regional ── */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="chart-card" style={{ animationDelay: '0.2s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">EPC Departamento</div>
                  <div className="chart-subtitle">Pacientes únicos por departamento</div>
                </div>
                <span className="chart-badge">{departamentoPacientesChart.length} deptos</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 340, paddingRight: 4 }}>
                <div style={{ height: Math.max(280, departamentoPacientesChart.length * 32), minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departamentoPacientesChart} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <defs>
                        <linearGradient id="gradDeptoPacientes" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Pacientes" fill="url(#gradDeptoPacientes)" radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.28s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">EPC Ciudad</div>
                  <div className="chart-subtitle">Pacientes únicos por ciudad</div>
                </div>
                <span className="chart-badge">{ciudadPacientesChart.length} ciudades</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 340, paddingRight: 4 }}>
                <div style={{ height: Math.max(280, ciudadPacientesChart.length * 28), minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ciudadPacientesChart} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Pacientes" radius={[0, 6, 6, 0]} barSize={18}>
                        {ciudadPacientesChart.map((_, i) => (
                          <Cell key={`ciudad-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.36s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Regional Normalizada</div>
                  <div className="chart-subtitle">Distribución regional de pacientes</div>
                </div>
                <span className="chart-badge">{regionPacientesChart.length} regiones</span>
              </div>
              <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {[
                        ['#14b8a6', '#0d9488'], ['#60a5fa', '#3b82f6'], ['#fbbf24', '#f59e0b'],
                        ['#f87171', '#ef4444'], ['#a78bfa', '#8b5cf6'], ['#22d3ee', '#06b6d4'],
                        ['#4ade80', '#22c55e'], ['#f472b6', '#ec4899'], ['#fb923c', '#f97316'],
                        ['#818cf8', '#6366f1'],
                      ].map(([light, dark], i) => (
                        <linearGradient key={`rpg-${i}`} id={`region-pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={light} stopOpacity={1} />
                          <stop offset="100%" stopColor={dark} stopOpacity={0.85} />
                        </linearGradient>
                      ))}
                      <filter id="regionPieShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity={0.18} />
                      </filter>
                    </defs>
                    <Pie
                      data={regionPacientesChart} cx="50%" cy="42%"
                      innerRadius={55} outerRadius={100}
                      paddingAngle={4} dataKey="value" cornerRadius={6}
                      animationBegin={200} animationDuration={1400}
                      stroke="rgba(255,255,255,0.6)" strokeWidth={2}
                      onMouseEnter={(_, index) => setHoveredRegionIdx(index)}
                      onMouseLeave={() => setHoveredRegionIdx(null)}
                      label={false} labelLine={false}
                      style={{ filter: 'url(#regionPieShadow)', cursor: 'pointer' }}
                    >
                      {regionPacientesChart.map((_, i) => (
                        <Cell key={`region-pie-${i}`} fill={`url(#region-pie-grad-${i % 10})`} />
                      ))}
                    </Pie>
                    {hoveredRegionIdx !== null && regionPacientesChart[hoveredRegionIdx] && (
                      <>
                        <text x="50%" y="39%" textAnchor="middle" dominantBaseline="central"
                          style={{ fontSize: 26, fontWeight: 800, fill: '#0f172a' }}>
                          {regionPacientesChart[hoveredRegionIdx].value.toLocaleString()}
                        </text>
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central"
                          style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}>
                          {regionPacientesChart[hoveredRegionIdx].name}
                        </text>
                      </>
                    )}
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: '0.5rem', fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Discapacidad y Grupos Étnicos ── */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="chart-card" style={{ animationDelay: '0.42s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Discapacidad</div>
                  <div className="chart-subtitle">Distribución de pacientes con discapacidad</div>
                </div>
                <span className="chart-badge">{discapacidadChart.length} categorías</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={discapacidadChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" radius={[0, 6, 6, 0]} barSize={30}>
                    {discapacidadChart.map((_, i) => (
                      <Cell key={`disc-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.5s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Grupos Étnicos</div>
                  <div className="chart-subtitle">Top 10 grupos étnicos</div>
                </div>
                <span className="chart-badge">{gruposEtnicosChart.length} grupos</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {[
                      ['#14b8a6', '#0d9488'], ['#60a5fa', '#3b82f6'], ['#fbbf24', '#f59e0b'],
                      ['#f87171', '#ef4444'], ['#a78bfa', '#8b5cf6'], ['#22d3ee', '#06b6d4'],
                      ['#4ade80', '#22c55e'], ['#f472b6', '#ec4899'], ['#fb923c', '#f97316'],
                      ['#818cf8', '#6366f1'],
                    ].map(([light, dark], i) => (
                      <linearGradient key={`etn-${i}`} id={`etnicos-pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={light} stopOpacity={1} />
                        <stop offset="100%" stopColor={dark} stopOpacity={0.85} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={gruposEtnicosChart} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={110}
                    paddingAngle={4} dataKey="value" cornerRadius={6}
                    label={({ name, percent }) =>
                      `${name.length > 12 ? name.substring(0, 12) + '...' : name} ${(percent * 100).toFixed(1)}%`
                    }
                    labelLine={false}
                  >
                    {gruposEtnicosChart.map((_, i) => (
                      <Cell key={`etn-cell-${i}`} fill={`url(#etnicos-pie-grad-${i % 10})`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tipos de Cáncer ── */}
          {cancerTypesChart.length > 0 && (
            <div className="chart-card" style={{ animationDelay: '0.55s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem' }}>🎗️</span> Tipos de Cáncer
                  </div>
                  <div className="chart-subtitle">
                    Distribución de diagnósticos oncológicos · {cancerTypesChart.length} tipos registrados
                  </div>
                </div>
                <span className="chart-badge">
                  {cancerTypesChart.reduce((s, d) => s + d.value, 0).toLocaleString()} registros
                </span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 480, paddingRight: 4 }}>
                <div style={{ height: Math.max(300, cancerTypesChart.length * 38), minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cancerTypesChart} layout="vertical" margin={{ left: 10, right: 40, top: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="gradCancerTypes" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.75} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis
                        dataKey="name" type="category" width={210}
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v: string) => v.length > 32 ? v.substring(0, 32) : v}
                      />
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        dataKey="value" name="Registros"
                        fill="url(#gradCancerTypes)" radius={[0, 6, 6, 0]} barSize={26}
                        label={{ position: 'right', fontSize: 10, fill: '#64748b', formatter: (v: number) => v.toLocaleString() }}
                      >
                        {cancerTypesChart.map((_, i) => (
                          <Cell key={`cancer-type-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── Enfermedades Diagnosticadas ── */}
          <div className="chart-card" style={{ animationDelay: '0.58s' }}>
            <div className="chart-header">
              <div>
                <div className="chart-title">Enfermedades Diagnosticadas</div>
                <div className="chart-subtitle">Todas las enfermedades registradas, de mayor a menor</div>
              </div>
              <span className="chart-badge">{enfermedadesChart.length} enfermedades</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(350, enfermedadesChart.length * 48)}>
              <BarChart data={enfermedadesChart} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name" type="category" width={180}
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 25 ? v.substring(0, 25) + '...' : v}
                />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Registros" radius={[0, 6, 6, 0]} barSize={35}>
                  {enfermedadesChart.map((_, i) => (
                    <Cell key={`enf-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* ── Tabla de Pacientes ── */}
      {filteredRecords.length > 0 && (
        <div className="chart-card" style={{ marginTop: '1.5rem', animationDelay: '0.65s' }}>
          {/* Cabecera */}
          <div className="chart-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiUserGroup size={18} style={{ color: 'var(--brand)' }} />
                Listado de Pacientes
              </div>
              <div className="chart-subtitle">
                {filteredRecords.length.toLocaleString()} registros · Página {patientPage} de {patientTotalPages}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                Filas:
              </label>
              <select
                value={patientPageSize}
                onChange={e => setPatientPageSize(Number(e.target.value))}
                style={{
                  fontSize: '0.8rem', padding: '0.25rem 0.5rem',
                  borderRadius: 6, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#374151', cursor: 'pointer',
                }}
              >
                {PATIENT_PAGE_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla */}
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {[
                    'N° Documento', 'Primer Apellido', 'Segundo Apellido',
                    'Primer Nombre', 'Segundo Nombre', 'Edad',
                    'Curso de Vida', 'Sexo', 'Nombre Establecimiento',
                    'EPC Ciudad', 'EPC Departamento',
                  ].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '0.6rem 0.75rem',
                        textAlign: 'left',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patientPageData.map((r: any, i: number) => (
                  <tr
                    key={r.id ?? i}
                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0d9488', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {r.numeroDocumento || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0f172a', fontWeight: 500 }}>
                      {r.primerApellido || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>
                      {r.segundoApellido || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#0f172a', fontWeight: 500 }}>
                      {r.primerNombre || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>
                      {r.segundoNombre || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151', textAlign: 'center' }}>
                      {r.edad ?? '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>
                      {r.cursoDeVida || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: r.sexo?.toLowerCase() === 'masculino'
                          ? 'rgba(59,130,246,0.1)'
                          : r.sexo?.toLowerCase() === 'femenino'
                            ? 'rgba(236,72,153,0.1)'
                            : 'rgba(100,116,139,0.1)',
                        color: r.sexo?.toLowerCase() === 'masculino'
                          ? '#3b82f6'
                          : r.sexo?.toLowerCase() === 'femenino'
                            ? '#ec4899'
                            : '#64748b',
                      }}>
                        {r.sexo || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151', maxWidth: 200 }}>
                      <span title={r.nombreEstablecimiento || ''}>
                        {r.nombreEstablecimiento
                          ? r.nombreEstablecimiento.length > 28
                            ? r.nombreEstablecimiento.substring(0, 28) + '…'
                            : r.nombreEstablecimiento
                          : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
                      {r.epcCiudad || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
                      {r.epcDepartamento || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Mostrando {((patientPage - 1) * patientPageSize) + 1}–{Math.min(patientPage * patientPageSize, filteredRecords.length)} de {filteredRecords.length.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPatientPage(1)}
                disabled={patientPage === 1}
                style={{
                  padding: '0.25rem 0.5rem', minWidth: 32, borderRadius: 6,
                  border: '1px solid #e2e8f0', background: patientPage === 1 ? '#f8fafc' : '#fff',
                  color: patientPage === 1 ? '#cbd5e1' : '#374151',
                  cursor: patientPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                }}
              >«</button>
              <button
                onClick={() => setPatientPage(p => Math.max(1, p - 1))}
                disabled={patientPage === 1}
                style={{
                  padding: '0.25rem 0.5rem', minWidth: 32, borderRadius: 6,
                  border: '1px solid #e2e8f0', background: patientPage === 1 ? '#f8fafc' : '#fff',
                  color: patientPage === 1 ? '#cbd5e1' : '#374151',
                  cursor: patientPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                }}
              >‹</button>

              {Array.from({ length: Math.min(5, patientTotalPages) }, (_, i) => {
                let page: number;
                if (patientTotalPages <= 5) {
                  page = i + 1;
                } else if (patientPage <= 3) {
                  page = i + 1;
                } else if (patientPage >= patientTotalPages - 2) {
                  page = patientTotalPages - 4 + i;
                } else {
                  page = patientPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setPatientPage(page)}
                    style={{
                      padding: '0.25rem 0.5rem', minWidth: 32, borderRadius: 6,
                      border: page === patientPage ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                      background: page === patientPage ? 'rgba(13,148,136,0.08)' : '#fff',
                      color: page === patientPage ? '#0d9488' : '#374151',
                      fontWeight: page === patientPage ? 700 : 400,
                      cursor: 'pointer', fontSize: '0.8rem',
                    }}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setPatientPage(p => Math.min(patientTotalPages, p + 1))}
                disabled={patientPage === patientTotalPages}
                style={{
                  padding: '0.25rem 0.5rem', minWidth: 32, borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: patientPage === patientTotalPages ? '#f8fafc' : '#fff',
                  color: patientPage === patientTotalPages ? '#cbd5e1' : '#374151',
                  cursor: patientPage === patientTotalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                }}
              >›</button>
              <button
                onClick={() => setPatientPage(patientTotalPages)}
                disabled={patientPage === patientTotalPages}
                style={{
                  padding: '0.25rem 0.5rem', minWidth: 32, borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: patientPage === patientTotalPages ? '#f8fafc' : '#fff',
                  color: patientPage === patientTotalPages ? '#cbd5e1' : '#374151',
                  cursor: patientPage === patientTotalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                }}
              >»</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
