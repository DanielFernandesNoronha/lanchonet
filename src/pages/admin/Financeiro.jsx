import { useState, useEffect } from 'react';
import { api, SSE_URL } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { FiCreditCard, FiAlertCircle, FiCheckCircle, FiClock, FiX, FiDollarSign, FiInfo, FiRefreshCw, FiSmartphone, FiUser, FiClipboard, FiLock, FiKey, FiStar, FiFileText, FiMessageSquare } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import './Financeiro.css';

const STATUS_CONFIG = {
  trial:    { label: 'Período de Teste',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <FiClock /> },
  ativo:    { label: 'Ativo',             color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <FiCheckCircle /> },
  atrasado: { label: 'Inadimplente',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <FiAlertCircle /> },
  pendente: { label: 'Pendente',          color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <FiClock /> },
};

// ===== MODAL BASE =====
function Modal({ open, onClose, children, titulo }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 520, position: 'relative',
        border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
          padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18
        }}><FiX /></button>
        {titulo && <h3 style={{ marginBottom: 24, fontSize: '1.25rem', fontWeight: 700 }}>{titulo}</h3>}
        {children}
      </div>
    </div>
  );
}

// ===== MODAL ASSINATURA (CARTÃO/LINK) =====
function ModalAssinatura({ open, onClose }) {
  const { fetchLojista, lojista } = useAuth();
  const [form, setForm] = useState({ 
    nome: lojista?.nome || '', 
    email: lojista?.email || '', 
    cpf: '', 
    celular: '' 
  });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null); // { url } após criar billing

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/lojistas/assinatura/criar', form);
      if (data.url) {
        setResultado(data);
        fetchLojista();
      } else {
        toast.error(data.error || 'Erro ao criar assinatura.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setForm({ nome: '', email: '', cpf: '', celular: '' });
    setResultado(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} titulo={<span style={{ display: 'flex', alignItems: 'center' }}><FiClipboard style={{ marginRight: 8 }}/> Assinatura Mensal — R$ 149,90/mês</span>}>
      {!resultado ? (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Preencha seus dados para ativar a assinatura. A cobrança será processada de forma segura e você receberá uma confirmação automática.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>CPF</label>
                <input className="input" placeholder="000.000.000-00" value={form.cpf}
                  onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Celular</label>
                <input className="input" placeholder="(88) 98158-3038" value={form.celular}
                  onChange={e => setForm(p => ({ ...p, celular: e.target.value }))} required />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 24, height: 48 }}>
            {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiRefreshCw className="spin" style={{ marginRight: 8 }} /> Processando...</span> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiLock style={{ marginRight: 8 }}/> Criar Assinatura</span>}
          </button>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Pagamento seguro via PIX
          </p>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><FiCheckCircle color="#4ade80" /></div>
          <h4 style={{ marginBottom: 8 }}>Assinatura criada!</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Clique no botão abaixo para ir à página de pagamento. Após o pagamento, seu acesso será liberado automaticamente.
          </p>
          <a href={resultado.url} target="_blank" rel="noopener noreferrer"
            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex', height: 48 }}>
            <FiCreditCard style={{ marginRight: 8 }}/> Pagar agora — R$ 149,90
          </a>
          <button className="btn btn-ghost" onClick={handleClose} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
}

// ===== MODAL PIX AVULSO (QR Code direto) =====
function ModalPixAvulso({ open, onClose }) {
  const { fetchLojista, lojista } = useAuth();
  const [form, setForm] = useState({ 
    nome: lojista?.nome || '', 
    email: lojista?.email || '', 
    cpf: '', 
    celular: '' 
  });
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/lojistas/assinatura/pix-avulso', form);
      if (data.pixCopiaECola || data.qrCode) {
        setPixData(data);
        fetchLojista();
      } else {
        toast.error(data.error || 'Erro ao gerar PIX.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopiar() {
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopiado(true);
    toast.success('PIX copiado!');
    setTimeout(() => setCopiado(false), 2500);
  }

  function handleClose() {
    setForm({ nome: '', email: '', cpf: '', celular: '' });
    setPixData(null);
    setCopiado(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} titulo={<span style={{ display: 'flex', alignItems: 'center' }}><FiSmartphone style={{ marginRight: 8 }}/> Pagar 1 Mês — R$ 169,90</span>}>
      {!pixData ? (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Preencha seus dados para gerar o QR Code PIX de R$ 169,90 referente a 1 mês de assinatura.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>CPF</label>
                <input className="input" placeholder="000.000.000-00" value={form.cpf}
                  onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Celular</label>
                <input className="input" placeholder="(88) 98158-3038" value={form.celular}
                  onChange={e => setForm(p => ({ ...p, celular: e.target.value }))} required />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 24, height: 48 }}>
            {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiRefreshCw className="spin" style={{ marginRight: 8 }} /> Gerando PIX...</span> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiKey style={{ marginRight: 8 }}/> Gerar QR Code PIX</span>}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Escaneie o QR Code ou copie o código abaixo no seu banco.
          </p>
          {(pixData.qrCode || pixData.pixCopiaECola) && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
              {pixData.qrCode && pixData.qrCode.startsWith('data:') ? (
                <img src={pixData.qrCode} alt="QR Code PIX" style={{ width: 200, height: 200 }} />
              ) : (
                <QRCodeSVG value={pixData.pixCopiaECola || pixData.qrCode} size={200} level="M" />
              )}
            </div>
          )}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 14px',
            fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--text-secondary)',
            marginBottom: 16, maxHeight: 80, overflowY: 'auto', textAlign: 'left'
          }}>
            {pixData.pixCopiaECola}
          </div>
          <button className="btn btn-primary" onClick={handleCopiar}
            style={{ width: '100%', justifyContent: 'center', height: 48 }}>
            {copiado ? <><FiCheckCircle style={{ marginRight: 8 }}/> Copiado!</> : 'Copiar código PIX'}
          </button>
          <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <FiRefreshCw size={12} /> O acesso é liberado automaticamente após a confirmação.
          </p>
        </div>
      )}
    </Modal>
  );
}

// ===== MODAL CARTÃO DE CRÉDITO =====
function ModalCartao({ open, onClose }) {
  const { fetchLojista, lojista } = useAuth();
  const [form, setForm] = useState({ 
    nome: lojista?.nome || '', 
    email: lojista?.email || '', 
    cpf: '', 
    celular: '' 
  });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [meses, setMeses] = useState(1);
  const precoBase = 169.90;
  const precoComDesconto = 129.90;
  const temDesconto = meses >= 6;
  const precoAtual = temDesconto ? precoComDesconto : precoBase;
  const total = precoAtual * meses;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, meses };
      const data = await api.post('/lojistas/assinatura/cartao', payload);
      if (data.url) {
        setResultado(data);
        fetchLojista();
      } else {
        toast.error(data.error || 'Erro ao gerar link de pagamento.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setMeses(1);
    setForm(p => ({ ...p, cpf: '', celular: '' }));
    setResultado(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} titulo={<span style={{ display: 'flex', alignItems: 'center' }}><FiCreditCard style={{ marginRight: 8 }}/> Pagar com Cartão de Crédito</span>}>
      {!resultado ? (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Selecione a quantidade de meses que deseja pagar. Para 6 meses ou mais, ganhe um desconto especial!
          </p>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Número de Meses: <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{meses}</span></label>
            <input 
              type="range" 
              min="1" 
              max="12" 
              value={meses} 
              onChange={(e) => setMeses(parseInt(e.target.value))} 
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>1 mês</span>
              <span>12 meses</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Valor Mensal</span>
              <span style={{ textDecoration: temDesconto ? 'line-through' : 'none', color: temDesconto ? 'var(--text-muted)' : 'var(--text-primary)' }}>R$ {precoBase.toFixed(2).replace('.', ',')}</span>
            </div>
            {temDesconto && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#4ade80', fontWeight: 600 }}>
                <span>Valor com Desconto (&gt;= 6 meses)</span>
                <span>R$ {precoComDesconto.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem' }}>
              <span>Total</span>
              <span>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            Por favor, confirme seus dados para gerar o link de pagamento.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div className="input-group">
              <label>CPF</label>
              <input className="input" placeholder="000.000.000-00" value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Celular</label>
              <input className="input" placeholder="(88) 98158-3038" value={form.celular}
                onChange={e => setForm(p => ({ ...p, celular: e.target.value }))} required />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', height: 48, background: '#60a5fa' }}>
            {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiRefreshCw className="spin" style={{ marginRight: 8 }} /> Gerando link...</span> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCreditCard style={{ marginRight: 8 }} /> Ir para Pagamento</span>}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: '#60a5fa' }}><FiCheckCircle /></div>
          <h4 style={{ marginBottom: 8 }}>Link Gerado!</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Clique no botão abaixo para ir à página segura de pagamento por Cartão de Crédito. O acesso é liberado automaticamente.
          </p>
          <a href={resultado.url} target="_blank" rel="noopener noreferrer"
            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex', height: 48, background: '#60a5fa' }}>
            <FiCreditCard style={{ marginRight: 8 }}/> Pagar R$ {total.toFixed(2).replace('.', ',')}
          </a>
          <button className="btn btn-ghost" onClick={handleClose} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function Financeiro() {
  const { lojista, diasRestantesTrial, isBloqueado, fetchLojista } = useAuth();

  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [modalPixAvulso, setModalPixAvulso] = useState(false);
  const [modalCartao, setModalCartao] = useState(false);

  // SSE: detecta pagamento confirmado
  useEffect(() => {
    if (!lojista?.id) return;
    const token = localStorage.getItem('lanchonet_token');
    if (!token) return;
    const eventSource = new EventSource(`${SSE_URL}/${lojista.id}?auth_token=${token}`);
    eventSource.addEventListener('assinatura_atualizada', (e) => {
      const payload = JSON.parse(e.data);
      if (payload.statusAssinatura === 'ativo') {
        toast.success('Pagamento confirmado! Acesso liberado! 🎉');
        fetchLojista();
        setModalAssinatura(false);
        setModalPixAvulso(false);
        setModalCartao(false);
      }
    });
    return () => eventSource.close();
  }, [lojista?.id]);

  const statusInfo = STATUS_CONFIG[lojista?.statusAssinatura] || STATUS_CONFIG.trial;
  const vencimento = lojista?.proximoVencimento
    ? new Date(lojista.proximoVencimento).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div className="financeiro-page">
      <div className="page-header">
        <h1 className="page-title">Financeiro</h1>
      </div>

      {/* Modais */}
      <ModalAssinatura open={modalAssinatura} onClose={() => setModalAssinatura(false)} />
      <ModalPixAvulso open={modalPixAvulso} onClose={() => setModalPixAvulso(false)} />
      <ModalCartao open={modalCartao} onClose={() => setModalCartao(false)} />

      {lojista?.statusAssinatura === 'trial' && diasRestantesTrial !== null && (
        <div className="fin-alert fin-alert--info" style={{ marginTop: 24 }}>
          <FiInfo size={20} />
          <div>
            <strong>Período de teste gratuito</strong>
            <p style={{ display: 'block', marginTop: 4 }}>Restam <strong style={{ display: 'inline' }}>{diasRestantesTrial} dias</strong> para o fim do seu teste grátis.</p>
          </div>
        </div>
      )}

      {/* ===== SEÇÃO: MINHA ASSINATURA ===== */}
      <div className="fin-section-title" style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}><FiCreditCard style={{ marginRight: 12 }} /> Minha Assinatura</div>

          {isBloqueado && (
            <div className="fin-alert fin-alert--danger">
              <FiAlertCircle size={20} />
              <div>
                <strong>Acesso Restrito</strong>
                <p>{lojista?.statusAssinatura === 'pendente' 
                  ? 'Você precisa escolher um plano e realizar o pagamento para liberar o acesso ao seu painel e cardápio.'
                  : 'Regularize seu pagamento abaixo para reativar o acesso ao painel e ao seu cardápio.'}</p>
              </div>
            </div>
          )}

          {/* Status card */}
          <div className="card fin-status-card" style={{ marginBottom: 40 }}>
            <div className="fin-status-row">
              <div>
                <p className="fin-label">Plano</p>
                <p className="fin-value">{lojista?.planos?.nome || 'Plano Padrão'}</p>
              </div>
              <div>
                <p className="fin-label">Status</p>
                <span className="fin-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.icon} {statusInfo.label}
                </span>
              </div>
              <div>
                <p className="fin-label">Próximo Vencimento</p>
                <p className="fin-value">{lojista?.statusAssinatura === 'pendente' ? 'Pendente' : vencimento}</p>
              </div>
            </div>
          </div>

          {lojista?.statusAssinatura === 'ativo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: 24, borderRadius: 16 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}><FiStar style={{ marginRight: 8, color: 'var(--accent)' }}/> O que seu plano inclui</h4>
                <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '2' }}>
                  <li><FiCheckCircle color="#4ade80" style={{ marginRight: 8 }}/> Cardápio Digital Ilimitado</li>
                  <li><FiCheckCircle color="#4ade80" style={{ marginRight: 8 }}/> Recebimento de pedidos via WhatsApp</li>
                  <li><FiCheckCircle color="#4ade80" style={{ marginRight: 8 }}/> Painel Kanban de Produção</li>
                  <li><FiCheckCircle color="#4ade80" style={{ marginRight: 8 }}/> Integração com Motoboys</li>
                  <li><FiCheckCircle color="#4ade80" style={{ marginRight: 8 }}/> Zero taxas por pedido</li>
                </ul>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 24, borderRadius: 16 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}><FiFileText style={{ marginRight: 8, color: '#60a5fa' }}/> Histórico de Faturas</h4>
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  <FiFileText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem' }}>Nenhuma fatura anterior encontrada.</p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 24, borderRadius: 16 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}><FiMessageSquare style={{ marginRight: 8, color: '#f43f5e' }}/> Precisa de Ajuda?</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Nosso time de suporte está disponível de segunda a sábado, das 10h às 22h para te ajudar com o sistema.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Falar com o Suporte
                </button>
              </div>
            </div>
          )}

      {/* ===== PLANOS ===== */}
      {lojista?.statusAssinatura !== 'ativo' && (
        <>
          <div className="fin-section-title" style={{ marginTop: lojista?.statusAssinatura === 'trial' ? 40 : 24, display: 'flex', alignItems: 'center' }}><FiDollarSign style={{ marginRight: 12 }} /> Formas de Pagamento</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Escolha o melhor plano para a sua loja.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>

        {/* ASSINATURA PIX */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(249,115,22,0.5)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, right: 24, background: 'var(--accent)', color: '#000', padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 'bold' }}>RECOMENDADO</div>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 16, fontSize: '1.2rem' }}>Assinatura Mensal</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 149,90<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>
            Cadastre seus dados e pague via link de pagamento seguro. Acesso liberado automaticamente.
          </div>
          <button className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)' }}
            onClick={() => setModalAssinatura(true)}>
            <FiUser style={{ marginRight: 8 }} /> Assinar Agora
          </button>
        </div>

        {/* PIX AVULSO */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(74,222,128,0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 16, fontSize: '1.2rem' }}>PIX Avulso (1 mês)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 169,90<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>
            Pague 1 mês via PIX e receba o QR Code na tela. Renovação manual todo mês.
          </div>
          <button className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', borderColor: '#4ade80', color: '#4ade80' }}
            onClick={() => setModalPixAvulso(true)}>
            <FiSmartphone style={{ marginRight: 8 }} /> Pagar 1 Mês (PIX)
          </button>
        </div>

        {/* CARTÃO */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(96,165,250,0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 16, fontSize: '1.2rem' }}>Cartão de Crédito</div>
          <div style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>De R$ 169,90</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8, color: '#60a5fa' }}>R$ 129,90<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>
            Pague 6 meses ou mais e ganhe desconto. Parcela no crédito sem burocracia.
          </div>
          <button className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', borderColor: '#60a5fa', color: '#60a5fa' }}
            onClick={() => setModalCartao(true)}>
            <FiCreditCard style={{ marginRight: 8 }} /> Pagar no Cartão
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
