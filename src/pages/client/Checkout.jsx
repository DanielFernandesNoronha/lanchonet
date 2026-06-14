import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { criarCobranca } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiCheck, FiLogOut } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Checkout.css';

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantidade, removeItem, total } = useCart();
  
  // Lojista info
  const [lojistaId, setLojistaId] = useState(null);
  const [lojistaObj, setLojistaObj] = useState(null);
  const [bairros, setBairros] = useState([]);
  
  // Checkout Steps
  const [step, setStep] = useState(1); // 1 = Review, 2 = Login, 3 = Address, 4 = Payment
  
  // Auth state
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
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

  useEffect(() => {
    async function loadLojista() {
      const { data: loj } = await supabase.from('lojistas').select('*').eq('slug', slug).single();
      if (loj) {
        setLojistaId(loj.id);
        setLojistaObj(loj);
        const { data: b } = await supabase.from('taxas_entrega').select('*').eq('lojista_id', loj.id);
        setBairros(b || []);
      }
    }
    loadLojista();
  }, [slug]);

  // Auth Functions
  async function handleLogin() {
    if (!whatsapp || !senha) return toast.error('Preencha WhatsApp e senha');
    setEnviando(true);
    
    // Check if client exists
    const { data: cliente } = await supabase.from('clientes')
      .select('*')
      .eq('lojista_id', lojistaId)
      .eq('whatsapp', whatsapp)
      .single();
      
    if (cliente) {
      if (cliente.senha_hash === senha) {
        setClienteLogado(cliente);
        if (cliente.endereco) {
          try {
            const endSaved = JSON.parse(cliente.endereco);
            setEndereco(endSaved);
            if (endSaved.bairro_id) handleBairroChange(endSaved.bairro_id);
          } catch(e) {}
        }
        toast.success('Login com sucesso!');
        setStep(3);
      } else {
        toast.error('Senha incorreta! Te enviamos um aviso no WhatsApp.');
        // Here we could trigger an n8n webhook for password recovery!
      }
    } else {
      // Register
      const { data: novoCli, error } = await supabase.from('clientes')
        .insert({ lojista_id: lojistaId, whatsapp, senha_hash: senha })
        .select('*')
        .single();
      
      if (error) {
        toast.error('Erro ao registrar. Você já executou o SQL no Supabase?');
      } else {
        setClienteLogado(novoCli);
        toast.success('Cadastro rápido concluído!');
        setStep(3);
      }
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
      
      // Save address to client profile
      supabase.from('clientes').update({ endereco: JSON.stringify(endereco), bairro_id: endereco.bairro_id }).eq('id', clienteLogado.id).then();
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
        preco: i.precoCalculado, // N8N/AbacatePay usará esse campo
        preco_base: parseFloat(i.preco),
        preco_calculado: i.precoCalculado,
        quantidade: i.quantidade,
        observacao: i.observacao,
        adicionais: i.adicionais
      }));

      // Adicionar taxa de entrega como um item para o AbacatePay cobrar corretamente
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
        lojista_id: lojistaId,
        cliente: {
          whatsapp: clienteLogado.whatsapp,
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

      // 1. Criar o pedido no banco de dados primeiro!
      const { data: pedidoDb, error: errPedido } = await supabase.from('pedidos').insert({
        lojista_id: lojistaId,
        cliente_id: clienteLogado.id,
        cliente_dados: payload.cliente,
        endereco_entrega: payload.cliente.endereco,
        itens: payload.itens,
        subtotal: payload.total_produtos,
        taxa_entrega: payload.cliente.taxa_entrega,
        total: payload.cliente.total_final,
        status: 'novo'
      }).select().single();

      if (errPedido) {
        toast.error('Erro ao registrar pedido.');
        setEnviando(false);
        return;
      }

      // 2. Se for PIX, chamar a integração para gerar QR Code
      if (formaPagamento === 'PIX') {
        const result = await criarCobranca(lojistaId, payload.itens, { ...payload.cliente, pedido_id: pedidoDb.id });
        const resultUrl = result.url || result.data?.url;
        
        if (resultUrl || result.data?.brCode) {
          setPixData({
            ...result,
            url: resultUrl,
            qrCode: result.qrCode || result.data?.qrCode || result.data?.brCodeBase64,
            pixCopiaECola: result.pixCopiaECola || result.data?.pixCopiaECola || result.data?.brCode
          });
        } else {
          toast.error('Pedido salvo, mas erro ao gerar PIX');
        }
      } else {
        // Dinheiro ou Maquininha: já está salvo no DB!
        toast.success('Pedido enviado com sucesso!');
        navigate(`/${slug}`);
      }

      // Enviar mensagem de comanda via n8n (se não for erro)
      if (!errPedido && clienteLogado.whatsapp) {
        try {
          const numeroWpp = clienteLogado.whatsapp.length <= 11 ? `55${clienteLogado.whatsapp}` : clienteLogado.whatsapp;
          let itensTexto = items.map(i => `${i.quantidade}x ${i.nome} (R$ ${(i.precoCalculado * i.quantidade).toFixed(2)})`).join('\\n');
          const tempoEstimado = (lojistaObj.tempo_novo ?? 5) + (lojistaObj.tempo_preparando ?? 30) + (tipoPedido === 'ENTREGA' ? (lojistaObj.tempo_entrega ?? 40) : 0);
          let textMsg = `*Novo Pedido Recebido!*\\n\\nOlá ${clienteLogado.nome || ''}! Recebemos seu pedido #${pedidoDb.id.slice(0, 6)}.\\n\\n*Itens:*\\n${itensTexto}\\n\\n*Total:* R$ ${(payload.cliente.total_final).toFixed(2)}\\n*Pagamento:* ${formaPagamento}\\n*Tempo estimado:* ~${tempoEstimado} minutos\\n\\nAguarde, logo iniciaremos o preparo!`;
          
          await fetch('/webhook/whatsapp-status-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lojista_id: lojistaId,
              telefone: numeroWpp,
              mensagem: textMsg
            })
          });
        } catch (e) {
          console.error("Erro ao enviar comanda via wpp", e);
        }
      }

    } catch (err) {
      toast.error('Erro de conexão');
    }
    setEnviando(false);
  }

  // --- RENDERS ---
  const whiteLabelStyles = lojistaObj ? {
    '--bg-primary': lojistaObj.cor_secundaria || '#111827',
    '--bg-card': lojistaObj.cor_fundo_cards || 'rgba(128, 128, 128, 0.15)',
    '--bg-secondary': lojistaObj.cor_fundo_cards || 'rgba(128, 128, 128, 0.08)',
    '--bg-glass': lojistaObj.cor_fundo_cards || 'rgba(128, 128, 128, 0.2)',
    '--primary': lojistaObj.cor_principal || '#f97316',
    '--accent': lojistaObj.cor_principal || '#f97316',
    '--accent-light': lojistaObj.cor_principal || '#fb923c',
    '--accent-dark': lojistaObj.cor_principal || '#ea580c',
    '--text-primary': lojistaObj.cor_texto_normal || '#ffffff',
    '--text-secondary': lojistaObj.cor_texto_secundaria || '#9ca3af',
    '--text-muted': lojistaObj.cor_texto_secundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
    '--border-hover': 'rgba(128, 128, 128, 0.35)',
  } : {};
  
  if (pixData) {
    return (
      <div className="checkout-page" style={whiteLabelStyles}>
        <div className="container">
          <div className="pix-container slide-up" style={{ textAlign: 'center', padding: 30, background: 'var(--bg-card)', borderRadius: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📱</div>
            <h2>Pague com PIX</h2>
            <p style={{ marginBottom: 20 }}>Escaneie o QR Code ou copie o código abaixo.</p>
            {pixData.qrCode && <img src={pixData.qrCode} alt="QR Code PIX" style={{ maxWidth: 200, margin: '0 auto 20px', display: 'block', borderRadius: 8 }} />}
            
            {pixData.pixCopiaECola && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Copia e Cola:</p>
                <div style={{ background: 'var(--bg-default)', padding: 10, borderRadius: 8, fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {pixData.pixCopiaECola}
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => { navigator.clipboard.writeText(pixData.pixCopiaECola); toast.success('Copiado!'); }}>Copiar</button>
              </div>
            )}
            
            {pixData.url && (
              <a href={pixData.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full btn-lg" style={{ marginBottom: 10 }}>
                Abrir App do Banco
              </a>
            )}
            <p className="pix-total" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Total: R$ {(total + taxaEntrega).toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" style={whiteLabelStyles}>
      <header className="checkout-header" style={{ 
        background: lojistaObj?.capa_url 
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${lojistaObj.capa_url}) center/cover no-repeat` 
          : 'var(--bg-secondary)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate(`/${slug}`)} style={{ color: lojistaObj?.capa_url ? (lojistaObj.cor_fundo_cards || '#ffffff') : 'var(--text-primary)' }}>
          <FiArrowLeft /> Voltar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lojistaObj?.logo_url && <img src={lojistaObj.logo_url} alt="Logo" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'contain' }} />}
          <h2 style={{ fontSize: '1.1rem', color: lojistaObj?.capa_url ? (lojistaObj.cor_fundo_cards || '#ffffff') : 'var(--text-primary)', margin: 0 }}>
            {step === 1 ? 'Revisão' : step === 2 ? 'Identificação' : step === 3 ? 'Endereço' : 'Pagamento'}
          </h2>
        </div>
        <div style={{ width: 80 }} />
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
                    <div className="quantidade-control" style={{ background: 'var(--bg-default)' }}>
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
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteLogado.whatsapp}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setClienteLogado(null); setSenha(''); }}><FiLogOut /></button>
                </div>
              ) : (
                <div className="form-grid">
                  <p style={{ gridColumn: '1/-1', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Digite seu WhatsApp e crie uma senha (ou use sua senha existente).</p>
                  <div className="input-group">
                    <label>WhatsApp (DDD + Número)</label>
                    <input className="input" placeholder="Ex: 11999999999" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="input-group">
                    <label>Senha</label>
                    <input className="input" type="password" placeholder="Sua senha" value={senha} onChange={e => setSenha(e.target.value)} />
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={handleLogin} disabled={enviando} style={{ gridColumn: '1/-1', marginTop: 8 }}>
                    {enviando ? 'Verificando...' : 'Entrar / Cadastrar'}
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
                  className={`btn ${tipoPedido === 'ENTREGA' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1 }} 
                  onClick={() => setTipoPedido('ENTREGA')}
                >
                  Entrega
                </button>
                <button 
                  className={`btn ${tipoPedido === 'RETIRADA' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1 }} 
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
                <label className={`card ${formaPagamento === 'PIX' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'PIX' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'PIX'} onChange={() => setFormaPagamento('PIX')} />
                  <div style={{ flex: 1 }}>
                    <strong>Pagar pelo Site (PIX)</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Rápido, seguro e liberado na hora.</p>
                  </div>
                </label>
                
                <label className={`card ${formaPagamento === 'MAQUININHA' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'MAQUININHA' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'MAQUININHA'} onChange={() => setFormaPagamento('MAQUININHA')} />
                  <div style={{ flex: 1 }}>
                    <strong>Cartão na Entrega</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>O motoboy leva a maquininha.</p>
                  </div>
                </label>

                <label className={`card ${formaPagamento === 'DINHEIRO' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'DINHEIRO' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'DINHEIRO'} onChange={() => setFormaPagamento('DINHEIRO')} />
                  <div style={{ flex: 1 }}>
                    <strong>Dinheiro na Entrega</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Pagamento em espécie.</p>
                  </div>
                </label>
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="input-group slide-up">
                  <label>Precisa de troco para quanto?</label>
                  <input className="input" placeholder="Ex: 50" value={trocoPara} onChange={e => setTrocoPara(e.target.value)} />
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
    </div>
  );
}
