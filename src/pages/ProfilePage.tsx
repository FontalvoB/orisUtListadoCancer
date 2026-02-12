import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestore';
import { logActivity } from '../services/activityLogService';
import { HiPencil, HiCheck, HiX } from 'react-icons/hi';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    displayName: user?.profile?.displayName ?? user?.displayName ?? '',
    phone: user?.profile?.phone ?? '',
    address: user?.profile?.address ?? '',
  });

  const handleSave = async () => {
    if (!user?.profile) return;
    setError('');
    try {
      await updateUserProfile(user.uid, {
        displayName: form.displayName,
        phone: form.phone,
        address: form.address,
      });
      const profileChanges: Record<string, { before: unknown; after: unknown }> = {};
      if ((user.profile?.displayName ?? '') !== form.displayName) profileChanges['Nombre'] = { before: user.profile?.displayName, after: form.displayName };
      if ((user.profile?.phone ?? '') !== form.phone) profileChanges['Teléfono'] = { before: user.profile?.phone || '(vacío)', after: form.phone || '(vacío)' };
      if ((user.profile?.address ?? '') !== form.address) profileChanges['Dirección'] = { before: user.profile?.address || '(vacío)', after: form.address || '(vacío)' };
      await logActivity({
        userId: user.uid,
        userEmail: user.email ?? '',
        userName: form.displayName,
        action: 'update',
        module: 'profile',
        description: `Perfil actualizado: ${form.displayName}`,
        targetId: user.uid,
        targetName: form.displayName,
        details: { changes: profileChanges },
      });
      await refreshProfile();
      setSuccessMsg('Perfil actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando perfil');
    }
  };

  if (!user?.profile) {
    return <div className="page"><p>Cargando perfil...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mi Perfil</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-primary">
            <HiPencil /> Editar
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="profile-card">
        <div className="profile-header">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="avatar-large" />
          ) : (
            <div className="avatar-large avatar-placeholder">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2>{user.profile.displayName}</h2>
            <span className={`role-badge role-${user.profile.roleName}`}>{user.profile.roleName}</span>
          </div>
        </div>

        <div className="profile-details">
          <div className="form-group">
            <label>Nombre</label>
            {editing ? (
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            ) : (
              <p>{user.profile.displayName}</p>
            )}
          </div>

          <div className="form-group">
            <label>Email</label>
            <p>{user.profile.email}</p>
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Tu número de teléfono"
              />
            ) : (
              <p>{user.profile.phone || 'No especificado'}</p>
            )}
          </div>

          <div className="form-group">
            <label>Dirección</label>
            {editing ? (
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Tu dirección"
              />
            ) : (
              <p>{user.profile.address || 'No especificada'}</p>
            )}
          </div>

          <div className="form-group">
            <label>Estado</label>
            <span className={`status-badge ${user.profile.isActive ? 'active' : 'inactive'}`}>
              {user.profile.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          <div className="form-group">
            <label>Miembro desde</label>
            <p>{user.profile.createdAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {editing && (
          <div className="form-actions">
            <button onClick={handleSave} className="btn btn-primary">
              <HiCheck /> Guardar
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">
              <HiX /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
