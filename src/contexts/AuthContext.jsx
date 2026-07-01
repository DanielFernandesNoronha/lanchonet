import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lojista, setLojista] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLojista(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLojista(session.user.id);
      else { setLojista(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchLojista(userId) {
    const { data } = await supabase
      .from('lojistas')
      .select('*, planos(id, nome, valor_mensal)')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (data) setLojista(data);
    setLoading(false);
  }

  // --- Computed subscription values ---
  const isBloqueado = lojista?.status_assinatura === 'atrasado' || 
    (lojista?.status_assinatura === 'trial' && new Date() > new Date(lojista?.trial_expira_em));

  const diasRestantesTrial = useMemo(() => {
    if (!lojista?.trial_expira_em || lojista.status_assinatura !== 'trial') return null;
    const diff = new Date(lojista.trial_expira_em) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [lojista]);

  // --- Auth actions ---
  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function register(email, password, nomeRestaurante, slug, planoId) {
    if (password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres');
    if (!/[A-Z]/.test(password)) throw new Error('A senha deve conter pelo menos uma letra maiúscula');
    if (!/[0-9]/.test(password)) throw new Error('A senha deve conter pelo menos um número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) throw new Error('A senha deve conter pelo menos um caractere especial (!@#$ etc)');
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);

    const userId = data.user?.id || data.session?.user?.id;
    if (userId) {
      const agora = new Date();
      const expiraTrial = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { error: lojistaError } = await supabase.from('lojistas').insert({
        user_id: userId,
        nome: nomeRestaurante,
        email: email,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        plano_id: planoId || null,
        status_assinatura: 'trial',
        trial_iniciado_em: agora.toISOString(),
        trial_expira_em: expiraTrial.toISOString(),
        proximo_vencimento: expiraTrial.toISOString(),
      });
      if (lojistaError) throw new Error(lojistaError.message);
      
      // Busca o lojista para preencher o state IMEDIATAMENTE antes de navegar
      await fetchLojista(userId);
      
      // Dispara webhook para o n8n para enviar o email de confirmação/boas-vindas
      try {
        await fetch('/webhook/novo-cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, nome: nomeRestaurante, slug })
        });
      } catch (e) {
        console.error('Erro ao notificar n8n:', e);
      }
    }
  }

  async function logout() {
    await supabase.auth.signOut();
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

