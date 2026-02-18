import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  writeBatch,
  serverTimestamp,
  type DocumentSnapshot,
  type Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CancerRecord } from '../types';

const COLLECTION = 'cancerRecords';

// ==================== IN-MEMORY CACHE ====================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let allRecordsCache: CacheEntry<CancerRecord[]> | null = null;
let countCache: CacheEntry<Record<string, number>> = { data: {}, timestamp: 0 };

const isCacheValid = <T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> => {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL;
};

/** Invalidate all caches — call after create/update/delete/import */
export const invalidateCancerCache = () => {
  allRecordsCache = null;
  countCache = { data: {}, timestamp: 0 };
};

const toDate = (ts: Timestamp | Date | undefined): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
};

const docToRecord = (d: DocumentSnapshot): CancerRecord => {
  const data = d.data()!;
  return {
    id: d.id,
    radicado: data.radicado ?? '',
    idInterno: data.idInterno ?? '',
    nitPrestador: data.nitPrestador ?? '',
    razonSocial: data.razonSocial ?? '',
    estado: data.estado ?? '',
    numeroFactura: data.numeroFactura ?? '',
    estadoAuditoria: data.estadoAuditoria ?? '',
    ciudadPrestador: data.ciudadPrestador ?? '',
    periodo: data.periodo ?? '',
    tipoDocumento: data.tipoDocumento ?? '',
    numeroDocumento: data.numeroDocumento ?? '',
    nombreEstablecimiento: data.nombreEstablecimiento ?? '',
    epcCiudad: data.epcCiudad ?? '',
    epcDepartamento: data.epcDepartamento ?? '',
    regionalNormalizada: data.regionalNormalizada ?? '',
    fechaIngreso: data.fechaIngreso ?? '',
    fechaEgreso: data.fechaEgreso ?? '',
    diasEstancia: data.diasEstancia ?? 0,
    tipoServicio: data.tipoServicio ?? '',
    codigoServicio: data.codigoServicio ?? '',
    descripcionServicio: data.descripcionServicio ?? '',
    agrupadorServicios: data.agrupadorServicios ?? '',
    codDiagnostico: data.codDiagnostico ?? '',
    descDiagnostico: data.descDiagnostico ?? '',
    dx: data.dx ?? '',
    cantidad: data.cantidad ?? 0,
    valorUnitario: data.valorUnitario ?? 0,
    valorTotal: data.valorTotal ?? 0,
    tipoContrato: data.tipoContrato ?? '',
    tutelaUsuario: data.tutelaUsuario ?? '',
    conteo: data.conteo ?? 0,
    tutela: data.tutela ?? '',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

// ==================== FILTERS ====================
export interface CancerFilters {
  descDiagnostico?: string;
  codDiagnostico?: string;
  epcDepartamento?: string;
  ciudadPrestador?: string;
  tipoServicio?: string;
  tipoContrato?: string;
  estado?: string;
  periodo?: string;
  razonSocial?: string;
  numeroDocumento?: string;
}

// ==================== PAGINATED READ ====================
export interface PaginatedResult {
  records: CancerRecord[];
  totalCount: number;
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export const getCancerRecordsPaginated = async (
  pageSize: number = 50,
  lastDocument: DocumentSnapshot | null = null,
  filters: CancerFilters = {},
  skipCount: boolean = false
): Promise<PaginatedResult> => {
  const constraints: QueryConstraint[] = [];

  // Apply filters — Firestore only allows equality filters combined with orderBy
  // For text search we use >= and <= for prefix matching on the indexed field
  if (filters.codDiagnostico) {
    constraints.push(where('codDiagnostico', '==', filters.codDiagnostico));
  }
  if (filters.epcDepartamento) {
    constraints.push(where('epcDepartamento', '==', filters.epcDepartamento));
  }
  if (filters.tipoServicio) {
    constraints.push(where('tipoServicio', '==', filters.tipoServicio));
  }
  if (filters.tipoContrato) {
    constraints.push(where('tipoContrato', '==', filters.tipoContrato));
  }
  if (filters.estado) {
    constraints.push(where('estado', '==', filters.estado));
  }
  if (filters.periodo) {
    constraints.push(where('periodo', '==', filters.periodo));
  }
  if (filters.ciudadPrestador) {
    constraints.push(where('ciudadPrestador', '==', filters.ciudadPrestador));
  }
  if (filters.numeroDocumento) {
    constraints.push(where('numeroDocumento', '==', filters.numeroDocumento));
  }

  // Order and pagination
  constraints.push(orderBy('createdAt', 'desc'));
  if (lastDocument) {
    constraints.push(startAfter(lastDocument));
  }
  constraints.push(limit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);

  // Only fetch count when needed (first page load or filter change), not on every page turn
  // We also cache the count per filter key to avoid repeated server count queries
  const filterKey = JSON.stringify(filters);
  let totalCount = 0;
  if (!skipCount) {
    if (isCacheValid(countCache) && countCache.data[filterKey] !== undefined) {
      totalCount = countCache.data[filterKey];
    } else {
      const countQueryConstraints: QueryConstraint[] = [];
      if (filters.codDiagnostico) countQueryConstraints.push(where('codDiagnostico', '==', filters.codDiagnostico));
      if (filters.epcDepartamento) countQueryConstraints.push(where('epcDepartamento', '==', filters.epcDepartamento));
      if (filters.tipoServicio) countQueryConstraints.push(where('tipoServicio', '==', filters.tipoServicio));
      if (filters.tipoContrato) countQueryConstraints.push(where('tipoContrato', '==', filters.tipoContrato));
      if (filters.estado) countQueryConstraints.push(where('estado', '==', filters.estado));
      if (filters.periodo) countQueryConstraints.push(where('periodo', '==', filters.periodo));
      if (filters.ciudadPrestador) countQueryConstraints.push(where('ciudadPrestador', '==', filters.ciudadPrestador));
      if (filters.numeroDocumento) countQueryConstraints.push(where('numeroDocumento', '==', filters.numeroDocumento));

      const countQuery = query(collection(db, COLLECTION), ...countQueryConstraints);
      const countSnap = await getCountFromServer(countQuery);
      totalCount = countSnap.data().count;
      countCache = {
        data: { ...countCache.data, [filterKey]: totalCount },
        timestamp: Date.now(),
      };
    }
  }

  const records = snap.docs.map(docToRecord);
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

  return {
    records,
    totalCount,
    lastDoc,
    hasMore: snap.docs.length === pageSize,
  };
};

// ==================== SINGLE READ ====================
export const getCancerRecordById = async (id: string): Promise<CancerRecord | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToRecord(snap);
};

// ==================== CREATE ====================
export const createCancerRecord = async (
  data: Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateCancerCache();
  return ref.id;
};

// ==================== UPDATE ====================
export const updateCancerRecord = async (
  id: string,
  data: Partial<CancerRecord>
): Promise<void> => {
  const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
  void _id; void _ca;
  await updateDoc(doc(db, COLLECTION, id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
  invalidateCancerCache();
};

// ==================== DELETE ====================
export const deleteCancerRecord = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidateCancerCache();
};

// ==================== BATCH IMPORT (for Excel) ====================
// Firestore batch limit = 500, so we chunk the data
export const importCancerRecords = async (
  records: Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'>[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> => {
  const BATCH_SIZE = 400; // Stay under the 500 limit, accounting for overhead
  let imported = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const record of chunk) {
      const ref = doc(collection(db, COLLECTION));
      batch.set(ref, {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    imported += chunk.length;
    onProgress?.(imported, records.length);
  }

  invalidateCancerCache();
  return imported;
};

// ==================== COMPUTE DISTINCT VALUES FROM RECORDS (in-memory) ====================
/**
 * Compute distinct values for a field from an already-loaded array of records.
 * Use this instead of getDistinctValues() to avoid extra Firestore reads.
 */
export const computeDistinctValues = (
  records: CancerRecord[],
  field: keyof CancerRecord
): string[] => {
  const values = new Set<string>();
  records.forEach(r => {
    const val = r[field];
    if (val != null && typeof val === 'string' && val.trim()) {
      values.add(val.trim());
    }
  });
  return Array.from(values).sort();
};

/**
 * Compute multiple distinct value sets at once from the same records array.
 * Returns a map of field → sorted unique string values.
 */
export const computeAllDistinctValues = (
  records: CancerRecord[],
  fields: (keyof CancerRecord)[]
): Record<string, string[]> => {
  const setsMap: Record<string, Set<string>> = {};
  fields.forEach(f => { setsMap[f] = new Set(); });

  records.forEach(r => {
    fields.forEach(f => {
      const val = r[f];
      if (val != null && typeof val === 'string' && val.trim()) {
        setsMap[f].add(val.trim());
      }
    });
  });

  const result: Record<string, string[]> = {};
  fields.forEach(f => {
    result[f] = Array.from(setsMap[f]).sort();
  });
  return result;
};

// ==================== GET ALL RECORDS (for analytics, with cache) ====================
export const getAllCancerRecords = async (forceRefresh = false): Promise<CancerRecord[]> => {
  if (!forceRefresh && isCacheValid(allRecordsCache)) {
    return allRecordsCache!.data;
  }
  const snap = await getDocs(collection(db, COLLECTION));
  const records = snap.docs.map(docToRecord);
  allRecordsCache = { data: records, timestamp: Date.now() };
  return records;
};

// ==================== DELETE ALL (for reimport) ====================
export const deleteAllCancerRecords = async (
  onProgress?: (deleted: number) => void
): Promise<number> => {
  const BATCH_SIZE = 400;
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const q = query(collection(db, COLLECTION), limit(BATCH_SIZE));
    const snap = await getDocs(q);

    if (snap.empty) {
      hasMore = false;
      break;
    }

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    totalDeleted += snap.docs.length;
    onProgress?.(totalDeleted);

    if (snap.docs.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  invalidateCancerCache();
  return totalDeleted;
};
