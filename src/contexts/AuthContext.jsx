import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../lib/apiClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lojista, setLojista] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Auth actions ---
  // useCallback garante identidade estável entre renders, então qualquer
  // useEffect em outras telas que dependa de "fetchLojista" não re-executa à toa.
  const logout = useCallback(async () => {
    localStorage.removeItem('lanchonet_token');
    localStorage.removeItem('lanchonet_user');
    setUser(null);
    setLojista(null);
  }, []);

  const fetchLojista = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setLojista(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar lojista:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('lanchonet_token');
    const storedUser = localStorage.getItem('lanchonet_user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      fetchLojista();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('lanchonet_token', data.token);
    localStorage.setItem('lanchonet_user', JSON.stringify(data.user));
    setUser(data.user);
    await fetchLojista();
  }, [fetchLojista]);

  const register = useCallback(async (email, password, nomeRestaurante, slug, planoId) => {
    const data = await api.post('/auth/register', { email, password, nomeRestaurante, slug, planoId });
    localStorage.setItem('lanchonet_token', data.token);
    localStorage.setItem('lanchonet_user', JSON.stringify(data.user));
    setUser(data.user);
    await fetchLojista();
  }, [fetchLojista]);

  // --- Computed subscription values ---
  const isBloqueado = lojista?.statusAssinatura === 'atrasado' ||
    lojista?.statusAssinatura === 'pendente' ||
    (lojista?.statusAssinatura === 'trial' && new Date() > new Date(lojista?.trialExpiraEm));

  const diasRestantesTrial = useMemo(() => {
    if (!lojista?.trialExpiraEm || lojista.statusAssinatura !== 'trial') return null;
    const diff = new Date(lojista.trialExpiraEm) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [lojista]);

  // useMemo no value evita que TODOS os consumidores de useAuth() re-renderizem
  // sempre que o AuthProvider re-renderiza por qualquer motivo não relacionado.
  const value = useMemo(() => ({
    user, lojista, loading,
    isBloqueado, diasRestantesTrial,
    login, register, logout, fetchLojista
  }), [user, lojista, loading, isBloqueado, diasRestantesTrial, login, register, logout, fetchLojista]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
