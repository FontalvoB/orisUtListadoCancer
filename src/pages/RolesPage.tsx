import { useEffect, useState } from 'react';
import { getRoles, createRole, updateRole, deleteRole } from '../services/firestore';
import { DEFAULT_PERMISSIONS } from '../types';
import type { Role } from '../types';
import { HiPencil, HiTrash, HiPlus, HiX, HiCheck } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../services/activityLogService';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { isSuperAdmin, user: currentUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [] as string[],
  });

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);

  const resetForm = () => {
    setForm({ name: '', displayName: '', description: '', permissions: [] });
    setShowCreate(false);
    setEditingRole(null);
  };

  const togglePermission = (permId: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name || !form.displayName) {
      setError('Nombre y nombre para mostrar son requeridos');
      return;
    }
    try {
      await createRole({
        name: form.name as Role['name'],
        displayName: form.displayName,
        description: form.description,
        permissions: form.permissions,
      });
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'create',
        module: 'roles',
        description: `Rol creado: ${form.displayName}`,
        targetName: form.displayName,
        details: { nombre: form.displayName, descripcion: form.description, permisos: form.permissions },
      });
      setSuccessMsg('Rol creado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      resetForm();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando rol');
    }
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: [...role.permissions],
    });
    setShowCreate(false);
  };

  const saveEdit = async () => {
    if (!editingRole) return;
    setError('');
    try {
      await updateRole(editingRole.id, {
        displayName: form.displayName,
        description: form.description,
        permissions: form.permissions,
      });
      const permChanges: Record<string, { before: unknown; after: unknown }> = {};
      if (editingRole.displayName !== form.displayName) permChanges['Nombre'] = { before: editingRole.displayName, after: form.displayName };
      if (editingRole.description !== form.description) permChanges['Descripción'] = { before: editingRole.description, after: form.description };
      const addedPerms = form.permissions.filter(p => !editingRole.permissions.includes(p));
      const removedPerms = editingRole.permissions.filter(p => !form.permissions.includes(p));
      if (addedPerms.length > 0 || removedPerms.length > 0) permChanges['Permisos'] = { before: `${editingRole.permissions.length} permisos`, after: `${form.permissions.length} permisos` };
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'update',
        module: 'roles',
        description: `Rol actualizado: ${form.displayName} (${form.permissions.length} permisos)`,
        targetId: editingRole.id,
        targetName: form.displayName,
        details: { changes: permChanges, ...(addedPerms.length > 0 ? { permisosAgregados: addedPerms } : {}), ...(removedPerms.length > 0 ? { permisosRemovidos: removedPerms } : {}) },
      });
      setSuccessMsg('Rol actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      resetForm();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando rol');
    }
  };

  const handleDelete = async (role: Role) => {
    if (['superadmin', 'admin', 'editor', 'user'].includes(role.name)) {
      setError('No se pueden eliminar roles del sistema');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar el rol "${role.displayName}"?`)) return;
    try {
      await deleteRole(role.id);
      await logActivity({
        userId: currentUser?.uid ?? '',
        userEmail: currentUser?.email ?? '',
        userName: currentUser?.displayName ?? '',
        action: 'delete',
        module: 'roles',
        description: `Rol eliminado: ${role.displayName}`,
        targetId: role.id,
        targetName: role.displayName,
        details: { rolEliminado: { nombre: role.displayName, descripcion: role.description, permisos: role.permissions } },
      });
      setSuccessMsg('Rol eliminado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando rol');
    }
  };

  // Group permissions by module
  const permissionsByModule = DEFAULT_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, typeof DEFAULT_PERMISSIONS>);

  if (loading) return <div className="page"><div className="spinner" /><p>Cargando roles...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestión de Roles</h1>
        {isSuperAdmin() && (
          <button onClick={() => { setShowCreate(true); setEditingRole(null); }} className="btn btn-primary">
            <HiPlus /> Nuevo Rol
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Create / Edit Form */}
      {(showCreate || editingRole) && (
        <div className="form-card">
          <h2>{editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre interno</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!!editingRole}
                placeholder="ej: moderator"
              />
            </div>
            <div className="form-group">
              <label>Nombre para mostrar</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="ej: Moderador"
              />
            </div>
            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción del rol..."
              />
            </div>
          </div>

          <h3>Permisos</h3>
          <div className="permissions-grid">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module} className="permission-module">
                <h4>{module.charAt(0).toUpperCase() + module.slice(1)}</h4>
                {perms.map(p => (
                  <label key={p.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p.id)}
                      onChange={() => togglePermission(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button onClick={editingRole ? saveEdit : handleCreate} className="btn btn-primary">
              <HiCheck /> {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
            </button>
            <button onClick={resetForm} className="btn btn-secondary">
              <HiX /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Roles Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Permisos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>
                  <span className={`role-badge role-${role.name}`}>{role.displayName}</span>
                </td>
                <td>{role.description}</td>
                <td>
                  <div className="permissions-list">
                    {role.permissions.length} permisos
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button onClick={() => startEdit(role)} className="btn-icon btn-edit" title="Editar">
                      <HiPencil />
                    </button>
                    {!['superadmin', 'admin', 'editor', 'user'].includes(role.name) && (
                      <button onClick={() => handleDelete(role)} className="btn-icon btn-delete" title="Eliminar">
                        <HiTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
