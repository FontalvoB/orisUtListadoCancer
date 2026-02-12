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
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Oris UT</h2>
          <span className={`role-badge role-${user?.profile?.roleName ?? 'user'}`}>{user?.profile?.roleName ?? 'sin rol'}</span>
        </div>

        <nav className="sidebar-nav">
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
              <HiClipboardList /> Activity Log
            </NavLink>
          )}

          <NavLink to="/admin/cancer" onClick={() => setSidebarOpen(false)}>
            <HiDocumentReport /> Registro Cáncer
          </NavLink>

          <NavLink to="/admin/profile" onClick={() => setSidebarOpen(false)}>
            <HiUserCircle /> Mi Perfil
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            {user?.photoURL && <img src={user.photoURL} alt="" className="avatar-small" />}
            <div>
              <p className="user-name">{user?.displayName ?? user?.email}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            <HiLogout /> Salir
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
