import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiUsers, HiShieldCheck, HiUserCircle, HiViewGrid, HiLogout, HiMenu, HiX, HiDocumentReport, HiClipboardList } from 'react-icons/hi';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        {sidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #0e7490, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.8rem',
            }}>
              {'OU'}
            </div>
            <h2>Oris UT</h2>
          </div>
          <span className={`role-badge role-${user?.profile?.roleName ?? 'user'}`}>
            {user?.profile?.roleName ?? 'sin rol'}
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/admin" end onClick={() => setSidebarOpen(false)}>
            <HiViewGrid /> Dashboard
          </NavLink>

          {isAdmin() && (
            <>
              <NavLink to="/admin/users" onClick={() => setSidebarOpen(false)}>
                <HiUsers /> Usuarios
              </NavLink>
              <NavLink to="/admin/roles" onClick={() => setSidebarOpen(false)}>
                <HiShieldCheck /> Roles
              </NavLink>
            </>
          )}

          {hasPermission('activity.view') && (
            <NavLink to="/admin/activity" onClick={() => setSidebarOpen(false)}>
              <HiClipboardList /> Actividad
            </NavLink>
          )}

          <NavLink to="/admin/cancer" onClick={() => setSidebarOpen(false)}>
            <HiDocumentReport /> Registro Cancer
          </NavLink>

          <NavLink to="/admin/profile" onClick={() => setSidebarOpen(false)}>
            <HiUserCircle /> Mi Perfil
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            {user?.photoURL && <img src={user.photoURL} alt="" className="avatar-small" />}
            {!user?.photoURL && (
              <div className="avatar-small avatar-placeholder" style={{ fontSize: '0.75rem' }}>
                {(user?.displayName ?? user?.email ?? '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="user-name">{user?.displayName ?? user?.email}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            <HiLogout /> Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
