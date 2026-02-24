import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { importIpsRecords } from '../services/ipsService';
import type { IpsRecord } from '../types';
import { EXCEL_TO_IPS_FIELD_MAP } from '../types';
import { HiUpload, HiX, HiCheck, HiDocumentText, HiDownload } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/activityLogService';

interface ImportIpsExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ImportIpsExcelModal({ isOpen, onClose, onImportComplete }: ImportIpsExcelModalProps) {
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

  // ── Parse Excel on selection ───────────────────────────────────────────────
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
        setPreview(jsonData.slice(0, 5));
        setFile(f);
      } catch {
        setError('Error al leer el archivo Excel. Verifica el formato.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseExcel(selectedFile);
  };

  // ── Map one Excel row → IpsRecord (without id/dates) ──────────────────────
  const mapRowToRecord = (row: Record<string, unknown>): Omit<IpsRecord, 'id' | 'createdAt' | 'updatedAt'> => {
    const defaults: Omit<IpsRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      departamento: '', municipio: '', region: '',
      codigoHabilitacion: '', numeroSede: '', nomIps: '',
      direccion: '', telefono: '', email: '',
      nitsNit: '', dv: '', clasePersona: '',
      najuCodigo: '', najuNombre: '',
      clprCodigo: '', clprNombre: '', grseCodigo: '',
      tipServicio: '', servCodigo: '', nomServicio: '', complejidad: '',
    };

    const record: Record<string, unknown> = { ...defaults };

    for (const [excelHeader, fieldName] of Object.entries(EXCEL_TO_IPS_FIELD_MAP)) {
      if (row[excelHeader] !== undefined && row[excelHeader] !== null) {
        const value = row[excelHeader];
        const strValue = String(value).trim();
        if (!strValue) continue;
        record[fieldName] = strValue;
      }
    }

    return record as Omit<IpsRecord, 'id' | 'createdAt' | 'updatedAt'>;
  };

  // ── Import ─────────────────────────────────────────────────────────────────
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
          const imported = await importIpsRecords(records, (completed, total) => {
            setProgress({ completed, total });
          });

          setSuccess(`✅ ${imported.toLocaleString()} registros importados correctamente`);
          await logActivity({
            userId: user?.uid ?? '',
            userEmail: user?.email ?? '',
            userName: user?.displayName ?? '',
            action: 'import',
            module: 'ips',
            description: `Importación Excel IPS: ${imported.toLocaleString()} registros desde ${file.name}`,
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

  // ── Download example file ──────────────────────────────────────────────────
  const handleDownloadExample = () => {
    const headers = Object.keys(EXCEL_TO_IPS_FIELD_MAP);
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

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IPS');
    XLSX.writeFile(wb, 'ejemplo_ips.xlsx');
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
          <h2><HiDocumentText /> Importar Excel – Registro IPS</h2>
          <button onClick={handleClose} className="btn-icon btn-cancel" disabled={importing}>
            <HiX />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Columns reference */}
          <div className="alert" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#0369a1' }}>
              <strong>Columnas esperadas:</strong>{' '}
              {Object.keys(EXCEL_TO_IPS_FIELD_MAP).join(', ')}
            </p>
          </div>

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
                  <p className="file-meta">
                    {totalRows.toLocaleString()} registros encontrados · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {preview.length > 0 && (
                <div className="preview-section">
                  <h3>Vista previa (primeros 5 registros)</h3>
                  <div className="table-container preview-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {previewHeaders.slice(0, 10).map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                          {previewHeaders.length > 10 && <th>...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {previewHeaders.slice(0, 10).map((h) => (
                              <td key={h}>{String(row[h] ?? '').substring(0, 40)}</td>
                            ))}
                            {previewHeaders.length > 10 && (
                              <td>+{previewHeaders.length - 10} cols</td>
                            )}
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
              <p>Importando registros IPS...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="progress-text">
                {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} registros
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleDownloadExample} className="btn btn-secondary" style={{ marginRight: 'auto' }}>
            <HiDownload /> Descargar archivo ejemplo
          </button>
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
