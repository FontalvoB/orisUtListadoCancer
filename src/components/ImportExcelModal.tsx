import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { importCancerRecords } from '../services/cancerService';
import type { CancerRecord } from '../types';
import { EXCEL_TO_FIELD_MAP } from '../types';
import { HiUpload, HiX, HiCheck, HiDocumentText } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/activityLogService';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ImportExcelModal({ isOpen, onClose, onImportComplete }: ImportExcelModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseExcel = (f: File) => {
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

        setTotalRows(jsonData.length);
        setPreview(jsonData.slice(0, 5)); // Preview first 5 rows
        setFile(f);
      } catch {
        setError('Error al leer el archivo Excel. Verifica el formato.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseExcel(selectedFile);
    }
  };

  const mapRowToRecord = (row: Record<string, unknown>): Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'> => {
    const record: Record<string, unknown> = {};

    // Initialize all fields with empty string defaults
    const defaults: Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      tipoDocumento: '', numeroDocumento: '', primerApellido: '', segundoApellido: '',
      primerNombre: '', segundoNombre: '', edad: 0, cursoDeVida: '', sexo: '',
      nombreEstablecimiento: '', epcCiudad: '', epcDepartamento: '', regionalNormalizada: '',
      discapacidad: '', lgtbiq: '', gruposEtnicos: '', estado: '', novedad: '',
      hipertensionHTA: '', diabetesMellitusDM: '', vih: '', sifilis: '',
      varicela: '', tuberculosis: '', hiperlipidemia: '', asma: '',
      enfermedadRenalCronicaERC: '', desnutricion: '', obesidad: '', epilepsia: '',
      hipotiroidismo: '', enfermedadPulmonarObstructivaCronicaEPOC: '', artritis: '',
      cancerCA: '', tipoDeCancer: '', patologiasCardiacas: '', trastornoSaludMental: '',
      gestantes: '', mujeresConTrastornosMenstruales: '', endometriosis: '',
      amenorrea: '', glaucoma: '', consumoDeSPA: '', enfermedadHuerfana: '',
      hiperplasiaDeProstata: '', hemofilia: '', otrosTrastornosVisuales: '',
      numeroDERiesgos: '',
      valoracionMedicinaGeneralFamiliar: '', consultaJoven: '',
      consultaAdultez: '', consultaVejez: '', citologiaTamizajeCACervix: '',
      resultadoCitologia: '', planificacionFamiliar: '', metodo: '', consultaDeMama: '',
      mamografia: '', resultadoMamografia: '', tamizajeCAProstata: '', resultadoProstata: '',
      tamizajeCADeColon: '', resultadoColon: '',
      creatinina: '', glicemia: '', hdl: '', colesterolTotal: '', ldl: '', trigliceridos: '',
      pediatria: '', medicinaInterna: '', educacion: '', odontologia: '',
      tomaVIH: '', tomaSifilis: '', tomaHepatitisB: '', psicologia: '',
      nutricion: '', ginecologia: '', ortopedia: '', endocrinologia: '',
      oftalmologia: '', psiquiatria: '', terapiaFisica: '', intervenciones: '',
    };

    Object.assign(record, defaults);

    // Map Excel headers to our fields — store EVERYTHING as-is (string)
    for (const [excelHeader, fieldName] of Object.entries(EXCEL_TO_FIELD_MAP)) {
      if (row[excelHeader] !== undefined && row[excelHeader] !== null) {
        const value = row[excelHeader];
        const strValue = String(value).trim();
        
        if (!strValue) continue;
        
        // Only edad needs to be a number
        if (fieldName === 'edad') {
          record[fieldName] = typeof value === 'number' ? value : parseFloat(strValue) || 0;
        } else {
          // Everything else is stored as string — dates, "1", text, etc.
          record[fieldName] = strValue;
        }
      }
    }

    return record as Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'>;
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });

          const records = jsonData.map(mapRowToRecord);

          const imported = await importCancerRecords(records, (completed, total) => {
            setProgress({ completed, total });
          });

          setSuccess(`✅ ${imported.toLocaleString()} registros importados correctamente`);
          await logActivity({
            userId: user?.uid ?? '',
            userEmail: user?.email ?? '',
            userName: user?.displayName ?? '',
            action: 'import',
            module: 'cancer',
            description: `Importación Excel: ${imported.toLocaleString()} registros desde ${file.name}`,
            details: { fileName: file.name, recordCount: imported },
          });
          onImportComplete();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error durante la importación');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error leyendo el archivo');
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setError('');
    setSuccess('');
    setProgress({ completed: 0, total: 0 });
    onClose();
  };

  const previewHeaders = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div className="modal-overlay">
      <div className="modal modal-large">
        <div className="modal-header">
          <h2><HiDocumentText /> Importar Excel</h2>
          <button onClick={handleClose} className="btn-icon btn-cancel" disabled={importing}>
            <HiX />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {!file && !success && (
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <HiUpload size={48} />
              <p>Haz clic o arrastra un archivo Excel (.xlsx, .xls)</p>
              <p className="upload-hint">El archivo debe tener los encabezados en la primera fila</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {file && !importing && !success && (
            <>
              <div className="file-info">
                <HiDocumentText size={24} />
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-meta">{totalRows.toLocaleString()} registros encontrados · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {preview.length > 0 && (
                <div className="preview-section">
                  <h3>Vista previa (primeros 5 registros)</h3>
                  <div className="table-container preview-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {previewHeaders.slice(0, 8).map(h => (
                            <th key={h}>{h}</th>
                          ))}
                          {previewHeaders.length > 8 && <th>...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {previewHeaders.slice(0, 8).map(h => (
                              <td key={h}>{String(row[h] ?? '').substring(0, 40)}</td>
                            ))}
                            {previewHeaders.length > 8 && <td>+{previewHeaders.length - 8} cols</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {importing && (
            <div className="import-progress">
              <div className="spinner" />
              <p>Importando registros...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="progress-text">
                {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} registros
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {file && !importing && !success && (
            <button onClick={handleImport} className="btn btn-primary">
              <HiCheck /> Importar {totalRows.toLocaleString()} registros
            </button>
          )}
          <button onClick={handleClose} className="btn btn-secondary" disabled={importing}>
            {success ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
