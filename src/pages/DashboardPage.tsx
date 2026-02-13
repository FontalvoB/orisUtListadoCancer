import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllCancerRecords, getDistinctValues } from '../services/cancerService';
import type { CancerRecord } from '../types';
import {
  HiDocumentReport, HiLocationMarker, HiCurrencyDollar, HiUserGroup,
  HiFilter, HiX, HiRefresh, HiTrendingUp, HiCalendar,
} from 'react-icons/hi';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ColombiaMap from '../components/ColombiaMap';

const CHART_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899', '#f97316', '#6366f1'];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 11,
  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)',
  padding: '8px 12px',
  background: '#ffffff',
  lineHeight: '1.5',
};

interface DashboardFilters {
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
}

const emptyFilters: DashboardFilters = {
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
};

export default function DashboardPage() {
  const { user } = useAuth();

  const [allRecords, setAllRecords] = useState<CancerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [records, deptos, tipos, contratos, estadosList, periodosList, dxList, estadosAud, ciudPrest, tipDoc, ciudPac, razSoc, codServ, regNorm] = await Promise.all([
        getAllCancerRecords(),
        getDistinctValues('epcDepartamento'),
        getDistinctValues('tipoServicio'),
        getDistinctValues('tipoContrato'),
        getDistinctValues('estado'),
        getDistinctValues('periodo'),
        getDistinctValues('codDiagnostico'),
        getDistinctValues('estadoAuditoria'),
        getDistinctValues('ciudadPrestador'),
        getDistinctValues('tipoDocumento'),
        getDistinctValues('epcCiudad'),
        getDistinctValues('razonSocial'),
        getDistinctValues('codigoServicio'),
        getDistinctValues('regionalNormalizada'),
      ]);
      setAllRecords(records);
      setDepartamentos(deptos);
      setTiposServicio(tipos);
      setTiposContrato(contratos);
      setEstados(estadosList);
      setPeriodos(periodosList);
      setDiagnosticos(dxList);
      setEstadosAuditoria(estadosAud);
      setCiudadesPrestador(ciudPrest);
      setTiposDocumento(tipDoc);
      setCiudadesPaciente(ciudPac);
      setRazonSociales(razSoc);
      setCodigosServicio(codServ);
      setRegionalizadas(regNorm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      return true;
    });
  }, [allRecords, filters]);

  // KPIs
  const kpis = useMemo(() => {
    const totalRegistros = filteredRecords.length;
    const valorTotal = filteredRecords.reduce((sum, r) => sum + (r.valorTotal || 0), 0);
    const departamentosUnicos = new Set(filteredRecords.map(r => r.epcDepartamento).filter(Boolean)).size;
    const diagnosticosUnicos = new Set(filteredRecords.map(r => r.codDiagnostico).filter(Boolean)).size;
    const pacientesUnicos = new Set(filteredRecords.map(r => r.numeroDocumento).filter(Boolean)).size;
    const promedioEstancia = totalRegistros > 0
      ? filteredRecords.reduce((sum, r) => sum + (r.diasEstancia || 0), 0) / totalRegistros
      : 0;
    return { totalRegistros, valorTotal, departamentosUnicos, diagnosticosUnicos, pacientesUnicos, promedioEstancia };
  }, [filteredRecords]);

  // Charts data
  const diagnosticosChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.codDiagnostico || 'Sin Dx'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const departamentoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.epcDepartamento || 'Sin Depto'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 18 ? name.substring(0, 18) + '...' : name, value }));
  }, [filteredRecords]);

  const servicioChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.tipoServicio || 'Sin Tipo'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const contratoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.tipoContrato || 'Sin Contrato'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const costoPeriodoChart = useMemo(() => {
    const map: Record<string, { periodo: string; valor: number; registros: number }> = {};
    filteredRecords.forEach(r => {
      const k = r.periodo || 'Sin Periodo';
      if (!map[k]) map[k] = { periodo: k, valor: 0, registros: 0 };
      map[k].valor += r.valorTotal || 0;
      map[k].registros += 1;
    });
    return Object.values(map).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [filteredRecords]);

  const estadoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.estado || 'Sin Estado'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // ============ LOCALIZACIÓN DEL PPL ============
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
        value: pacientes.size 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredRecords]);

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
        value: pacientes.size 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRecords]);

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

  // ============ ESTANCIA DEL PACIENTE ============

  // Gráfica 1: Top 3 Empresas por Mes (ordenado cronológicamente)
  const empresasPorMesChart = useMemo(() => {
    // Obtener top 3 empresas por total de pacientes
    const pacientesPorEmpresa: Record<string, Set<string>> = {};
    filteredRecords.forEach(r => {
      const empresa = r.razonSocial || 'Sin Empresa';
      const paciente = r.numeroDocumento || '';
      if (!pacientesPorEmpresa[empresa]) pacientesPorEmpresa[empresa] = new Set();
      if (paciente) pacientesPorEmpresa[empresa].add(paciente);
    });

    const topEmpresas = Object.entries(pacientesPorEmpresa)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 3)
      .map(([name]) => name);

    // Agrupar por periodo y empresa (con Sets para contar únicos)
    const periodoData: Record<string, any> = {};

    filteredRecords.forEach(r => {
      const periodo = r.periodo || 'Sin Periodo';
      const empresa = r.razonSocial || 'Sin Empresa';
      const paciente = r.numeroDocumento || '';

      if (topEmpresas.includes(empresa) && paciente) {
        if (!periodoData[periodo]) {
          periodoData[periodo] = { periodo };
          topEmpresas.forEach(emp => {
            periodoData[periodo][`_set_${emp}`] = new Set();
          });
        }
        periodoData[periodo][`_set_${empresa}`].add(paciente);
      }
    });

    // Convertir Sets a counts y preparar data
    const result = Object.entries(periodoData)
      .map(([periodo, data]) => {
        const dataPoint: any = { periodo };
        topEmpresas.forEach(empresa => {
          const shortName = empresa.length > 20 ? empresa.substring(0, 20) + '...' : empresa;
          dataPoint[shortName] = data[`_set_${empresa}`]?.size || 0;
        });
        return dataPoint;
      })
      .sort((a, b) => a.periodo.localeCompare(b.periodo)); // Orden cronológico

    return {
      data: result,
      empresas: topEmpresas.map(e => e.length > 20 ? e.substring(0, 20) + '...' : e)
    };
  }, [filteredRecords]);

  const pacientesPorEstanciaChart = useMemo(() => {
    const estanciaMap: Record<number, Set<string>> = {};

    filteredRecords.forEach(r => {
      const dias = r.diasEstancia || 0;
      const paciente = r.numeroDocumento || '';

      if (paciente && dias <= 30) {
        if (!estanciaMap[dias]) estanciaMap[dias] = new Set();
        estanciaMap[dias].add(paciente);
      }
    });

    const result = [];
    for (let i = 0; i <= 30; i++) {
      result.push({ dias: i, pacientes: estanciaMap[i]?.size || 0 });
    }

    return result.filter(item => item.pacientes > 0);
  }, [filteredRecords]);

  const estanciaDetalleTable = useMemo(() => {
    // Función para convertir número de Excel a fecha
    const excelSerialToDate = (serial: any): Date | null => {
      if (!serial) return null;

      const numSerial = Number(serial);
      if (!isNaN(numSerial) && numSerial > 1000) {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + numSerial * 86400000);
      }

      // Intentar parsear si es string
      if (typeof serial === 'string') {
        const parsed = new Date(serial);
        if (!isNaN(parsed.getTime())) return parsed;
      }

      return null;
    };

    // Función para formatear fecha
    const formatDate = (date: Date | null): string => {
      if (!date) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Función para calcular días entre dos fechas
    const calcularDias = (ingreso: Date | null, egreso: Date | null): number => {
      if (!ingreso || !egreso) return 0;
      const diffTime = egreso.getTime() - ingreso.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    };

    const registrosConEstancia = filteredRecords
      .filter(r => r.fechaIngreso || r.fechaEgreso || (r.diasEstancia && r.diasEstancia > 0))
      .map(r => {
        const fechaIngresoObj = excelSerialToDate(r.fechaIngreso);
        const fechaEgresoObj = excelSerialToDate(r.fechaEgreso);

        // Calcular días de estancia
        const diasCalculados = calcularDias(fechaIngresoObj, fechaEgresoObj);

        return {
          razonSocial: r.razonSocial || 'Sin Razón Social',
          ciudadPrestador: r.ciudadPrestador || 'Sin Ciudad',
          fechaIngreso: formatDate(fechaIngresoObj),
          fechaEgreso: formatDate(fechaEgresoObj),
          diasEstancia: diasCalculados || r.diasEstancia || 0,
          numeroDocumento: r.numeroDocumento || ''
        };
      })
      .filter(r => r.diasEstancia > 0) // Solo mostrar con estancia válida
      .sort((a, b) => b.diasEstancia - a.diasEstancia)
      .slice(0, 15);

    return registrosConEstancia;
  }, [filteredRecords]);

  const prestadoresChart = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = r.razonSocial || 'Sin Prestador'; map[k] = (map[k] || 0) + (r.valorTotal || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 22 ? name.substring(0, 22) + '...' : name, value }));
  }, [filteredRecords]);

  const diasEstanciaChart = useMemo(() => {
    const buckets: Record<string, number> = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
    filteredRecords.forEach(r => {
      const d = r.diasEstancia || 0;
      if (d === 0) buckets['0']++;
      else if (d <= 3) buckets['1-3']++;
      else if (d <= 7) buckets['4-7']++;
      else if (d <= 14) buckets['8-14']++;
      else if (d <= 30) buckets['15-30']++;
      else buckets['30+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name: name + ' dias', value }));
  }, [filteredRecords]);

  // Records filtered by everything EXCEPT department (so the map always shows all departments)
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

  // Map data — aggregate by department (uses records without department filter)
  const departmentMapData = useMemo(() => {
    const map: Record<string, {
      casos: number; valorTotal: number; pacientes: Set<string>;
      conTutela: number; sinTutela: number;
      ambulatorio: number; hospitalizacion: number; diagnostico: number; procedimiento: number; farmaco: number; otros: number;
      agrupadorServicios: Record<string, number>;
    }> = {};
    recordsForMap.forEach(r => {
      const depto = r.epcDepartamento || '';
      if (!depto) return;
      if (!map[depto]) map[depto] = {
        casos: 0, valorTotal: 0, pacientes: new Set(),
        conTutela: 0, sinTutela: 0,
        tipoServicios: {},
        agrupadorServicios: {},
      };
      map[depto].casos += 1;
      map[depto].valorTotal += r.valorTotal || 0;
      if (r.numeroDocumento) map[depto].pacientes.add(r.numeroDocumento);
      // Tutela
      const tut = (r.tutelaUsuario || r.tutela || '').toUpperCase().trim();
      if (tut === 'SI' || tut === 'SÍ' || tut === 'S') {
        map[depto].conTutela += 1;
      } else {
        map[depto].sinTutela += 1;
      }
      // Tipo servicio - cada valor real
      const ts = (r.tipoServicio || '').trim();
      if (ts) {
        const tsKey = ts.charAt(0).toUpperCase() + ts.slice(1).toLowerCase();
        map[depto].tipoServicios[tsKey] = (map[depto].tipoServicios[tsKey] || 0) + 1;
      } else {
        map[depto].tipoServicios['Sin tipo'] = (map[depto].tipoServicios['Sin tipo'] || 0) + 1;
      }
      // Agrupador de servicios
      const agr = (r.agrupadorServicios || '').trim();
      if (agr) {
        const agrKey = agr.charAt(0).toUpperCase() + agr.slice(1).toLowerCase();
        map[depto].agrupadorServicios[agrKey] = (map[depto].agrupadorServicios[agrKey] || 0) + 1;
      }
    });
    const result: Record<string, {
      casos: number; valorTotal: number; pacientes: number;
      conTutela: number; sinTutela: number;
      tipoServicios: Record<string, number>;
      agrupadorServicios: Record<string, number>;
    }> = {};
    for (const [k, v] of Object.entries(map)) {
      result[k] = {
        casos: v.casos, valorTotal: v.valorTotal, pacientes: v.pacientes.size,
        conTutela: v.conTutela, sinTutela: v.sinTutela,
        tipoServicios: v.tipoServicios,
        agrupadorServicios: v.agrupadorServicios,
      };
    }
    return result;
  }, [recordsForMap]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatShortCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;
  const clearFilters = () => setFilters(emptyFilters);
  const updateFilter = useCallback((key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  const removeFilter = (key: keyof DashboardFilters) => {
    updateFilter(key, '');
  };

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
    filters.tutelaUsuario, filters.codigoServicio, filters.regionalNormalizada
  ].filter(v => v).length > 0;

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
        <button onClick={loadData} className="btn btn-primary"><HiRefresh /> Reintentar</button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard Oncologico</h1>
          <p className="page-subtitle">
            {'Bienvenido, '}
            <strong style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{user?.displayName ?? user?.email}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={loadData} className="btn btn-secondary">
            <HiRefresh size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* Filters - Main Row */}
      <div className="dashboard-filters">
        <div className="filter-field">
          <label><HiFilter size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />Depto</label>
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
          <button onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)} className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '0.4375rem 0.625rem' }}>
            {advancedFiltersOpen ? '▼' : '▶'} Avanzado {advancedFiltersActive && <span style={{ color: 'var(--brand)', fontWeight: 'bold' }}>●</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="btn btn-outline">
              <HiX /> Limpiar ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Filters - Advanced Section */}
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
            <input type="text" placeholder="Buscar..." value={filters.numeroFactura} onChange={e => updateFilter('numeroFactura', e.target.value)} />
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

      {/* Active filter tags */}
      {activeFilterCount > 0 && (
        <div className="active-filters">
          {filters.epcDepartamento && (
            <span className="filter-tag">Depto: {filters.epcDepartamento} <button onClick={() => removeFilter('epcDepartamento')}><HiX size={12} /></button></span>
          )}
          {filters.tipoServicio && (
            <span className="filter-tag">Servicio: {filters.tipoServicio} <button onClick={() => removeFilter('tipoServicio')}><HiX size={12} /></button></span>
          )}
          {filters.tipoContrato && (
            <span className="filter-tag">Contrato: {filters.tipoContrato} <button onClick={() => removeFilter('tipoContrato')}><HiX size={12} /></button></span>
          )}
          {filters.estado && (
            <span className="filter-tag">Estado: {filters.estado} <button onClick={() => removeFilter('estado')}><HiX size={12} /></button></span>
          )}
          {filters.periodo && (
            <span className="filter-tag">Periodo: {filters.periodo} <button onClick={() => removeFilter('periodo')}><HiX size={12} /></button></span>
          )}
          {filters.codDiagnostico && (
            <span className="filter-tag">Dx: {filters.codDiagnostico} <button onClick={() => removeFilter('codDiagnostico')}><HiX size={12} /></button></span>
          )}
          {filters.estadoAuditoria && (
            <span className="filter-tag">Auditoria: {filters.estadoAuditoria} <button onClick={() => removeFilter('estadoAuditoria')}><HiX size={12} /></button></span>
          )}
          {filters.ciudadPrestador && (
            <span className="filter-tag">Ciudad Prest.: {filters.ciudadPrestador} <button onClick={() => removeFilter('ciudadPrestador')}><HiX size={12} /></button></span>
          )}
          {filters.tipoDocumento && (
            <span className="filter-tag">Tipo Doc.: {filters.tipoDocumento} <button onClick={() => removeFilter('tipoDocumento')}><HiX size={12} /></button></span>
          )}
          {filters.numeroFactura && (
            <span className="filter-tag">Factura: {filters.numeroFactura} <button onClick={() => removeFilter('numeroFactura')}><HiX size={12} /></button></span>
          )}
          {filters.epcCiudad && (
            <span className="filter-tag">Cd. Pac.: {filters.epcCiudad} <button onClick={() => removeFilter('epcCiudad')}><HiX size={12} /></button></span>
          )}
          {filters.razonSocial && (
            <span className="filter-tag">Institucion: {filters.razonSocial.substring(0, 15)}... <button onClick={() => removeFilter('razonSocial')}><HiX size={12} /></button></span>
          )}
          {filters.codigoServicio && (
            <span className="filter-tag">Cod.Serv.: {filters.codigoServicio} <button onClick={() => removeFilter('codigoServicio')}><HiX size={12} /></button></span>
          )}
          {filters.regionalNormalizada && (
            <span className="filter-tag">Regional: {filters.regionalNormalizada} <button onClick={() => removeFilter('regionalNormalizada')}><HiX size={12} /></button></span>
          )}
          {filters.tutelaUsuario && (
            <span className="filter-tag">Tutela: {filters.tutelaUsuario} <button onClick={() => removeFilter('tutelaUsuario')}><HiX size={12} /></button></span>
          )}
        </div>
      )}

      {/* KPI Cards */}
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
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--brand)' }}></span>
            <span className="kpi-sub">{kpis.diagnosticosUnicos} diagnosticos unicos</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <HiCurrencyDollar size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Valor Total</span>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{formatShortCurrency(kpis.valorTotal)}</div>
            </div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--success)' }}></span>
            <span className="kpi-sub">COP facturados</span>
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
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--accent)' }}></span>
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
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--warning)' }}></span>
            <span className="kpi-sub">Regiones</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--info)', borderColor: 'rgba(139,92,246,0.2)' }}>
              <HiCalendar size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Estancia</span>
              <div className="kpi-value">{kpis.promedioEstancia.toFixed(1)}</div>
            </div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--info)' }}></span>
            <span className="kpi-sub">Dias promedio</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-main">
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <HiTrendingUp size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Costo / Pac.</span>
              <div className="kpi-value" style={{ fontSize: '1.25rem' }}>
                {kpis.pacientesUnicos > 0 ? formatShortCurrency(kpis.valorTotal / kpis.pacientesUnicos) : '$0'}
              </div>
            </div>
          </div>
          <div className="kpi-divider"></div>
          <div className="kpi-detail">
            <span className="kpi-dot" style={{ background: 'var(--danger)' }}></span>
            <span className="kpi-sub">Promedio</span>
          </div>
        </div>
      </div>

      {/* Colombia Map */}
      <ColombiaMap
        departmentData={departmentMapData}
        onDepartmentClick={handleMapDepartmentClick}
        selectedDepartment={filters.epcDepartamento}
      />

      {filteredRecords.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <HiDocumentReport size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.125rem' }}>Sin datos para mostrar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: 400, margin: '0 auto' }}>
            {allRecords.length === 0
              ? 'No hay registros en la base de datos. Importa datos desde la seccion de Registro Cancer.'
              : 'Los filtros seleccionados no coinciden con ningun registro. Ajusta los filtros.'}
          </p>
        </div>
      ) : (
        <div className="charts-section">
          {/* Row 1: Area chart full width */}
          <div className="chart-card" style={{ animationDelay: '0.1s' }}>
            <div className="chart-header">
              <div>
                <div className="chart-title">Evolucion Financiera por Periodo</div>
                <div className="chart-subtitle">Valor facturado y volumen de registros a lo largo del tiempo</div>
              </div>
              <span className="chart-badge">{costoPeriodoChart.length} periodos</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costoPeriodoChart}>
                <defs>
                  <linearGradient id="gradValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRegistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatShortCurrency(v)} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'valor' ? formatCurrency(value) : value.toLocaleString(),
                    name === 'valor' ? 'Valor Total' : 'Registros'
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                <Area yAxisId="left" type="monotone" dataKey="valor" stroke="#0d9488" strokeWidth={2} fill="url(#gradValor)" name="Valor Total" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#0d9488' }} />
                <Area yAxisId="right" type="monotone" dataKey="registros" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gradRegistros)" name="Registros" dot={false} activeDot={{ r: 3.5, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ============ LOCALIZACIÓN DEL PPL ============ */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="chart-card" style={{ animationDelay: '0.2s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Pacientes por Departamento</div>
                  <div className="chart-subtitle">Cantidad de pacientes por departamento</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={departamentoPacientesChart}>
                  <defs>
                    <linearGradient id="gradDeptoPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 500 }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Pacientes" fill="url(#gradDeptoPacientes)" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.28s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Pacientes por Ciudad</div>
                  <div className="chart-subtitle">Cantidad de pacientes por ciudad</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ciudadPacientesChart} layout="vertical" margin={{ left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Pacientes" radius={[0, 6, 6, 0]} barSize={16}>
                    {ciudadPacientesChart.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.36s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Pacientes por Región</div>
                  <div className="chart-subtitle">Distribución regional de pacientes</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={regionPacientesChart} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={95}
                    paddingAngle={3} dataKey="value" cornerRadius={3}
                    label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    style={{ fontSize: 9.5, fontWeight: 500, fill: '#64748b' }}
                  >
                    {regionPacientesChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ============ ESTANCIA DEL PACIENTE ============ */}
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {/* Gráfica 1: Empresas por Mes - CON PERIODOS EN ORDEN */}
            <div className="chart-card" style={{ animationDelay: '0.44s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Pacientes por Empresa y Mes</div>
                  <div className="chart-subtitle">Top 3 empresas - Evolución mensual</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={empresasPorMesChart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="periodo" 
                    tick={{ fontSize: 8.5, fill: '#94a3b8', fontWeight: 500 }} 
                    angle={-35} 
                    textAnchor="end" 
                    height={70}
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [value.toLocaleString() + ' pacientes', name]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: 9, fontWeight: 500 }} 
                    iconType="rect"
                  />
                  {empresasPorMesChart.empresas.map((empresa, index) => (
                    <Bar 
                      key={empresa} 
                      dataKey={empresa} 
                      name={empresa}
                      fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      radius={[4, 4, 0, 0]} 
                      barSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica 2: Pacientes por Días de Estancia */}
            <div className="chart-card" style={{ animationDelay: '0.52s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Pacientes por Días de Estancia</div>
                  <div className="chart-subtitle">Distribución según días hospitalizados</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={pacientesPorEstanciaChart}>
                  <defs>
                    <linearGradient id="gradEstancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dias" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} label={{ value: 'Días', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'Pacientes', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Pacientes']} contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => `${label} días`} />
                  <Area type="monotone" dataKey="pacientes" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradEstancia)" dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica 3: Tabla de Detalles - CON DÍAS CALCULADOS */}
            <div className="chart-card" style={{ animationDelay: '0.6s', overflow: 'auto' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Detalle de Estancias</div>
                  <div className="chart-subtitle">Top 15 con días calculados</div>
                </div>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', fontSize: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '0.5rem 0.375rem', textAlign: 'left', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institución</th>
                      <th style={{ padding: '0.5rem 0.375rem', textAlign: 'left', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciudad</th>
                      <th style={{ padding: '0.5rem 0.375rem', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingreso</th>
                      <th style={{ padding: '0.5rem 0.375rem', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Egreso</th>
                      <th style={{ padding: '0.5rem 0.375rem', textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estanciaDetalleTable.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No hay datos de estancia disponibles</td>
                      </tr>
                    ) : (
                      estanciaDetalleTable.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '0.5rem 0.375rem', fontSize: '0.6875rem', color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.razonSocial}>
                            {row.razonSocial.length > 18 ? row.razonSocial.substring(0, 18) + '...' : row.razonSocial}
                          </td>
                          <td style={{ padding: '0.5rem 0.375rem', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{row.ciudadPrestador}</td>
                          <td style={{ padding: '0.5rem 0.375rem', fontSize: '0.6875rem', color: 'var(--text-tertiary)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.fechaIngreso}</td>
                          <td style={{ padding: '0.5rem 0.375rem', fontSize: '0.6875rem', color: 'var(--text-tertiary)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.fechaEgreso}</td>
                          <td style={{ padding: '0.5rem 0.375rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textAlign: 'center' }}>{row.diasEstancia}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}