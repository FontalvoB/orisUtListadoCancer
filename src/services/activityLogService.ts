import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  getCountFromServer,
  serverTimestamp,
  type DocumentSnapshot,
  type Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ==================== TYPES ====================
export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: ActivityAction;
  module: ActivityModule;
  description: string;
  details?: Record<string, unknown>;
  targetId?: string;
  targetName?: string;
  ipAddress?: string;
  createdAt: Date;
}

export type ActivityModule = 'auth' | 'users' | 'roles' | 'cancer' | 'profile' | 'system';

export type ActivityAction =
  | 'login'
  | 'login_google'
  | 'logout'
  | 'register'
  | 'create'
  | 'update'
  | 'delete'
  | 'import'
  | 'export'
  | 'view';

const COLLECTION = 'activityLogs';

const toDate = (ts: Timestamp | Date | undefined): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
};

// ==================== LOG ACTIVITY ====================
export const logActivity = async (data: {
  userId: string;
  userEmail: string;
  userName: string;
  action: ActivityAction;
  module: ActivityModule;
  description: string;
  details?: Record<string, unknown>;
  targetId?: string;
  targetName?: string;
}): Promise<void> => {
  try {
    const ref = doc(collection(db, COLLECTION));
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Don't let logging failures break the app
    console.error('Error logging activity:', err);
  }
};

// ==================== FILTERS ====================
export interface ActivityLogFilters {
  module?: ActivityModule;
  action?: ActivityAction;
  userId?: string;
  userEmail?: string;
}

// ==================== PAGINATED READ ====================
export interface PaginatedActivityResult {
  logs: ActivityLog[];
  totalCount: number;
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export const getActivityLogsPaginated = async (
  pageSize: number = 50,
  lastDocument: DocumentSnapshot | null = null,
  filters: ActivityLogFilters = {}
): Promise<PaginatedActivityResult> => {
  const constraints: QueryConstraint[] = [];

  if (filters.module) constraints.push(where('module', '==', filters.module));
  if (filters.action) constraints.push(where('action', '==', filters.action));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.userEmail) constraints.push(where('userEmail', '==', filters.userEmail));

  constraints.push(orderBy('createdAt', 'desc'));
  if (lastDocument) constraints.push(startAfter(lastDocument));
  constraints.push(limit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);

  // Count
  const countConstraints: QueryConstraint[] = [];
  if (filters.module) countConstraints.push(where('module', '==', filters.module));
  if (filters.action) countConstraints.push(where('action', '==', filters.action));
  if (filters.userId) countConstraints.push(where('userId', '==', filters.userId));
  if (filters.userEmail) countConstraints.push(where('userEmail', '==', filters.userEmail));

  const countQ = query(collection(db, COLLECTION), ...countConstraints);
  const countSnap = await getCountFromServer(countQ);
  const totalCount = countSnap.data().count;

  const logs: ActivityLog[] = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? '',
      userEmail: data.userEmail ?? '',
      userName: data.userName ?? '',
      action: data.action ?? '',
      module: data.module ?? '',
      description: data.description ?? '',
      details: data.details,
      targetId: data.targetId,
      targetName: data.targetName,
      createdAt: toDate(data.createdAt),
    };
  });

  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

  return {
    logs,
    totalCount,
    lastDoc,
    hasMore: snap.docs.length === pageSize,
  };
};

// ==================== QUICK HELPERS ====================
export const ACTION_LABELS: Record<ActivityAction, string> = {
  login: 'Inicio de sesión',
  login_google: 'Login con Google',
  logout: 'Cierre de sesión',
  register: 'Registro',
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  import: 'Importación',
  export: 'Exportación',
  view: 'Visualización',
};

export const MODULE_LABELS: Record<ActivityModule, string> = {
  auth: 'Autenticación',
  users: 'Usuarios',
  roles: 'Roles',
  cancer: 'Registro Cáncer',
  profile: 'Perfil',
  system: 'Sistema',
};

export const ACTION_COLORS: Record<ActivityAction, string> = {
  login: '#059669',
  login_google: '#059669',
  logout: '#64748b',
  register: '#0e7490',
  create: '#2563eb',
  update: '#d97706',
  delete: '#dc2626',
  import: '#7c3aed',
  export: '#0891b2',
  view: '#64748b',
};
