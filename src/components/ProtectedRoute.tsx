import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RoleName } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
  requireProfile?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, requireProfile = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but has no profile, redirect to setup (except superadmin init)
  if (requireProfile && !user.profile) {
    return <Navigate to="/setup" replace />;
  }

  if (allowedRoles && user.profile && !allowedRoles.includes(user.profile.roleName)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
