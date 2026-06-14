import { createContext, useContext, useState, useEffect } from 'react';
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
    const { data, error } = await supabase
      .from('lojistas')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (data) {
      setLojista(data);
      if (data.nome) document.title = `${data.nome} | Painel`;
      if (data.logo_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.logo_url;
      }
    }
    setLoading(false);
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function register(email, password, nomeRestaurante, slug) {
    if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres');
    
    // 1. Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);

    // 2. Criar o perfil do lojista vinculado ao usuário
    // Supabase pode retornar user mesmo com confirmação de email pendente
    const userId = data.user?.id || data.session?.user?.id;
    if (userId) {
      const { error: lojistaError } = await supabase.from('lojistas').insert({
        user_id: userId,
        nome: nomeRestaurante,
        email: email,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
      });
      if (lojistaError) throw new Error(lojistaError.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setLojista(null);
  }

  return (
    <AuthContext.Provider value={{ user, lojista, loading, login, register, logout, fetchLojista }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
