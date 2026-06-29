import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FiLock, FiMail, FiLoader, FiEye, FiEyeOff } from 'react-icons/fi';
import './Master.css';

// Emails autorizados como master-admin (adicione o seu aqui)
// O Supabase também valida via a tabela super_admins
const MASTER_EMAILS_PERMITIDOS = [
  // Adicione o email da conta master aqui
  // Ex: 'daniel@oxentech.com.br'
];

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error('E-mail ou senha incorretos.');

      // Verifica se é super admin
      const { data: adminData, error: adminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      console.log('--- DEBUG MASTER LOGIN ---');
      console.log('ID logado:', data.user.id);
      console.log('adminData retornado:', adminData);
      console.log('adminError retornado:', adminError);
      console.log('--------------------------');

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error(`Acesso negado. Esta conta não tem privilégios de administrador master. (ID logado: ${data.user.id})`);
      }

      // Salva sessão master
      sessionStorage.setItem('master_uid', data.user.id);
      sessionStorage.setItem('master_email', data.user.email);

      navigate('/master');
    } catch (e) {
      setErro(e.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="master-login">
      <div className="master-login-card">
        <div className="master-logo">
          <div className="master-logo-icon">🛡️</div>
          <span className="master-logo-text">LanchoNET</span>
        </div>
        <p className="master-subtitle">Painel de Gestão — Acesso Restrito</p>

        <form onSubmit={handleLogin}>
          <div className="master-input-group">
            <label>E-mail</label>
            <input
              className="master-input"
              type="email"
              placeholder="admin@seudominio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="master-input-group">
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="master-input"
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
                  color: 'rgba(255,255,255,0.4)',
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

          {erro && <div className="master-error">{erro}</div>}

          <button className="master-btn" type="submit" disabled={loading}>
            {loading ? <><FiLoader className="spin" /> Entrando...</> : <><FiLock /> Acessar Painel</>}
          </button>
        </form>
      </div>
    </div>
  );
}
