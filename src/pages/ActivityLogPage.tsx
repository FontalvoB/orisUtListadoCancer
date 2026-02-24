import { useEffect, useState, useCallback } from 'react';
import {
  getActivityLogsPaginated,
  type ActivityLog,
  type ActivityLogFilters,
  type ActivityModule,
  type ActivityAction,
  type PaginatedActivityResult,
  ACTION_LABELS,
  MODULE_LABELS,
  ACTION_COLORS,
} from '../services/activityLogService';
import {
  HiFilter, HiChevronLeft, HiChevronRight, HiRefresh, HiX, HiCheck, HiClock, HiChevronDown, HiChevronUp,
} from 'react-icons/hi';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 30;

const MODULES: ActivityModule[] = ['auth', 'users', 'roles', 'cancer', 'arthritis', 'ips', 'profile', 'system'];
const ACTIONS: ActivityAction[] = ['login', 'login_google', 'logout', 'register', 'create', 'update', 'delete', 'import', 'export', 'view'];

export default function ActivityLogPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageHistory, setPageHistory] = useState<(DocumentSnapshot | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [tempFilters, setTempFilters] = useState<ActivityLogFilters>({});

  const loadPage = useCallback(async (startAfterDoc: DocumentSnapshot | null = null) => {
    setLoading(true);
    setError('');
    try {
      const result: PaginatedActivityResult = await getActivityLogsPaginated(PAGE_SIZE, startAfterDoc, filters);
      setLogs(result.logs);
      setTotalCount(result.totalCount);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPage(null);
    setPageHistory([null]);
    setCurrentPage(0);
  }, [loadPage]);

  const handleNextPage = () => {
    if (!hasMore || !lastDoc) return;
    setPageHistory([...pageHistory, lastDoc]);
    setCurrentPage(currentPage + 1);
    loadPage(lastDoc);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const prevDoc = pageHistory[currentPage - 1] ?? null;
    setCurrentPage(currentPage - 1);
    loadPage(prevDoc);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const activeFilterCount = Object.values(filters).filter(v => v && String(v).trim()).length;

  if (!hasPermission('activity.view')) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>Sin Acceso</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>No tienes permiso para ver el registro de actividad.</p>
        <button className="btn btn-primary" onClick={() => navigate('/admin')}>Volver al Dashboard</button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Log</h1>
        <div className="header-actions">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${activeFilterCount > 0 ? 'btn-filter-active' : ''}`}
          >
            <HiFilter /> Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button onClick={() => loadPage(pageHistory[currentPage])} className="btn btn-secondary" title="Recargar">
            <HiRefresh />
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-section">
            <h4 className="filter-section-title">Filtrar por</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Módulo</label>
                <select
                  value={tempFilters.module ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, module: (e.target.value || undefined) as ActivityModule | undefined })}
                >
                  <option value="">Todos</option>
                  {MODULES.map(m => (
                    <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Acción</label>
                <select
                  value={tempFilters.action ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, action: (e.target.value || undefined) as ActivityAction | undefined })}
                >
                  <option value="">Todas</option>
                  {ACTIONS.map(a => (
                    <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Email usuario</label>
                <input
                  type="text"
                  value={tempFilters.userEmail ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, userEmail: e.target.value || undefined })}
                  placeholder="Filtrar por email"
                />
              </div>
            </div>
          </div>
          <div className="filter-actions">
            <button onClick={applyFilters} className="btn btn-primary"><HiCheck /> Aplicar</button>
            <button onClick={clearFilters} className="btn btn-secondary"><HiX /> Limpiar</button>
          </div>
        </div>
      )}

      <div className="table-stats">
        <span>{totalCount.toLocaleString()} registros</span>
        <span>Página {currentPage + 1}</span>
      </div>

      {loading ? (
        <div className="loading-inline"><div className="spinner" /><p>Cargando actividad...</p></div>
      ) : (
        <div className="activity-log-list">
          {logs.length === 0 && <p className="no-data">No hay registros de actividad</p>}
          {logs.map(log => (
            <div key={log.id} className={`activity-item ${expandedLog === log.id ? 'activity-item-expanded' : ''}`}>
              <div className="activity-icon" style={{ backgroundColor: `${ACTION_COLORS[log.action]}20`, color: ACTION_COLORS[log.action] }}>
                <HiClock />
              </div>
              <div className="activity-content">
                <div className="activity-main">
                  <span className="activity-action-badge" style={{ backgroundColor: `${ACTION_COLORS[log.action]}20`, color: ACTION_COLORS[log.action] }}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="activity-module-badge">
                    {MODULE_LABELS[log.module] ?? log.module}
                  </span>
                  <span className="activity-description">{log.description}</span>
                </div>
                <div className="activity-meta">
                  <span className="activity-user">{log.userName || log.userEmail}</span>
                  <span className="activity-time">{formatDate(log.createdAt)}</span>
                </div>
                {log.targetName && (
                  <div className="activity-target">Objetivo: {log.targetName}</div>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <>
                    <button
                      className="btn-detail-toggle"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {expandedLog === log.id ? <HiChevronUp /> : <HiChevronDown />}
                      {expandedLog === log.id ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                    {expandedLog === log.id && (
                      <div className="activity-details">
                        {log.details.changes && typeof log.details.changes === 'object' && Object.keys(log.details.changes as Record<string, unknown>).length > 0 ? (
                          <div className="detail-changes">
                            <span className="detail-label">Cambios realizados:</span>
                            <table className="detail-table">
                              <thead>
                                <tr><th>Campo</th><th>Antes</th><th>Después</th></tr>
                              </thead>
                              <tbody>
                                {Object.entries(log.details.changes as Record<string, { before: unknown; after: unknown }>).map(([field, vals]) => (
                                  <tr key={field}>
                                    <td className="detail-field">{field}</td>
                                    <td className="detail-before">{String(vals.before ?? '—')}</td>
                                    <td className="detail-after">{String(vals.after ?? '—')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                        {/* Render other detail fields (non-changes) */}
                        {Object.entries(log.details)
                          .filter(([key]) => key !== 'changes')
                          .map(([key, value]) => (
                            <div key={key} className="detail-row">
                              <span className="detail-label">{key}:</span>
                              <span className="detail-value">
                                {typeof value === 'object' && value !== null
                                  ? (
                                    <pre className="detail-json">{JSON.stringify(value, null, 2)}</pre>
                                  )
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button onClick={handlePrevPage} disabled={currentPage === 0} className="btn btn-secondary">
          <HiChevronLeft /> Anterior
        </button>
        <span className="page-info">Página {currentPage + 1}</span>
        <button onClick={handleNextPage} disabled={!hasMore} className="btn btn-secondary">
          Siguiente <HiChevronRight />
        </button>
      </div>
    </div>
  );
}
