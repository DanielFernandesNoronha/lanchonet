import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiMail, FiLock, FiUser, FiLink, FiCoffee } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeRestaurante, setNomeRestaurante] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, senha);
        toast.success('Bem-vindo!');
      } else {
        await register(email, senha, nomeRestaurante, slug);
        toast.success('Conta criada com sucesso!');
      }
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Erro ao processar');
    }
    setLoading(false);
  }

  return (
    <div className="login-page admin-theme">
      <div className="login-glow" />
      <div className="login-card slide-up">
        <div className="login-logo" style={{ color: 'var(--accent)' }}><FiCoffee size={48} /></div>
        <h1 className="login-title">LanchoNet</h1>
        <p className="login-subtitle">Painel do Restaurante</p>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Nome do Restaurante</label>
                <div className="input-icon">
                  <FiUser />
                  <input className="input" type="text" placeholder="Meu Restaurante" value={nomeRestaurante} onChange={e => setNomeRestaurante(e.target.value)} required />
                </div>
              </div>
              <div className="input-group">
                <label>URL do Cardápio (Slug)</label>
                <div className="input-icon">
                  <FiLink />
                  <input className="input" type="text" placeholder="meu-restaurante" value={slug} onChange={e => setSlug(e.target.value)} required />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email</label>
            <div className="input-icon">
              <FiMail />
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="input-group">
            <label>Senha</label>
            <div className="input-icon">
              <FiLock />
              <input className="input" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} required />
            </div>
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <p style={{ marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ marginLeft: '5px', padding: 0, color: 'var(--accent)' }}>
            {isLogin ? 'Crie uma agora' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}
