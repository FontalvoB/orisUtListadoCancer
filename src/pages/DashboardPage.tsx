import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiUsers, HiShieldCheck, HiUserCircle, HiDocumentReport } from 'react-icons/hi';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="welcome-text">
        Bienvenido, <strong>{user?.displayName ?? user?.email}</strong>
      </p>

      <div className="stats-grid">
        {isAdmin() && (
          <>
            <Link to="/admin/users" className="stat-card">
              <HiUsers size={32} />
              <div>
                <h3>Usuarios</h3>
                <p>Gestión de usuarios del sistema</p>
              </div>
            </Link>
            <Link to="/admin/roles" className="stat-card">
              <HiShieldCheck size={32} />
              <div>
                <h3>Roles</h3>
                <p>Administración de roles y permisos</p>
              </div>
            </Link>
          </>
        )}
        <Link to="/admin/cancer" className="stat-card">
          <HiDocumentReport size={32} />
          <div>
            <h3>Registro Cáncer</h3>
            <p>Gestión de registros oncológicos</p>
          </div>
        </Link>
        <Link to="/admin/profile" className="stat-card">
          <HiUserCircle size={32} />
          <div>
            <h3>Perfil</h3>
            <p>Tu información personal</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
