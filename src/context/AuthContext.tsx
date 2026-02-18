import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getUserProfile, initializeRoles, getRoleByName } from '../services/firestore';
import { logActivity } from '../services/activityLogService';
import type { AppUser, UserProfile } from '../types';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permissionId: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRolePermissions, setUserRolePermissions] = useState<string[]>([]);

  // Cache roles to avoid repeated Firestore reads
  const rolesCacheRef = useRef<Record<string, string[]>>({});
  const rolesInitializedRef = useRef(false);

  const loadProfile = async (fbUser: User): Promise<UserProfile | null> => {
    try {
      const profile = await getUserProfile(fbUser.uid);
      if (profile && profile.roleId) {
        try {
          // Check in-memory cache first
          if (rolesCacheRef.current[profile.roleName]) {
            setUserRolePermissions(rolesCacheRef.current[profile.roleName]);
          } else {
            const role = await getRoleByName(profile.roleName);
            if (role) {
              rolesCacheRef.current[profile.roleName] = role.permissions;
              setUserRolePermissions(role.permissions);
            }
          }
        } catch {
          setUserRolePermissions([]);
        }
      } else {
        setUserRolePermissions([]);
      }
      return profile;
    } catch (err) {
      console.error('Error loading profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Initialize roles only once per session
    if (!rolesInitializedRef.current) {
      rolesInitializedRef.current = true;
      initializeRoles().catch(console.error);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await loadProfile(fbUser);
        setFirebaseUser(fbUser);
        setUserProfile(profile);
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          profile,
        });
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await logActivity({
      userId: cred.user.uid,
      userEmail: cred.user.email ?? email,
      userName: cred.user.displayName ?? '',
      action: 'login',
      module: 'auth',
      description: `Inicio de sesión por email: ${email}`,
    });
  };

  const register = async (email: string, password: string, displayName: string): Promise<User> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await logActivity({
      userId: cred.user.uid,
      userEmail: email,
      userName: displayName,
      action: 'register',
      module: 'auth',
      description: `Nuevo usuario registrado: ${email}`,
    });
    return cred.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    await logActivity({
      userId: result.user.uid,
      userEmail: result.user.email ?? '',
      userName: result.user.displayName ?? '',
      action: 'login_google',
      module: 'auth',
      description: `Inicio de sesión con Google: ${result.user.email}`,
    });
    return result.user;
  };

  const logout = async () => {
    if (firebaseUser) {
      await logActivity({
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email ?? '',
        userName: firebaseUser.displayName ?? '',
        action: 'logout',
        module: 'auth',
        description: `Cierre de sesión: ${firebaseUser.email}`,
      });
    }
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await loadProfile(firebaseUser);
      setUserProfile(profile);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        profile,
      });
    }
  };

  const hasPermission = (permissionId: string): boolean => {
    if (!userProfile) return false;
    if (userProfile.roleName === 'superadmin') return true;
    // Check actual role permissions from loaded role data
    return userRolePermissions.includes(permissionId);
  };

  const isAdmin = (): boolean => {
    return userProfile?.roleName === 'admin' || userProfile?.roleName === 'superadmin';
  };

  const isSuperAdmin = (): boolean => {
    return userProfile?.roleName === 'superadmin';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
        hasPermission,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
