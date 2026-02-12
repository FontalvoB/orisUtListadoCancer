import { useEffect, useState } from 'react';
import { getAllUsers, updateUserProfile, deleteUserProfile, getRoles, createUserByAdmin } from '../services/firestore';
import type { UserProfile, Role, RoleName } from '../types';
import { HiPencil, HiTrash, HiX, HiCheck, HiSearch, HiUserAdd } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/activityLogService';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', email: '', roleId: '', roleName: '', isActive: true });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ displayName: '', email: '', password: '', roleId: '' });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([getAllUsers(), getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.roleName.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
      isActive: user.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setError('');
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setError('');
    try {
      const selectedRole = roles.find(r => r.id === editForm.roleId);
      await updateUserProfile(editingUser.uid, {
        displayName: editForm.displayName,
        roleId: editForm.roleId,
        roleName: selectedRole?.name ?? editingUser.roleName,
        isActive: editForm.isActive,
      });
      const changes: Record<string, { before: unknown; after: unknown }> = {};
      if (editingUser.displayName !== editForm.displayName) changes['Nombre'] = { before: editingUser.displayName, after: editForm.displayName };
      if (editingUser.roleId !== editForm.roleId) changes['Rol'] = { before: editingUser.roleName, after: selectedRole?.displayName ?? selectedRole?.name ?? editForm.roleId };
      if (editingUser.isActive !== editForm.isActive) changes['Activo'] = { before: editingUser.isActive ? 'Sí' : 'No', after: editForm.isActive ? 'Sí' : 'No' };
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'update',
        module: 'users',
        description: `Usuario actualizado: ${editForm.displayName}`,
        targetId: editingUser.uid,
        targetName: editForm.displayName,
        details: { changes },
      });
      setSuccessMsg('Usuario actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingUser(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando usuario');
    }
  };

  const handleDelete = async (user: UserProfile) => {
    if (user.roleName === 'superadmin') {
      setError('No se puede eliminar al superadmin');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar a ${user.displayName}?`)) return;
    try {
      await deleteUserProfile(user.uid);
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'delete',
        module: 'users',
        description: `Usuario eliminado: ${user.displayName}`,
        targetId: user.uid,
        targetName: user.displayName,
        details: { deletedUser: { email: user.email, rol: user.roleName, nombre: user.displayName } },
      });
      setSuccessMsg('Usuario eliminado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando usuario');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.displayName || !createForm.roleId) {
      setError('Todos los campos son obligatorios');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const selectedRole = roles.find(r => r.id === createForm.roleId);
      const roleName = (selectedRole?.name ?? 'user') as RoleName;
      await createUserByAdmin(createForm.email, createForm.password, createForm.displayName, roleName);
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'create',
        module: 'users',
        description: `Usuario creado: ${createForm.displayName} (${createForm.email})`,
        targetName: createForm.displayName,
        details: { email: createForm.email, rol: selectedRole?.displayName ?? roleName },
      });
      setSuccessMsg('Usuario creado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowCreateModal(false);
      setCreateForm({ displayName: '', email: '', password: '', roleId: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando usuario');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="page"><div className="spinner" /><p>Cargando usuarios...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <HiUserAdd /> Nuevo Usuario
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="search-bar">
        <HiSearch />
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.uid}>
                <td>
                  <div className="user-cell">
                    {user.photoURL && <img src={user.photoURL} alt="" className="avatar-small" />}
                    {editingUser?.uid === user.uid ? (
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="inline-input"
                      />
                    ) : (
                      <span>{user.displayName}</span>
                    )}
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  {editingUser?.uid === user.uid ? (
                    <select
                      value={editForm.roleId}
                      onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                      className="inline-select"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.displayName}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`role-badge role-${user.roleName}`}>{user.roleName}</span>
                  )}
                </td>
                <td>
                  {editingUser?.uid === user.uid ? (
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      <span>{editForm.isActive ? 'Activo' : 'Inactivo'}</span>
                    </label>
                  ) : (
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </td>
                <td>
                  <div className="actions">
                    {editingUser?.uid === user.uid ? (
                      <>
                        <button onClick={saveEdit} className="btn-icon btn-save" title="Guardar">
                          <HiCheck />
                        </button>
                        <button onClick={cancelEdit} className="btn-icon btn-cancel" title="Cancelar">
                          <HiX />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(user)} className="btn-icon btn-edit" title="Editar">
                          <HiPencil />
                        </button>
                        {user.roleName !== 'superadmin' && (
                          <button onClick={() => handleDelete(user)} className="btn-icon btn-delete" title="Eliminar">
                            <HiTrash />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <p className="no-data">No se encontraron usuarios</p>}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Usuario</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="form-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="Nombre del usuario"
                  required
                />
              </div>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={createForm.roleId}
                  onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
