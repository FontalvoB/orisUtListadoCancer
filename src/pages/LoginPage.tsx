import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, createUserWithRole } from '../services/firestore';
import { FcGoogle } from 'react-icons/fc';
import { HiMail, HiLockClosed, HiUser } from 'react-icons/hi';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useAuth();

  const handleAfterAuth = async (uid: string, email: string, displayName: string, photoURL: string) => {
    const profile = await getUserProfile(uid);
    if (!profile) {
      await createUserWithRole(uid, email, displayName, photoURL, 'user');
    }
    navigate('/admin');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const fbUser = await register(email, password, displayName);
        await handleAfterAuth(fbUser.uid, email, displayName, '');
      } else {
        await login(email, password);
        const { currentUser } = await import('../config/firebase').then(m => m.auth);
        if (currentUser) {
          await handleAfterAuth(
            currentUser.uid,
            currentUser.email ?? email,
            currentUser.displayName ?? displayName,
            currentUser.photoURL ?? ''
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setError('Credenciales invalidas');
      } else if (message.includes('auth/user-not-found')) {
        setError('Usuario no encontrado');
      } else if (message.includes('auth/email-already-in-use')) {
        setError('El correo ya esta registrado');
      } else if (message.includes('auth/weak-password')) {
        setError('La contrasena debe tener al menos 6 caracteres');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      await handleAfterAuth(
        fbUser.uid,
        fbUser.email ?? '',
        fbUser.displayName ?? '',
        fbUser.photoURL ?? ''
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message.includes('auth/popup-closed-by-user')) {
        setError('Inicio de sesion cancelado');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="login-card">
        <div className="login-header">
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, #0284c7, #0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.0625rem',
            letterSpacing: '-0.02em',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.25)',
          }}>
            OU
          </div>
          <h1>Oris UT</h1>
          <p>{isRegister ? 'Crear una nueva cuenta' : 'Plataforma de Registro Oncologico'}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleEmailLogin} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="displayName">
                <HiUser />
                Nombre completo
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                required={isRegister}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <HiMail />
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <HiLockClosed />
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
          </button>
        </form>

        <div className="divider">
          <span>o continua con</span>
        </div>

        <button onClick={handleGoogleLogin} className="btn btn-google" disabled={loading}>
          <FcGoogle size={20} />
          Google
        </button>

        <p className="toggle-auth">
          {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? 'Iniciar sesion' : 'Registrarse'}
          </button>
        </p>
      </div>
    </div>
  );
}
