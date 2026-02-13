import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import { getUserProfile, createUserWithRole } from '../services/firestore';
import { HiMail, HiLockClosed, HiUser } from 'react-icons/hi';
import ImageCarousel from '../components/ImageCarousel';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

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
        const { currentUser } = auth;
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

  return (
    <div className="login-page">
      <div className="login-left">
        <ImageCarousel />
        <div className="login-card">
          <div className="login-logo">
            <img src="/assets/logo.png" alt="Oris UT" className="login-logo-img" />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleEmailLogin} className="login-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="displayName"><HiUser size={14} /> Nombre completo</label>
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
              <label htmlFor="email"><HiMail size={14} /> Correo electronico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password"><HiLockClosed size={14} /> Contrasena</label>
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
              style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem' }}
            >
              {loading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
            </button>
          </form>

          <div className="divider">o continua con</div>

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

      <div className="login-right">
        <div className="login-right-content">
          <h2>Analisis inteligente de datos oncologicos</h2>
          <p>
            Visualiza, gestiona y analiza registros de cancer con herramientas
            de datos en tiempo real para la toma de decisiones clinicas.
          </p>
          <div className="login-decoration">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </div>
  );
}
