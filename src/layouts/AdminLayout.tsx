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
        {sidebarOpen ? <HiX size={22} /> : <HiMenu size={22} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.75rem',
              letterSpacing: '-0.02em',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}>
              OU
            </div>
            <div>
              <h2 style={{ margin: 0, lineHeight: 1.2 }}>Oris UT</h2>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, letterSpacing: '0.02em' }}>
                Registro Oncologico
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem 0.25rem' }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>
            Menu principal
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName ?? user?.email}
              </p>
              <p className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <span className={`role-badge role-${user?.profile?.roleName ?? 'user'}`} style={{ flexShrink: 0 }}>
              {user?.profile?.roleName ?? 'sin rol'}
            </span>
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
