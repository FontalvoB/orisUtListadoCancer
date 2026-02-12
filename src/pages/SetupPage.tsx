import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkSuperAdminExists, initializeSuperAdmin, createUserWithRole } from '../services/firestore';
import { HiCog } from 'react-icons/hi';

export default function SetupPage() {
  const { firebaseUser, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSetup = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError('');
    try {
      let shouldBeSuperAdmin = false;
      try {
        const saExists = await checkSuperAdminExists();
        shouldBeSuperAdmin = !saExists;
      } catch {
        shouldBeSuperAdmin = false;
      }

      if (shouldBeSuperAdmin) {
        await initializeSuperAdmin(
          firebaseUser.uid,
          firebaseUser.email ?? '',
          firebaseUser.displayName ?? '',
          firebaseUser.photoURL ?? ''
        );
      } else {
        await createUserWithRole(
          firebaseUser.uid,
          firebaseUser.email ?? '',
          firebaseUser.displayName ?? '',
          firebaseUser.photoURL ?? '',
          'user'
        );
      }
      await refreshProfile();
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error durante la configuracion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <HiCog size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Configuracion de Cuenta</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Tu cuenta aun no tiene un perfil asignado. Haz clic en el boton para configurar tu cuenta.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <button onClick={handleSetup} className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Configurando...' : 'Configurar mi cuenta'}
        </button>
      </div>
    </div>
  );
}
