import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🚫 Acceso Denegado</h1>
        <p>No tienes permisos para acceder a esta sección.</p>
        <Link to="/admin" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
