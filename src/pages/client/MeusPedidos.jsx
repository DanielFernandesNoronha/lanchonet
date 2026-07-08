import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { FiClock, FiCheckCircle, FiTruck, FiPackage, FiLogOut, FiList, FiShoppingCart, FiShoppingBag, FiLock, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart } from '../../contexts/CartContext';
import './MeusPedidos.css';

export default function MeusPedidos() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  
  const [lojista, setLojista] = useState(null);
  const [cachedLogo, setCachedLogo] = useState(() => {
    try { return localStorage.getItem(`lanchonet_logo_${slug}`) || ''; } catch (e) { return ''; }
  });
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clienteLogado, setClienteLogado] = useState(null);
  
  // Auth state
  const [whatsapp, setWhatsapp] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function initData() {
      try {
        const safeSlug = slug ? slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '') : '';
        const lojData = await api.get(`/cardapio/${safeSlug}`);
        if (lojData && lojData.id) {
          setLojista(lojData);
          if (lojData.logoUrl) {
            try { localStorage.setItem(`lanchonet_logo_${slug}`, lojData.logoUrl); } catch(e) {}
            setCachedLogo(lojData.logoUrl);
          }
          if (lojData.nome) document.title = `Meus Pedidos | ${lojData.nome}`;
        }
      } catch (e) {
        console.error("Erro ao carregar lojista", e);
      }
      
      try {
        let savedClient = null;
        try { savedClient = localStorage.getItem(`lanchonet_client_${slug}`); } catch (e) {}
        
        if (savedClient) {
          const parsed = JSON.parse(savedClient);
          setClienteLogado(parsed);
          await loadPedidos(parsed.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro no initData", err);
        setLoading(false);
      }
    }
    initData();
  }, [slug]);

  const loadPedidos = async (clienteId) => {
    setLoading(true);
    try {
      const data = await api.get(`/cardapio/${slug}/pedidos/${clienteId}`);
      setPedidos(data || []);
    } catch (e) {
      console.error("Erro ao carregar pedidos", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!clienteLogado || !slug) return;
    
    // First load
    loadPedidos(clienteLogado.id);

    // Setup SSE Connection for Real-Time Updates
    const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/cardapio/${slug}/sse/${clienteLogado.id}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // We only care about status_atualizado or novo_pedido, but mostly we just reload the full list
        loadPedidos(clienteLogado.id);
        toast.success(`Pedido atualizado!`);
      } catch(e) {}
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Optional fallback if SSE drops
      setTimeout(() => loadPedidos(clienteLogado.id), 5000);
    };

    return () => eventSource.close();
  }, [clienteLogado, slug]);

  const handleLogin = async () => {
    if (!whatsapp) return toast.error('Preencha o WhatsApp');
    setEnviando(true);
    
    try {
      const cliente = await api.post(`/cardapio/${slug}/login`, { whatsapp });
      
      if (cliente && cliente.id) {
        setClienteLogado(cliente);
        try { localStorage.setItem(`lanchonet_client_${slug}`, JSON.stringify(cliente)); } catch(e) {}
        toast.success('Logado com sucesso!');
        loadPedidos(cliente.id);
      } else {
        toast.error('Não foi possível conectar.');
      }
    } catch (e) {
      toast.error('Erro de conexão ao servidor.');
    }
    
    setEnviando(false);
  };

  const handleLogout = () => {
    setClienteLogado(null);
    setPedidos([]);
    try { localStorage.removeItem(`lanchonet_client_${slug}`); } catch(e) {}
  };

  // Funções auxiliares para status
  const getStatusIndex = (status) => {
    switch(status) {
      case 'novo': return 1;
      case 'preparando': return 2;
      case 'pronto':
      case 'a_caminho':
      case 'entrega':
        return 3;
      case 'entregue':
      case 'concluido':
        return 4;
      case 'cancelado': return -1;
      default: return 1;
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const whiteLabelStyles = lojista ? {
    '--bg-primary': lojista.corSecundaria || '#f8fafc',
    '--bg-page': lojista.corSecundaria || '#f8fafc',
    '--bg-secondary': '#ffffff',
    '--bg-card': lojista.corFundoCards || '#ffffff',
    '--bg-card-hover': lojista.corFundoCards || '#ffffff',
    '--header-bg': lojista.corSecundaria || '#111827',
    '--primary': lojista.corPrincipal || '#f97316',
    '--accent': lojista.corPrincipal || '#f97316',
    '--accent-dark': lojista.corPrincipal || '#ea580c',
    '--text-primary': lojista.corTextoNormal || '#0f172a',
    '--text-secondary': lojista.corTextoSecundaria || '#64748b',
    '--text-muted': '#94a3b8',
    '--border': 'rgba(128, 128, 128, 0.2)',
    '--border-hover': 'rgba(128, 128, 128, 0.3)',
  } : {};

  if (loading && !pedidos.length && !clienteLogado) {
    return (
      <div style={{
        ...whiteLabelStyles,
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-page, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {cachedLogo ? (
          <img src={cachedLogo} alt="Logo" style={{ width: 100, height: 100, borderRadius: '50%', marginBottom: 20, objectFit: 'contain', animation: 'pulse 1.5s infinite ease-in-out' }} />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid rgba(128,128,128,0.2)', borderTop: '4px solid var(--accent, #f97316)', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
        )}
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="meus-pedidos-page" style={whiteLabelStyles}>
      <header className="meus-pedidos-header" style={{
        background: lojista?.capaUrl 
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${lojista.capaUrl}) center/cover no-repeat` 
          : 'var(--bg-secondary)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lojista?.logoUrl && (
            <img 
              src={lojista.logoUrl} 
              alt="Logo" 
              style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'contain' }} 
            />
          )}
          <h1 style={{ fontSize: '1.1rem', color: lojista?.capaUrl ? '#ffffff' : 'var(--text-primary)', margin: 0 }}>Meus Pedidos</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {clienteLogado && (
            <button 
              className="btn-voltar-header" 
              onClick={handleLogout} 
              style={lojista?.capaUrl ? { 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: '1px solid rgba(255, 255, 255, 0.3)', 
                color: '#ffffff'
              } : {}}
            >
              <FiLogOut size={16} /> Sair
            </button>
          )}
        </div>
      </header>

      <div className="container">
        {!clienteLogado ? (
          <div className="login-section slide-up">
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
              color: 'var(--accent)'
            }}>
              <FiLock size={26} />
            </div>
            <h2 style={{ marginBottom: '8px', fontSize: '1.4rem', fontWeight: 800 }}>Acompanhar Pedidos</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Informe o <strong>WhatsApp</strong> que você usou na hora de fazer o pedido.
            </p>
            
            <div className="input-group" style={{ textAlign: 'left', marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiPhone size={14}/> WhatsApp</label>
              <input 
                className="input" 
                placeholder="(00) 00000-0000" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} 
                style={{ fontSize: '1.05rem', padding: '14px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              />
            </div>
            
            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={handleLogin} 
              disabled={enviando}
              style={{ padding: '16px', fontSize: '1rem', borderRadius: '12px', fontWeight: 700 }}
            >
              {enviando ? 'Autenticando...' : 'Acessar Meus Pedidos'}
            </button>
          </div>
        ) : (
          <div className="pedidos-list">
            {loading && pedidos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Carregando pedidos...</div>
            ) : pedidos.length === 0 ? (
              <div className="empty-state slide-up">
                <div style={{ color: 'var(--accent)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <FiShoppingBag size={48} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Nenhum pedido por aqui</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px', margin: '0 auto 16px auto', lineHeight: 1.4 }}>
                  Você ainda não realizou nenhum pedido. Que tal dar uma olhada no nosso cardápio e escolher algo gostoso?
                </p>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '12px 32px', 
                    fontSize: '0.9rem', 
                    borderRadius: '8px', 
                    background: 'var(--primary, #f97316)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)',
                    cursor: 'pointer'
                  }} 
                  onClick={() => navigate(`/${slug}`)}
                >
                  Ver Cardápio
                </button>
              </div>
            ) : (
              pedidos.map(pedido => {
                const step = getStatusIndex(pedido.status);
                
                // Tratar clienteDados vindo do Prisma
                let clienteDados = pedido.clienteDados;
                if (typeof clienteDados === 'string') {
                  try { clienteDados = JSON.parse(clienteDados); } catch(e) {}
                }
                
                // Tratar itens vindo do Prisma
                let pedidoItens = pedido.itens;
                if (typeof pedidoItens === 'string') {
                  try { pedidoItens = JSON.parse(pedidoItens); } catch(e) { pedidoItens = []; }
                }

                const isEntrega = clienteDados?.tipo_pedido === 'ENTREGA';
                
                return (
                  <div key={pedido.id} className="pedido-card slide-up">
                    <div className="pedido-header">
                      <div>
                        <span className="pedido-id">Pedido #{pedido.id.substring(0,6).toUpperCase()}</span>
                        <div className="pedido-data">{formatDate(pedido.createdAt)}</div>
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
                          <span className="timeline-label">
                            {isEntrega ? 'Entregue' : 'Retirado'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pedido-itens">
                      <h4 style={{ fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-secondary)' }}>Itens</h4>
                      {pedidoItens?.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <div className="pedido-item-row">
                            <span>{item.quantidade}x {item.nome}</span>
                            <span>R$ {(item.preco_calculado * item.quantidade).toFixed(2)}</span>
                          </div>
                          {item.adicionais && item.adicionais.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: 24, marginTop: 2 }}>
                              {item.adicionais.map((adc, iadc) => (
                                <div key={iadc}>+ {adc.nome} <small>(R$ {parseFloat(adc.preco || 0).toFixed(2)})</small></div>
                              ))}
                            </div>
                          )}
                          {item.observacao && (
                            <div style={{ paddingLeft: 24, marginTop: 2, fontSize: '0.8rem', color: 'var(--accent)', fontStyle: 'italic' }}>
                              Obs: {item.observacao}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pedido-footer">
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {clienteDados?.forma_pagamento}
                      </span>
                      <span className="pedido-total">R$ {parseFloat(pedido.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav Bar */}
      <div className="bottom-nav">
        <button className="bottom-nav-item" onClick={() => navigate(`/${slug}`)}>
          <FiList size={20} />
          <span>Cardápio</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate(`/${slug}/checkout`)}>
          <div className="bottom-nav-icon-wrapper">
            <FiShoppingCart size={20} />
            {totalItems > 0 && <span className="bottom-nav-badge">{totalItems}</span>}
          </div>
          <span>Carrinho</span>
        </button>
        <button className="bottom-nav-item active" onClick={() => navigate(`/${slug}/pedidos`)}>
          <FiClock size={20} />
          <span>Pedidos</span>
        </button>
      </div>
    </div>
  );
}
