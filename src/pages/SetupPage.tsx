import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkSuperAdminExists, initializeSuperAdmin, createUserWithRole } from '../services/firestore';

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
        // New users can't query all users — default to regular user
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
      setError(err instanceof Error ? err.message : 'Error durante la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Configuración de Cuenta</h1>
        <p>Tu cuenta aún no tiene un perfil asignado. Haz clic en el botón para configurar tu cuenta.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <button onClick={handleSetup} className="btn btn-primary" disabled={loading}>
          {loading ? 'Configurando...' : 'Configurar mi cuenta'}
        </button>
      </div>
    </div>
  );
}
