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
import type { CancerRecord } from "../types";

const COLLECTION = "cancerRecords";

// ==================== IN-MEMORY CACHE ====================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let allRecordsCache: CacheEntry<CancerRecord[]> | null = null;
let countCache: CacheEntry<Record<string, number>> = { data: {}, timestamp: 0 };

const isCacheValid = <T>(
  cache: CacheEntry<T> | null,
): cache is CacheEntry<T> => {
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

  // Helper: convert any value to string (handles booleans from old data, dates, numbers)
  const toStr = (val: unknown): string => {
    if (val === undefined || val === null) return "";
    if (typeof val === "boolean") return val ? "1" : "";
    if (typeof val === "number") return String(val);
    return String(val);
  };

  return {
    id: d.id,
    tipoDocumento: toStr(data.tipoDocumento),
    numeroDocumento: toStr(data.numeroDocumento),
    primerApellido: toStr(data.primerApellido),
    segundoApellido: toStr(data.segundoApellido),
    primerNombre: toStr(data.primerNombre),
    segundoNombre: toStr(data.segundoNombre),
    edad: data.edad ?? 0,
    cursoDeVida: toStr(data.cursoDeVida),
    sexo: toStr(data.sexo),
    nombreEstablecimiento: toStr(data.nombreEstablecimiento),
    epcCiudad: toStr(data.epcCiudad),
    epcDepartamento: toStr(data.epcDepartamento),
    regionalNormalizada: toStr(data.regionalNormalizada),
    discapacidad: toStr(data.discapacidad),
    lgtbiq: toStr(data.lgtbiq),
    gruposEtnicos: toStr(data.gruposEtnicos),
    estado: toStr(data.estado),
    novedad: toStr(data.novedad),
    hipertensionHTA: toStr(data.hipertensionHTA),
    diabetesMellitusDM: toStr(data.diabetesMellitusDM),
    vih: toStr(data.vih),
    sifilis: toStr(data.sifilis),
    varicela: toStr(data.varicela),
    tuberculosis: toStr(data.tuberculosis),
    hiperlipidemia: toStr(data.hiperlipidemia),
    asma: toStr(data.asma),
    enfermedadRenalCronicaERC: toStr(data.enfermedadRenalCronicaERC),
    desnutricion: toStr(data.desnutricion),
    obesidad: toStr(data.obesidad),
    epilepsia: toStr(data.epilepsia),
    hipotiroidismo: toStr(data.hipotiroidismo),
    enfermedadPulmonarObstructivaCronicaEPOC: toStr(
      data.enfermedadPulmonarObstructivaCronicaEPOC,
    ),
    artritis: toStr(data.artritis),
    cancerCA: toStr(data.cancerCA),
    tipoDeCancer: toStr(data.tipoDeCancer),
    patologiasCardiacas: toStr(data.patologiasCardiacas),
    trastornoSaludMental: toStr(data.trastornoSaludMental),
    gestantes: toStr(data.gestantes),
    mujeresConTrastornosMenstruales: toStr(
      data.mujeresConTrastornosMenstruales,
    ),
    endometriosis: toStr(data.endometriosis),
    amenorrea: toStr(data.amenorrea),
    glaucoma: toStr(data.glaucoma),
    consumoDeSPA: toStr(data.consumoDeSPA),
    enfermedadHuerfana: toStr(data.enfermedadHuerfana),
    hiperplasiaDeProstata: toStr(data.hiperplasiaDeProstata),
    hemofilia: toStr(data.hemofilia),
    otrosTrastornosVisuales: toStr(data.otrosTrastornosVisuales),
    numeroDERiesgos: toStr(data.numeroDERiesgos),
    valoracionMedicinaGeneralFamiliar: toStr(
      data.valoracionMedicinaGeneralFamiliar,
    ),
    consultaJoven: toStr(data.consultaJoven),
    consultaAdultez: toStr(data.consultaAdultez),
    consultaVejez: toStr(data.consultaVejez),
    citologiaTamizajeCACervix: toStr(data.citologiaTamizajeCACervix),
    resultadoCitologia: toStr(data.resultadoCitologia),
    planificacionFamiliar: toStr(data.planificacionFamiliar),
    metodo: toStr(data.metodo),
    consultaDeMama: toStr(data.consultaDeMama),
    mamografia: toStr(data.mamografia),
    resultadoMamografia: toStr(data.resultadoMamografia),
    tamizajeCAProstata: toStr(data.tamizajeCAProstata),
    resultadoProstata: toStr(data.resultadoProstata),
    tamizajeCADeColon: toStr(data.tamizajeCADeColon),
    resultadoColon: toStr(data.resultadoColon),
    creatinina: toStr(data.creatinina),
    glicemia: toStr(data.glicemia),
    hdl: toStr(data.hdl),
    colesterolTotal: toStr(data.colesterolTotal),
    ldl: toStr(data.ldl),
    trigliceridos: toStr(data.trigliceridos),
    pediatria: toStr(data.pediatria),
    medicinaInterna: toStr(data.medicinaInterna),
    educacion: toStr(data.educacion),
    odontologia: toStr(data.odontologia),
    tomaVIH: toStr(data.tomaVIH),
    tomaSifilis: toStr(data.tomaSifilis),
    tomaHepatitisB: toStr(data.tomaHepatitisB),
    psicologia: toStr(data.psicologia),
    nutricion: toStr(data.nutricion),
    ginecologia: toStr(data.ginecologia),
    ortopedia: toStr(data.ortopedia),
    endocrinologia: toStr(data.endocrinologia),
    oftalmologia: toStr(data.oftalmologia),
    psiquiatria: toStr(data.psiquiatria),
    terapiaFisica: toStr(data.terapiaFisica),
    intervenciones: toStr(data.intervenciones),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
};

// ==================== FILTERS ====================
export interface CancerFilters {
  epcDepartamento?: string;
  estado?: string;
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
  skipCount: boolean = false,
): Promise<PaginatedResult> => {
  const constraints: QueryConstraint[] = [];

  // Apply filters — Firestore only allows equality filters combined with orderBy
  if (filters.epcDepartamento) {
    constraints.push(where("epcDepartamento", "==", filters.epcDepartamento));
  }
  if (filters.estado) {
    constraints.push(where("estado", "==", filters.estado));
  }
  if (filters.numeroDocumento) {
    constraints.push(where("numeroDocumento", "==", filters.numeroDocumento));
  }

  // Order and pagination
  constraints.push(orderBy("createdAt", "desc"));
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
      if (filters.epcDepartamento)
        countQueryConstraints.push(
          where("epcDepartamento", "==", filters.epcDepartamento),
        );
      if (filters.estado)
        countQueryConstraints.push(where("estado", "==", filters.estado));
      if (filters.numeroDocumento)
        countQueryConstraints.push(
          where("numeroDocumento", "==", filters.numeroDocumento),
        );

      const countQuery = query(
        collection(db, COLLECTION),
        ...countQueryConstraints,
      );
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
export const getCancerRecordById = async (
  id: string,
): Promise<CancerRecord | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToRecord(snap);
};

// ==================== CREATE ====================
export const createCancerRecord = async (
  data: Omit<CancerRecord, "id" | "createdAt" | "updatedAt">,
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
  data: Partial<CancerRecord>,
): Promise<void> => {
  const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
  void _id;
  void _ca;
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
  records: Omit<CancerRecord, "id" | "createdAt" | "updatedAt">[],
  onProgress?: (completed: number, total: number) => void,
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
  field: keyof CancerRecord,
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

/**
 * Compute multiple distinct value sets at once from the same records array.
 * Returns a map of field → sorted unique string values.
 */
export const computeAllDistinctValues = (
  records: CancerRecord[],
  fields: (keyof CancerRecord)[],
): Record<string, string[]> => {
  const setsMap: Record<string, Set<string>> = {};
  fields.forEach((f) => {
    setsMap[f] = new Set();
  });

  records.forEach((r) => {
    fields.forEach((f) => {
      const val = r[f];
      if (val != null && typeof val === "string" && val.trim()) {
        setsMap[f].add(val.trim());
      }
    });
  });

  const result: Record<string, string[]> = {};
  fields.forEach((f) => {
    result[f] = Array.from(setsMap[f]).sort();
  });
  return result;
};

// ==================== GET ALL RECORDS (for analytics, with cache) ====================
export const getAllCancerRecords = async (
  forceRefresh = false,
): Promise<CancerRecord[]> => {
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

    if (snap.docs.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  invalidateCancerCache();
  return totalDeleted;
};
