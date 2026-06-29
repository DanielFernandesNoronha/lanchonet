import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, lojista, loading, isBloqueado } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  // Se inadimplente, só permite acessar a aba Financeiro
  if (isBloqueado && location.pathname !== '/admin/financeiro') {
    return <Navigate to="/admin/financeiro" replace />;
  }

  return children;
}
