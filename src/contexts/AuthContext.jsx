import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../lib/apiClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lojista, setLojista] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lanchonet_token');
    const storedUser = localStorage.getItem('lanchonet_user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      fetchLojista();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchLojista() {
    try {
      const data = await api.get('/auth/me');
      setLojista(data);
    } catch (error) {
      console.error('Erro ao buscar lojista:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }

  // --- Computed subscription values ---
  const isBloqueado = lojista?.statusAssinatura === 'atrasado' || 
    lojista?.statusAssinatura === 'pendente' ||
    (lojista?.statusAssinatura === 'trial' && new Date() > new Date(lojista?.trialExpiraEm));

  const diasRestantesTrial = useMemo(() => {
    if (!lojista?.trialExpiraEm || lojista.statusAssinatura !== 'trial') return null;
    const diff = new Date(lojista.trialExpiraEm) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [lojista]);

  // --- Auth actions ---
  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('lanchonet_token', data.token);
    localStorage.setItem('lanchonet_user', JSON.stringify(data.user));
    setUser(data.user);
    await fetchLojista();
  }

  async function register(email, password, nomeRestaurante, slug, planoId) {
    const data = await api.post('/auth/register', { email, password, nomeRestaurante, slug, planoId });
    localStorage.setItem('lanchonet_token', data.token);
    localStorage.setItem('lanchonet_user', JSON.stringify(data.user));
    setUser(data.user);
    await fetchLojista();
  }

  async function logout() {
    localStorage.removeItem('lanchonet_token');
    localStorage.removeItem('lanchonet_user');
    setUser(null);
    setLojista(null);
  }

  return (
    <AuthContext.Provider value={{
      user, lojista, loading,
      isBloqueado, diasRestantesTrial,
      login, register, logout, fetchLojista
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

