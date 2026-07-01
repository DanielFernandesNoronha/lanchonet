import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiTrash2, FiMessageCircle, FiX, FiCheck, FiEdit2, FiPlus, FiChevronRight, FiDollarSign, FiMapPin, FiClock, FiPackage, FiPhone, FiStar, FiCoffee, FiTruck, FiCheckCircle, FiUser, FiCreditCard, FiShoppingBag, FiPower, FiSearch } from 'react-icons/fi';
import './Pedidos.css';

const STATUS_ORDER = ['novo', 'preparando', 'entrega', 'concluido'];
const STATUS_LABELS = { novo: 'Novo', preparando: 'Preparando', entrega: 'Entrega', concluido: 'Concluído' };
const STATUS_ICONS = { novo: <FiStar />, preparando: <FiCoffee />, entrega: <FiTruck />, concluido: <FiCheckCircle /> };

export default function Pedidos() {
  const { lojista } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [adicionaisGlobais, setAdicionaisGlobais] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedItemIdx, setExpandedItemIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualTimersModal, setShowManualTimersModal] = useState(false);
  const [manualTimeEntrega, setManualTimeEntrega] = useState('');
  const [manualTimeRetirada, setManualTimeRetirada] = useState('');

  const tocarSomCampainha = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); 
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(1, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.3); 
      gain2.gain.setValueAtTime(0, now + 0.3);
      gain2.gain.linearRampToValueAtTime(1, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.8);
    } catch(e) {
      console.error('Erro ao tocar som:', e);
    }
  };

  // Load pedidos + produtos + bairros
  useEffect(() => {
    if (!lojista) return;

    async function load() {
      const [pedidosRes, produtosRes, bairrosRes, adicionaisRes] = await Promise.all([
        supabase.from('pedidos').select('*, clientes(nome, telefone)').eq('lojista_id', lojista.id).order('created_at', { ascending: false }),
        supabase.from('produtos').select('*').eq('lojista_id', lojista.id).eq('disponivel', true),
        supabase.from('taxas_entrega').select('*').eq('lojista_id', lojista.id),
        supabase.from('adicionais').select('*').eq('lojista_id', lojista.id)
      ]);
      setPedidos(pedidosRes.data || []);
      setProdutos(produtosRes.data || []);
      setBairros(bairrosRes.data || []);
      setAdicionaisGlobais(adicionaisRes.data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `lojista_id=eq.${lojista.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPedidos(prev => [payload.new, ...prev]);
          toast.success('Novo pedido recebido!', { duration: 5000 });
          tocarSomCampainha();
        }
        if (payload.eventType === 'UPDATE') {
          setPedidos(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
          if (pedidoSelecionado && pedidoSelecionado.id === payload.new.id) {
            setPedidoSelecionado(prev => ({ ...prev, ...payload.new }));
          }
        }
        if (payload.eventType === 'DELETE') {
          setPedidos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [lojista]);
  // --- Auto-Advance Timers ---
  const [tick, setTick] = useState(0);
  const advancingIds = useRef(new Set());
  const deletingIds = useRef(new Set());

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000); // Tick every 1s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lojista || lojista.pausar_timers || pedidos.length === 0) return;

    const now = Date.now();
    pedidos.forEach(p => {
      const startTime = new Date(p.status_updated_at || p.created_at).getTime();
      const elapsedMins = (now - startTime) / 60000;
      
      let shouldAdvance = false;
      if (p.status === 'novo' && elapsedMins >= (lojista.tempo_novo ?? 5)) shouldAdvance = true;
      else if (p.status === 'preparando' && elapsedMins >= (lojista.tempo_preparando ?? 30)) shouldAdvance = true;
      else if (p.status === 'entrega' && elapsedMins >= (lojista.tempo_entrega ?? 40)) shouldAdvance = true;

      if (shouldAdvance && p.status !== 'concluido') {
        if (!advancingIds.current.has(p.id)) {
          avancarStatus(p);
        }
      } else if (p.status === 'concluido' && elapsedMins >= (lojista.tempo_concluido ?? 10)) {
        if (!deletingIds.current.has(p.id)) {
          excluirPedidoSilencioso(p.id);
        }
      }
    });
  }, [tick]); // run every 1s

  async function excluirPedidoSilencioso(id) {
    if (deletingIds.current.has(id)) return;
    deletingIds.current.add(id);

    try {
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (!error) {
        setPedidos(prev => prev.filter(p => p.id !== id));
        if (pedidoSelecionado?.id === id) { setPedidoSelecionado(null); setIsEditing(false); }
      }
    } finally {
      deletingIds.current.delete(id);
    }
  }

  // --- Actions ---
  async function avancarStatus(pedido) {
    if (advancingIds.current.has(pedido.id)) return;
    
    const idx = STATUS_ORDER.indexOf(pedido.status);
    if (idx >= STATUS_ORDER.length - 1) return;
    
    let novoStatus = STATUS_ORDER[idx + 1];
    const tipoPedido = pedido.cliente_dados?.tipo_pedido || 'ENTREGA';
    if (pedido.status === 'preparando' && tipoPedido === 'RETIRADA') {
      novoStatus = 'concluido';
    }

    let previsaoManual = '';
    // Se estiver avançando para preparando e os timers automáticos estiverem pausados
    if (novoStatus === 'preparando' && lojista?.pausar_timers) {
      previsaoManual = tipoPedido === 'ENTREGA' ? lojista.tempo_manual_entrega : lojista.tempo_manual_retirada;
    }

    advancingIds.current.add(pedido.id);

    try {
      const nowISO = new Date().toISOString();
      const { error } = await supabase.from('pedidos').update({ 
        status: novoStatus,
        status_updated_at: nowISO
      }).eq('id', pedido.id);
      if (error) {
        toast.error('Erro ao atualizar');
        return;
      }

      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: novoStatus, status_updated_at: nowISO } : p));
      if (pedidoSelecionado?.id === pedido.id) setPedidoSelecionado(prev => ({...prev, status: novoStatus, status_updated_at: nowISO}));
      toast.success(`Status → ${STATUS_LABELS[novoStatus]}`);

      // WhatsApp notification
      const pedidoNum = pedido.id.slice(0, 6).toUpperCase();
      const nomeRestaurante = lojista?.nome || 'Restaurante';
      const nomeCliente = pedido.clientes?.nome || pedido.cliente_dados?.nome || 'Cliente';
      const tipoPed = pedido.cliente_dados?.tipo_pedido || 'ENTREGA';

      let txtPreparando = `👨‍🍳 *Pedido #${pedidoNum} em preparo!*\n\n*${nomeRestaurante}* já está cuidando do seu pedido com todo carinho. 🍳\n\n`;
      if (previsaoManual && typeof previsaoManual === 'string' && previsaoManual.trim()) {
        txtPreparando += `⏱️ *Previsão estimada:* ${previsaoManual.trim()}\n\n`;
      }
      txtPreparando += `Fique de olho, logo logo fica pronto!`;

      const statusMsgs = {
        'preparando': txtPreparando,
        'entrega': `🛵 *Pedido #${pedidoNum} saiu para entrega!*\n\nNosso entregador já está a caminho! 🏃‍♂️\n\nFique de olho no portão. 😊\n\n*${nomeRestaurante}* agradece sua preferência! ❤️`,
      };
      
      let mensagemEnvio = '';
      if (novoStatus === 'concluido') {
        if (tipoPed === 'RETIRADA') {
          mensagemEnvio = `🛍️ *Pedido #${pedidoNum} pronto para retirada!*\n\nOlá, ${nomeCliente}! Seu pedido está te esperando no balcão.\n\nNão esqueça de confirmar o número do pedido na retirada.\n\n*${nomeRestaurante}* 💚`;
        } else {
          mensagemEnvio = `✅ *Pedido #${pedidoNum} entregue!*\n\nEsperamos que você aproveite muito, ${nomeCliente}! 🎉\n\nQualquer dúvida ou problema, fale comigo aqui no WhatsApp.\n\n*${nomeRestaurante}* ❤️`;
        }
      } else if (statusMsgs[novoStatus]) {
        mensagemEnvio = statusMsgs[novoStatus];
      }

      if (mensagemEnvio) {
        try {
          const nome = pedido.clientes?.nome || pedido.cliente_dados?.nome || 'Cliente';
          let tel = pedido.clientes?.telefone || pedido.cliente_dados?.whatsapp || '';
          tel = tel.replace(/\D/g, '');
          if (tel) {
            if (!tel.startsWith('55') && tel.length <= 11) tel = `55${tel}`;
            await fetch('/webhook/whatsapp-status-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lojista_id: lojista.id, telefone: tel, mensagem: `Olá, ${nome}!\n\n${mensagemEnvio}\n\nPedido #${pedido.id.slice(0, 6)}` })
            });
          }
        } catch (e) { console.error('WhatsApp error', e); }
      }
    } finally {
      advancingIds.current.delete(pedido.id);
    }
  }

  function triggerDelete(id) {
    setIdToDelete(id);
    setShowConfirmModal(true);
  }

  async function excluirPedidoConfirmado() {
    setShowConfirmModal(false);
    if (!idToDelete) return;
    const { error } = await supabase.from('pedidos').delete().eq('id', idToDelete);
    if (error) return toast.error('Erro ao excluir. Rode o SQL de permissão no Supabase.');
    setPedidos(prev => prev.filter(p => p.id !== idToDelete));
    if (pedidoSelecionado?.id === idToDelete) { setPedidoSelecionado(null); setIsEditing(false); }
    setIdToDelete(null);
    toast.success('Pedido excluído');
  }

  async function toggleLoja() {
    if (!lojista) return;
    const novoStatus = !lojista.aberto;
    const { error } = await supabase.from('lojistas').update({ aberto: novoStatus }).eq('id', lojista.id);
    if (!error) {
      lojista.aberto = novoStatus;
      setTick(t => t + 1); // trigger re-render
      toast.success(novoStatus ? 'Loja Aberta!' : 'Loja Fechada!');
    } else toast.error('Erro! Rode o script SQL no Supabase.');
  }

  async function toggleTimers() {
    if (!lojista) return;
    const isPausando = !lojista.pausar_timers;
    
    if (isPausando) {
      setManualTimeEntrega(lojista.tempo_manual_entrega || '');
      setManualTimeRetirada(lojista.tempo_manual_retirada || '');
      setShowManualTimersModal(true);
      return;
    }

    // Retomando timers automáticos
    const { error } = await supabase.from('lojistas').update({ 
      pausar_timers: false,
      tempo_manual_entrega: null,
      tempo_manual_retirada: null
    }).eq('id', lojista.id);

    if (!error) {
      lojista.pausar_timers = false;
      lojista.tempo_manual_entrega = null;
      lojista.tempo_manual_retirada = null;
      setTick(t => t + 1);
      toast.success('Timers Ativos! Calculando automaticamente.');
    } else toast.error('Erro! Rode o script SQL no Supabase.');
  }

  async function confirmManualTimers(e) {
    e.preventDefault();
    if (!manualTimeEntrega.trim() || !manualTimeRetirada.trim()) {
      return toast.error('Por favor, preencha os dois tempos (entrega e retirada).');
    }
    
    const { error } = await supabase.from('lojistas').update({ 
      pausar_timers: true,
      tempo_manual_entrega: manualTimeEntrega.trim(),
      tempo_manual_retirada: manualTimeRetirada.trim()
    }).eq('id', lojista.id);

    if (!error) {
      lojista.pausar_timers = true;
      lojista.tempo_manual_entrega = manualTimeEntrega.trim();
      lojista.tempo_manual_retirada = manualTimeRetirada.trim();
      setShowManualTimersModal(false);
      setTick(t => t + 1);
      toast.success('Timers pausados e previsões manuais salvas!');
    } else {
      toast.error('Ocorreu um erro. Por favor, certifique-se de ter rodado o SQL de colunas novas no Supabase!');
    }
  }

  async function updateTimerConfig(status, val) {
    if (!lojista) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 0) return;
    const campo = `tempo_${status}`;
    const { error } = await supabase.from('lojistas').update({ [campo]: num }).eq('id', lojista.id);
    if (!error) {
      lojista[campo] = num;
      setTick(t => t + 1);
      toast.success(`Tempo de "${STATUS_LABELS[status]}" atualizado!`);
    } else toast.error('Erro ao salvar tempo.');
  }

  // --- Edit ---
  function iniciarEdicao() {
    setEditData({
      status: pedidoSelecionado.status,
      forma_pagamento: pedidoSelecionado.cliente_dados?.forma_pagamento || 'PIX',
      pago: pedidoSelecionado.cliente_dados?.pago || false,
      taxa_entrega: pedidoSelecionado.taxa_entrega || 0,
      tipo_pedido: pedidoSelecionado.cliente_dados?.tipo_pedido || 'RETIRADA',
      itens: JSON.parse(JSON.stringify(pedidoSelecionado.itens || [])),
      bairro: pedidoSelecionado.cliente_dados?.bairro || '',
      endereco: pedidoSelecionado.cliente_dados?.endereco || { rua: '', numero: '', complemento: '' }
    });
    setIsEditing(true);
    setShowAddItem(false);
    setExpandedItemIdx(null);
  }

  async function salvarEdicao() {
    const sub = calcSubtotal(editData.itens);
    const total = sub + parseFloat(editData.taxa_entrega || 0);
    const dadosAtualizados = {
      ...pedidoSelecionado.cliente_dados,
      pago: editData.pago,
      forma_pagamento: editData.forma_pagamento,
      tipo_pedido: editData.tipo_pedido,
      endereco: editData.tipo_pedido === 'ENTREGA' ? editData.endereco : null,
      bairro: editData.tipo_pedido === 'ENTREGA' ? editData.bairro : null,
      taxa_entrega: editData.tipo_pedido === 'ENTREGA' ? parseFloat(editData.taxa_entrega || 0) : 0
    };

    const taxaFinal = editData.tipo_pedido === 'ENTREGA' ? parseFloat(editData.taxa_entrega || 0) : 0;
    const totalFinal = sub + taxaFinal;
    const { error } = await supabase.from('pedidos').update({
      status: editData.status,
      total: totalFinal, subtotal: sub,
      taxa_entrega: taxaFinal,
      cliente_dados: dadosAtualizados,
      itens: editData.itens
    }).eq('id', pedidoSelecionado.id);

    if (error) return toast.error('Erro ao salvar');
    toast.success('Pedido atualizado!');
    setIsEditing(false);
    setPedidoSelecionado(prev => ({ ...prev, status: editData.status, total: totalFinal, subtotal: sub, taxa_entrega: taxaFinal, cliente_dados: dadosAtualizados, itens: editData.itens }));
  }

  function updateEditItem(i, key, val) {
    const c = [...editData.itens]; c[i][key] = val;
    setEditData(prev => ({ ...prev, itens: c }));
  }
  function removeEditItem(i) { setEditData(prev => ({ ...prev, itens: prev.itens.filter((_, x) => x !== i) })); }
  function addEditItem(produto) {
    const novo = { id: produto.id, nome: produto.nome, preco: parseFloat(produto.preco), preco_calculado: parseFloat(produto.preco), quantidade: 1, observacao: '', adicionais: [] };
    setEditData(prev => ({ ...prev, itens: [...prev.itens, novo] }));
    setShowAddItem(false);
    toast.success(`${produto.nome} adicionado`);
  }
  function handleBairroChange(bairroId) {
    const b = bairros.find(x => x.id === bairroId);
    if (b) {
      setEditData(prev => ({ ...prev, bairro: b.bairro, taxa_entrega: parseFloat(b.valor) }));
    }
  }

  function calcSubtotal(itens) {
    return itens.reduce((acc, item) => {
      const adcTotal = (item.adicionais || []).reduce((s, a) => s + parseFloat(a.preco || 0), 0);
      return acc + ((parseFloat(item.preco_calculado || item.preco || 0) + adcTotal) * parseInt(item.quantidade || 1));
    }, 0);
  }

  function toggleAdicionalOnItem(itemIdx, adicional) {
    const novosItens = [...editData.itens];
    const item = novosItens[itemIdx];
    const adcs = item.adicionais || [];
    const exists = adcs.findIndex(a => a.id === adicional.id);
    if (exists >= 0) {
      item.adicionais = adcs.filter(a => a.id !== adicional.id);
    } else {
      item.adicionais = [...adcs, { id: adicional.id, nome: adicional.nome, preco: parseFloat(adicional.preco) }];
    }
    setEditData(prev => ({ ...prev, itens: novosItens }));
  }

  function openPedido(pedido) {
    setPedidoSelecionado(pedido);
    setIsEditing(false);
    setShowAddItem(false);
  }

  if (loading) return <div className="ped-loading"><div className="ped-spinner" /><span>Carregando pedidos...</span></div>;

  const totalPedidos = pedidos.length;

  return (
    <div className="ped-page">
      <div className="ped-top-bar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <h1 className="ped-title">Pedidos</h1>
          <span className="ped-badge-total">{totalPedidos} total</span>
        </div>

        {/* Center: search */}
        <div style={{ flex: 1, position: 'relative', maxWidth: 380 }}>
          <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input"
            placeholder="Buscar por nome ou código..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 34, height: 36, fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
          <button
            onClick={tocarSomCampainha}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            title="Testar e habilitar som de notificação"
          >
            🔊 Testar Som
          </button>
          <button
            onClick={toggleTimers}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: lojista?.pausar_timers ? 'var(--red-glow)' : 'var(--blue-glow)', color: lojista?.pausar_timers ? 'var(--red)' : 'var(--blue)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <FiClock /> {lojista?.pausar_timers ? 'Timers Pausados' : 'Timers Ativos'}
          </button>
          <button
            onClick={toggleLoja}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: lojista?.aberto ? 'var(--green-glow)' : 'var(--red-glow)', color: lojista?.aberto ? 'var(--green)' : 'var(--red)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <FiPower /> {lojista?.aberto ? 'Loja Aberta' : 'Loja Fechada'}
          </button>
        </div>
      </div>

      <div className="ped-container">
        {/* KANBAN */}
        <div className={`ped-kanban ${pedidoSelecionado ? 'ped-kanban--compact' : ''}`}>
          {STATUS_ORDER.map(status => {
            const count = pedidos.filter(p => {
              if (p.status !== status) return false;
              if (!searchQuery.trim()) return true;
              const q = searchQuery.trim().toLowerCase();
              const nome = (p.clientes?.nome || p.cliente_dados?.nome || '').toLowerCase();
              const codigo = p.id.slice(0, 6).toLowerCase();
              return nome.includes(q) || codigo.includes(q);
            }).length;
            return (
              <div key={status} className="ped-col">
                <div className={`ped-col-header ped-col-header--${status}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                  <div className="ped-col-header-left" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="ped-col-icon">{STATUS_ICONS[status]}</span>
                    <span className="ped-col-label">{STATUS_LABELS[status]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }} title="Minutos até o timer expirar">
                      <FiClock size={10} style={{ color: 'var(--text-muted)', marginRight: 4 }} />
                      <input 
                        type="number" 
                        defaultValue={lojista ? (lojista[`tempo_${status}`] ?? (status === 'novo' ? 5 : status === 'preparando' ? 30 : status === 'entrega' ? 40 : 10)) : 0} 
                        onBlur={(e) => updateTimerConfig(status, e.target.value)}
                        style={{ width: 28, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, padding: 0, textAlign: 'center', outline: 'none' }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>m</span>
                    </div>
                    <span className="ped-col-count">{count}</span>
                  </div>
                </div>
                <div className="ped-col-body">
                  {pedidos.filter(p => {
                    if (p.status !== status) return false;
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.trim().toLowerCase();
                    const nome = (p.clientes?.nome || p.cliente_dados?.nome || '').toLowerCase();
                    const codigo = p.id.slice(0, 6).toLowerCase();
                    return nome.includes(q) || codigo.includes(q);
                  }).map(pedido => {
                    const nome = pedido.clientes?.nome || pedido.cliente_dados?.nome || '—';
                    const pago = pedido.cliente_dados?.pago;
                    const isActive = pedidoSelecionado?.id === pedido.id;
                    return (
                      <div key={pedido.id} className={`ped-card ${isActive ? 'ped-card--active' : ''}`} onClick={() => openPedido(pedido)} style={{ position: 'relative', overflow: 'hidden' }}>
                        
                        {/* Top Progress Line */}
                        {(() => {
                          const limit = status === 'novo' ? (lojista?.tempo_novo ?? 5) : status === 'preparando' ? (lojista?.tempo_preparando ?? 30) : status === 'entrega' ? (lojista?.tempo_entrega ?? 40) : (lojista?.tempo_concluido ?? 10);
                          const startTime = new Date(pedido.status_updated_at || pedido.created_at).getTime();
                          const elapsedMins = (Date.now() - startTime) / 60000;
                          const pct = Math.min((elapsedMins / limit) * 100, 100);
                          const isDanger = pct > 80;
                          return (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--border)' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: lojista?.pausar_timers ? 'var(--text-muted)' : (isDanger ? 'var(--red)' : 'var(--primary)'), transition: 'width 1s linear' }} />
                            </div>
                          );
                        })()}

                        <div className="ped-card-row" style={{ marginTop: 6, marginBottom: 8 }}>
                          <span className="ped-card-id">#{pedido.id.slice(0,6)}</span>
                          
                          {/* Beautiful Timer Badge */}
                          {(() => {
                            const limit = status === 'novo' ? (lojista?.tempo_novo ?? 5) : status === 'preparando' ? (lojista?.tempo_preparando ?? 30) : status === 'entrega' ? (lojista?.tempo_entrega ?? 40) : (lojista?.tempo_concluido ?? 10);
                            const startTime = new Date(pedido.status_updated_at || pedido.created_at).getTime();
                            const elapsedMins = (Date.now() - startTime) / 60000;
                            const pct = Math.min((elapsedMins / limit) * 100, 100);
                            const remainingMins = Math.max(0, limit - elapsedMins);
                            const isDanger = pct > 80;

                            if (lojista?.pausar_timers) {
                              return <span className="ped-card-time" style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.6 }}><FiClock size={11}/> Pausado</span>;
                            }
                            return (
                              <span className="ped-card-time" style={{ 
                                background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)', 
                                color: isDanger ? 'var(--red)' : 'var(--text-secondary)',
                                border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 4,
                                fontWeight: isDanger ? 'bold' : 'normal'
                              }}>
                                <FiClock size={11} style={{ animation: isDanger ? 'pulse 1s infinite' : 'none' }}/> 
                                {Math.floor(remainingMins)}:{Math.floor((remainingMins % 1) * 60).toString().padStart(2, '0')}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="ped-card-nome">{nome}</p>
                        <div className="ped-card-row">
                          <span className="ped-card-total">R$ {parseFloat(pedido.total || 0).toFixed(2)}</span>
                          {pago !== undefined && (
                            <span className={`ped-card-pago ${pago ? 'ped-card-pago--sim' : 'ped-card-pago--nao'}`}>
                              {pago ? '● Pago' : '○ Pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {count === 0 && <div className="ped-col-empty">Nenhum pedido</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* SIDEBAR / OVERLAY */}
        {pedidoSelecionado && (
          <>
            <div className="ped-overlay" onClick={() => { setPedidoSelecionado(null); setIsEditing(false); }} />
            <div className="ped-sidebar">
              {/* Header */}
              <div className="ped-sb-header">
                <div>
                  <span className="ped-sb-id">#{pedidoSelecionado.id.slice(0,6)}</span>
                  <span className={`ped-sb-status ped-sb-status--${pedidoSelecionado.status}`}>{STATUS_LABELS[pedidoSelecionado.status]}</span>
                </div>
                <button className="ped-sb-close" onClick={() => { setPedidoSelecionado(null); setIsEditing(false); }}><FiX size={18}/></button>
              </div>

              {/* Scrollable Content */}
              <div className="ped-sb-body">
                {isEditing ? (
                  /* ===== EDIT MODE ===== */
                  <div className="ped-edit">
                    <div className="ped-edit-section">
                      <label className="ped-edit-label">Status</label>
                      <select className="ped-input" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                        {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>

                    <div className="ped-edit-row">
                      <div className="ped-edit-section" style={{flex:1}}>
                        <label className="ped-edit-label">Pagamento</label>
                        <select className="ped-input" value={editData.forma_pagamento} onChange={e => setEditData({...editData, forma_pagamento: e.target.value})}>
                          <option value="PIX">PIX</option>
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="MAQUININHA">Maquininha</option>
                        </select>
                      </div>
                      <div className="ped-edit-section ped-edit-pago" style={{flex:0}}>
                        <label className="ped-checkbox-label">
                          <input type="checkbox" checked={editData.pago} onChange={e => setEditData({...editData, pago: e.target.checked})} />
                          <span className="ped-checkbox-custom" />
                          Pago
                        </label>
                      </div>
                    </div>

                    {/* Tipo de Pedido toggle */}
                    <div className="ped-edit-section">
                      <label className="ped-edit-label">Tipo de Pedido</label>
                      <div className="ped-toggle-row">
                        <button className={`ped-toggle-btn ${editData.tipo_pedido === 'ENTREGA' ? 'ped-toggle-btn--active' : ''}`} onClick={() => setEditData({...editData, tipo_pedido: 'ENTREGA'})}>
                          <FiTruck /> Entrega
                        </button>
                        <button className={`ped-toggle-btn ${editData.tipo_pedido === 'RETIRADA' ? 'ped-toggle-btn--active' : ''}`} onClick={() => setEditData({...editData, tipo_pedido: 'RETIRADA', taxa_entrega: 0})}>
                          <FiPackage /> Retirada
                        </button>
                      </div>
                    </div>

                    {/* Entrega - agora depende de editData.tipo_pedido */}
                    {editData.tipo_pedido === 'ENTREGA' && (
                      <div className="ped-edit-block">
                        <h4 className="ped-edit-block-title"><FiMapPin size={14}/> Endereço de Entrega</h4>
                        <div className="ped-edit-section">
                          <label className="ped-edit-label">Bairro / Taxa</label>
                          <select className="ped-input" value={bairros.find(b => b.bairro === editData.bairro)?.id || ''} onChange={e => handleBairroChange(e.target.value)}>
                            <option value="">Selecione o bairro</option>
                            {bairros.map(b => <option key={b.id} value={b.id}>{b.bairro} — R$ {parseFloat(b.valor).toFixed(2)}</option>)}
                          </select>
                        </div>
                        <div className="ped-edit-section">
                          <label className="ped-edit-label">Rua</label>
                          <input className="ped-input" value={editData.endereco?.rua || ''} onChange={e => setEditData({...editData, endereco: {...editData.endereco, rua: e.target.value}})} />
                        </div>
                        <div className="ped-edit-row">
                          <div className="ped-edit-section" style={{flex:1}}>
                            <label className="ped-edit-label">Nº</label>
                            <input className="ped-input" value={editData.endereco?.numero || ''} onChange={e => setEditData({...editData, endereco: {...editData.endereco, numero: e.target.value}})} />
                          </div>
                          <div className="ped-edit-section" style={{flex:2}}>
                            <label className="ped-edit-label">Complemento</label>
                            <input className="ped-input" placeholder="Ap, Bloco..." value={editData.endereco?.complemento || ''} onChange={e => setEditData({...editData, endereco: {...editData.endereco, complemento: e.target.value}})} />
                          </div>
                        </div>
                        <div className="ped-edit-section">
                          <label className="ped-edit-label">Taxa Entrega (R$)</label>
                          <input type="number" step="0.01" className="ped-input" value={editData.taxa_entrega} onChange={e => setEditData({...editData, taxa_entrega: e.target.value})} />
                        </div>
                      </div>
                    )}

                    {/* Itens editáveis */}
                    <div className="ped-edit-block">
                      <div className="ped-edit-block-header">
                        <h4 className="ped-edit-block-title"><FiPackage size={14}/> Itens</h4>
                        <button className="ped-btn-add" onClick={() => setShowAddItem(!showAddItem)}><FiPlus size={14}/> Adicionar</button>
                      </div>

                      {showAddItem && (
                        <div className="ped-add-item-list">
                          {produtos.map(p => (
                            <button key={p.id} className="ped-add-item-btn" onClick={() => addEditItem(p)}>
                              <span>{p.nome}</span>
                              <span className="ped-add-item-price">R$ {parseFloat(p.preco).toFixed(2)}</span>
                            </button>
                          ))}
                          {produtos.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'0.8rem', padding:8}}>Nenhum produto cadastrado</p>}
                        </div>
                      )}

                      {editData.itens.map((item, i) => (
                        <div key={i} className="ped-edit-item-wrap">
                          <div className="ped-edit-item">
                            <input type="number" className="ped-input ped-input--qty" value={item.quantidade} onChange={e => updateEditItem(i, 'quantidade', parseInt(e.target.value) || 1)} min="1" />
                            <button className="ped-edit-item-name" onClick={() => setExpandedItemIdx(expandedItemIdx === i ? null : i)}>
                              {item.nome}
                              {item.adicionais?.length > 0 && <span className="ped-edit-item-adc-count">+{item.adicionais.length}</span>}
                            </button>
                            <input type="number" step="0.01" className="ped-input ped-input--price" value={item.preco_calculado || item.preco} onChange={e => updateEditItem(i, 'preco_calculado', e.target.value)} />
                            <button className="ped-btn-del" onClick={() => removeEditItem(i)}><FiTrash2 size={14}/></button>
                          </div>
                          {/* Adicionais da loja mostrados ao expandir */}
                          {expandedItemIdx === i && adicionaisGlobais.length > 0 && (
                            <div className="ped-item-adicionais">
                              <span className="ped-item-adicionais-title">Adicionais:</span>
                              {adicionaisGlobais.map(ad => {
                                const isChecked = (item.adicionais || []).some(a => a.id === ad.id);
                                return (
                                  <label key={ad.id} className={`ped-adc-chip ${isChecked ? 'ped-adc-chip--on' : ''}`}>
                                    <input type="checkbox" checked={isChecked} onChange={() => toggleAdicionalOnItem(i, ad)} />
                                    {ad.nome} <span className="ped-adc-chip-price">+R$ {parseFloat(ad.preco).toFixed(2)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {/* Show current adicionais inline */}
                          {item.adicionais?.length > 0 && expandedItemIdx !== i && (
                            <div className="ped-edit-item-adcs">
                              {item.adicionais.map(a => <span key={a.id} className="ped-adc-tag">+ {a.nome}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="ped-totals">
                      <div className="ped-totals-row"><span>Subtotal</span><span>R$ {calcSubtotal(editData.itens).toFixed(2)}</span></div>
                      {editData.tipo_pedido === 'ENTREGA' && <div className="ped-totals-row"><span>Entrega</span><span>R$ {parseFloat(editData.taxa_entrega || 0).toFixed(2)}</span></div>}
                      <div className="ped-totals-row ped-totals-row--total"><span>Total</span><span>R$ {(calcSubtotal(editData.itens) + (editData.tipo_pedido === 'ENTREGA' ? parseFloat(editData.taxa_entrega || 0) : 0)).toFixed(2)}</span></div>
                    </div>
                  </div>
                ) : (
                  /* ===== VIEW MODE ===== */
                  <div className="ped-view">
                    {/* Cliente */}
                    <div className="ped-view-section">
                      <h4 className="ped-view-title"><FiUser /> Cliente</h4>
                      <p className="ped-view-line"><strong>Nome:</strong> {pedidoSelecionado.clientes?.nome || pedidoSelecionado.cliente_dados?.nome || '—'}</p>
                      <p className="ped-view-line"><FiPhone size={13}/> {pedidoSelecionado.cliente_dados?.whatsapp || '—'}</p>
                    </div>

                    {/* Pagamento */}
                    <div className="ped-view-section">
                      <h4 className="ped-view-title"><FiCreditCard /> Pagamento</h4>
                      <div className="ped-view-chips">
                        <span className="ped-chip">{pedidoSelecionado.cliente_dados?.forma_pagamento || 'PIX'}</span>
                        <span className={`ped-chip ${pedidoSelecionado.cliente_dados?.pago ? 'ped-chip--green' : 'ped-chip--red'}`}>
                          {pedidoSelecionado.cliente_dados?.pago ? '✓ Pago' : '✗ Pendente'}
                        </span>
                      </div>
                      {pedidoSelecionado.cliente_dados?.troco_para && <p className="ped-view-line">Troco para: R$ {pedidoSelecionado.cliente_dados.troco_para}</p>}
                    </div>

                    {/* Entrega */}
                    <div className="ped-view-section">
                      <h4 className="ped-view-title"><FiMapPin /> Entrega</h4>
                      {pedidoSelecionado.cliente_dados?.tipo_pedido === 'ENTREGA' ? (
                        <>
                          <p className="ped-view-line">{pedidoSelecionado.cliente_dados?.endereco?.rua}, {pedidoSelecionado.cliente_dados?.endereco?.numero || 'S/N'}</p>
                          {pedidoSelecionado.cliente_dados?.endereco?.complemento && <p className="ped-view-line">Compl: {pedidoSelecionado.cliente_dados.endereco.complemento}</p>}
                          <p className="ped-view-line"><strong>Bairro:</strong> {pedidoSelecionado.cliente_dados?.bairro}</p>
                        </>
                      ) : (
                        <p className="ped-view-line ped-view-highlight"><FiPackage /> Retirada no Balcão</p>
                      )}
                    </div>

                    {/* Itens */}
                    <div className="ped-view-section">
                      <h4 className="ped-view-title"><FiShoppingBag /> Itens</h4>
                      <ul className="ped-itens-list">
                        {(Array.isArray(pedidoSelecionado.itens) ? pedidoSelecionado.itens : []).map((item, i) => (
                          <li key={i} className="ped-item-row">
                            <span className="ped-item-qty">{item.quantidade}x</span>
                            <span className="ped-item-name">{item.nome}</span>
                            <span className="ped-item-price">R$ {parseFloat(item.preco_calculado || item.preco || 0).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="ped-totals">
                        <div className="ped-totals-row"><span>Subtotal</span><span>R$ {parseFloat(pedidoSelecionado.subtotal || 0).toFixed(2)}</span></div>
                        <div className="ped-totals-row"><span>Entrega</span><span>R$ {parseFloat(pedidoSelecionado.taxa_entrega || 0).toFixed(2)}</span></div>
                        <div className="ped-totals-row ped-totals-row--total"><span>Total</span><span>R$ {parseFloat(pedidoSelecionado.total || 0).toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="ped-sb-footer">
                {isEditing ? (
                  <>
                    <button className="ped-btn ped-btn--ghost" onClick={() => setIsEditing(false)}>Cancelar</button>
                    <button className="ped-btn ped-btn--primary" onClick={salvarEdicao}><FiCheck size={16}/> Salvar</button>
                  </>
                ) : (
                  <>
                    <button className="ped-btn ped-btn--danger" onClick={() => triggerDelete(pedidoSelecionado.id)}><FiTrash2 size={14}/> Excluir</button>
                    <button className="ped-btn ped-btn--secondary" onClick={iniciarEdicao}><FiEdit2 size={14}/> Editar</button>
                    {pedidoSelecionado.status !== 'concluido' && (
                      <button className="ped-btn ped-btn--primary" onClick={() => avancarStatus(pedidoSelecionado)}>
                        <FiChevronRight size={16}/> {STATUS_LABELS[
                          pedidoSelecionado.status === 'preparando' && (pedidoSelecionado.cliente_dados?.tipo_pedido || 'ENTREGA') === 'RETIRADA'
                            ? 'concluido'
                            : STATUS_ORDER[STATUS_ORDER.indexOf(pedidoSelecionado.status) + 1]
                        ] || 'Avançar'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-card slide-up">
            <div className="confirm-modal-icon danger">
              <FiTrash2 />
            </div>
            <h3 className="confirm-modal-title">Excluir Pedido</h3>
            <p className="confirm-modal-message">
              Tem certeza que deseja excluir permanentemente este pedido? Esta ação não poderá ser revertida.
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={excluirPedidoConfirmado}>Excluir Pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsão Manual */}
      {showManualTimersModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-card slide-up">
            <h3 className="confirm-modal-title" style={{ textAlign: 'left', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiClock /> Definir Tempo Manual</h3>
            <p className="confirm-modal-message" style={{ textAlign: 'left', marginBottom: 24 }}>
              Como os timers automáticos estão sendo desativados, você precisa definir uma previsão fixa para mostrar aos clientes.
            </p>
            <form onSubmit={confirmManualTimers}>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Tempo para <strong>Entrega</strong></label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ex: ~50 min, em 1h..."
                  value={manualTimeEntrega}
                  onChange={e => setManualTimeEntrega(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ marginBottom: 24 }}>
                <label>Tempo para <strong>Retirada</strong></label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ex: ~30 min, 20-30 min..."
                  value={manualTimeRetirada}
                  onChange={e => setManualTimeRetirada(e.target.value)}
                />
              </div>
              <div className="confirm-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowManualTimersModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Previsão</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
