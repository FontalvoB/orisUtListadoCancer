import { Link } from 'react-router-dom';
import { HiShieldExclamation } from 'react-icons/hi';

export default function UnauthorizedPage() {
  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <HiShieldExclamation size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Acceso Denegado</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No tienes permisos para acceder a esta seccion.</p>
        <Link to="/admin" className="btn btn-primary" style={{ width: '100%' }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
