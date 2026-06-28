import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FiArrowLeft, FiClock, FiCheckCircle, FiTruck, FiPackage, FiLogOut } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './MeusPedidos.css';

export default function MeusPedidos() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [lojista, setLojista] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clienteLogado, setClienteLogado] = useState(null);
  
  // Auth state
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function loadLojista() {
      const { data: loj } = await supabase.from('lojistas').select('*').eq('slug', slug).single();
      if (loj) {
        setLojista(loj);
        if (loj.nome) document.title = `Meus Pedidos | ${loj.nome}`;
      }
    }
    loadLojista();
    
    // Check local storage for persistent login
    const savedClient = localStorage.getItem(`lanchonet_client_${slug}`);
    if (savedClient) {
      const parsed = JSON.parse(savedClient);
      setClienteLogado(parsed);
      loadPedidos(parsed.id);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const loadPedidos = async (clienteId) => {
    setLoading(true);
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    
    setPedidos(data || []);
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!whatsapp || !senha) return toast.error('Preencha WhatsApp e senha');
    setEnviando(true);
    
    const { data: cliente } = await supabase.from('clientes')
      .select('*')
      .eq('lojista_id', lojista.id)
      .eq('whatsapp', whatsapp)
      .single();
      
    if (cliente && cliente.senha_hash === senha) {
      setClienteLogado(cliente);
      localStorage.setItem(`lanchonet_client_${slug}`, JSON.stringify(cliente));
      toast.success('Login com sucesso!');
      loadPedidos(cliente.id);
    } else {
      toast.error('WhatsApp ou senha incorretos.');
    }
    setEnviando(false);
  };

  const handleLogout = () => {
    setClienteLogado(null);
    setPedidos([]);
    localStorage.removeItem(`lanchonet_client_${slug}`);
  };

  // Funções auxiliares para status
  const getStatusIndex = (status) => {
    switch(status) {
      case 'novo': return 1;
      case 'preparando': return 2;
      case 'pronto': return 3;
      case 'a_caminho': return 3; // O mesmo passo na UI, muda só o ícone
      case 'entregue': return 4;
      case 'cancelado': return -1;
      default: return 1;
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const whiteLabelStyles = lojista ? {
    '--bg-primary': lojista.cor_secundaria || '#111827',
    '--bg-card': lojista.cor_fundo_cards || 'rgba(128, 128, 128, 0.15)',
    '--bg-secondary': lojista.cor_fundo_cards || 'rgba(128, 128, 128, 0.08)',
    '--primary': lojista.cor_principal || '#f97316',
    '--accent': lojista.cor_principal || '#f97316',
    '--accent-dark': lojista.cor_principal || '#ea580c',
    '--text-primary': lojista.cor_texto_normal || '#ffffff',
    '--text-secondary': lojista.cor_texto_secundaria || '#9ca3af',
    '--text-muted': lojista.cor_texto_secundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
  } : {};

  return (
    <div className="meus-pedidos-page fade-in" style={whiteLabelStyles}>
      <header className="meus-pedidos-header">
        <button className="btn-voltar" onClick={() => navigate(`/${slug}`)}>
          <FiArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Meus Pedidos</h1>
        <div style={{ flex: 1 }}></div>
        {clienteLogado && (
          <button className="btn-voltar" onClick={handleLogout} title="Sair">
            <FiLogOut size={20} />
          </button>
        )}
      </header>

      <div className="container">
        {!clienteLogado ? (
          <div className="login-section slide-up">
            <h2 style={{ marginBottom: '8px' }}>Acompanhar Pedidos</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Entre com os dados usados no momento do pedido.
            </p>
            
            <div className="input-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label>WhatsApp</label>
              <input 
                className="input" 
                placeholder="Apenas números" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} 
              />
            </div>
            
            <div className="input-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
              <label>Senha</label>
              <input 
                className="input" 
                type="password" 
                placeholder="Sua senha" 
                value={senha} 
                onChange={e => setSenha(e.target.value)} 
              />
            </div>
            
            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={handleLogin} 
              disabled={enviando}
            >
              {enviando ? 'Verificando...' : 'Acessar Meus Pedidos'}
            </button>
          </div>
        ) : (
          <div className="pedidos-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Carregando pedidos...</div>
            ) : pedidos.length === 0 ? (
              <div className="empty-state">
                <p>Você ainda não fez nenhum pedido.</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate(`/${slug}`)}>
                  Ver Cardápio
                </button>
              </div>
            ) : (
              pedidos.map(pedido => {
                const step = getStatusIndex(pedido.status);
                const isEntrega = pedido.cliente_dados?.tipo_pedido === 'ENTREGA';
                
                return (
                  <div key={pedido.id} className="pedido-card slide-up">
                    <div className="pedido-header">
                      <div>
                        <span className="pedido-id">Pedido #{pedido.id.substring(0,6).toUpperCase()}</span>
                        <div className="pedido-data">{formatDate(pedido.created_at)}</div>
                      </div>
                      <span className={`badge badge-${pedido.status}`}>
                        {pedido.status.replace('_', ' ')}
                      </span>
                    </div>

                    {pedido.status !== 'cancelado' && (
                      <div className="timeline">
                        <div className={`timeline-step ${step >= 1 ? 'completed' : ''}`}>
                          <div className="timeline-icon"><FiCheckCircle /></div>
                          <span className="timeline-label">Novo</span>
                        </div>
                        <div className={`timeline-step ${step >= 2 ? 'completed' : ''} ${step === 2 ? 'active' : ''}`}>
                          <div className="timeline-icon"><FiClock /></div>
                          <span className="timeline-label">Preparo</span>
                        </div>
                        <div className={`timeline-step ${step >= 3 ? 'completed' : ''} ${step === 3 ? 'active' : ''}`}>
                          <div className="timeline-icon">
                            {isEntrega ? <FiTruck /> : <FiPackage />}
                          </div>
                          <span className="timeline-label">
                            {isEntrega ? 'A Caminho' : 'Pronto'}
                          </span>
                        </div>
                        <div className={`timeline-step ${step >= 4 ? 'completed' : ''}`}>
                          <div className="timeline-icon"><FiCheckCircle /></div>
                          <span className="timeline-label">Entregue</span>
                        </div>
                      </div>
                    )}

                    <div className="pedido-itens">
                      <h4 style={{ fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-secondary)' }}>Itens</h4>
                      {pedido.itens?.map((item, idx) => (
                        <div key={idx} className="pedido-item-row">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>R$ {(item.preco_calculado * item.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pedido-footer">
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {pedido.cliente_dados?.forma_pagamento}
                      </span>
                      <span className="pedido-total">R$ {pedido.total?.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
