import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import { FiMail, FiLock, FiUser, FiLink, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import MenuLogo from '../../assets/MENU.svg';
import './Login.css';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(() => {
    if (location.state?.mode === 'register') {
      return false;
    }
    return true;
  });
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nomeRestaurante, setNomeRestaurante] = useState('');
  const [planos, setPlanos] = useState([]);
  const [planoSelecionado, setPlanoSelecionado] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.mode === 'register') {
      setIsLogin(false);
    } else if (location.state?.mode === 'login') {
      setIsLogin(true);
    }
  }, [location.state]);

  useEffect(() => {
    async function loadPlanos() {
      try {
        const data = await api.get('/planos');
        if (data && data.length > 0) {
          setPlanos(data);
          setPlanoSelecionado(data[0].id);
        }
      } catch (e) {}
    }
    loadPlanos();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, senha);
        toast.success('Bem-vindo!');
        navigate('/admin');
      } else {
        if (senha !== confirmarSenha) {
          toast.error('As senhas não coincidem!');
          setLoading(false);
          return;
        }
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_~`-]).{8,}$/;
        if (!passwordRegex.test(senha)) {
          toast.error('A senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.');
          setLoading(false);
          return;
        }

        const geradoSlug = nomeRestaurante
          .trim()
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-');

        await register(email, senha, nomeRestaurante, geradoSlug, planoSelecionado);
        toast.success('Conta criada! Por favor, termine de configurar seu restaurante.');
        navigate('/admin/config'); // Redireciona para configurações
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao processar');
    }
    setLoading(false);
  }

  return (
    <div className="login-page admin-theme">
      <div className="login-glow" />
      <div className="login-card slide-up">
        <div className="login-logo" style={{ marginBottom: '16px' }}>
          <img src={MenuLogo} alt="MENU Logo" style={{ height: '72px', width: 'auto' }} />
        </div>
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

              {planos.length > 0 && (
                <div className="input-group" style={{ marginBottom: '20px' }}>
                  <label>Escolha o seu plano</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {planos.map(plano => (
                      <div 
                        key={plano.id} 
                        onClick={() => setPlanoSelecionado(plano.id)}
                        style={{ 
                          padding: '12px 16px', 
                          border: planoSelecionado === plano.id ? '2px solid var(--accent)' : '1px solid var(--border)', 
                          borderRadius: '8px', 
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: planoSelecionado === plano.id ? 'rgba(249, 115, 22, 0.05)' : 'transparent'
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{plano.nome}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{plano.descricao}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: 'var(--accent)' }}>R$ {parseFloat(plano.valorMensal || plano.valor_mensal).toFixed(2)}/mês</strong>
                          {planoSelecionado === plano.id && <FiCheckCircle color="var(--accent)" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <input 
                className="input" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={senha} 
                onChange={e => setSenha(e.target.value)} 
                required 
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Confirmar Senha</label>
              <div className="input-icon">
                <FiLock />
                <input 
                  className="input" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={confirmarSenha} 
                  onChange={e => setConfirmarSenha(e.target.value)} 
                  required 
                  style={{ paddingRight: '40px' }}
                />
              </div>
            </div>
          )}

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
