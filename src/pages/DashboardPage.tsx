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

const CHART_COLORS = ['#0f766e', '#0ea5e9', '#f59e0b', '#ef4444', '#6366f1', '#06b6d4', '#84cc16', '#ec4899', '#f97316', '#8b5cf6'];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  fontSize: 12,
  boxShadow: 'var(--shadow-lg)',
  padding: '10px 14px',
  background: '#ffffff',
};

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
            <strong style={{ color: 'var(--text-secondary)' }}>{user?.displayName ?? user?.email}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={loadData} className="btn btn-secondary">
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
            <button onClick={clearFilters} className="btn btn-outline">
              <HiX /> Limpiar ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      {/* Active filter tags */}
      {activeFilterCount > 0 && (
        <div className="active-filters">
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
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Registros</span>
            <div className="kpi-icon" style={{ background: 'rgba(15,118,110,0.08)', color: 'var(--brand)' }}><HiDocumentReport /></div>
          </div>
          <div className="kpi-value">{kpis.totalRegistros.toLocaleString()}</div>
          <div className="kpi-sub">{kpis.diagnosticosUnicos} diagnosticos unicos</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Valor Total</span>
            <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--success)' }}><HiCurrencyDollar /></div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{formatShortCurrency(kpis.valorTotal)}</div>
          <div className="kpi-sub">COP facturados</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Pacientes</span>
            <div className="kpi-icon" style={{ background: 'rgba(14,165,233,0.08)', color: 'var(--accent)' }}><HiUserGroup /></div>
          </div>
          <div className="kpi-value">{kpis.pacientesUnicos.toLocaleString()}</div>
          <div className="kpi-sub">Documentos unicos</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Departamentos</span>
            <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--warning)' }}><HiLocationMarker /></div>
          </div>
          <div className="kpi-value">{kpis.departamentosUnicos}</div>
          <div className="kpi-sub">Regiones</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Estancia</span>
            <div className="kpi-icon" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--info)' }}><HiCalendar /></div>
          </div>
          <div className="kpi-value">{kpis.promedioEstancia.toFixed(1)}</div>
          <div className="kpi-sub">Dias promedio</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Costo / Pac.</span>
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}><HiTrendingUp /></div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
            {kpis.pacientesUnicos > 0 ? formatShortCurrency(kpis.valorTotal / kpis.pacientesUnicos) : '$0'}
          </div>
          <div className="kpi-sub">Promedio</div>
        </div>
      </div>

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
          <div className="chart-card" style={{ animationDelay: '0.05s' }}>
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
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRegistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatShortCurrency(v)} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'valor' ? formatCurrency(value) : value.toLocaleString(),
                    name === 'valor' ? 'Valor Total' : 'Registros'
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                <Area yAxisId="left" type="monotone" dataKey="valor" stroke="#0f766e" strokeWidth={2.5} fill="url(#gradValor)" name="Valor Total" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#0f766e' }} />
                <Area yAxisId="right" type="monotone" dataKey="registros" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradRegistros)" name="Registros" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#0ea5e9' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Row 2: Estado donut + Top Diagnostics */}
          <div className="charts-row">
            <div className="chart-card" style={{ animationDelay: '0.1s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Distribucion por Estado</div>
                  <div className="chart-subtitle">Estado actual de las facturas</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estadoChart} cx="50%" cy="50%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={4} dataKey="value" cornerRadius={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    style={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }}
                  >
                    {estadoChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.15s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Top 10 Diagnosticos</div>
                  <div className="chart-subtitle">Codigos CIE-10 mas frecuentes</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={diagnosticosChart} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" radius={[0, 6, 6, 0]} barSize={20}>
                    {diagnosticosChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Department + Service Type */}
          <div className="charts-row">
            <div className="chart-card" style={{ animationDelay: '0.2s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Registros por Departamento</div>
                  <div className="chart-subtitle">Top departamentos con mayor volumen</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departamentoChart}>
                  <defs>
                    <linearGradient id="gradBar1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} angle={-30} textAnchor="end" height={65} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" fill="url(#gradBar1)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.25s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Tipo de Servicio</div>
                  <div className="chart-subtitle">Hospitalizacion, ambulatorio, urgencias</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={servicioChart} cx="50%" cy="50%"
                    outerRadius={110} paddingAngle={3}
                    dataKey="value" cornerRadius={4}
                    label={({ name, percent }) => `${name.length > 12 ? name.substring(0, 12) + '..' : name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    style={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }}
                  >
                    {servicioChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: Contract type + Days distribution */}
          <div className="charts-row">
            <div className="chart-card" style={{ animationDelay: '0.3s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Tipo de Contrato</div>
                  <div className="chart-subtitle">Distribucion por modalidad contractual</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contratoChart}>
                  <defs>
                    <linearGradient id="gradBar2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" fill="url(#gradBar2)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" style={{ animationDelay: '0.35s' }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">Dias de Estancia</div>
                  <div className="chart-subtitle">Distribucion por rango de dias</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={diasEstanciaChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Registros']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Registros" radius={[6, 6, 0, 0]} barSize={36}>
                    {diasEstanciaChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 5: Top providers full width */}
          <div className="chart-card" style={{ animationDelay: '0.4s' }}>
            <div className="chart-header">
              <div>
                <div className="chart-title">Top Prestadores por Valor Facturado</div>
                <div className="chart-subtitle">Instituciones con mayor valor acumulado</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={prestadoresChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatShortCurrency(v)} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor Total']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Valor Total" radius={[0, 6, 6, 0]} barSize={22}>
                  {prestadoresChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
