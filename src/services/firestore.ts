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
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import type { Role, UserProfile, Permission, RoleName } from '../types';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from '../types';

// ==================== HELPER ====================
const toDate = (ts: Timestamp | Date | undefined): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
};

// ==================== ROLES ====================
export const getRoles = async (): Promise<Role[]> => {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      permissions: data.permissions ?? [],
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Role;
  });
};

export const getRoleById = async (id: string): Promise<Role | null> => {
  const snap = await getDoc(doc(db, 'roles', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    displayName: data.displayName,
    description: data.description,
    permissions: data.permissions ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Role;
};

export const getRoleByName = async (name: RoleName): Promise<Role | null> => {
  const q = query(collection(db, 'roles'), where('name', '==', name));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    displayName: data.displayName,
    description: data.description,
    permissions: data.permissions ?? [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Role;
};

export const createRole = async (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = doc(collection(db, 'roles'));
  await setDoc(ref, {
    ...role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateRole = async (id: string, data: Partial<Role>): Promise<void> => {
  const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
  void _id; void _ca;
  await updateDoc(doc(db, 'roles', id), { ...rest, updatedAt: serverTimestamp() });
};

export const deleteRole = async (id: string): Promise<void> => {
  // Check if any users have this role
  const q = query(collection(db, 'users'), where('roleId', '==', id));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('No se puede eliminar un rol que tiene usuarios asignados');
  }
  await deleteDoc(doc(db, 'roles', id));
};

// ==================== USERS / PROFILES ====================
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    uid: data.uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL ?? '',
    phone: data.phone ?? '',
    address: data.address ?? '',
    roleId: data.roleId,
    roleName: data.roleName,
    isActive: data.isActive ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as UserProfile;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      roleId: data.roleId,
      roleName: data.roleName,
      isActive: data.isActive ?? true,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as UserProfile;
  });
};

export const createUserProfile = async (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  await setDoc(doc(db, 'users', profile.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
  void _id; void _ca;
  await updateDoc(doc(db, 'users', uid), { ...rest, updatedAt: serverTimestamp() });
};

export const deleteUserProfile = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', uid));
};

// ==================== PERMISSIONS ====================
export const getPermissions = (): Permission[] => DEFAULT_PERMISSIONS;

// ==================== SEED / INIT ====================
export const initializeRoles = async (): Promise<void> => {
  const existing = await getRoles();
  for (const roleDef of DEFAULT_ROLES) {
    const found = existing.find(r => r.name === roleDef.name);
    if (!found) {
      await createRole(roleDef);
    }
  }
};

export const checkSuperAdminExists = async (): Promise<boolean> => {
  const q = query(collection(db, 'users'), where('roleName', '==', 'superadmin'));
  const snap = await getDocs(q);
  return !snap.empty;
};

export const initializeSuperAdmin = async (uid: string, email: string, displayName: string, photoURL: string): Promise<void> => {
  // Ensure roles exist
  await initializeRoles();

  const superAdminExists = await checkSuperAdminExists();
  if (superAdminExists) {
    throw new Error('Ya existe un superadmin en el sistema');
  }

  const role = await getRoleByName('superadmin');
  if (!role) throw new Error('Rol superadmin no encontrado');

  await createUserProfile({
    uid,
    email,
    displayName,
    photoURL,
    phone: '',
    address: '',
    roleId: role.id,
    roleName: 'superadmin',
    isActive: true,
  });
};

export const createUserWithRole = async (
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  roleName: RoleName = 'user'
): Promise<void> => {
  const role = await getRoleByName(roleName);
  if (!role) throw new Error(`Rol ${roleName} no encontrado`);

  await createUserProfile({
    uid,
    email,
    displayName,
    photoURL,
    phone: '',
    address: '',
    roleId: role.id,
    roleName,
    isActive: true,
  });
};

// ==================== ADMIN: CREATE USER ====================
export const createUserByAdmin = async (
  email: string,
  password: string,
  displayName: string,
  roleName: RoleName = 'user'
): Promise<void> => {
  // Use a secondary Firebase app so the current admin session is not affected
  const secondaryApp = initializeApp(firebaseConfig, 'secondaryApp_' + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(cred.user, { displayName });

    // Create Firestore profile using the main db
    await createUserWithRole(cred.user.uid, email, displayName, '', roleName);

    // Sign out from secondary auth
    await signOut(secondaryAuth);
  } finally {
    // Clean up the secondary app
    await deleteApp(secondaryApp);
  }
};
