import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiLoader, FiEye, FiEyeOff } from 'react-icons/fi';
import MenuLogo from '../../assets/MENU.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function MasterLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/master/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login.');

      sessionStorage.setItem('master_token', data.token);
      sessionStorage.setItem('master_email', data.email);
      navigate('/master');
    } catch (e) {
      setErro(e.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page admin-theme">
      <div className="login-glow" />
      <div className="login-card slide-up">
        <div className="login-logo" style={{ marginBottom: '16px' }}>
          <img src={MenuLogo} alt="MENU Logo" style={{ height: '72px', width: 'auto' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: 2, display: 'block', marginTop: '-8px' }}>ADMIN MASTER</span>
        </div>
        <p className="login-subtitle">Gestão Global do Sistema</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>E-mail Corporativo</label>
            <div className="input-icon">
              <FiMail />
              <input
                className="input"
                type="email"
                placeholder="admin@lancho.net"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="input-group">
            <label>Senha de Acesso</label>
            <div className="input-icon" style={{ position: 'relative' }}>
              <FiLock />
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0
                }}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {erro && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
              {erro}
            </div>
          )}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <FiLoader className="spin" size={20} /> : <><FiLock size={20} /> Acessar Painel</>}
          </button>
        </form>
      </div>
    </div>
  );
}
