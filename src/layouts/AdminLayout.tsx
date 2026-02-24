import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineDocumentReport,
} from 'react-icons/hi';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = (user?.displayName ?? user?.email ?? '?')[0].toUpperCase();

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? <HiOutlineX size={20} /> : <HiOutlineMenu size={20} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/assets/logo.png" alt="Oris UT" className="sidebar-logo-img" />
          <div className="sidebar-brand">
            <h2>Oris UT</h2>
            <span>Registro Oncologico</span>
          </div>
        </div>

        <div className="sidebar-section-label">Plataforma</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/admin" end onClick={() => setSidebarOpen(false)}>
            <HiOutlineChartBar size={16} /> Dashboard
          </NavLink>
          <NavLink to="/admin/cancer" onClick={() => setSidebarOpen(false)}>
            <HiOutlineDocumentReport size={16} /> Registro Cancer
          </NavLink>
          <NavLink to="/admin/arthritis" onClick={() => setSidebarOpen(false)}>
            <HiOutlineDocumentReport size={16} /> Registro Artritis
          </NavLink>
          <NavLink to="/admin/ips" onClick={() => setSidebarOpen(false)}>
            <HiOutlineDocumentReport size={16} /> Registro IPS
          </NavLink>

          {isAdmin() && (
            <>
              <div className="sidebar-section-label">Administracion</div>
              <NavLink to="/admin/users" onClick={() => setSidebarOpen(false)}>
                <HiOutlineUsers size={16} /> Usuarios
              </NavLink>
              <NavLink to="/admin/roles" onClick={() => setSidebarOpen(false)}>
                <HiOutlineShieldCheck size={16} /> Roles
              </NavLink>
            </>
          )}

          {hasPermission('activity.view') && (
            <NavLink to="/admin/activity" onClick={() => setSidebarOpen(false)}>
              <HiOutlineClock size={16} /> Actividad
            </NavLink>
          )}

          <div className="sidebar-section-label">Cuenta</div>
          <NavLink to="/admin/profile" onClick={() => setSidebarOpen(false)}>
            <HiOutlineUser size={16} /> Mi Perfil
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar-sm">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </div>
            <div className="user-meta">
              <div className="user-name">{user?.displayName ?? 'Usuario'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          {user?.profile?.roleName && (
            <div className="user-role-badge">{user.profile.roleName}</div>
          )}
          <button onClick={handleLogout} className="btn-logout" style={{ marginTop: '0.5rem' }}>
            <HiOutlineLogout size={14} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
