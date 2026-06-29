import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { gerarCobrancaMensalidade, cadastrarContaRecebimento } from '../../lib/api';
import { FiCreditCard, FiAlertCircle, FiCheckCircle, FiClock, FiSave, FiRefreshCw, FiDollarSign, FiInfo, FiAlertTriangle, FiSmartphone } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import './Financeiro.css';

const STATUS_CONFIG = {
  trial:    { label: 'Período de Teste',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <FiClock /> },
  ativo:    { label: 'Ativo',             color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <FiCheckCircle /> },
  atrasado: { label: 'Inadimplente',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <FiAlertCircle /> },
};

const PAGAMENTO_TABS = [
  { id: 'pix',    label: 'PIX',            icon: <FiSmartphone />, disponivel: true },
  { id: 'cartao', label: 'Cartão de Crédito', icon: <FiCreditCard />, disponivel: false },
  { id: 'boleto', label: 'Boleto',          icon: <FiDollarSign />, disponivel: false },
];

export default function Financeiro() {
  const { lojista, diasRestantesTrial, isBloqueado, fetchLojista, user } = useAuth();

  const [tabPagamento, setTabPagamento] = useState('pix');
  const [gerandoPix, setGerandoPix] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [pixErro, setPixErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [dadosBancarios, setDadosBancarios] = useState(null);
  const [formBanco, setFormBanco] = useState({ tipo_chave: 'cpf', chave_pix: '', nome_titular: '', banco: '' });
  const [salvandoBanco, setSalvandoBanco] = useState(false);

  const [testandoPix, setTestandoPix] = useState(false);
  const [testePixData, setTestePixData] = useState(null);
  const [testeCopiado, setTesteCopiado] = useState(false);

  // Realtime: detecta pagamento confirmado
  useEffect(() => {
    if (!lojista?.id) return;
    const channel = supabase
      .channel(`financeiro-lojista-${lojista.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lojistas', filter: `id=eq.${lojista.id}` },
        (payload) => {
          if (payload.new.status_assinatura === 'ativo') {
            toast.success('Pagamento confirmado! Acesso liberado! 🎉');
            fetchLojista(user.id);
            setPixData(null);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [lojista?.id]);

  // Carrega dados bancários
  useEffect(() => {
    if (!lojista?.id) return;
    supabase.from('dados_bancarios_lojista').select('*').eq('lojista_id', lojista.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDadosBancarios(data);
          setFormBanco({ tipo_chave: data.tipo_chave || 'cpf', chave_pix: data.chave_pix || '', nome_titular: data.nome_titular || '', banco: data.banco || '' });
        }
      });
  }, [lojista?.id]);

  async function handleGerarPix() {
    setGerandoPix(true);
    setPixData(null);
    setPixErro(false);
    try {
      const result = await gerarCobrancaMensalidade(lojista.id);
      if (result?.pixCopiaECola || result?.qrCode) {
        setPixData(result);
      } else {
        setPixErro(true);
        toast.error('Não foi possível gerar o PIX. Entre em contato com o suporte.');
      }
    } catch (e) {
      setPixErro(true);
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setGerandoPix(false);
    }
  }

  async function handleCopiarPix() {
    if (!pixData?.pixCopiaECola) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
    toast.success('Código PIX copiado!');
  }

  async function handleSalvarBanco(e) {
    e.preventDefault();
    setSalvandoBanco(true);
    try {
      const chaveFormatada = formatarChavePix(formBanco.chave_pix, formBanco.tipo_chave);
      const { error } = await supabase.from('dados_bancarios_lojista')
        .upsert({ 
          lojista_id: lojista.id, 
          tipo_chave: formBanco.tipo_chave, 
          chave_pix: chaveFormatada, 
          nome_titular: formBanco.nome_titular, 
          banco: formBanco.banco 
        }, { onConflict: 'lojista_id' });
      if (error) throw error;
      try { await cadastrarContaRecebimento(lojista.id, formBanco); } catch (_) {}
      toast.success('Dados bancários salvos com sucesso!');
      setDadosBancarios({ lojista_id: lojista.id, ...formBanco });
    } catch (e) {
      toast.error('Erro ao salvar dados bancários.');
    } finally {
      setSalvandoBanco(false);
    }
  }

  function formatarChavePix(chave, tipo) {
    if (tipo === 'telefone') {
      let num = chave.replace(/\D/g, '');
      if (num.length === 10 || num.length === 11) return `+55${num}`;
      if (num.length === 13 && num.startsWith('55')) return `+${num}`;
    }
    return chave;
  }

  function formatarChavePixParaBRCode(chave, tipo) {
    if (tipo === 'telefone') {
      let num = chave.replace(/\D/g, '');
      if (num.length === 10 || num.length === 11) return `+55${num}`;
      if (num.length === 13 && num.startsWith('55')) return `+${num}`;
    }
    return chave;
  }

  function generatePixPayload(key, name, city = 'Brasil', amount = 0, transactionId = 'TESTE') {
    const formatLength = (val) => String(val.length).padStart(2, '0');
    const formatField = (id, val) => `${id}${formatLength(val)}${val}`;
    
    const payloadFormatIndicator = formatField('00', '01');
    const merchantAccountInfo = formatField('26', 
      formatField('00', 'br.gov.bcb.pix') + 
      formatField('01', key)
    );
    const merchantCategoryCode = formatField('52', '0000');
    const transactionCurrency = formatField('53', '986');
    const transactionAmount = amount ? formatField('54', Number(amount).toFixed(2)) : '';
    const countryCode = formatField('58', 'BR');
    
    const safeName = name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25) || 'Lojista';
    const safeCity = city.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 15) || 'Brasil';
    
    const merchantName = formatField('59', safeName);
    const merchantCity = formatField('60', safeCity);
    const additionalDataField = formatField('62', formatField('05', transactionId));

    const payload = payloadFormatIndicator + merchantAccountInfo + merchantCategoryCode +
                    transactionCurrency + transactionAmount + countryCode +
                    merchantName + merchantCity + additionalDataField;

    const crc16 = (str) => {
      let crc = 0xFFFF;
      for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
          if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
          else crc = crc << 1;
        }
      }
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

    const payloadWithCrcId = payload + '6304';
    return payloadWithCrcId + crc16(payloadWithCrcId);
  }

  async function handleVerificarPix() {
    if (!formBanco.chave_pix) return toast.error('Preencha a chave PIX primeiro.');
    setTestandoPix(true);
    setTestePixData(null);
    try {
      const chaveFormatada = formatarChavePixParaBRCode(formBanco.chave_pix, formBanco.tipo_chave);
      const payloadBrCode = generatePixPayload(chaveFormatada, formBanco.nome_titular, 'Lanchonet', 0.01, 'TESTELAN');
      
      // Simular delay de rede
      await new Promise(r => setTimeout(r, 600));

      setTestePixData({ pixCopiaECola: payloadBrCode });
      toast.success('QR Code de teste gerado localmente!');
    } catch (e) {
      toast.error('Erro ao gerar PIX de teste.');
    } finally {
      setTestandoPix(false);
    }
  }

  const statusInfo = STATUS_CONFIG[lojista?.status_assinatura] || STATUS_CONFIG.trial;
  const vencimento = lojista?.proximo_vencimento
    ? new Date(lojista.proximo_vencimento).toLocaleDateString('pt-BR')
    : '—';
  const mostrarPagamento = isBloqueado || lojista?.status_assinatura === 'trial' || lojista?.status_assinatura === 'ativo';

  return (
    <div className="financeiro-page">
      <div className="page-header">
        <h1 className="page-title">Financeiro</h1>
      </div>

      {/* ===== SEÇÃO A: ASSINATURA ===== */}
      <div className="fin-section-title"><FiCreditCard /> Minha Assinatura</div>

      {isBloqueado && (
        <div className="fin-alert fin-alert--danger">
          <FiAlertCircle size={20} />
          <div>
            <strong>Conta bloqueada por inadimplência</strong>
            <p>Regularize seu pagamento abaixo para reativar o acesso ao painel e ao seu cardápio.</p>
          </div>
        </div>
      )}

      {lojista?.status_assinatura === 'trial' && diasRestantesTrial !== null && (
        <div className="fin-alert fin-alert--info">
          <FiInfo size={20} />
          <div>
            <strong>Período de teste gratuito</strong>
            <p>Restam <strong>{diasRestantesTrial} dias</strong> de trial. Após o vencimento, será cobrado <strong>R$ 150,00/mês</strong>.</p>
          </div>
        </div>
      )}

      {/* Status card */}
      <div className="card fin-status-card">
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
            <p className="fin-value">{vencimento}</p>
          </div>
          <div>
            <p className="fin-label">Valor Mensal</p>
            <p className="fin-value fin-value--price">R$ 150,00</p>
          </div>
        </div>
      </div>

      {/* ===== PAGAMENTO DA MENSALIDADE ===== */}
      {mostrarPagamento && (
        <div className="card fin-pix-card">
          <h3 className="fin-card-title"><FiDollarSign /> Pagar Mensalidade</h3>
          <p className="fin-card-desc">Escolha a forma de pagamento para quitar os R$ 150,00. O pagamento é confirmado automaticamente.</p>

          {/* Tabs de pagamento */}
          <div className="fin-tabs">
            {PAGAMENTO_TABS.map(tab => (
              <button
                key={tab.id}
                className={`fin-tab ${tabPagamento === tab.id ? 'active' : ''} ${!tab.disponivel ? 'disabled' : ''}`}
                onClick={() => tab.disponivel && setTabPagamento(tab.id)}
                title={!tab.disponivel ? 'Em breve' : ''}
              >
                {tab.icon} {tab.label}
                {!tab.disponivel && <span className="fin-tab-badge">Em breve</span>}
              </button>
            ))}
          </div>

          {/* Conteúdo da tab PIX */}
          {tabPagamento === 'pix' && (
            <div className="fin-tab-content">
              {!pixData && !pixErro && (
                <button className="btn btn-primary" onClick={handleGerarPix} disabled={gerandoPix}>
                  {gerandoPix
                    ? <><FiRefreshCw className="spin" /> Gerando PIX...</>
                    : <><FiSmartphone /> Gerar QR Code PIX — R$ 150,00</>
                  }
                </button>
              )}

              {pixErro && (
                <div className="fin-alert fin-alert--danger" style={{ marginTop: 0 }}>
                  <FiAlertCircle size={18} />
                  <div>
                    <strong>Não foi possível gerar o PIX agora</strong>
                    <p>O serviço de pagamentos está indisponível. Tente novamente em alguns instantes ou entre em contato: <strong>suporte@lanchonet.com.br</strong></p>
                  </div>
                </div>
              )}
              {pixErro && (
                <button className="btn btn-ghost" onClick={handleGerarPix} style={{ marginTop: 8 }}>
                  <FiRefreshCw /> Tentar novamente
                </button>
              )}

              {pixData && (
                <div className="fin-pix-result">
                  {pixData.pixCopiaECola && (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block' }}>
                      <QRCodeSVG
                        value={pixData.pixCopiaECola}
                        size={180}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  )}
                  <p className="fin-pix-label">PIX Copia e Cola</p>
                  <div className="fin-pix-code">{pixData.pixCopiaECola}</div>
                  <button className="btn btn-primary" onClick={handleCopiarPix}>
                    {copiado ? <><FiCheckCircle /> Copiado!</> : 'Copiar código PIX'}
                  </button>
                  <p className="fin-pix-hint"><FiRefreshCw size={12} /> Aguardando confirmação automática do pagamento...</p>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo das tabs em breve */}
          {(tabPagamento === 'cartao' || tabPagamento === 'boleto') && (
            <div className="fin-tab-content fin-coming-soon">
              <div style={{ fontSize: 40 }}>🚀</div>
              <h4>Em breve!</h4>
              <p>Esta forma de pagamento estará disponível em breve. Por enquanto, utilize o PIX.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== SEÇÃO B: DADOS DE RECEBIMENTO ===== */}
      <div className="fin-section-title" style={{ marginTop: 32 }}>
        <FiDollarSign /> Dados de Recebimento
      </div>

      {/* Aviso de taxa */}
      <div className="fin-alert fin-alert--warning">
        <FiAlertTriangle size={20} />
        <div>
          <strong>Taxa de processamento AbacatePay</strong>
          <p>Para cada pagamento recebido via PIX pelos seus clientes, será descontado <strong>R$ 0,80</strong> referente à taxa de processamento. Esse valor é cobrado diretamente pela gateway de pagamento.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="fin-card-title">Onde você quer receber os pagamentos dos pedidos?</h3>
        <p className="fin-card-desc">
          Cadastre sua chave PIX para que os pagamentos dos clientes sejam transferidos para sua conta.
          {dadosBancarios && <span className="fin-badge-saved"> ✓ Dados já cadastrados</span>}
        </p>

        <form onSubmit={handleSalvarBanco} className="fin-form">
          <div className="form-grid">
            <div className="input-group">
              <label>Tipo de Chave PIX</label>
              <select className="input" value={formBanco.tipo_chave} onChange={e => setFormBanco(p => ({ ...p, tipo_chave: e.target.value }))}>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Chave Aleatória</option>
              </select>
            </div>
            <div className="input-group">
              <label>Chave PIX</label>
              <input className="input" type="text" placeholder="Sua chave PIX" value={formBanco.chave_pix} onChange={e => setFormBanco(p => ({ ...p, chave_pix: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Nome do Titular</label>
              <input className="input" type="text" placeholder="Nome completo" value={formBanco.nome_titular} onChange={e => setFormBanco(p => ({ ...p, nome_titular: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label>Banco</label>
              <select className="input" value={formBanco.banco} onChange={e => setFormBanco(p => ({ ...p, banco: e.target.value }))} required>
                <option value="">Selecione um banco</option>
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="Nubank">Nubank</option>
                <option value="Itaú">Itaú</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Caixa Econômica Federal">Caixa Econômica Federal</option>
                <option value="PicPay">PicPay</option>
                <option value="Inter">Inter</option>
                <option value="C6 Bank">C6 Bank</option>
                <option value="PagBank">PagBank</option>
                <option value="Neon">Neon</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={salvandoBanco} style={{ width: 'fit-content' }}>
              {salvandoBanco ? <><FiRefreshCw className="spin" /> Salvando...</> : <><FiSave /> Salvar Dados Bancários</>}
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleVerificarPix} disabled={testandoPix} style={{ width: 'fit-content' }}>
              {testandoPix ? <><FiRefreshCw className="spin" /> Verificando...</> : <><FiCheckCircle /> Verificar Chave</>}
            </button>
          </div>
        </form>

        {testePixData && (
          <div className="fin-pix-result slide-up" style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Teste de Recebimento (R$ 0,01)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Escaneie ou copie o código abaixo no seu banco para verificar se o pagamento vai para sua conta corretamente.
            </p>
            {testePixData.pixCopiaECola && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG 
                  value={testePixData.pixCopiaECola} 
                  size={180} 
                  level="M" 
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#fff' }} 
                />
              </div>
            )}
            <div className="fin-pix-code">{testePixData.pixCopiaECola}</div>
            <button className="btn btn-secondary" onClick={() => {
              navigator.clipboard.writeText(testePixData.pixCopiaECola);
              setTesteCopiado(true);
              setTimeout(() => setTesteCopiado(false), 2500);
              toast.success('Código PIX copiado!');
            }}>
              {testeCopiado ? <><FiCheckCircle /> Copiado!</> : 'Copiar código PIX'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
