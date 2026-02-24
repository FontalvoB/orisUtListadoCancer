import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getIpsRecordsPaginated,
  updateIpsRecord,
  deleteIpsRecord,
  createIpsRecord,
  deleteAllIpsRecords,
  exportIpsRecordsStream,
  type IpsFilters,
  type PaginatedIpsResult,
} from '../services/ipsService';
import type { IpsRecord } from '../types';
import { EXCEL_TO_IPS_FIELD_MAP } from '../types';
import { useAuth } from '../context/AuthContext';
import ImportIpsExcelModal from '../components/ImportIpsExcelModal';
import { logActivity } from '../services/activityLogService';
import {
  HiSearch, HiFilter, HiUpload, HiPlus,
  HiPencil, HiTrash, HiCheck, HiX,
  HiChevronLeft, HiChevronRight, HiEye,
  HiRefresh, HiDownload,
} from 'react-icons/hi';
import * as XLSX from 'xlsx';
import type { DocumentSnapshot } from 'firebase/firestore';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

const TABLE_COLUMNS: { key: keyof IpsRecord; label: string; width?: string }[] = [
  { key: 'departamento',       label: 'Departamento',      width: '140px' },
  { key: 'municipio',          label: 'Municipio',         width: '140px' },
  { key: 'region',             label: 'Región',            width: '120px' },
  { key: 'codigoHabilitacion', label: 'Cod. Habilitación', width: '150px' },
  { key: 'numeroSede',         label: 'Nº Sede',           width: '80px'  },
  { key: 'nomIps',             label: 'Nombre IPS',        width: '220px' },
  { key: 'direccion',          label: 'Dirección',         width: '180px' },
  { key: 'telefono',           label: 'Teléfono',          width: '130px' },
  { key: 'email',              label: 'Email',             width: '180px' },
  { key: 'nitsNit',            label: 'NIT',               width: '130px' },
  { key: 'dv',                 label: 'DV',                width: '60px'  },
  { key: 'clasePersona',       label: 'Clase Persona',     width: '130px' },
  { key: 'najuCodigo',         label: 'Naju Código',       width: '110px' },
  { key: 'najuNombre',         label: 'Naju Nombre',       width: '200px' },
  { key: 'clprCodigo',         label: 'Clpr Código',       width: '110px' },
  { key: 'clprNombre',         label: 'Clpr Nombre',       width: '140px' },
  { key: 'grseCodigo',         label: 'Grse Código',       width: '110px' },
  { key: 'tipServicio',        label: 'Tipo Servicio',     width: '140px' },
  { key: 'servCodigo',         label: 'Serv Código',       width: '110px' },
  { key: 'nomServicio',        label: 'Nombre Servicio',   width: '210px' },
  { key: 'complejidad',        label: 'Complejidad',       width: '120px' },
];

const EMPTY_IPS: Omit<IpsRecord, 'id' | 'createdAt' | 'updatedAt'> = {
  departamento: '', municipio: '', region: '',
  codigoHabilitacion: '', numeroSede: '', nomIps: '',
  direccion: '', telefono: '', email: '',
  nitsNit: '', dv: '', clasePersona: '',
  najuCodigo: '', najuNombre: '',
  clprCodigo: '', clprNombre: '', grseCodigo: '',
  tipServicio: '', servCodigo: '', nomServicio: '', complejidad: '',
};

// ───────────────────────────────────────────────────────────
export default function IpsRegistryPage() {
  const { hasPermission, user } = useAuth();
  const canEdit   = hasPermission('ips.edit');
  const canCreate = hasPermission('ips.create');
  const canDelete = hasPermission('ips.delete');
  const canImport = hasPermission('ips.import');

  const [records,     setRecords]     = useState<IpsRecord[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);
  const [lastDoc,     setLastDoc]     = useState<DocumentSnapshot | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [pageHistory, setPageHistory] = useState<(DocumentSnapshot | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize,    setPageSize]    = useState(10);

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  // Filters
  const [showFilters,  setShowFilters]  = useState(false);
  const [filters,      setFilters]      = useState<IpsFilters>({});
  const [tempFilters,  setTempFilters]  = useState<IpsFilters>({});

  // Server-side search (debounced → updates filters.nomIps)
  const [searchInput,  setSearchInput]  = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, nomIps: val.trim() || undefined }));
      setCurrentPage(0);
      setPageHistory([null]);
    }, 450);
  };

  // Export progress
  const [exportProgress, setExportProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Detail / Edit
  const [selectedRecord, setSelectedRecord] = useState<IpsRecord | null>(null);
  const [editingRecord,  setEditingRecord]  = useState<IpsRecord | null>(null);
  const [editForm,       setEditForm]       = useState<Partial<IpsRecord>>({});

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<IpsRecord>>({});

  // Messages
  const [error,      setError]      = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load page ──────────────────────────────────────────────
  const loadPage = useCallback(async (
    startAfterDoc: DocumentSnapshot | null = null,
    skipCount = false,
  ) => {
    setLoading(true);
    setError('');
    try {
      const result: PaginatedIpsResult = await getIpsRecordsPaginated(
        pageSize, startAfterDoc, filters, skipCount,
      );
      setRecords(result.records);
      if (!skipCount) setTotalCount(result.totalCount);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando registros');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  useEffect(() => {
    loadPage(null);
    setPageHistory([null]);
    setCurrentPage(0);
  }, [loadPage]);

  // ── Pagination ─────────────────────────────────────────────
  const handleNextPage = () => {
    if (!hasMore || !lastDoc) return;
    const newHistory = [...pageHistory, lastDoc];
    setPageHistory(newHistory);
    setCurrentPage(currentPage + 1);
    loadPage(lastDoc, true);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const prevDoc = pageHistory[currentPage - 1] ?? null;
    setCurrentPage(currentPage - 1);
    loadPage(prevDoc, true);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
    setPageHistory([null]);
  };

  // ── Filters ────────────────────────────────────────────────
  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
  };

  // ── Quick search (client-side) ───────────────────────────────
  // nomIps is now a server-side filter — records are already filtered
  const filteredRecords = records;

  // ── Detail ─────────────────────────────────────────────────
  const viewDetail  = (r: IpsRecord) => { setSelectedRecord(r); setEditingRecord(null); };
  const closeDetail = () => { setSelectedRecord(null); setEditingRecord(null); };

  // ── Edit ───────────────────────────────────────────────────
  const startEdit = (r: IpsRecord) => {
    setEditingRecord(r);
    setEditForm({ ...r });
    setSelectedRecord(null);
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    setError('');
    try {
      await updateIpsRecord(editingRecord.id, editForm);
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'update',
        module: 'ips',
        description: `IPS actualizada: ${editForm.nomIps ?? editingRecord.nomIps}`,
        targetId: editingRecord.id,
        targetName: String(editForm.nomIps ?? editingRecord.nomIps),
        details: {},
      });
      setSuccessMsg('Registro actualizado');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingRecord(null);
      await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando');
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (r: IpsRecord) => {
    if (!window.confirm(`¿Eliminar IPS "${r.nomIps}"?`)) return;
    try {
      await deleteIpsRecord(r.id);
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'delete',
        module: 'ips',
        description: `IPS eliminada: ${r.nomIps}`,
        targetId: r.id,
        targetName: r.nomIps,
        details: {},
      });
      setSuccessMsg('Registro eliminado');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (records.length === 1 && currentPage > 0) handlePrevPage();
      else await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando');
    }
  };

  // ── Create ─────────────────────────────────────────────────
  const handleCreate = async () => {
    setError('');
    try {
      const payload: Omit<IpsRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        ...EMPTY_IPS,
        ...Object.fromEntries(
          Object.entries(createForm).map(([k, v]) => [k, String(v ?? '')])
        ) as Partial<typeof EMPTY_IPS>,
      };
      await createIpsRecord(payload);
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'create',
        module: 'ips',
        description: `IPS creada: ${payload.nomIps || 'sin nombre'}`,
        targetName: payload.nomIps,
        details: {},
      });
      setSuccessMsg('Registro IPS creado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowCreate(false);
      setCreateForm({});
      await loadPage(null);
      setPageHistory([null]);
      setCurrentPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando registro');
    }
  };

  // ── Export to Excel (streaming, respects active filters) ────
  const handleExportExcel = async () => {
    const hasFilters = Object.values(filters).some(Boolean);
    const estimatedCount = totalCount;
    if (!hasFilters && estimatedCount > 5000) {
      if (!window.confirm(
        `Va a exportar ${estimatedCount.toLocaleString()} registros sin filtros aplicados.\n` +
        'Esto puede tardar varios minutos.\n\n¿Desea continuar?'
      )) return;
    }
    setExportProgress({ loaded: 0, total: estimatedCount });
    setSuccessMsg('');
    setError('');
    try {
      const all = await exportIpsRecordsStream(filters, (loaded, total) => {
        setExportProgress({ loaded, total });
      });
      const rows = all.map(r => ({
        DEPARTAMENTO: r.departamento,
        MUNICIPIO: r.municipio,
        REGION: r.region,
        codigo_habilitacion: r.codigoHabilitacion,
        numero_sede: r.numeroSede,
        'NOM IPS': r.nomIps,
        DIRECCION: r.direccion,
        TELEFONO: r.telefono,
        email: r.email,
        nits_nit: r.nitsNit,
        dv: r.dv,
        clase_persona: r.clasePersona,
        naju_codigo: r.najuCodigo,
        naju_nombre: r.najuNombre,
        clpr_codigo: r.clprCodigo,
        clpr_nombre: r.clprNombre,
        grse_codigo: r.grseCodigo,
        'TIP SERVICIO': r.tipServicio,
        serv_codigo: r.servCodigo,
        'NOM SERVICIO': r.nomServicio,
        COMPLEJIDAD: r.complejidad,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'IPS');
      XLSX.writeFile(wb, `ips_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setSuccessMsg(`Exportación completada: ${all.length.toLocaleString()} registros`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exportando');
    } finally {
      setExportProgress(null);
    }
  };

  // ── Download Template ───────────────────────────────────────
  const handleDownloadTemplate = () => {
    const exampleRow: Record<string, string> = {
      DEPARTAMENTO: 'ATLANTICO',
      MUNICIPIO: 'BARRANQUILLA',
      REGION: 'CARIBE',
      codigo_habilitacion: '085001000001',
      numero_sede: '1',
      'NOM IPS': 'CLINICA EJEMPLO S.A.S.',
      DIRECCION: 'CRA 45 # 15-20',
      TELEFONO: '6051234567',
      email: 'info@clinicaejemplo.com',
      nits_nit: '900123456',
      dv: '7',
      clase_persona: 'JURIDICA',
      naju_codigo: '12',
      naju_nombre: 'SOCIEDAD POR ACCIONES SIMPLIFICADA',
      clpr_codigo: '1',
      clpr_nombre: 'PRIVADO',
      grse_codigo: '2',
      'TIP SERVICIO': 'AMBULATORIO',
      serv_codigo: '105',
      'NOM SERVICIO': 'CONSULTA MEDICINA GENERAL',
      COMPLEJIDAD: 'BAJA',
    };
    const headers = Object.keys(EXCEL_TO_IPS_FIELD_MAP);
    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IPS');
    XLSX.writeFile(wb, 'plantilla_ips.xlsx');
  };

  // ── Delete All ─────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm('¿Eliminar TODOS los registros IPS? Esta acción no se puede deshacer.')) return;
    if (!window.confirm('Confirmación doble: ¿Está completamente seguro?')) return;
    try {
      setLoading(true);
      const deleted = await deleteAllIpsRecords();
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'delete',
        module: 'ips',
        description: `Eliminación masiva: ${deleted} registros IPS borrados`,
        details: { deleted },
      });
      setSuccessMsg(`${deleted} registros eliminados`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadPage(null);
      setPageHistory([null]);
      setCurrentPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en eliminación masiva');
      setLoading(false);
    }
  };

  // ── Form field helper ──────────────────────────────────────
  const renderField = (
    label: string,
    field: keyof typeof EMPTY_IPS,
    form: Partial<IpsRecord>,
    setter: (v: Partial<IpsRecord>) => void,
  ) => (
    <div className="form-group" key={field}>
      <label>{label}</label>
      <input
        type="text"
        value={String(form[field] ?? '')}
        onChange={e => setter({ ...form, [field]: e.target.value })}
        className="form-control"
      />
    </div>
  );

  // ── Detail fields ──────────────────────────────────────────
  const FIELD_LABELS: Record<keyof typeof EMPTY_IPS, string> = {
    departamento: 'Departamento', municipio: 'Municipio', region: 'Región',
    codigoHabilitacion: 'Código Habilitación', numeroSede: 'Nº Sede', nomIps: 'Nombre IPS',
    direccion: 'Dirección', telefono: 'Teléfono', email: 'Email',
    nitsNit: 'NIT', dv: 'DV', clasePersona: 'Clase Persona',
    najuCodigo: 'Naju Código', najuNombre: 'Naju Nombre',
    clprCodigo: 'Clpr Código', clprNombre: 'Clpr Nombre', grseCodigo: 'Grse Código',
    tipServicio: 'Tipo Servicio', servCodigo: 'Serv Código',
    nomServicio: 'Nombre Servicio', complejidad: 'Complejidad',
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registro IPS</h1>
          <p className="page-subtitle">
            {totalCount.toLocaleString()} registros totales
          </p>
        </div>
        <div className="page-actions">
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <HiPlus /> Nuevo registro
            </button>
          )}
          {canImport && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                <HiUpload /> Importar Excel
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadTemplate} title="Descargar plantilla Excel de ejemplo">
                <HiDownload /> Plantilla
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <HiDownload /> Exportar Excel
          </button>
          {canDelete && (
            <button className="btn btn-danger" onClick={handleDeleteAll} title="Eliminar todos los registros">
              <HiTrash /> Eliminar todos
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => { loadPage(pageHistory[currentPage]); }}>
            <HiRefresh />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error      && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Export progress overlay */}
      {exportProgress && (
        <div className="alert" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            <span style={{ fontSize: '0.875rem', color: '#0369a1' }}>
              Exportando... {exportProgress.loaded.toLocaleString()} / {exportProgress.total.toLocaleString()} registros
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div
              className="progress-fill"
              style={{ width: `${exportProgress.total > 0 ? (exportProgress.loaded / exportProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="toolbar">
        <div className="search-box">
          <HiSearch />
          <input
            type="text"
            placeholder="Buscar por nombre IPS (search en servidor)..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              className="btn-icon"
              style={{ color: '#9ca3af', padding: '0 4px' }}
              onClick={() => { setSearchInput(''); handleSearchChange(''); }}
              title="Limpiar búsqueda"
            >
              <HiX />
            </button>
          )}
        </div>
        <button
          className={`btn btn-secondary ${Object.keys(filters).length > 0 ? 'btn-active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <HiFilter /> Filtros {Object.keys(filters).filter(k => filters[k as keyof IpsFilters]).length > 0 && `(${Object.keys(filters).filter(k => filters[k as keyof IpsFilters]).length})`}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="form-group">
              <label>Departamento</label>
              <input
                type="text"
                value={tempFilters.departamento ?? ''}
                onChange={e => setTempFilters({ ...tempFilters, departamento: e.target.value || undefined })}
                className="form-control"
                placeholder="Ej: ATLANTICO"
              />
            </div>
            <div className="form-group">
              <label>Municipio</label>
              <input
                type="text"
                value={tempFilters.municipio ?? ''}
                onChange={e => setTempFilters({ ...tempFilters, municipio: e.target.value || undefined })}
                className="form-control"
                placeholder="Ej: BARRANQUILLA"
              />
            </div>
            <div className="form-group">
              <label>Tipo Servicio</label>
              <input
                type="text"
                value={tempFilters.tipServicio ?? ''}
                onChange={e => setTempFilters({ ...tempFilters, tipServicio: e.target.value || undefined })}
                className="form-control"
                placeholder="Ej: AMBULATORIO"
              />
            </div>
            <div className="form-group">
              <label>Complejidad</label>
              <input
                type="text"
                value={tempFilters.complejidad ?? ''}
                onChange={e => setTempFilters({ ...tempFilters, complejidad: e.target.value || undefined })}
                className="form-control"
                placeholder="Ej: BAJA"
              />
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={applyFilters}>
              <HiCheck /> Aplicar filtros
            </button>
            <button className="btn btn-secondary" onClick={clearFilters}>
              <HiX /> Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Page-size selector */}
      <div className="table-controls">
        <div className="page-size-selector">
          <span>Mostrar</span>
          {PAGE_SIZE_OPTIONS.map(s => (
            <button
              key={s}
              className={`btn-page-size ${pageSize === s ? 'active' : ''}`}
              onClick={() => handlePageSizeChange(s)}
            >
              {s}
            </button>
          ))}
          <span>por página</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Cargando registros IPS...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <p>No se encontraron registros IPS.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map(col => (
                  <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                ))}
                <th style={{ width: '110px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id}>
                  {TABLE_COLUMNS.map(col => (
                    <td key={col.key} style={{ minWidth: col.width }}>
                      <span className="cell-text">{String(record[col.key] ?? '')}</span>
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div className="action-buttons">
                      <button className="btn-icon btn-view" onClick={() => viewDetail(record)} title="Ver detalles">
                        <HiEye />
                      </button>
                      {canEdit && (
                        <button className="btn-icon btn-edit" onClick={() => startEdit(record)} title="Editar">
                          <HiPencil />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(record)} title="Eliminar">
                          <HiTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="btn btn-secondary" onClick={handlePrevPage} disabled={currentPage === 0}>
          <HiChevronLeft /> Anterior
        </button>
        <span className="pagination-info">
          Página {currentPage + 1} de {totalPages} · {totalCount.toLocaleString()} registros
        </span>
        <button className="btn btn-secondary" onClick={handleNextPage} disabled={!hasMore}>
          Siguiente <HiChevronRight />
        </button>
      </div>

      {/* ── Detail modal ── */}
      {selectedRecord && !editingRecord && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle IPS – {selectedRecord.nomIps}</h2>
              <button className="btn-icon btn-cancel" onClick={closeDetail}><HiX /></button>
            </div>
            <div className="modal-body">
              <div className="ips-detail-grid">
                {(Object.keys(FIELD_LABELS) as (keyof typeof EMPTY_IPS)[]).map(field => (
                  <div className="ips-detail-card" key={field}>
                    <span className="ips-detail-label">{FIELD_LABELS[field]}</span>
                    <span className="ips-detail-value">{String(selectedRecord[field] ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              {canEdit && (
                <button className="btn btn-primary" onClick={() => startEdit(selectedRecord)}>
                  <HiPencil /> Editar
                </button>
              )}
              <button className="btn btn-secondary" onClick={closeDetail}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Editar IPS – {editingRecord.nomIps}</h2>
              <button className="btn-icon btn-cancel" onClick={() => setEditingRecord(null)}><HiX /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                {(Object.keys(FIELD_LABELS) as (keyof typeof EMPTY_IPS)[]).map(field =>
                  renderField(FIELD_LABELS[field], field, editForm as Partial<IpsRecord>, setEditForm)
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={saveEdit}>
                <HiCheck /> Guardar cambios
              </button>
              <button className="btn btn-secondary" onClick={() => setEditingRecord(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Nuevo Registro IPS</h2>
              <button className="btn-icon btn-cancel" onClick={() => { setShowCreate(false); setCreateForm({}); }}><HiX /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid">
                {(Object.keys(FIELD_LABELS) as (keyof typeof EMPTY_IPS)[]).map(field =>
                  renderField(FIELD_LABELS[field], field, createForm as Partial<IpsRecord>, setCreateForm)
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleCreate}>
                <HiCheck /> Crear registro
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setCreateForm({}); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ── */}
      <ImportIpsExcelModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={async () => {
          setShowImport(false);
          await loadPage(null);
          setPageHistory([null]);
          setCurrentPage(0);
        }}
      />
    </div>
  );
}
