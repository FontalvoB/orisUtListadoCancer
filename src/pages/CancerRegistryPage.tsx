import { useEffect, useState, useCallback } from 'react';
import {
  getCancerRecordsPaginated,
  updateCancerRecord,
  deleteCancerRecord,
  createCancerRecord,
  type CancerFilters,
  type PaginatedResult,
} from '../services/cancerService';
import type { CancerRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import ImportExcelModal from '../components/ImportExcelModal';
import { logActivity } from '../services/activityLogService';
import {
  HiSearch, HiFilter, HiUpload, HiPlus,
  HiPencil, HiTrash, HiCheck, HiX,
  HiChevronLeft, HiChevronRight, HiEye,
  HiRefresh, HiDownload,
} from 'react-icons/hi';
import * as XLSX from 'xlsx';
import { EXCEL_TO_FIELD_MAP } from '../types';
import type { DocumentSnapshot } from 'firebase/firestore';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// All columns from the Firestore collection
const TABLE_COLUMNS: { key: keyof CancerRecord; label: string; width?: string }[] = [
  { key: 'radicado', label: 'Radicado', width: '120px' },
  { key: 'idInterno', label: 'ID Interno', width: '100px' },
  { key: 'nitPrestador', label: 'NIT Prestador', width: '120px' },
  { key: 'razonSocial', label: 'Razón Social', width: '180px' },
  { key: 'estado', label: 'Estado', width: '100px' },
  { key: 'numeroFactura', label: 'Nº Factura', width: '120px' },
  { key: 'estadoAuditoria', label: 'Estado Auditoría', width: '130px' },
  { key: 'ciudadPrestador', label: 'Ciudad Prestador', width: '140px' },
  { key: 'periodo', label: 'Periodo', width: '100px' },
  { key: 'tipoDocumento', label: 'Tipo Doc.', width: '100px' },
  { key: 'numeroDocumento', label: 'Nº Documento', width: '130px' },
  { key: 'nombreEstablecimiento', label: 'Establecimiento', width: '180px' },
  { key: 'epcCiudad', label: 'Ciudad Paciente', width: '140px' },
  { key: 'epcDepartamento', label: 'Depto. Paciente', width: '140px' },
  { key: 'regionalNormalizada', label: 'Regional', width: '140px' },
  { key: 'fechaIngreso', label: 'Fecha Ingreso', width: '120px' },
  { key: 'fechaEgreso', label: 'Fecha Egreso', width: '120px' },
  { key: 'diasEstancia', label: 'Días Estancia', width: '100px' },
  { key: 'tipoServicio', label: 'Tipo Servicio', width: '130px' },
  { key: 'codigoServicio', label: 'Cód. Servicio', width: '120px' },
  { key: 'descripcionServicio', label: 'Desc. Servicio', width: '180px' },
  { key: 'agrupadorServicios', label: 'Agrupador Serv.', width: '140px' },
  { key: 'codDiagnostico', label: 'Cód. Diagnóstico', width: '120px' },
  { key: 'descDiagnostico', label: 'Desc. Diagnóstico', width: '200px' },
  { key: 'dx', label: 'Dx', width: '80px' },
  { key: 'cantidad', label: 'Cantidad', width: '90px' },
  { key: 'valorUnitario', label: 'Valor Unitario', width: '120px' },
  { key: 'valorTotal', label: 'Valor Total', width: '120px' },
  { key: 'tipoContrato', label: 'Tipo Contrato', width: '120px' },
  { key: 'tutelaUsuario', label: 'Tutela-Usuario', width: '120px' },
  { key: 'conteo', label: 'Conteo', width: '80px' },
  { key: 'tutela', label: 'Tutela', width: '80px' },
];

export default function CancerRegistryPage() {
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('cancer.edit');
  const canCreate = hasPermission('cancer.create');
  const canDelete = hasPermission('cancer.delete');
  const canImport = hasPermission('cancer.import');

  const [records, setRecords] = useState<CancerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageHistory, setPageHistory] = useState<(DocumentSnapshot | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CancerFilters>({});
  const [tempFilters, setTempFilters] = useState<CancerFilters>({});

  // Quick search (local filter on loaded data)
  const [quickSearch, setQuickSearch] = useState('');

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Detail / Edit
  const [selectedRecord, setSelectedRecord] = useState<CancerRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<CancerRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<CancerRecord>>({});

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<CancerRecord>>({});

  // Messages
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPage = useCallback(async (startAfterDoc: DocumentSnapshot | null = null, skipCount = false) => {
    setLoading(true);
    setError('');
    try {
      const result: PaginatedResult = await getCancerRecordsPaginated(pageSize, startAfterDoc, filters, skipCount);
      setRecords(result.records);
      if (!skipCount) {
        setTotalCount(result.totalCount);
      }
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

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
  };

  const filteredRecords = quickSearch
    ? records.filter(r =>
        r.descDiagnostico.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.codDiagnostico.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.radicado.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.numeroDocumento.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.razonSocial.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.nombreEstablecimiento.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : records;

  // ====== DETAIL VIEW ======
  const viewDetail = (record: CancerRecord) => {
    setSelectedRecord(record);
    setEditingRecord(null);
  };

  const closeDetail = () => {
    setSelectedRecord(null);
    setEditingRecord(null);
  };

  // ====== EDIT ======
  const startEdit = (record: CancerRecord) => {
    setEditingRecord(record);
    setEditForm({ ...record });
    setSelectedRecord(null);
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    setError('');
    try {
      await updateCancerRecord(editingRecord.id, editForm);
      const cancerChanges: Record<string, { before: unknown; after: unknown }> = {};
      for (const key of Object.keys(editForm) as (keyof typeof editForm)[]) {
        if (key === 'id') continue;
        const oldVal = editingRecord[key as keyof typeof editingRecord];
        const newVal = editForm[key];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          cancerChanges[key] = { before: oldVal ?? '', after: newVal ?? '' };
        }
      }
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'update',
        module: 'cancer',
        description: `Registro actualizado: ${editForm.radicado ?? editingRecord.radicado}`,
        targetId: editingRecord.id,
        targetName: String(editForm.radicado ?? editingRecord.radicado),
        details: { changes: cancerChanges },
      });
      setSuccessMsg('Registro actualizado');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingRecord(null);
      await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando');
    }
  };

  // ====== DELETE ======
  const handleDelete = async (record: CancerRecord) => {
    if (!window.confirm(`¿Eliminar registro ${record.radicado}?`)) return;
    try {
      await deleteCancerRecord(record.id);
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'delete',
        module: 'cancer',
        description: `Registro eliminado: ${record.radicado}`,
        targetId: record.id,
        targetName: record.radicado,
        details: { registroEliminado: { radicado: record.radicado, documento: record.numeroDocumento, diagnostico: record.descDiagnostico, estado: record.estado } },
      });
      setSuccessMsg('Registro eliminado');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando');
    }
  };

  // ====== CREATE ======
  const handleCreate = async () => {
    setError('');
    try {
      await createCancerRecord({
        radicado: String(createForm.radicado ?? ''),
        idInterno: String(createForm.idInterno ?? ''),
        nitPrestador: String(createForm.nitPrestador ?? ''),
        razonSocial: String(createForm.razonSocial ?? ''),
        estado: String(createForm.estado ?? ''),
        numeroFactura: String(createForm.numeroFactura ?? ''),
        estadoAuditoria: String(createForm.estadoAuditoria ?? ''),
        ciudadPrestador: String(createForm.ciudadPrestador ?? ''),
        periodo: String(createForm.periodo ?? ''),
        tipoDocumento: String(createForm.tipoDocumento ?? ''),
        numeroDocumento: String(createForm.numeroDocumento ?? ''),
        nombreEstablecimiento: String(createForm.nombreEstablecimiento ?? ''),
        epcCiudad: String(createForm.epcCiudad ?? ''),
        epcDepartamento: String(createForm.epcDepartamento ?? ''),
        regionalNormalizada: String(createForm.regionalNormalizada ?? ''),
        fechaIngreso: String(createForm.fechaIngreso ?? ''),
        fechaEgreso: String(createForm.fechaEgreso ?? ''),
        diasEstancia: Number(createForm.diasEstancia ?? 0),
        tipoServicio: String(createForm.tipoServicio ?? ''),
        codigoServicio: String(createForm.codigoServicio ?? ''),
        descripcionServicio: String(createForm.descripcionServicio ?? ''),
        agrupadorServicios: String(createForm.agrupadorServicios ?? ''),
        codDiagnostico: String(createForm.codDiagnostico ?? ''),
        descDiagnostico: String(createForm.descDiagnostico ?? ''),
        dx: String(createForm.dx ?? ''),
        cantidad: Number(createForm.cantidad ?? 0),
        valorUnitario: Number(createForm.valorUnitario ?? 0),
        valorTotal: Number(createForm.valorTotal ?? 0),
        tipoContrato: String(createForm.tipoContrato ?? ''),
        tutelaUsuario: String(createForm.tutelaUsuario ?? ''),
        conteo: Number(createForm.conteo ?? 0),
        tutela: String(createForm.tutela ?? ''),
      });
      setSuccessMsg('Registro creado correctamente');
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'create',
        module: 'cancer',
        description: `Registro de cáncer creado: ${createForm.radicado ?? 'sin radicado'}`,
        targetName: String(createForm.radicado ?? ''),
        details: { nuevoRegistro: { radicado: createForm.radicado, documento: createForm.numeroDocumento, diagnostico: createForm.descDiagnostico, estado: createForm.estado, servicio: createForm.descripcionServicio } },
      });
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowCreate(false);
      setCreateForm({});
      await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando registro');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const renderCellValue = (record: CancerRecord, key: keyof CancerRecord) => {
    const val = record[key];
    if (key === 'valorTotal' || key === 'valorUnitario') return formatCurrency(val as number);
    if (typeof val === 'number') return val.toLocaleString();
    return String(val ?? '');
  };

  // All fields for detail/edit forms
  const allFields: { key: keyof CancerRecord; label: string; type: 'text' | 'number' }[] = [
    { key: 'radicado', label: 'Radicado', type: 'text' },
    { key: 'idInterno', label: 'ID Interno', type: 'text' },
    { key: 'nitPrestador', label: 'NIT Prestador', type: 'text' },
    { key: 'razonSocial', label: 'Razón Social', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'text' },
    { key: 'numeroFactura', label: 'Número Factura', type: 'text' },
    { key: 'estadoAuditoria', label: 'Estado Auditoría', type: 'text' },
    { key: 'ciudadPrestador', label: 'Ciudad Prestador', type: 'text' },
    { key: 'periodo', label: 'Periodo', type: 'text' },
    { key: 'tipoDocumento', label: 'Tipo Documento', type: 'text' },
    { key: 'numeroDocumento', label: 'Número Documento', type: 'text' },
    { key: 'nombreEstablecimiento', label: 'Nombre Establecimiento', type: 'text' },
    { key: 'epcCiudad', label: 'Ciudad Paciente', type: 'text' },
    { key: 'epcDepartamento', label: 'Departamento Paciente', type: 'text' },
    { key: 'regionalNormalizada', label: 'Regional Normalizada', type: 'text' },
    { key: 'fechaIngreso', label: 'Fecha Ingreso', type: 'text' },
    { key: 'fechaEgreso', label: 'Fecha Egreso', type: 'text' },
    { key: 'diasEstancia', label: 'Días Estancia', type: 'number' },
    { key: 'tipoServicio', label: 'Tipo Servicio', type: 'text' },
    { key: 'codigoServicio', label: 'Código Servicio', type: 'text' },
    { key: 'descripcionServicio', label: 'Descripción Servicio', type: 'text' },
    { key: 'agrupadorServicios', label: 'Agrupador Servicios', type: 'text' },
    { key: 'codDiagnostico', label: 'Cód. Diagnóstico', type: 'text' },
    { key: 'descDiagnostico', label: 'Desc. Diagnóstico', type: 'text' },
    { key: 'dx', label: 'dx', type: 'text' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
    { key: 'valorUnitario', label: 'Valor Unitario', type: 'number' },
    { key: 'valorTotal', label: 'Valor Total', type: 'number' },
    { key: 'tipoContrato', label: 'Tipo Contrato', type: 'text' },
    { key: 'tutelaUsuario', label: 'Tutela-Usuario', type: 'text' },
    { key: 'conteo', label: 'Conteo', type: 'number' },
    { key: 'tutela', label: 'Tutela', type: 'text' },
  ];

  const activeFilterCount = Object.values(filters).filter(v => v && v.trim()).length;

  // ====== SAMPLE EXCEL DOWNLOAD ======
  const downloadSampleExcel = () => {
    const headers = Object.keys(EXCEL_TO_FIELD_MAP);
    const sampleRows = [
      {
        'RADICADO': '1234567',
        'ID INTERNO': '001',
        'NIT PRESTADOR': '900123456',
        'RAZON SOCIAL': 'HOSPITAL EJEMPLO',
        'ESTADO': 'ACTIVO',
        'NUMERO FACTURA': 'FAC-001',
        'ESTADO AUDITORIA': 'AUDITADO',
        'CIUDAD PRESTADOR': 'BOGOTÁ',
        'PERIODO': '2025-01',
        'TIPO DOCUMENTO': 'CC',
        'NUMERO DOCUMENTO': '1234567890',
        'NOMBRE_ESTABLECIMIENTO DEL PACIENTE': 'CLÍNICA EJEMPLO',
        'EPC_CIUDAD DEL PACIENTE': 'MEDELLÍN',
        'EPC_DEPARTAMENTO DEL PACIENTE': 'ANTIOQUIA',
        'REGIONAL_NORMALIZADA DEL PACIENTE': 'REGIONAL NOROESTE',
        'FECHA INGRESO': '2025-01-15',
        'FECHA EGRESO': '2025-01-20',
        'DIAS ESTANCIA': 5,
        'TIPO SERVICIO': 'HOSPITALIZACIÓN',
        'CODIGO SERVICIO': 'SRV001',
        'DESCRIPCION SERVICIO': 'CONSULTA ONCOLÓGICA',
        'AGRUPADOR DE SERVICIOS': 'ONCOLOGÍA',
        'COD. DIAGNOSTICO': 'C50',
        'DESC. DIAGNOSTICO': 'TUMOR MALIGNO DE LA MAMA',
        'dx': 'C50.9',
        'CANTIDAD': 1,
        'VALOR UNITARIO': 150000,
        'VALOR TOTAL': 150000,
        'TIPO CONTRATO': 'EVENTO',
        'TUTELA-USUARIO': 'NO',
        'CONTEO': 1,
        'TUTELA': 'NO',
      },
      {
        'RADICADO': '1234568',
        'ID INTERNO': '002',
        'NIT PRESTADOR': '900654321',
        'RAZON SOCIAL': 'CLÍNICA SALUD',
        'ESTADO': 'ACTIVO',
        'NUMERO FACTURA': 'FAC-002',
        'ESTADO AUDITORIA': 'PENDIENTE',
        'CIUDAD PRESTADOR': 'CALI',
        'PERIODO': '2025-02',
        'TIPO DOCUMENTO': 'CC',
        'NUMERO DOCUMENTO': '9876543210',
        'NOMBRE_ESTABLECIMIENTO DEL PACIENTE': 'CENTRO MÉDICO SUR',
        'EPC_CIUDAD DEL PACIENTE': 'CALI',
        'EPC_DEPARTAMENTO DEL PACIENTE': 'VALLE DEL CAUCA',
        'REGIONAL_NORMALIZADA DEL PACIENTE': 'REGIONAL SUROCCIDENTE',
        'FECHA INGRESO': '2025-02-01',
        'FECHA EGRESO': '2025-02-03',
        'DIAS ESTANCIA': 2,
        'TIPO SERVICIO': 'AMBULATORIO',
        'CODIGO SERVICIO': 'SRV002',
        'DESCRIPCION SERVICIO': 'QUIMIOTERAPIA',
        'AGRUPADOR DE SERVICIOS': 'ONCOLOGÍA',
        'COD. DIAGNOSTICO': 'C34',
        'DESC. DIAGNOSTICO': 'TUMOR MALIGNO DEL BRONQUIO Y PULMÓN',
        'dx': 'C34.1',
        'CANTIDAD': 3,
        'VALOR UNITARIO': 500000,
        'VALOR TOTAL': 1500000,
        'TIPO CONTRATO': 'CÁPITA',
        'TUTELA-USUARIO': 'SI',
        'CONTEO': 1,
        'TUTELA': 'SI',
      },
    ];

    // Ensure all header columns exist in each row
    const completeRows = sampleRows.map(row => {
      const complete: Record<string, unknown> = {};
      headers.forEach(h => { complete[h] = row[h as keyof typeof row] ?? ''; });
      return complete;
    });

    const ws = XLSX.utils.json_to_sheet(completeRows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros Cáncer');
    XLSX.writeFile(wb, 'plantilla_registros_cancer.xlsx');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Registro de Cáncer</h1>
        <div className="header-actions">
          <button onClick={downloadSampleExcel} className="btn btn-outline" title="Descargar plantilla Excel de ejemplo">
            <HiDownload /> Plantilla Excel
          </button>
          {canImport && (
            <button onClick={() => setShowImport(true)} className="btn btn-secondary">
              <HiUpload /> Importar Excel
            </button>
          )}
          {canCreate && (
            <button onClick={() => { setShowCreate(true); setCreateForm({}); }} className="btn btn-primary">
              <HiPlus /> Nuevo Registro
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Search & Filters Bar */}
      <div className="toolbar">
        <div className="search-bar">
          <HiSearch />
          <input
            type="text"
            placeholder="Buscar por diagnóstico, radicado, documento, razón social..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
        </div>
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

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-section">
            <h4 className="filter-section-title">Diagnóstico</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Cód. Diagnóstico</label>
                <input
                  type="text"
                  value={tempFilters.codDiagnostico ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, codDiagnostico: e.target.value })}
                  placeholder="Ej: C50"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-section-title">Ubicación</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Departamento</label>
                <input
                  type="text"
                  value={tempFilters.epcDepartamento ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, epcDepartamento: e.target.value })}
                  placeholder="Departamento"
                />
              </div>
              <div className="form-group">
                <label>Ciudad Prestador</label>
                <input
                  type="text"
                  value={tempFilters.ciudadPrestador ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, ciudadPrestador: e.target.value })}
                  placeholder="Ciudad del prestador"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-section-title">Servicio y Contrato</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Tipo Servicio</label>
                <input
                  type="text"
                  value={tempFilters.tipoServicio ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, tipoServicio: e.target.value })}
                  placeholder="Tipo de servicio"
                />
              </div>
              <div className="form-group">
                <label>Tipo Contrato</label>
                <input
                  type="text"
                  value={tempFilters.tipoContrato ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, tipoContrato: e.target.value })}
                  placeholder="Tipo de contrato"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-section-title">Estado y Periodo</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Estado</label>
                <input
                  type="text"
                  value={tempFilters.estado ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, estado: e.target.value })}
                  placeholder="Estado"
                />
              </div>
              <div className="form-group">
                <label>Periodo</label>
                <input
                  type="text"
                  value={tempFilters.periodo ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, periodo: e.target.value })}
                  placeholder="Periodo"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-section-title">Paciente</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Nº Documento</label>
                <input
                  type="text"
                  value={tempFilters.numeroDocumento ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, numeroDocumento: e.target.value })}
                  placeholder="Número de documento"
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

      {/* Stats */}
      <div className="table-stats-enhanced">
        <div className="stat-item">
          <span className="stat-value">{totalCount.toLocaleString()}</span>
          <span className="stat-label">Total de Registros</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{filteredRecords.length.toLocaleString()}</span>
          <span className="stat-label">En Esta Página</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{currentPage + 1}/{totalPages}</span>
          <span className="stat-label">Página Actual</span>
        </div>
      </div>

      {/* Pagination - Top */}
      <div className="pagination-enhanced">
        <button 
          onClick={handlePrevPage} 
          disabled={currentPage === 0} 
          className="btn btn-pagination"
          title="Página anterior"
        >
          <HiChevronLeft /> <span className="btn-label">Anterior</span>
        </button>
        
        <div className="pagination-center">
          <div className="page-size-selector-enhanced">
            <label htmlFor="pageSize-top">Registros por página:</label>
            <select
              id="pageSize-top"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="size-select"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span className="page-info-enhanced">
            Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong>
          </span>
        </div>

        <button 
          onClick={handleNextPage} 
          disabled={!hasMore} 
          className="btn btn-pagination"
          title="Página siguiente"
        >
          <span className="btn-label">Siguiente</span> <HiChevronRight />
        </button>
      </div>

      {/* Table */}
      <div className="table-content-wrapper">
        {loading ? (
          <div className="loading-inline"><div className="spinner" /><p>Cargando registros...</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state">
              <div className="empty-state-icon">
                <HiSearch />
              </div>
              <h3>No se encontraron registros</h3>
              <p>Intenta ajustar los filtros o búsquedas</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-wrapper-desktop">
              <div className="table-container">
              <table className="data-table-enhanced">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(col => (
                      <th key={col.key} style={{ minWidth: col.width }} className="table-header-cell">
                        <span className="header-content">{col.label}</span>
                      </th>
                    ))}
                    <th className="table-header-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <tr key={record.id} className={`table-row-item ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                      {TABLE_COLUMNS.map(col => (
                        <td key={col.key} className="table-data-cell">
                          <span className="cell-content" title={String(record[col.key] ?? '')}>
                            {col.key === 'estado' ? (
                              <span className={`status-badge status-${String(record[col.key] ?? '').toLowerCase()}`}>
                                {renderCellValue(record, col.key)}
                              </span>
                            ) : (
                              renderCellValue(record, col.key)
                            )}
                          </span>
                        </td>
                      ))}
                      <td className="table-actions-cell">
                        <div className="actions-group">
                          <button 
                            onClick={() => viewDetail(record)} 
                            className="action-btn action-view" 
                            title="Ver detalle"
                            aria-label="Ver detalle del registro"
                          >
                            <HiEye />
                            <span className="btn-tooltip">Ver</span>
                          </button>
                          {canEdit && (
                            <button 
                              onClick={() => startEdit(record)} 
                              className="action-btn action-edit" 
                              title="Editar"
                              aria-label="Editar registro"
                            >
                              <HiPencil />
                              <span className="btn-tooltip">Editar</span>
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDelete(record)} 
                              className="action-btn action-delete" 
                              title="Eliminar"
                              aria-label="Eliminar registro"
                            >
                              <HiTrash />
                              <span className="btn-tooltip">Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="table-wrapper-mobile">
            <div className="cards-container">
              {filteredRecords.map((record) => (
                <div key={record.id} className="record-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <h4 className="card-title">{record.radicado}</h4>
                      <span className={`status-badge status-${String(record.estado ?? '').toLowerCase()}`}>
                        {record.estado}
                      </span>
                    </div>
                    <div className="card-actions-mobile">
                      <button 
                        onClick={() => viewDetail(record)} 
                        className="action-btn-mobile action-view"
                        title="Ver detalle"
                      >
                        <HiEye />
                      </button>
                      {canEdit && (
                        <button 
                          onClick={() => startEdit(record)} 
                          className="action-btn-mobile action-edit"
                          title="Editar"
                        >
                          <HiPencil />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(record)} 
                          className="action-btn-mobile action-delete"
                          title="Eliminar"
                        >
                          <HiTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-field">
                      <span className="field-label">Documento</span>
                      <span className="field-value">{record.numeroDocumento}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Institución</span>
                      <span className="field-value">{record.razonSocial}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Diagnóstico</span>
                      <span className="field-value">{record.descDiagnostico}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Cod. Dx</span>
                      <span className="field-value">{record.codDiagnostico}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Tipo de Servicio</span>
                      <span className="field-value">{record.tipoServicio}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Valor Total</span>
                      <span className="field-value field-value-currency">{formatCurrency(record.valorTotal as number)}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Departamento</span>
                      <span className="field-value">{record.epcDepartamento}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Período</span>
                      <span className="field-value">{record.periodo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </div>

      {/* Pagination */}
      <div className="pagination-enhanced">
        <button 
          onClick={handlePrevPage} 
          disabled={currentPage === 0} 
          className="btn btn-pagination"
          title="Página anterior"
        >
          <HiChevronLeft /> <span className="btn-label">Anterior</span>
        </button>
        
        <div className="pagination-center">
          <div className="page-size-selector-enhanced">
            <label htmlFor="pageSize">Registros por página:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="size-select"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span className="page-info-enhanced">
            Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong>
          </span>
        </div>

        <button 
          onClick={handleNextPage} 
          disabled={!hasMore} 
          className="btn btn-pagination"
          title="Página siguiente"
        >
          <span className="btn-label">Siguiente</span> <HiChevronRight />
        </button>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle del Registro</h2>
              <button onClick={closeDetail} className="btn-icon btn-cancel"><HiX /></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {allFields.map(f => (
                  <div key={f.key} className="detail-item">
                    <label>{f.label}</label>
                    <p>{f.type === 'number' && (f.key === 'valorTotal' || f.key === 'valorUnitario')
                      ? formatCurrency(selectedRecord[f.key] as number)
                      : String(selectedRecord[f.key] ?? '')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              {canEdit && (
                <button onClick={() => startEdit(selectedRecord)} className="btn btn-primary">
                  <HiPencil /> Editar
                </button>
              )}
              <button onClick={closeDetail} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Editar Registro</h2>
              <button onClick={() => setEditingRecord(null)} className="btn-icon btn-cancel"><HiX /></button>
            </div>
            <div className="modal-body">
              <div className="edit-grid">
                {allFields.map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    <input
                      type={f.type}
                      value={editForm[f.key] !== undefined ? String(editForm[f.key]) : ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={saveEdit} className="btn btn-primary"><HiCheck /> Guardar</button>
              <button onClick={() => setEditingRecord(null)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Nuevo Registro</h2>
              <button onClick={() => setShowCreate(false)} className="btn-icon btn-cancel"><HiX /></button>
            </div>
            <div className="modal-body">
              <div className="edit-grid">
                {allFields.map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    <input
                      type={f.type}
                      value={createForm[f.key] !== undefined ? String(createForm[f.key]) : ''}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCreate} className="btn btn-primary"><HiCheck /> Crear Registro</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportExcelModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={() => loadPage(null)}
      />
    </div>
  );
}
