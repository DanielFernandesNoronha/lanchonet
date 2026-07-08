import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../lib/apiClient';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiCheck, FiLogOut, FiList, FiClock, FiShoppingCart, FiCopy } from 'react-icons/fi';
import { FaPix, FaWhatsapp } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import './Checkout.css';

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantidade, removeItem, total, totalItems, clearCart } = useCart();
  
  // Lojista info
  const [lojistaId, setLojistaId] = useState(null);
  const [lojistaObj, setLojistaObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cachedLogo, setCachedLogo] = useState(() => {
    try { return localStorage.getItem(`lanchonet_logo_${slug}`) || ''; } catch (e) { return ''; }
  });
  const [bairros, setBairros] = useState([]);
  
  // Checkout Steps
  const [step, setStep] = useState(1); // 1 = Review, 2 = Login, 3 = Address, 4 = Payment
  
  // Auth state
  const [whatsapp, setWhatsapp] = useState('');
  const [nome, setNome] = useState('');
  const [clienteLogado, setClienteLogado] = useState(null);
  
  // Address state
  const [tipoPedido, setTipoPedido] = useState('ENTREGA'); // ENTREGA ou RETIRADA
  const [endereco, setEndereco] = useState({
    bairro_id: '',
    rua: '',
    numero: '',
    semNumero: false,
    complemento: '',
    observacao: ''
  });
  
  // Payment state
  const [formaPagamento, setFormaPagamento] = useState('PIX'); // PIX, DINHEIRO, MAQUININHA
  const [trocoPara, setTrocoPara] = useState('');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  
  const [enviando, setEnviando] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [temPix, setTemPix] = useState(false);

  useEffect(() => {
    async function loadLojista() {
      try {
        const loj = await api.get(`/cardapio/${slug}`);
        if (!loj) {
          toast.error('Restaurante não encontrado');
          return;
        }

        setLojistaId(loj.id);
        setLojistaObj(loj);
        if (loj.logo_url) {
          try { localStorage.setItem(`lanchonet_logo_${slug}`, loj.logo_url); } catch(e) {}
          setCachedLogo(loj.logo_url);
        }
        
        if (loj.nome) document.title = `Checkout | ${loj.nome}`;
        if (loj.logo_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = loj.logo_url;
        }

        setBairros(loj.taxasEntrega || []);

        // Se houver chave PIX configurada, exibe a opção de PIX
        if (loj.dadosBancarios && loj.dadosBancarios.chavePix) {
          setTemPix(true);
        } else {
          setTemPix(false);
          setFormaPagamento('MAQUININHA'); // fallback se não tiver PIX
        }

      } catch (err) {
        console.error("Erro ao carregar Checkout", err);
        toast.error("Erro ao carregar Checkout");
      } finally {
        setLoading(false);
      }
    }
    loadLojista();
  }, [slug]);

  const [buscandoNome, setBuscandoNome] = useState(false);

  useEffect(() => {
    if (whatsapp.length >= 10 && !nome) {
      const timer = setTimeout(() => {
        handleFetchName();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [whatsapp]);

  async function handleFetchName() {
    if (whatsapp.length < 10) return;
    if (nome) return; // Não sobrescreve se o usuário já digitou
    
    setBuscandoNome(true);
    try {
      const res = await api.get(`/cardapio/${slug}/fetch-name/${whatsapp}`);
      if (res && res.name) {
        setNome(res.name);
        toast.success(`Nome ${res.name} encontrado!`);
      }
    } catch (err) {
      // Falhou silenciosamente, o usuário pode digitar manualmente
    }
    setBuscandoNome(false);
  }

  async function handleLogin() {
    if (!whatsapp) return toast.error('Preencha seu WhatsApp');
    setEnviando(true);
    
    try {
      const cliente = await api.post(`/cardapio/${slug}/login`, {
        whatsapp,
        nome
      });
      
      setClienteLogado(cliente);
      try { localStorage.setItem(`lanchonet_client_${slug}`, JSON.stringify(cliente)); } catch(e) {}
      if (cliente.endereco) {
        try {
          const endSaved = JSON.parse(cliente.endereco);
          setEndereco(endSaved);
          if (endSaved.bairro_id) handleBairroChange(endSaved.bairro_id);
        } catch(e) {}
      }
      toast.success(`Bem-vindo, ${cliente.nome || 'cliente'}!`);
      setStep(3);
    } catch (error) {
      toast.error('Erro ao conectar cliente.');
    }
    setEnviando(false);
  }

  // Address Functions
  function handleBairroChange(bId) {
    setEndereco(prev => ({ ...prev, bairro_id: bId }));
    const b = bairros.find(x => x.id === bId);
    setTaxaEntrega(b ? parseFloat(b.valor) : 0);
  }
  
  function avancarParaPagamento() {
    if (tipoPedido === 'ENTREGA') {
      if (!endereco.bairro_id) return toast.error('Selecione um bairro');
      if (!endereco.rua) return toast.error('Informe a rua');
      if (!endereco.numero && !endereco.semNumero) return toast.error('Informe o número ou marque Sem número');
    }
    setStep(4);
  }

  // Finalize
  async function handleFinalizar() {
    setEnviando(true);
    try {
      const itensPayload = items.map(i => ({
        id: i.id,
        nome: i.adicionais?.length > 0 ? `${i.nome} (+ Adicionais)` : i.nome,
        preco: i.precoCalculado, 
        preco_base: parseFloat(i.preco),
        preco_calculado: i.precoCalculado,
        quantidade: i.quantidade,
        observacao: i.observacao,
        adicionais: i.adicionais
      }));

      if (taxaEntrega > 0) {
        itensPayload.push({
          id: 'taxa-entrega',
          nome: 'Taxa de Entrega',
          preco: taxaEntrega,
          preco_base: taxaEntrega,
          preco_calculado: taxaEntrega,
          quantidade: 1,
          observacao: '',
          adicionais: []
        });
      }

      const payload = {
        cliente_id: clienteLogado.id,
        cliente: {
          nome: clienteLogado.nome,
          whatsapp: clienteLogado.telefone || whatsapp,
          tipo_pedido: tipoPedido,
          endereco: tipoPedido === 'ENTREGA' ? endereco : null,
          bairro: tipoPedido === 'ENTREGA' ? bairros.find(b => b.id === endereco.bairro_id)?.bairro : null,
          taxa_entrega: tipoPedido === 'ENTREGA' ? taxaEntrega : 0,
          total_final: total + (tipoPedido === 'ENTREGA' ? taxaEntrega : 0),
          forma_pagamento: formaPagamento,
          troco_para: trocoPara
        },
        itens: itensPayload,
        total_produtos: total
      };

      const { pedido, pixData: novoPixData } = await api.post(`/cardapio/${slug}/checkout`, payload);

      if (formaPagamento === 'PIX') {
        const resultUrl = novoPixData?.url || novoPixData?.data?.url;
        
        if (novoPixData?.qrCodePayload) {
          setPixData({
            qrCodePayload: novoPixData.qrCodePayload,
            pedidoId: pedido.id,
            totalPix: total + taxaEntrega
          });
          clearCart();
        } else if (resultUrl || novoPixData?.data?.brCode) {
          setPixData({
            url: resultUrl,
            qrCode: novoPixData.qrCode || novoPixData.data?.qrCode || novoPixData.data?.brCodeBase64,
            pixCopiaECola: novoPixData.pixCopiaECola || novoPixData.data?.pixCopiaECola || novoPixData.data?.brCode,
            pedidoId: pedido.id,
            totalPix: total + taxaEntrega
          });
          clearCart();
        } else {
          toast.error('Pedido salvo, mas erro ao gerar PIX');
          clearCart();
          navigate(`/${slug}/pedidos`);
        }
      } else {
        toast.success('Pedido enviado com sucesso!');
        clearCart();
        navigate(`/${slug}/pedidos`);
      }
    } catch (err) {
      toast.error('Erro ao finalizar pedido');
    }
    setEnviando(false);
  }

  // --- RENDERS ---
  const whiteLabelStyles = lojistaObj ? {
    '--bg-primary': lojistaObj.corSecundaria || '#111827',
    '--bg-card': lojistaObj.corFundoCards || 'rgba(128, 128, 128, 0.15)',
    '--bg-secondary': lojistaObj.corFundoCards || 'rgba(128, 128, 128, 0.08)',
    '--bg-glass': lojistaObj.corFundoCards || 'rgba(128, 128, 128, 0.2)',
    '--primary': lojistaObj.corPrincipal || '#f97316',
    '--accent': lojistaObj.corPrincipal || '#f97316',
    '--accent-light': lojistaObj.corPrincipal || '#fb923c',
    '--accent-dark': lojistaObj.corPrincipal || '#ea580c',
    '--text-primary': lojistaObj.corTextoNormal || '#ffffff',
    '--text-secondary': lojistaObj.corTextoSecundaria || '#9ca3af',
    '--text-muted': lojistaObj.corTextoSecundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
    '--border-hover': 'rgba(128, 128, 128, 0.35)',
  } : {};

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid #f3f3f3', borderTop: '4px solid var(--accent, #f97316)', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
        <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 600 }}>Carregando...</h2>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="checkout-page" style={whiteLabelStyles}>
        <header className="checkout-header" style={{ 
          background: lojistaObj?.capaUrl 
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${lojistaObj.capaUrl}) center/cover no-repeat` 
            : 'var(--bg-secondary)', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lojistaObj?.logoUrl && <img src={lojistaObj.logoUrl} alt="Logo" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'contain' }} />}
            <h2 style={{ fontSize: '1.1rem', color: lojistaObj?.capaUrl ? (lojistaObj.corFundoCards || '#ffffff') : 'var(--text-primary)', margin: 0 }}>
              Pedido Realizado
            </h2>
          </div>
          <button 
            className="btn-voltar-header" 
            onClick={() => navigate(`/${slug}/pedidos`)} 
            style={lojistaObj?.capaUrl ? { 
              background: 'rgba(255, 255, 255, 0.2)', 
              border: '1px solid rgba(255, 255, 255, 0.3)', 
              color: '#ffffff' 
            } : {}}
          >
            <FiArrowLeft size={16} /> Voltar
          </button>
        </header>

        <div className="container" style={{ padding: '24px 20px 80px', textAlign: 'center' }}>
          
          <div className="slide-up">
            
            <div style={{ 
              width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)', 
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 16px', opacity: 0.9 
            }}>
              <FaPix size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Pague via PIX</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 24 }}>Escaneie o QR Code abaixo no app do seu banco</p>

            {pixData.qrCodePayload && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  display: 'inline-block', background: '#fff', padding: 12, 
                  borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16
                }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.qrCodePayload)}`} alt="QR Code PIX" style={{ display: 'block', width: 200, height: 200 }} />
                </div>
                
                <div style={{ textAlign: 'left', background: 'var(--bg-card)', padding: '12px', borderRadius: 8, border: '1px dashed var(--border)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Pix Copia e Cola:</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="text" 
                      value={pixData.qrCodePayload} 
                      readOnly 
                      className="input" 
                      style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px', margin: 0, background: 'var(--bg-secondary)' }} 
                    />
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0 12px', borderRadius: 8, gap: 6 }} 
                      onClick={() => { navigator.clipboard.writeText(pixData.qrCodePayload); toast.success('Copiado!'); }}
                    >
                      <FiCopy size={16} /> Copiar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ margin: '24px 0', padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Total do Pedido</p>
              <h3 style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 800 }}>R$ {(pixData.totalPix || 0).toFixed(2)}</h3>
            </div>

            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 12, fontWeight: 500, textAlign: 'center' }}>
                Já realizou o pagamento?
              </p>
              <button 
                className="btn" 
                style={{ width: '100%', gap: 8, justifyContent: 'center', height: 48, marginBottom: 12, background: '#22c55e', color: '#fff', border: 'none' }}
                onClick={() => {
                  const num = (lojistaObj?.telefone || '').replace(/\D/g, '');
                  if (num) window.open(`https://wa.me/55${num}?text=Ol%C3%A1%21+Aqui+est%C3%A1+o+comprovante+do+meu+pedido+%23${pixData.pedidoId?.substring(0,6).toUpperCase()}`, '_blank');
                  else window.open(`https://wa.me/`, '_blank');
                }}
              >
                <FaWhatsapp size={20} /> Enviar Comprovante
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', height: 48 }}
                onClick={() => navigate(`/${slug}/pedidos`)}
              >
                Acompanhar Pedido
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" style={whiteLabelStyles}>
      <header className="checkout-header" style={{ 
        background: lojistaObj?.capaUrl 
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${lojistaObj.capaUrl}) center/cover no-repeat` 
          : 'var(--bg-secondary)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lojistaObj?.logoUrl && <img src={lojistaObj.logoUrl} alt="Logo" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'contain' }} />}
          <h2 style={{ fontSize: '1.1rem', color: lojistaObj?.capaUrl ? (lojistaObj.corFundoCards || '#ffffff') : 'var(--text-primary)', margin: 0 }}>
            {step === 1 ? 'Revisão' : step === 2 ? 'Identificação' : step === 3 ? 'Endereço' : 'Pagamento'}
          </h2>
        </div>
        <button 
          className="btn-voltar-header" 
          onClick={() => step > 1 ? setStep(step - 1) : navigate(`/${slug}`)} 
          style={lojistaObj?.capaUrl ? { 
            background: 'rgba(255, 255, 255, 0.2)', 
            border: '1px solid rgba(255, 255, 255, 0.3)', 
            color: '#ffffff' 
          } : {}}
        >
          <FiArrowLeft size={16} /> Voltar
        </button>
      </header>

      <div className="container" style={{ paddingBottom: 100 }}>
        {/* STEP 1: Carrinho */}
        {step === 1 && (
          <div className="fade-in">
            <section className="checkout-section">
              <h3 className="section-title">Itens do Pedido</h3>
              {items.map(item => (
                <div key={item.cartItemId} className="checkout-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{item.nome}</span>
                    <span style={{ fontWeight: 600 }}>R$ {(item.precoCalculado * item.quantidade).toFixed(2)}</span>
                  </div>
                  
                  {item.adicionais && item.adicionais.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      + {item.adicionais.map(a => a.nome).join(', ')}
                    </div>
                  )}
                  {item.observacao && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontStyle: 'italic' }}>
                      Obs: {item.observacao}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div className="quantidade-control">
                      <button className="qty-btn" onClick={() => updateQuantidade(item.cartItemId, item.quantidade - 1)}><FiMinus /></button>
                      <span className="qty-num">{item.quantidade}</span>
                      <button className="qty-btn" onClick={() => updateQuantidade(item.cartItemId, item.quantidade + 1)}><FiPlus /></button>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.cartItemId)} style={{ color: 'var(--red)' }}>
                      <FiTrash2 /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </section>
            
            {items.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={() => setStep(2)}>Confirmar Pedido</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Login */}
        {step === 2 && (
          <div className="fade-in">
            <section className="checkout-section">
              <h3 className="section-title">Identificação Rápida</h3>
              {clienteLogado ? (
                <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontWeight: 600 }}>Logado como</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteLogado.nome !== 'Sem Nome' ? clienteLogado.nome : (clienteLogado.whatsapp || clienteLogado.telefone)}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setClienteLogado(null); }}><FiLogOut /></button>
                </div>
              ) : (
                <div className="form-grid">
                  <p style={{ gridColumn: '1/-1', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Digite seu WhatsApp para continuar.</p>
                  <div className="input-group">
                    <label>WhatsApp (DDD + Número)</label>
                    <input 
                      className="input" 
                      placeholder="Ex: 11999999999" 
                      value={whatsapp} 
                      onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                  <div className="input-group">
                    <label>
                      Confirme seu Nome (Opcional se já cadastrado)
                      {(whatsapp.length > 0 && !nome) && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--primary)' }}>Buscando no WhatsApp...</span>}
                    </label>
                    <input className="input" placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} disabled={whatsapp.length > 0 && !nome && whatsapp.length < 10} />
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={handleLogin} disabled={enviando || whatsapp.length < 10} style={{ gridColumn: '1/-1', marginTop: 8 }}>
                    {enviando ? 'Verificando...' : 'Continuar'}
                  </button>
                </div>
              )}
            </section>
            
            {clienteLogado && (
              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={() => setStep(3)}>Avançar para Endereço</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Endereço */}
        {step === 3 && (
          <div className="fade-in">
            <section className="checkout-section">
              <h3 className="section-title">Como você quer receber?</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <button 
                  className={`btn ${tipoPedido === 'ENTREGA' ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, border: '1px solid var(--border)', background: tipoPedido === 'ENTREGA' ? 'var(--primary)' : 'transparent', color: tipoPedido === 'ENTREGA' ? '#fff' : 'var(--text-secondary)' }} 
                  onClick={() => setTipoPedido('ENTREGA')}
                >
                  Entrega
                </button>
                <button 
                  className={`btn ${tipoPedido === 'RETIRADA' ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, border: '1px solid var(--border)', background: tipoPedido === 'RETIRADA' ? 'var(--primary)' : 'transparent', color: tipoPedido === 'RETIRADA' ? '#fff' : 'var(--text-secondary)' }} 
                  onClick={() => { setTipoPedido('RETIRADA'); setTaxaEntrega(0); }}
                >
                  Retirada no Balcão
                </button>
              </div>

              {tipoPedido === 'ENTREGA' && (
                <>
                  <h3 className="section-title">Onde vamos entregar?</h3>
                  <div className="form-grid">
                    <div className="input-group" style={{ gridColumn: '1/-1' }}>
                      <label>Bairro</label>
                      <select className="input" value={endereco.bairro_id} onChange={e => handleBairroChange(e.target.value)}>
                        <option value="">Selecione o bairro</option>
                        {bairros.map(b => (
                          <option key={b.id} value={b.id}>{b.bairro} - R$ {parseFloat(b.valor).toFixed(2)}</option>
                        ))}
                      </select>
                      {bairros.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: 4 }}>Nenhum bairro cadastrado. Fale com a loja.</p>}
                    </div>
                    
                    <div className="input-group" style={{ gridColumn: '1/-1' }}>
                      <label>Rua / Avenida</label>
                      <input className="input" value={endereco.rua} onChange={e => setEndereco({...endereco, rua: e.target.value})} />
                    </div>
                    
                    <div className="input-group">
                      <label>Número</label>
                      <input className="input" value={endereco.numero} onChange={e => setEndereco({...endereco, numero: e.target.value})} disabled={endereco.semNumero} />
                    </div>
                    
                    <div className="input-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={endereco.semNumero} onChange={e => setEndereco({...endereco, semNumero: e.target.checked, numero: e.target.checked ? '' : endereco.numero})} />
                        Sem número
                      </label>
                    </div>
                    
                    <div className="input-group">
                      <label>Complemento</label>
                      <input className="input" placeholder="Ap 12, Bloco C..." value={endereco.complemento} onChange={e => setEndereco({...endereco, complemento: e.target.value})} />
                    </div>
                    
                    <div className="input-group" style={{ gridColumn: '1/-1' }}>
                      <label>Ponto de Referência / Observação</label>
                      <input className="input" value={endereco.observacao} onChange={e => setEndereco({...endereco, observacao: e.target.value})} />
                    </div>
                  </div>
                </>
              )}
            </section>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={avancarParaPagamento}>Ir para Pagamento</button>
            </div>
          </div>
        )}

        {/* STEP 4: Pagamento */}
        {step === 4 && (
          <div className="fade-in">
            <section className="checkout-section">
              <h3 className="section-title">Como quer pagar?</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {temPix && (
                  <label className={`card ${formaPagamento === 'PIX' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'PIX' ? '2px solid var(--primary)' : '' }}>
                    <input type="radio" name="pagamento" checked={formaPagamento === 'PIX'} onChange={() => setFormaPagamento('PIX')} />
                    <div style={{ flex: 1 }}>
                      <strong>Pagar pelo Site (PIX)</strong>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Rápido, seguro e liberado na hora.</p>
                    </div>
                  </label>
                )}
                
                <label className={`card ${formaPagamento === 'MAQUININHA' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'MAQUININHA' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'MAQUININHA'} onChange={() => setFormaPagamento('MAQUININHA')} />
                  <div style={{ flex: 1 }}>
                    <strong>{tipoPedido === 'ENTREGA' ? 'Cartão na Entrega' : 'Cartão na Retirada'}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      {tipoPedido === 'ENTREGA' ? 'O motoboy leva a maquininha.' : 'Pague com cartão ao retirar.'}
                    </p>
                  </div>
                </label>

                <label className={`card ${formaPagamento === 'DINHEIRO' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'DINHEIRO' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'DINHEIRO'} onChange={() => setFormaPagamento('DINHEIRO')} />
                  <div style={{ flex: 1 }}>
                    <strong>{tipoPedido === 'ENTREGA' ? 'Dinheiro na Entrega' : 'Dinheiro na Retirada'}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      {tipoPedido === 'ENTREGA' ? 'Pagamento em espécie na entrega.' : 'Pague em espécie ao retirar.'}
                    </p>
                  </div>
                </label>
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="input-group slide-up">
                  <label>Precisa de troco para quanto?</label>
                  <input className="input" placeholder="Ex: 50 (ou deixe em branco se não precisar)" value={trocoPara} onChange={e => setTrocoPara(e.target.value)} />
                </div>
              )}
            </section>

            <section className="checkout-section checkout-summary" style={{ marginBottom: 24 }}>
              <div className="summary-row"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
              {tipoPedido === 'ENTREGA' && (
                <div className="summary-row"><span>Taxa de entrega</span><span>R$ {taxaEntrega.toFixed(2)}</span></div>
              )}
              <div className="summary-row summary-total"><span>Total</span><span>R$ {(total + (tipoPedido === 'ENTREGA' ? taxaEntrega : 0)).toFixed(2)}</span></div>
            </section>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleFinalizar} disabled={enviando} style={{ marginBottom: 40 }}>
              {enviando ? 'Processando pedido...' : `Finalizar Pedido - R$ ${(total + (tipoPedido === 'ENTREGA' ? taxaEntrega : 0)).toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
      
      {/* Bottom Nav Bar */}
      <div className="bottom-nav">
        <button className="bottom-nav-item" onClick={() => navigate(`/${slug}`)}>
          <FiList size={20} />
          <span>Cardápio</span>
        </button>
        <button className="bottom-nav-item active" onClick={() => navigate(`/${slug}/checkout`)}>
          <div className="bottom-nav-icon-wrapper">
            <FiShoppingCart size={20} />
            {totalItems > 0 && <span className="bottom-nav-badge">{totalItems}</span>}
          </div>
          <span>Carrinho</span>
        </button>
        <button className="bottom-nav-item" onClick={() => navigate(`/${slug}/pedidos`)}>
          <FiClock size={20} />
          <span>Pedidos</span>
        </button>
      </div>
    </div>
  );
}
