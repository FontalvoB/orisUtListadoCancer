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
  { key: 'tipoDocumento', label: 'Tipo Documento', width: '120px' },
  { key: 'numeroDocumento', label: 'Nº Documento', width: '130px' },
  { key: 'primerApellido', label: 'Primer Apellido', width: '140px' },
  { key: 'segundoApellido', label: 'Segundo Apellido', width: '140px' },
  { key: 'primerNombre', label: 'Primer Nombre', width: '140px' },
  { key: 'segundoNombre', label: 'Segundo Nombre', width: '140px' },
  { key: 'edad', label: 'Edad', width: '80px' },
  { key: 'cursoDeVida', label: 'Curso de Vida', width: '140px' },
  { key: 'sexo', label: 'Sexo', width: '80px' },
  { key: 'nombreEstablecimiento', label: 'Establecimiento', width: '180px' },
  { key: 'epcCiudad', label: 'Ciudad', width: '140px' },
  { key: 'epcDepartamento', label: 'Departamento', width: '140px' },
  { key: 'regionalNormalizada', label: 'Regional', width: '140px' },
  { key: 'discapacidad', label: 'Discapacidad', width: '120px' },
  { key: 'lgtbiq', label: 'LGTBIQ+', width: '100px' },
  { key: 'gruposEtnicos', label: 'Grupos Étnicos', width: '140px' },
  { key: 'estado', label: 'Estado', width: '100px' },
  { key: 'novedad', label: 'Novedad', width: '120px' },
  { key: 'hipertensionHTA', label: 'Hipertensión (HTA)', width: '130px' },
  { key: 'diabetesMellitusDM', label: 'Diabetes Mellitus (DM)', width: '150px' },
  { key: 'vih', label: 'VIH', width: '80px' },
  { key: 'sifilis', label: 'Sífilis', width: '80px' },
  { key: 'varicela', label: 'Varicela', width: '100px' },
  { key: 'tuberculosis', label: 'Tuberculosis', width: '120px' },
  { key: 'hiperlipidemia', label: 'Hiperlipidemia', width: '120px' },
  { key: 'asma', label: 'Asma', width: '80px' },
  { key: 'enfermedadRenalCronicaERC', label: 'ERC', width: '80px' },
  { key: 'desnutricion', label: 'Desnutrición', width: '120px' },
  { key: 'obesidad', label: 'Obesidad', width: '100px' },
  { key: 'epilepsia', label: 'Epilepsia', width: '100px' },
  { key: 'hipotiroidismo', label: 'Hipotiroidismo', width: '120px' },
  { key: 'enfermedadPulmonarObstructivaCronicaEPOC', label: 'EPOC', width: '80px' },
  { key: 'artritis', label: 'Artritis', width: '100px' },
  { key: 'cancerCA', label: 'Cáncer (CA)', width: '100px' },
  { key: 'tipoDeCancer', label: 'Tipo de Cáncer', width: '150px' },
  { key: 'patologiasCardiacas', label: 'Patologías Cardíacas', width: '150px' },
  { key: 'trastornoSaludMental', label: 'Trastorno/Salud Mental', width: '150px' },
  { key: 'gestantes', label: 'Gestantes', width: '100px' },
  { key: 'mujeresConTrastornosMenstruales', label: 'Trastornos Menstruales', width: '150px' },
  { key: 'endometriosis', label: 'Endometriosis', width: '120px' },
  { key: 'amenorrea', label: 'Amenorrea', width: '100px' },
  { key: 'glaucoma', label: 'Glaucoma', width: '100px' },
  { key: 'consumoDeSPA', label: 'Consumo de SPA', width: '120px' },
  { key: 'enfermedadHuerfana', label: 'Enfermedad Huérfana', width: '150px' },
  { key: 'hiperplasiaDeProstata', label: 'Hiperplasia de Próstata', width: '150px' },
  { key: 'hemofilia', label: 'Hemofilia', width: '100px' },
  { key: 'otrosTrastornosVisuales', label: 'Otros Trastornos Visuales', width: '150px' },
  { key: 'numeroDERiesgos', label: 'Nº de Riesgos', width: '100px' },
  { key: 'valoracionMedicinaGeneralFamiliar', label: 'Valoración Med. General', width: '150px' },
  { key: 'consultaJoven', label: 'Consulta Joven', width: '120px' },
  { key: 'consultaAdultez', label: 'Consulta Adultez', width: '130px' },
  { key: 'consultaVejez', label: 'Consulta Vejez', width: '120px' },
  { key: 'citologiaTamizajeCACervix', label: 'Citología Ca Cérvix', width: '150px' },
  { key: 'resultadoCitologia', label: 'Resultado Citología', width: '130px' },
  { key: 'planificacionFamiliar', label: 'Planificación Familiar', width: '150px' },
  { key: 'metodo', label: 'Método', width: '120px' },
  { key: 'consultaDeMama', label: 'Consulta de Mama', width: '130px' },
  { key: 'mamografia', label: 'Mamografía', width: '120px' },
  { key: 'resultadoMamografia', label: 'Resultado Mamografía', width: '130px' },
  { key: 'tamizajeCAProstata', label: 'Tamizaje Ca Próstata', width: '150px' },
  { key: 'resultadoProstata', label: 'Resultado Próstata', width: '130px' },
  { key: 'tamizajeCADeColon', label: 'Tamizaje Ca Colon', width: '130px' },
  { key: 'resultadoColon', label: 'Resultado Colon', width: '130px' },
  { key: 'creatinina', label: 'Creatinina', width: '100px' },
  { key: 'glicemia', label: 'Glicemia', width: '100px' },
  { key: 'hdl', label: 'HDL', width: '80px' },
  { key: 'colesterolTotal', label: 'Colesterol Total', width: '130px' },
  { key: 'ldl', label: 'LDL', width: '80px' },
  { key: 'trigliceridos', label: 'Triglicéridos', width: '120px' },
  { key: 'pediatria', label: 'Pediatría', width: '100px' },
  { key: 'medicinaInterna', label: 'Medicina Interna', width: '130px' },
  { key: 'educacion', label: 'Educación', width: '100px' },
  { key: 'odontologia', label: 'Odontología', width: '120px' },
  { key: 'tomaVIH', label: 'Toma VIH', width: '100px' },
  { key: 'tomaSifilis', label: 'Toma Sífilis', width: '110px' },
  { key: 'tomaHepatitisB', label: 'Toma Hepatitis B', width: '130px' },
  { key: 'psicologia', label: 'Psicología', width: '100px' },
  { key: 'nutricion', label: 'Nutrición', width: '100px' },
  { key: 'ginecologia', label: 'Ginecología', width: '120px' },
  { key: 'ortopedia', label: 'Ortopedia', width: '100px' },
  { key: 'endocrinologia', label: 'Endocrinología', width: '120px' },
  { key: 'oftalmologia', label: 'Oftalmología', width: '120px' },
  { key: 'psiquiatria', label: 'Psiquiatría', width: '110px' },
  { key: 'terapiaFisica', label: 'Terapia Física', width: '120px' },
  { key: 'intervenciones', label: 'Intervenciones', width: '180px' },
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
        r.numeroDocumento.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.primerNombre.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.primerApellido.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.nombreEstablecimiento.toLowerCase().includes(quickSearch.toLowerCase()) ||
        r.estado.toLowerCase().includes(quickSearch.toLowerCase())
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
        description: `Registro actualizado: ${editForm.numeroDocumento ?? editingRecord.numeroDocumento}`,
        targetId: editingRecord.id,
        targetName: String(editForm.numeroDocumento ?? editingRecord.numeroDocumento),
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
    if (!window.confirm(`¿Eliminar registro ${record.numeroDocumento}?`)) return;
    try {
      await deleteCancerRecord(record.id);
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'delete',
        module: 'cancer',
        description: `Registro eliminado: ${record.numeroDocumento}`,
        targetId: record.id,
        targetName: record.numeroDocumento,
        details: { registroEliminado: { documento: record.numeroDocumento, primerNombre: record.primerNombre, primerApellido: record.primerApellido, estado: record.estado } },
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
        tipoDocumento: String(createForm.tipoDocumento ?? ''),
        numeroDocumento: String(createForm.numeroDocumento ?? ''),
        primerApellido: String(createForm.primerApellido ?? ''),
        segundoApellido: String(createForm.segundoApellido ?? ''),
        primerNombre: String(createForm.primerNombre ?? ''),
        segundoNombre: String(createForm.segundoNombre ?? ''),
        edad: Number(createForm.edad ?? 0),
        cursoDeVida: String(createForm.cursoDeVida ?? ''),
        sexo: String(createForm.sexo ?? ''),
        nombreEstablecimiento: String(createForm.nombreEstablecimiento ?? ''),
        epcCiudad: String(createForm.epcCiudad ?? ''),
        epcDepartamento: String(createForm.epcDepartamento ?? ''),
        regionalNormalizada: String(createForm.regionalNormalizada ?? ''),
        discapacidad: String(createForm.discapacidad ?? ''),
        lgtbiq: String(createForm.lgtbiq ?? ''),
        gruposEtnicos: String(createForm.gruposEtnicos ?? ''),
        estado: String(createForm.estado ?? ''),
        novedad: String(createForm.novedad ?? ''),
        hipertensionHTA: String(createForm.hipertensionHTA ?? ''),
        diabetesMellitusDM: String(createForm.diabetesMellitusDM ?? ''),
        vih: String(createForm.vih ?? ''),
        sifilis: String(createForm.sifilis ?? ''),
        varicela: String(createForm.varicela ?? ''),
        tuberculosis: String(createForm.tuberculosis ?? ''),
        hiperlipidemia: String(createForm.hiperlipidemia ?? ''),
        asma: String(createForm.asma ?? ''),
        enfermedadRenalCronicaERC: String(createForm.enfermedadRenalCronicaERC ?? ''),
        desnutricion: String(createForm.desnutricion ?? ''),
        obesidad: String(createForm.obesidad ?? ''),
        epilepsia: String(createForm.epilepsia ?? ''),
        hipotiroidismo: String(createForm.hipotiroidismo ?? ''),
        enfermedadPulmonarObstructivaCronicaEPOC: String(createForm.enfermedadPulmonarObstructivaCronicaEPOC ?? ''),
        artritis: String(createForm.artritis ?? ''),
        cancerCA: String(createForm.cancerCA ?? ''),
        tipoDeCancer: String(createForm.tipoDeCancer ?? ''),
        patologiasCardiacas: String(createForm.patologiasCardiacas ?? ''),
        trastornoSaludMental: String(createForm.trastornoSaludMental ?? ''),
        gestantes: String(createForm.gestantes ?? ''),
        mujeresConTrastornosMenstruales: String(createForm.mujeresConTrastornosMenstruales ?? ''),
        endometriosis: String(createForm.endometriosis ?? ''),
        amenorrea: String(createForm.amenorrea ?? ''),
        glaucoma: String(createForm.glaucoma ?? ''),
        consumoDeSPA: String(createForm.consumoDeSPA ?? ''),
        enfermedadHuerfana: String(createForm.enfermedadHuerfana ?? ''),
        hiperplasiaDeProstata: String(createForm.hiperplasiaDeProstata ?? ''),
        hemofilia: String(createForm.hemofilia ?? ''),
        otrosTrastornosVisuales: String(createForm.otrosTrastornosVisuales ?? ''),
        numeroDERiesgos: String(createForm.numeroDERiesgos ?? ''),
        valoracionMedicinaGeneralFamiliar: String(createForm.valoracionMedicinaGeneralFamiliar ?? ''),
        consultaJoven: String(createForm.consultaJoven ?? ''),
        consultaAdultez: String(createForm.consultaAdultez ?? ''),
        consultaVejez: String(createForm.consultaVejez ?? ''),
        citologiaTamizajeCACervix: String(createForm.citologiaTamizajeCACervix ?? ''),
        resultadoCitologia: String(createForm.resultadoCitologia ?? ''),
        planificacionFamiliar: String(createForm.planificacionFamiliar ?? ''),
        metodo: String(createForm.metodo ?? ''),
        consultaDeMama: String(createForm.consultaDeMama ?? ''),
        mamografia: String(createForm.mamografia ?? ''),
        resultadoMamografia: String(createForm.resultadoMamografia ?? ''),
        tamizajeCAProstata: String(createForm.tamizajeCAProstata ?? ''),
        resultadoProstata: String(createForm.resultadoProstata ?? ''),
        tamizajeCADeColon: String(createForm.tamizajeCADeColon ?? ''),
        resultadoColon: String(createForm.resultadoColon ?? ''),
        creatinina: String(createForm.creatinina ?? ''),
        glicemia: String(createForm.glicemia ?? ''),
        hdl: String(createForm.hdl ?? ''),
        colesterolTotal: String(createForm.colesterolTotal ?? ''),
        ldl: String(createForm.ldl ?? ''),
        trigliceridos: String(createForm.trigliceridos ?? ''),
        pediatria: String(createForm.pediatria ?? ''),
        medicinaInterna: String(createForm.medicinaInterna ?? ''),
        educacion: String(createForm.educacion ?? ''),
        odontologia: String(createForm.odontologia ?? ''),
        tomaVIH: String(createForm.tomaVIH ?? ''),
        tomaSifilis: String(createForm.tomaSifilis ?? ''),
        tomaHepatitisB: String(createForm.tomaHepatitisB ?? ''),
        psicologia: String(createForm.psicologia ?? ''),
        nutricion: String(createForm.nutricion ?? ''),
        ginecologia: String(createForm.ginecologia ?? ''),
        ortopedia: String(createForm.ortopedia ?? ''),
        endocrinologia: String(createForm.endocrinologia ?? ''),
        oftalmologia: String(createForm.oftalmologia ?? ''),
        psiquiatria: String(createForm.psiquiatria ?? ''),
        terapiaFisica: String(createForm.terapiaFisica ?? ''),
        intervenciones: String(createForm.intervenciones ?? ''),
      });
      setSuccessMsg('Registro creado correctamente');
      await logActivity({
        userId: user?.uid ?? '',
        userEmail: user?.email ?? '',
        userName: user?.displayName ?? '',
        action: 'create',
        module: 'cancer',
        description: `Registro de cáncer creado: ${createForm.numeroDocumento ?? 'sin documento'}`,
        targetName: String(createForm.numeroDocumento ?? ''),
        details: { nuevoRegistro: { documento: createForm.numeroDocumento, primerNombre: createForm.primerNombre, primerApellido: createForm.primerApellido, estado: createForm.estado } },
      });
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowCreate(false);
      setCreateForm({});
      await loadPage(pageHistory[currentPage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando registro');
    }
  };

  const renderCellValue = (record: CancerRecord, key: keyof CancerRecord) => {
    const val = record[key];
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') return val.toLocaleString();
    if (val instanceof Date) return val.toLocaleDateString('es-CO');
    return String(val);
  };

  // All fields for detail/edit forms — everything is text now (dates/values stored as strings)
  const allFields: { key: keyof CancerRecord; label: string; type: 'text' | 'number' }[] = [
    { key: 'tipoDocumento', label: 'Tipo Documento', type: 'text' },
    { key: 'numeroDocumento', label: 'Número Documento', type: 'text' },
    { key: 'primerApellido', label: 'Primer Apellido', type: 'text' },
    { key: 'segundoApellido', label: 'Segundo Apellido', type: 'text' },
    { key: 'primerNombre', label: 'Primer Nombre', type: 'text' },
    { key: 'segundoNombre', label: 'Segundo Nombre', type: 'text' },
    { key: 'edad', label: 'Edad', type: 'number' },
    { key: 'cursoDeVida', label: 'Curso de Vida', type: 'text' },
    { key: 'sexo', label: 'Sexo', type: 'text' },
    { key: 'nombreEstablecimiento', label: 'Establecimiento', type: 'text' },
    { key: 'epcCiudad', label: 'Ciudad', type: 'text' },
    { key: 'epcDepartamento', label: 'Departamento', type: 'text' },
    { key: 'regionalNormalizada', label: 'Regional Normalizada', type: 'text' },
    { key: 'discapacidad', label: 'Discapacidad', type: 'text' },
    { key: 'lgtbiq', label: 'LGTBIQ+', type: 'text' },
    { key: 'gruposEtnicos', label: 'Grupos Étnicos', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'text' },
    { key: 'novedad', label: 'Novedad', type: 'text' },
    { key: 'hipertensionHTA', label: 'Hipertensión (HTA)', type: 'text' },
    { key: 'diabetesMellitusDM', label: 'Diabetes Mellitus (DM)', type: 'text' },
    { key: 'vih', label: 'VIH', type: 'text' },
    { key: 'sifilis', label: 'Sífilis', type: 'text' },
    { key: 'varicela', label: 'Varicela', type: 'text' },
    { key: 'tuberculosis', label: 'Tuberculosis', type: 'text' },
    { key: 'hiperlipidemia', label: 'Hiperlipidemia', type: 'text' },
    { key: 'asma', label: 'Asma', type: 'text' },
    { key: 'enfermedadRenalCronicaERC', label: 'Enfermedad Renal Crónica', type: 'text' },
    { key: 'desnutricion', label: 'Desnutrición', type: 'text' },
    { key: 'obesidad', label: 'Obesidad', type: 'text' },
    { key: 'epilepsia', label: 'Epilepsia', type: 'text' },
    { key: 'hipotiroidismo', label: 'Hipotiroidismo', type: 'text' },
    { key: 'enfermedadPulmonarObstructivaCronicaEPOC', label: 'EPOC', type: 'text' },
    { key: 'artritis', label: 'Artritis', type: 'text' },
    { key: 'cancerCA', label: 'Cáncer (CA)', type: 'text' },
    { key: 'tipoDeCancer', label: 'Tipo de Cáncer', type: 'text' },
    { key: 'patologiasCardiacas', label: 'Patologías Cardíacas', type: 'text' },
    { key: 'trastornoSaludMental', label: 'Trastorno/Salud Mental', type: 'text' },
    { key: 'gestantes', label: 'Gestantes', type: 'text' },
    { key: 'mujeresConTrastornosMenstruales', label: 'Trastornos Menstruales', type: 'text' },
    { key: 'endometriosis', label: 'Endometriosis', type: 'text' },
    { key: 'amenorrea', label: 'Amenorrea', type: 'text' },
    { key: 'glaucoma', label: 'Glaucoma', type: 'text' },
    { key: 'consumoDeSPA', label: 'Consumo de SPA', type: 'text' },
    { key: 'enfermedadHuerfana', label: 'Enfermedad Huérfana', type: 'text' },
    { key: 'hiperplasiaDeProstata', label: 'Hiperplasia de Próstata', type: 'text' },
    { key: 'hemofilia', label: 'Hemofilia', type: 'text' },
    { key: 'otrosTrastornosVisuales', label: 'Otros Trastornos Visuales', type: 'text' },
    { key: 'numeroDERiesgos', label: 'Número de Riesgos', type: 'text' },
    { key: 'valoracionMedicinaGeneralFamiliar', label: 'Valoración Med. General', type: 'text' },
    { key: 'consultaJoven', label: 'Consulta Joven', type: 'text' },
    { key: 'consultaAdultez', label: 'Consulta Adultez', type: 'text' },
    { key: 'consultaVejez', label: 'Consulta Vejez', type: 'text' },
    { key: 'citologiaTamizajeCACervix', label: 'Citología Tamizaje Ca Cérvix', type: 'text' },
    { key: 'resultadoCitologia', label: 'Resultado Citología', type: 'text' },
    { key: 'planificacionFamiliar', label: 'Planificación Familiar', type: 'text' },
    { key: 'metodo', label: 'Método', type: 'text' },
    { key: 'consultaDeMama', label: 'Consulta de Mama', type: 'text' },
    { key: 'mamografia', label: 'Mamografía', type: 'text' },
    { key: 'resultadoMamografia', label: 'Resultado Mamografía', type: 'text' },
    { key: 'tamizajeCAProstata', label: 'Tamizaje Ca Próstata', type: 'text' },
    { key: 'resultadoProstata', label: 'Resultado Próstata', type: 'text' },
    { key: 'tamizajeCADeColon', label: 'Tamizaje Ca Colon', type: 'text' },
    { key: 'resultadoColon', label: 'Resultado Colon', type: 'text' },
    { key: 'creatinina', label: 'Creatinina', type: 'text' },
    { key: 'glicemia', label: 'Glicemia', type: 'text' },
    { key: 'hdl', label: 'HDL', type: 'text' },
    { key: 'colesterolTotal', label: 'Colesterol Total', type: 'text' },
    { key: 'ldl', label: 'LDL', type: 'text' },
    { key: 'trigliceridos', label: 'Triglicéridos', type: 'text' },
    { key: 'pediatria', label: 'Pediatría', type: 'text' },
    { key: 'medicinaInterna', label: 'Medicina Interna', type: 'text' },
    { key: 'educacion', label: 'Educación', type: 'text' },
    { key: 'odontologia', label: 'Odontología', type: 'text' },
    { key: 'tomaVIH', label: 'Toma VIH', type: 'text' },
    { key: 'tomaSifilis', label: 'Toma Sífilis', type: 'text' },
    { key: 'tomaHepatitisB', label: 'Toma Hepatitis B', type: 'text' },
    { key: 'psicologia', label: 'Psicología', type: 'text' },
    { key: 'nutricion', label: 'Nutrición', type: 'text' },
    { key: 'ginecologia', label: 'Ginecología', type: 'text' },
    { key: 'ortopedia', label: 'Ortopedia', type: 'text' },
    { key: 'endocrinologia', label: 'Endocrinología', type: 'text' },
    { key: 'oftalmologia', label: 'Oftalmología', type: 'text' },
    { key: 'psiquiatria', label: 'Psiquiatría', type: 'text' },
    { key: 'terapiaFisica', label: 'Terapia Física', type: 'text' },
    { key: 'intervenciones', label: 'Intervenciones', type: 'text' },
  ];

  const activeFilterCount = Object.values(filters).filter(v => v && v.trim()).length;

  // ====== SAMPLE EXCEL DOWNLOAD ======
  const downloadSampleExcel = () => {
    const headers = Object.keys(EXCEL_TO_FIELD_MAP);
    const sampleRows = [
      {
        'TIPO_DOCUMENTO': 'CC',
        'NUMERO_DOCUMENTO': '1010201010',
        'PRIMER_APELLIDO': 'García',
        'SEGUNDO_APELLIDO': 'López',
        'PRIMER_NOMBRE': 'Juan',
        'SEGUNDO_NOMBRE': 'Carlos',
        'EDAD': 45,
        'CURSO DE VIDA': 'Adultez',
        'SEXO': 'M',
        'NOMBRE_ESTABLECIMIENTO': 'HOSPITAL UNIVERSITARIO',
        'EPC_CIUDAD': 'Bogotá',
        'EPC_DEPARTAMENTO': 'Cundinamarca',
        'REGIONAL_NORMALIZADA': 'Región Central',
        'DISCAPACIDAD': 'No',
        'LGTBIQ+': 'No',
        'GRUPOS ETNICOS': 'No aplica',
        'ESTADO': 'Vivo',
        'NOVEDAD': 'Nuevo caso',
        'Hipertensión (HTA)': '1',
        'Diabetes Mellitus (DM)': '',
        'VIH': '',
        'SIFILIS': '',
        'VARICELA': '1',
        'Tuberculosis': '',
        'Hiperlipidemia': '1',
        'Asma': '',
        'Enfermedad Renal Crónica (ERC)': '',
        'Desnutricion': '',
        'Obesidad': '1',
        'Epilepsia': '',
        'Hipotiroidismo': '',
        'Enfermedad Pulmonar Obstructiva Crónica (EPOC)': '',
        'Artritis': '1',
        'Cáncer (CA)': '1',
        'Tipo de cancer': 'Cáncer de mama',
        'Patologías Cardíacas': '',
        'TRASTORNO/SALUD MENTAL': '',
        'GESTANTES': '',
        'Mujeres con trastornos menstruales': '',
        'Endometriosis': '',
        'AMENORREA': '',
        'Glaucoma': '',
        'CONSUMO DE SPA': '',
        'ENFERMEDAD HUERFANA': '',
        'HIPERPLASIA DE PROSTATA': '',
        'HEMOFILIA': '',
        'OTROS TRASTORNOS VISUALES': '',
        'NUMERO DE RIESGOS': 3,
        'VALORACION MEDICINA GENERAL/FAMILIAR': '15/03/2025',
        'CONSULTA JOVEN': '',
        'CONSULTA ADULTEZ': '22/05/2025',
        'CONSULTA VEJEZ': '',
        'CITOLOGIA-TAMIZAJE CA DE CERVIX': '',
        'RESULTADO CITOLOGIA': '6/10/2025',
        'PLANIFICACION FAMILIAR': '',
        'METODO': 'N/A',
        'CONSULTA DE MAMA': '10/04/2025',
        'MAMOGRAFIA': '20/06/2025',
        'RESULTADO MAMOGRAFIA': 'Normal',
        'TAMIZAJE CA PROSTATA': '',
        'RESULTADO PROSTATA': '',
        'TAMIZAJE CA DE COLON': '',
        'RESULTADO COLON': '',
        'CREATININA': '12/02/2025',
        'GLICEMIA': '12/02/2025',
        'HDL': '12/02/2025',
        'COLESTEROL TOTAL': '12/02/2025',
        'LDL': '12/02/2025',
        'TRIGLICERIDOS': '12/02/2025',
        'PEDIATRIA': '',
        'MEDICINA INTERNA': '5/06/2025',
        'EDUCACION': '22/05/2025',
        'ODONTOLOGIA': '',
        'TOMA VIH': '',
        'TOMA SIFILIS': '',
        'TOMA HEPATITIS B': '',
        'PSICOLOGIA': '',
        'NUTRICION': '8/07/2025',
        'GINECOLOGIA': '',
        'ORTOPEDIA': '',
        'ENDOCRINOLOGIA': '',
        'OFTALMOLOGIA': '',
        'PSIQUIATRIA': '',
        'TERAPIA FISICA': '',
        'INTERVENCIONES': 'Quimioterapia, Radioterapia',
      },
      {
        'TIPO_DOCUMENTO': 'CC',
        'NUMERO_DOCUMENTO': '9876543210',
        'PRIMER_APELLIDO': 'Rodríguez',
        'SEGUNDO_APELLIDO': 'Martínez',
        'PRIMER_NOMBRE': 'María',
        'SEGUNDO_NOMBRE': 'Elena',
        'EDAD': 58,
        'CURSO DE VIDA': 'Vejez',
        'SEXO': 'F',
        'NOMBRE_ESTABLECIMIENTO': 'CLÍNICA SAN RAFAEL',
        'EPC_CIUDAD': 'Medellín',
        'EPC_DEPARTAMENTO': 'Antioquia',
        'REGIONAL_NORMALIZADA': 'Región Noroeste',
        'DISCAPACIDAD': 'Sí',
        'LGTBIQ+': 'No',
        'GRUPOS ETNICOS': 'Indígena',
        'ESTADO': 'Fallecido',
        'NOVEDAD': 'Seguimiento',
        'Hipertensión (HTA)': '1',
        'Diabetes Mellitus (DM)': '1',
        'VIH': '',
        'SIFILIS': '',
        'VARICELA': '1',
        'Tuberculosis': '',
        'Hiperlipidemia': '',
        'Asma': '',
        'Enfermedad Renal Crónica (ERC)': '1',
        'Desnutricion': '',
        'Obesidad': '',
        'Epilepsia': '',
        'Hipotiroidismo': '1',
        'Enfermedad Pulmonar Obstructiva Crónica (EPOC)': '1',
        'Artritis': '',
        'Cáncer (CA)': '1',
        'Tipo de cancer': 'Cáncer de pulmón',
        'Patologías Cardíacas': '1',
        'TRASTORNO/SALUD MENTAL': '',
        'GESTANTES': '',
        'Mujeres con trastornos menstruales': '',
        'Endometriosis': '',
        'AMENORREA': '',
        'Glaucoma': '1',
        'CONSUMO DE SPA': '1',
        'ENFERMEDAD HUERFANA': '',
        'HIPERPLASIA DE PROSTATA': '',
        'HEMOFILIA': '',
        'OTROS TRASTORNOS VISUALES': '',
        'NUMERO DE RIESGOS': 5,
        'VALORACION MEDICINA GENERAL/FAMILIAR': '4/01/2025',
        'CONSULTA JOVEN': '',
        'CONSULTA ADULTEZ': '',
        'CONSULTA VEJEZ': '18/03/2025',
        'CITOLOGIA-TAMIZAJE CA DE CERVIX': '',
        'RESULTADO CITOLOGIA': '4/09/2025',
        'PLANIFICACION FAMILIAR': '',
        'METODO': 'N/A',
        'CONSULTA DE MAMA': '',
        'MAMOGRAFIA': '',
        'RESULTADO MAMOGRAFIA': '',
        'TAMIZAJE CA PROSTATA': '15/05/2025',
        'RESULTADO PROSTATA': '9/07/2025',
        'TAMIZAJE CA DE COLON': '20/06/2025',
        'RESULTADO COLON': '11/11/2025',
        'CREATININA': '3/03/2025',
        'GLICEMIA': '3/03/2025',
        'HDL': '3/03/2025',
        'COLESTEROL TOTAL': '3/03/2025',
        'LDL': '3/03/2025',
        'TRIGLICERIDOS': '3/03/2025',
        'PEDIATRIA': '',
        'MEDICINA INTERNA': '10/04/2025',
        'EDUCACION': '22/05/2025',
        'ODONTOLOGIA': '',
        'TOMA VIH': '',
        'TOMA SIFILIS': '',
        'TOMA HEPATITIS B': '',
        'PSICOLOGIA': '15/06/2025',
        'NUTRICION': '8/07/2025',
        'GINECOLOGIA': '',
        'ORTOPEDIA': '',
        'ENDOCRINOLOGIA': '20/08/2025',
        'OFTALMOLOGIA': '25/09/2025',
        'PSIQUIATRIA': '',
        'TERAPIA FISICA': '',
        'INTERVENCIONES': 'Manejo paliativo, Soporte respiratorio',
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
            placeholder="Buscar por documento, nombre, establecimiento..."
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
            <h4 className="filter-section-title">Información Demográfica</h4>
            <div className="filter-grid">
              <div className="form-group">
                <label>Número Documento</label>
                <input
                  type="text"
                  value={tempFilters.numeroDocumento ?? ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, numeroDocumento: e.target.value })}
                  placeholder="Ej: 1234567890"
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
            </div>
          </div>

          <div className="filter-section">
            <h4 className="filter-section-title">Estado</h4>
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
                      <h4 className="card-title">{record.numeroDocumento} - {record.primerNombre} {record.primerApellido}</h4>
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
                      <span className="field-label">Nombre</span>
                      <span className="field-value">{record.primerNombre} {record.segundoNombre} {record.primerApellido}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Edad</span>
                      <span className="field-value">{record.edad} años</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Sexo</span>
                      <span className="field-value">{record.sexo}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Tipo Cáncer</span>
                      <span className="field-value">{record.tipoDeCancer || 'No especificado'}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Establecimiento</span>
                      <span className="field-value">{record.nombreEstablecimiento}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Departamento</span>
                      <span className="field-value">{record.epcDepartamento}</span>
                    </div>
                    <div className="card-field">
                      <span className="field-label">Curso de Vida</span>
                      <span className="field-value">{record.cursoDeVida}</span>
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
                    <p>{String(selectedRecord[f.key] ?? '')}</p>
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
