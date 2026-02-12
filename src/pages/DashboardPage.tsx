import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllCancerRecords, getDistinctValues } from '../services/cancerService';
import type { CancerRecord } from '../types';
import {
  HiDocumentReport, HiLocationMarker, HiCurrencyDollar, HiUserGroup,
  HiFilter, HiX, HiRefresh,
} from 'react-icons/hi';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CHART_COLORS = ['#0e7490', '#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#0891b2', '#65a30d', '#ea580c', '#9333ea'];

interface DashboardFilters {
  epcDepartamento: string;
  tipoServicio: string;
  tipoContrato: string;
  estado: string;
  periodo: string;
  codDiagnostico: string;
}

const emptyFilters: DashboardFilters = {
  epcDepartamento: '',
  tipoServicio: '',
  tipoContrato: '',
  estado: '',
  periodo: '',
  codDiagnostico: '',
};

export default function DashboardPage() {
  const { user } = useAuth();

  const [allRecords, setAllRecords] = useState<CancerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);

  // Dropdown options
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [tiposServicio, setTiposServicio] = useState<string[]>([]);
  const [tiposContrato, setTiposContrato] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [records, deptos, tipos, contratos, estadosList, periodosList, dxList] = await Promise.all([
        getAllCancerRecords(),
        getDistinctValues('epcDepartamento'),
        getDistinctValues('tipoServicio'),
        getDistinctValues('tipoContrato'),
        getDistinctValues('estado'),
        getDistinctValues('periodo'),
        getDistinctValues('codDiagnostico'),
      ]);
      setAllRecords(records);
      setDepartamentos(deptos);
      setTiposServicio(tipos);
      setTiposContrato(contratos);
      setEstados(estadosList);
      setPeriodos(periodosList);
      setDiagnosticos(dxList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (filters.epcDepartamento && r.epcDepartamento !== filters.epcDepartamento) return false;
      if (filters.tipoServicio && r.tipoServicio !== filters.tipoServicio) return false;
      if (filters.tipoContrato && r.tipoContrato !== filters.tipoContrato) return false;
      if (filters.estado && r.estado !== filters.estado) return false;
      if (filters.periodo && r.periodo !== filters.periodo) return false;
      if (filters.codDiagnostico && r.codDiagnostico !== filters.codDiagnostico) return false;
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

  // Chart: Top diagnostics by count
  const diagnosticosChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.codDiagnostico || 'Sin Dx';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart: By department
  const departamentoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.epcDepartamento || 'Sin Depto';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart: By service type
  const servicioChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.tipoServicio || 'Sin Tipo';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart: By contract type
  const contratoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.tipoContrato || 'Sin Contrato';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart: Cost by period (line)
  const costoPeriodoChart = useMemo(() => {
    const map: Record<string, { periodo: string; valor: number; registros: number }> = {};
    filteredRecords.forEach(r => {
      const key = r.periodo || 'Sin Periodo';
      if (!map[key]) map[key] = { periodo: key, valor: 0, registros: 0 };
      map[key].valor += r.valorTotal || 0;
      map[key].registros += 1;
    });
    return Object.values(map).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [filteredRecords]);

  // Chart: By estado
  const estadoChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.estado || 'Sin Estado';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Top prestadores by value
  const prestadoresChart = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r.razonSocial || 'Sin Prestador';
      map[key] = (map[key] || 0) + (r.valorTotal || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + '...' : name, value }));
  }, [filteredRecords]);

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

  const updateFilter = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-inline">
          <div className="spinner" />
          <p>Cargando datos del dashboard...</p>
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
          <p className="welcome-text" style={{ marginBottom: 0 }}>
            Bienvenido, <strong>{user?.displayName ?? user?.email}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={loadData} className="btn btn-secondary" title="Actualizar datos">
            <HiRefresh /> Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-filters">
        <div className="filter-field">
          <label><HiFilter style={{ display: 'inline', verticalAlign: 'middle' }} /> Departamento</label>
          <select value={filters.epcDepartamento} onChange={e => updateFilter('epcDepartamento', e.target.value)}>
            <option value="">Todos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Tipo Servicio</label>
          <select value={filters.tipoServicio} onChange={e => updateFilter('tipoServicio', e.target.value)}>
            <option value="">Todos</option>
            {tiposServicio.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label>Tipo Contrato</label>
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
        {activeFilterCount > 0 && (
          <div className="filter-actions-row">
            <button onClick={clearFilters} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              <HiX /> Limpiar ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      {/* Active filter tags */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {filters.epcDepartamento && (
            <span className="filter-tag">Depto: {filters.epcDepartamento} <button onClick={() => updateFilter('epcDepartamento', '')}><HiX /></button></span>
          )}
          {filters.tipoServicio && (
            <span className="filter-tag">Servicio: {filters.tipoServicio} <button onClick={() => updateFilter('tipoServicio', '')}><HiX /></button></span>
          )}
          {filters.tipoContrato && (
            <span className="filter-tag">Contrato: {filters.tipoContrato} <button onClick={() => updateFilter('tipoContrato', '')}><HiX /></button></span>
          )}
          {filters.estado && (
            <span className="filter-tag">Estado: {filters.estado} <button onClick={() => updateFilter('estado', '')}><HiX /></button></span>
          )}
          {filters.periodo && (
            <span className="filter-tag">Periodo: {filters.periodo} <button onClick={() => updateFilter('periodo', '')}><HiX /></button></span>
          )}
          {filters.codDiagnostico && (
            <span className="filter-tag">Dx: {filters.codDiagnostico} <button onClick={() => updateFilter('codDiagnostico', '')}><HiX /></button></span>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Registros</span>
            <div className="kpi-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <HiDocumentReport />
            </div>
          </div>
          <div className="kpi-card-value">{kpis.totalRegistros.toLocaleString()}</div>
          <div className="kpi-card-subtitle">{kpis.diagnosticosUnicos} diagnosticos unicos</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Valor Total</span>
            <div className="kpi-card-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <HiCurrencyDollar />
            </div>
          </div>
          <div className="kpi-card-value">{formatShortCurrency(kpis.valorTotal)}</div>
          <div className="kpi-card-subtitle">{formatCurrency(kpis.valorTotal)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Pacientes</span>
            <div className="kpi-card-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
              <HiUserGroup />
            </div>
          </div>
          <div className="kpi-card-value">{kpis.pacientesUnicos.toLocaleString()}</div>
          <div className="kpi-card-subtitle">Documentos unicos</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Departamentos</span>
            <div className="kpi-card-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <HiLocationMarker />
            </div>
          </div>
          <div className="kpi-card-value">{kpis.departamentosUnicos}</div>
          <div className="kpi-card-subtitle">Prom. estancia: {kpis.promedioEstancia.toFixed(1)} dias</div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <HiDocumentReport size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Sin datos para mostrar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {allRecords.length === 0
              ? 'No hay registros en la base de datos. Importa datos desde la seccion de Registro Cancer.'
              : 'Los filtros seleccionados no coinciden con ningun registro. Intenta ajustar los filtros.'}
          </p>
        </div>
      ) : (
        <>
          {/* Row 1: Line chart + Pie */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Costo por Periodo</div>
                  <div className="chart-card-subtitle">Valor total y cantidad de registros por periodo</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={costoPeriodoChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatShortCurrency(v)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'valor' ? formatCurrency(value) : value.toLocaleString(),
                      name === 'valor' ? 'Valor Total' : 'Registros'
                    ]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="valor" stroke="#0e7490" strokeWidth={2} name="Valor Total" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="registros" stroke="#059669" strokeWidth={2} name="Registros" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Distribucion por Estado</div>
                  <div className="chart-card-subtitle">Registros segun estado de la factura</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={estadoChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 11 }}
                  >
                    {estadoChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Registros']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Top Diagnostics */}
          <div className="charts-grid">
            <div className="chart-card chart-card-full">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Top 10 Diagnosticos por Frecuencia</div>
                  <div className="chart-card-subtitle">Codigos CIE-10 mas frecuentes en los registros</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={diagnosticosChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Registros']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Registros" radius={[0, 4, 4, 0]}>
                    {diagnosticosChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Department + Service Type */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Registros por Departamento</div>
                  <div className="chart-card-subtitle">Top 10 departamentos con mas registros</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={departamentoChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Registros']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Registros" fill="#0e7490" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Distribucion por Tipo de Servicio</div>
                  <div className="chart-card-subtitle">Hospitalizacion, ambulatorio, urgencias, etc.</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={servicioChart}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {servicioChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Registros']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: Contract type + Top providers */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Tipo de Contrato</div>
                  <div className="chart-card-subtitle">Distribucion de registros por tipo de contrato</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contratoChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Registros']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Registros" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Top Prestadores por Valor</div>
                  <div className="chart-card-subtitle">Prestadores con mayor valor facturado</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prestadoresChart} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatShortCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Valor Total']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Valor Total" fill="#d97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
