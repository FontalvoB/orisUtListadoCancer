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
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { IpsRecord } from "../types";

const COLLECTION = "ipsRecords";

// ==================== IN-MEMORY CACHE ====================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let allRecordsCache: CacheEntry<IpsRecord[]> | null = null;
let countCache: CacheEntry<Record<string, number>> = { data: {}, timestamp: 0 };

const isCacheValid = <T>(
  cache: CacheEntry<T> | null,
): cache is CacheEntry<T> => {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL;
};

/** Invalidate all caches — call after create/update/delete/import */
export const invalidateIpsCache = () => {
  allRecordsCache = null;
  countCache = { data: {}, timestamp: 0 };
};

const toDate = (ts: Timestamp | Date | undefined): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
};

const docToRecord = (d: DocumentSnapshot): IpsRecord => {
  const data = d.data()!;
  const toStr = (val: unknown): string => {
    if (val === undefined || val === null) return "";
    if (typeof val === "boolean") return val ? "1" : "";
    if (typeof val === "number") return String(val);
    return String(val);
  };

  return {
    id: d.id,
    departamento: toStr(data.departamento),
    municipio: toStr(data.municipio),
    region: toStr(data.region),
    codigoHabilitacion: toStr(data.codigoHabilitacion),
    numeroSede: toStr(data.numeroSede),
    nomIps: toStr(data.nomIps),
    direccion: toStr(data.direccion),
    telefono: toStr(data.telefono),
    email: toStr(data.email),
    nitsNit: toStr(data.nitsNit),
    dv: toStr(data.dv),
    clasePersona: toStr(data.clasePersona),
    najuCodigo: toStr(data.najuCodigo),
    najuNombre: toStr(data.najuNombre),
    clprCodigo: toStr(data.clprCodigo),
    clprNombre: toStr(data.clprNombre),
    grseCodigo: toStr(data.grseCodigo),
    tipServicio: toStr(data.tipServicio),
    servCodigo: toStr(data.servCodigo),
    nomServicio: toStr(data.nomServicio),
    complejidad: toStr(data.complejidad),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

// ==================== FILTERS ====================
export interface IpsFilters {
  departamento?: string;
  municipio?: string;
  nomIps?: string;
  tipServicio?: string;
  complejidad?: string;
}

// ==================== PAGINATED READ ====================
export interface PaginatedIpsResult {
  records: IpsRecord[];
  totalCount: number;
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/** Build filter constraints shared between paginated queries and count queries */
function buildFilterConstraints(filters: IpsFilters): QueryConstraint[] {
  const c: QueryConstraint[] = [];
  if (filters.departamento)
    c.push(where("departamento", "==", filters.departamento));
  if (filters.municipio) c.push(where("municipio", "==", filters.municipio));
  if (filters.tipServicio)
    c.push(where("tipServicio", "==", filters.tipServicio));
  if (filters.complejidad)
    c.push(where("complejidad", "==", filters.complejidad));
  return c;
}

/** Build ordering constraints. When nomIps prefix search is active we must
 *  orderBy("nomIps") first (Firestore requirement for range queries). */
function buildOrderConstraints(filters: IpsFilters): QueryConstraint[] {
  if (filters.nomIps) {
    const val = filters.nomIps.toUpperCase().trim();
    return [
      where("nomIps", ">=", val),
      where("nomIps", "<", val + "\uf8ff"),
      orderBy("nomIps"),
    ];
  }
  return [orderBy("createdAt", "desc")];
}

export const getIpsRecordsPaginated = async (
  pageSize = 50,
  lastDocument: DocumentSnapshot | null = null,
  filters: IpsFilters = {},
  skipCount = false,
): Promise<PaginatedIpsResult> => {
  const base = buildFilterConstraints(filters);
  const order = buildOrderConstraints(filters);

  const pageConstraints: QueryConstraint[] = [
    ...base,
    ...order,
    ...(lastDocument ? [startAfter(lastDocument)] : []),
    limit(pageSize),
  ];

  const q = query(collection(db, COLLECTION), ...pageConstraints);
  const snap = await getDocs(q);

  const filterKey = JSON.stringify(filters);
  let totalCount = 0;

  if (!skipCount) {
    if (isCacheValid(countCache) && countCache.data[filterKey] !== undefined) {
      totalCount = countCache.data[filterKey];
    } else {
      // getCountFromServer is a metadata-only read — does NOT count towards
      // document read quota and is free.
      const countConstraints: QueryConstraint[] = [
        ...base,
        ...buildOrderConstraints(filters),
      ];
      const countSnap = await getCountFromServer(
        query(collection(db, COLLECTION), ...countConstraints),
      );
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
export const getIpsRecordById = async (
  id: string,
): Promise<IpsRecord | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToRecord(snap);
};

// ==================== CREATE ====================
export const createIpsRecord = async (
  data: Omit<IpsRecord, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const ref = doc(collection(db, COLLECTION));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateIpsCache();
  return ref.id;
};

// ==================== UPDATE ====================
export const updateIpsRecord = async (
  id: string,
  data: Partial<IpsRecord>,
): Promise<void> => {
  const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
  void _id;
  void _ca;
  await updateDoc(doc(db, COLLECTION, id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
  invalidateIpsCache();
};

// ==================== DELETE ====================
export const deleteIpsRecord = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidateIpsCache();
};

// ==================== BATCH IMPORT ====================
export const importIpsRecords = async (
  records: Omit<IpsRecord, "id" | "createdAt" | "updatedAt">[],
  onProgress?: (completed: number, total: number) => void,
): Promise<number> => {
  const BATCH_SIZE = 400;
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

  invalidateIpsCache();
  return imported;
};

// ==================== GET ALL (for analytics, with cache) ====================
export const getAllIpsRecords = async (
  forceRefresh = false,
): Promise<IpsRecord[]> => {
  if (!forceRefresh && isCacheValid(allRecordsCache)) {
    return allRecordsCache!.data;
  }
  const records = await exportIpsRecordsStream({});
  allRecordsCache = { data: records, timestamp: Date.now() };
  return records;
};

// ==================== EXPORT STREAMING (reads in batches of 500) ====================
/** Streams through all records matching `filters` in chunks of 500.
 *  Only reads what is necessary — never loads 30k docs in a single request.
 *  onProgress(loaded, total) is called after each batch. */
export const exportIpsRecordsStream = async (
  filters: IpsFilters = {},
  onProgress?: (loaded: number, total: number) => void,
): Promise<IpsRecord[]> => {
  const BATCH = 500;
  const allRecords: IpsRecord[] = [];
  let lastDocument: DocumentSnapshot | null = null;
  let hasMore = true;

  const base = buildFilterConstraints(filters);
  const order = buildOrderConstraints(filters);

  // Fetch total count once (metadata read — free quota)
  const total = await getCountFromServer(
    query(collection(db, COLLECTION), ...base, ...order),
  ).then((s) => s.data().count);

  while (hasMore) {
    const constraints: QueryConstraint[] = [
      ...base,
      ...order,
      ...(lastDocument ? [startAfter(lastDocument)] : []),
      limit(BATCH),
    ];
    const snap = await getDocs(
      query(collection(db, COLLECTION), ...constraints),
    );
    const records = snap.docs.map(docToRecord);
    allRecords.push(...records);
    lastDocument = snap.docs[snap.docs.length - 1] ?? null;
    hasMore = snap.docs.length === BATCH;
    onProgress?.(allRecords.length, total);
  }

  return allRecords;
};

// ==================== DELETE ALL (for reimport) ====================
export const deleteAllIpsRecords = async (
  onProgress?: (deleted: number) => void,
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
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    totalDeleted += snap.docs.length;
    onProgress?.(totalDeleted);

    if (snap.docs.length < BATCH_SIZE) hasMore = false;
  }

  invalidateIpsCache();
  return totalDeleted;
};

// ==================== COMPUTE DISTINCT VALUES ====================
export const computeIpsDistinctValues = (
  records: IpsRecord[],
  field: keyof IpsRecord,
): string[] => {
  const values = new Set<string>();
  records.forEach((r) => {
    const val = r[field];
    if (val != null && typeof val === "string" && val.trim()) {
      values.add(val.trim());
    }
  });
  return Array.from(values).sort();
};
