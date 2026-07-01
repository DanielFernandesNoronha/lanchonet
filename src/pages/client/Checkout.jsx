import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { criarCobranca, obterNomeWhatsApp } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiCheck, FiLogOut, FiList, FiClock, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Checkout.css';

export default function Checkout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantidade, removeItem, total, totalItems } = useCart();
  
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
  const [isNovoCadastro, setIsNovoCadastro] = useState(false);
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
      const { data: loj } = await supabase.from('lojistas').select('id, nome, slug, logo_url, capa_url, cor_principal, cor_secundaria, cor_fundo_cards, cor_texto_normal, cor_texto_secundaria, aberto, descricao, pausar_timers, tempo_novo, tempo_preparando, tempo_entrega, tempo_concluido, tempo_manual_entrega, tempo_manual_retirada').eq('slug', slug).single();
      if (loj) {
        setLojistaId(loj.id);
        setLojistaObj(loj);
        if (loj.logo_url) {
          try { localStorage.setItem(`lanchonet_logo_${slug}`, loj.logo_url); } catch(e) {}
          setCachedLogo(loj.logo_url);
        }
        
        // Atualiza o título da aba e o favicon
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

        const { data: b } = await supabase.from('taxas_entrega').select('*').eq('lojista_id', loj.id);
        setBairros(b || []);

        const { data: db } = await supabase.from('dados_bancarios_lojista').select('id').eq('lojista_id', loj.id).maybeSingle();
        setTemPix(!!db);
        if (!db) {
          setFormaPagamento('DINHEIRO');
        }
      }
      setLoading(false);
    }
    loadLojista();
  }, [slug]);

  useEffect(() => {
    if (whatsapp.length >= 10 && lojistaId) {
      const checkSeExiste = async () => {
        const { data } = await supabase.from('clientes')
          .select('id')
          .eq('lojista_id', lojistaId)
          .eq('whatsapp', whatsapp)
          .maybeSingle();
        
        const novo = !data;
        setIsNovoCadastro(novo);
        
        if (novo) {
          try {
            const numeroWpp = whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp;
            const res = await obterNomeWhatsApp(lojistaId, numeroWpp);
            if (res && (res.name || res.pushName)) {
              setNome(res.name || res.pushName);
            }
          } catch (e) {
            console.error("Erro ao buscar nome do whatsapp:", e);
          }
        } else {
          try {
            const { data: cliData } = await supabase.rpc('get_cliente_by_phone', { 
              p_telefone: whatsapp, 
              p_lojista_id: lojistaId 
            });
            if (cliData) {
              const { data: cliFull } = await supabase.from('clientes')
                .select('*')
                .eq('id', cliData.id)
                .single();
              if (cliFull && (!cliFull.nome || cliFull.nome === '—' || cliFull.nome.trim() === '')) {
                const numeroWpp = whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp;
                const res = await obterNomeWhatsApp(lojistaId, numeroWpp);
                const wppName = res?.name || res?.pushName;
                if (wppName) {
                  await supabase.from('clientes').update({ nome: wppName }).eq('id', cliFull.id);
                }
              }
            }
          } catch (e) {}
        }
      };
      checkSeExiste();
    } else {
      setIsNovoCadastro(false);
    }
  }, [whatsapp, lojistaId]);

  // Auth Functions
  async function handleLogin() {
    if (!whatsapp) return toast.error('Preencha seu WhatsApp');
    if (isNovoCadastro && !nome) return toast.error('Por favor, informe seu nome');
    setEnviando(true);
    
    // Check if client exists
    const { data: cliente } = await supabase.rpc('get_cliente_by_phone', {
      p_telefone: whatsapp,
      p_lojista_id: lojistaId
    });
      
    if (cliente) {
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
    } else {
      // Register
      const { data: novoCli, error } = await supabase.rpc('register_cliente_secure', {
        p_lojista_id: lojistaId,
        p_whatsapp: whatsapp,
        p_nome: nome,
        p_senha_hash: 'na'
      });
      
      if (error) {
        toast.error(`Erro ao registrar: ${error.message || error.details}`);
      } else {
        setClienteLogado(novoCli);
        try { localStorage.setItem(`lanchonet_client_${slug}`, JSON.stringify(novoCli)); } catch(e) {}
        toast.success('Pronto!');
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
          nome: clienteLogado.nome,
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
        console.error('Supabase errPedido:', errPedido);
        toast.error(`Erro ao registrar pedido: ${errPedido.message || errPedido.details || JSON.stringify(errPedido)}`);
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
        navigate(`/${slug}/pedidos`);
      }

      // Enviar mensagem de comanda via n8n
      if (!errPedido && clienteLogado.whatsapp) {
        try {
          const numeroWpp = clienteLogado.whatsapp.length <= 11 ? `55${clienteLogado.whatsapp}` : clienteLogado.whatsapp;
          
          // Itens formatados
          let itensTexto = items.map(i => {
            let itemStr = `• *${i.quantidade}x ${i.nome}* — R$ ${(i.precoCalculado * i.quantidade).toFixed(2)}`;
            if (i.adicionais && i.adicionais.length > 0) {
              itemStr += `\n  ↳ Adicionais: ${i.adicionais.map(a => a.nome).join(', ')}`;
            }
            if (i.observacao) {
              itemStr += `\n  ↳ Obs: ${i.observacao}`;
            }
            return itemStr;
          }).join('\n');

          // Calcular previsão de tempo
          let tempoEstimado = '';
          if (lojistaObj.pausar_timers) {
            // Se timers estiverem pausados, usa a previsão manual enviada pelo admin
            tempoEstimado = tipoPedido === 'ENTREGA' ? lojistaObj.tempo_manual_entrega : lojistaObj.tempo_manual_retirada;
          } else {
            // Timers automáticos
            const tempoNovo = lojistaObj.tempo_novo;
            const tempoPreparando = lojistaObj.tempo_preparando;
            const tempoEntrega = lojistaObj.tempo_entrega;
            if (tempoNovo || tempoPreparando || tempoEntrega) {
              const minutos = (tempoNovo ?? 5) + (tempoPreparando ?? 30) + (tipoPedido === 'ENTREGA' ? (tempoEntrega ?? 40) : 0);
              tempoEstimado = `~${minutos} min`;
            }
          }

          // Bloco de pagamento
          let pagamentoTexto = '';
          if (formaPagamento === 'PIX') {
            pagamentoTexto = `💠 *Pagamento:* PIX\n   ↳ O QR Code foi enviado no site. Aguarde confirmação automática.`;
          } else if (formaPagamento === 'DINHEIRO') {
            pagamentoTexto = `💵 *Pagamento:* Dinheiro`;
            if (trocoPara && parseFloat(trocoPara) > 0) {
              const troco = parseFloat(trocoPara) - payload.cliente.total_final;
              pagamentoTexto += `\n   ↳ Troco para: R$ ${parseFloat(trocoPara).toFixed(2)}`;
              if (troco > 0) pagamentoTexto += ` _(troco de R$ ${troco.toFixed(2)})_`;
            } else {
              pagamentoTexto += `\n   ↳ Sem troco necessário`;
            }
          } else if (formaPagamento === 'MAQUININHA') {
            pagamentoTexto = `💳 *Pagamento:* Maquininha (débito/crédito)`;
          }

          // Bloco de entrega
          let entregaTexto = '';
          if (tipoPedido === 'ENTREGA') {
            const nomeBairro = bairros.find(b => b.id === endereco.bairro_id)?.bairro || '';
            const ruaNum = `${endereco.rua}, ${endereco.semNumero ? 'S/N' : endereco.numero}`;
            const complementoStr = endereco.complemento ? `, ${endereco.complemento}` : '';
            const referenciaStr = endereco.referencia ? `\n   ↳ Referência: ${endereco.referencia}` : '';
            entregaTexto = `🛵 *Tipo:* Entrega\n📍 *Endereço:* ${ruaNum}${complementoStr} — ${nomeBairro}${referenciaStr}`;
            if (taxaEntrega > 0) {
              entregaTexto += `\n🪙 *Taxa de entrega:* R$ ${taxaEntrega.toFixed(2)}`;
            }
          } else {
            entregaTexto = `🛍️ *Tipo:* Retirada no Balcão`;
          }

          let textMsg = `📋 *PEDIDO CONFIRMADO! #${pedidoDb.id.slice(0, 6).toUpperCase()}*\n`;
          textMsg += `🏪 *${lojistaObj.nome}*\n`;
          textMsg += `━━━━━━━━━━━━━━━━━━\n`;
          textMsg += `👤 *Cliente:* ${clienteLogado.nome}\n\n`;
          textMsg += `🛒 *Itens do Pedido:*\n${itensTexto}\n\n`;
          textMsg += `━━━━━━━━━━━━━━━━━━\n`;
          textMsg += `${entregaTexto}\n\n`;
          textMsg += `${pagamentoTexto}\n\n`;
          textMsg += `━━━━━━━━━━━━━━━━━━\n`;
          textMsg += `💰 *Subtotal:* R$ ${total.toFixed(2)}\n`;
          if (tipoPedido === 'ENTREGA' && taxaEntrega > 0) {
            textMsg += `🪙 *Entrega:* R$ ${taxaEntrega.toFixed(2)}\n`;
          }
          textMsg += `🔥 *Total:* *R$ ${payload.cliente.total_final.toFixed(2)}*\n`;
          if (tempoEstimado) {
            textMsg += `\n⏱️ *Previsão:* ${tempoEstimado}`;
          }

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
          console.error('Erro ao enviar comanda via wpp', e);
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
        {cachedLogo ? (
          <img src={cachedLogo} alt="Logo" style={{ width: 100, height: 100, borderRadius: '50%', marginBottom: 20, objectFit: 'contain', animation: 'pulse 1.5s infinite ease-in-out' }} />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid #f3f3f3', borderTop: '4px solid var(--accent, #f97316)', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
        )}
        <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 600 }}>Carregando...</h2>
      </div>
    );
  }

  if (pixData) {
    return (
      <div className="checkout-page" style={whiteLabelStyles}>
        <div className="container">
          <div className="pix-container slide-up" style={{ textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: 20 }}>
              <FiCheck size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Pague com PIX</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Escaneie o QR Code abaixo com o app do seu banco</p>
            
            {pixData.qrCode && (
              <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
                <img src={pixData.qrCode} alt="QR Code PIX" style={{ width: 200, height: 200, display: 'block' }} />
              </div>
            )}
            
            {pixData.pixCopiaECola && (
              <div style={{ marginBottom: 24, textAlign: 'left', maxWidth: 400, margin: '0 auto 24px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Ou use o Pix Copia e Cola:</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}>
                    {pixData.pixCopiaECola}
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0 20px', flexShrink: 0 }} onClick={() => { navigator.clipboard.writeText(pixData.pixCopiaECola); toast.success('Copiado!'); }}>
                    Copiar
                  </button>
                </div>
              </div>
            )}
            
            {pixData.url && (
              <div style={{ maxWidth: 400, margin: '0 auto 24px' }}>
                <a href={pixData.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full btn-lg">
                  Abrir no App do Banco
                </a>
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
              <p className="pix-total" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Total a pagar</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>R$ {(total + taxaEntrega).toFixed(2)}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate(`/${slug}/pedidos`)}>
                Acompanhar pelo Site
              </button>
              <button 
                className="btn btn-secondary btn-lg btn-full" 
                onClick={() => {
                  const num = (lojistaObj?.telefone || '').replace(/\D/g, '');
                  if (num) window.open(`https://wa.me/55${num}`, '_blank');
                  else window.open(`https://wa.me/`, '_blank');
                }}
              >
                Acompanhar pelo WhatsApp
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
        background: lojistaObj?.capa_url 
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${lojistaObj.capa_url}) center/cover no-repeat` 
          : 'var(--bg-secondary)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lojistaObj?.logo_url && <img src={lojistaObj.logo_url} alt="Logo" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'contain' }} />}
          <h2 style={{ fontSize: '1.1rem', color: lojistaObj?.capa_url ? (lojistaObj.cor_fundo_cards || '#ffffff') : 'var(--text-primary)', margin: 0 }}>
            {step === 1 ? 'Revisão' : step === 2 ? 'Identificação' : step === 3 ? 'Endereço' : 'Pagamento'}
          </h2>
        </div>
        <button 
          className="btn-voltar-header" 
          onClick={() => step > 1 ? setStep(step - 1) : navigate(`/${slug}`)} 
          style={lojistaObj?.capa_url ? { 
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
                    <span style={{ color: 'var(--text-secondary)' }}>{clienteLogado.whatsapp}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setClienteLogado(null); setSenha(''); }}><FiLogOut /></button>
                </div>
              ) : (
                <div className="form-grid">
                  <p style={{ gridColumn: '1/-1', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Digite seu WhatsApp para continuar.</p>
                  <div className="input-group">
                    <label>WhatsApp (DDD + Número)</label>
                    <input className="input" placeholder="Ex: 11999999999" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  {isNovoCadastro && (
                    <div className="input-group">
                      <label>Confirme seu Nome</label>
                      <input className="input" placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} />
                    </div>
                  )}
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
                {/* PIX — só mostra se tiver dados bancários */}
                {temPix && (
                  <label className={`card ${formaPagamento === 'PIX' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'PIX' ? '2px solid var(--primary)' : '' }}>
                    <input type="radio" name="pagamento" checked={formaPagamento === 'PIX'} onChange={() => setFormaPagamento('PIX')} />
                    <div style={{ flex: 1 }}>
                      <strong>Pagar pelo Site (PIX)</strong>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Rápido, seguro e liberado na hora.</p>
                    </div>
                  </label>
                )}
                
                {/* Maquininha — texto muda conforme tipo */}
                <label className={`card ${formaPagamento === 'MAQUININHA' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: formaPagamento === 'MAQUININHA' ? '2px solid var(--primary)' : '' }}>
                  <input type="radio" name="pagamento" checked={formaPagamento === 'MAQUININHA'} onChange={() => setFormaPagamento('MAQUININHA')} />
                  <div style={{ flex: 1 }}>
                    <strong>{tipoPedido === 'ENTREGA' ? 'Cartão na Entrega' : 'Cartão na Retirada'}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      {tipoPedido === 'ENTREGA' ? 'O motoboy leva a maquininha.' : 'Pague com cartão ao retirar.'}
                    </p>
                  </div>
                </label>

                {/* Dinheiro — texto muda conforme tipo */}
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

              {/* Troco — só para dinheiro */}
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
