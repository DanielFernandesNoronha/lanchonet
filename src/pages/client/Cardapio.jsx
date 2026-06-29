import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { FiShoppingCart, FiPlus, FiMinus, FiSearch, FiList, FiX, FiCheck, FiClock, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Cardapio.css';

export default function Cardapio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQuantidade, totalItems, total } = useCart();
  const [lojista, setLojista] = useState(null);
  const [cachedLogo, setCachedLogo] = useState(() => {
    try { return localStorage.getItem(`lanchonet_logo_${slug}`) || ''; } catch (e) { return ''; }
  });
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [catAtiva, setCatAtiva] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [produtoModal, setProdutoModal] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: loj } = await supabase.from('lojistas').select('*').eq('slug', slug).single();
      if (!loj) { toast.error('Restaurante não encontrado'); return; }
      setLojista(loj);
      if (loj?.logo_url) {
        localStorage.setItem(`lanchonet_logo_${slug}`, loj.logo_url);
        setCachedLogo(loj.logo_url);
      }
      
      // Atualiza o título da aba e o favicon
      if (loj.nome) document.title = loj.nome;
      if (loj.logo_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = loj.logo_url;
      }

      const { data: cats } = await supabase.from('categorias').select('*').eq('lojista_id', loj.id).order('ordem');
      setCategorias(cats || []);

      const { data: prods } = await supabase.from('produtos')
        .select('*, produto_adicionais(adicionais(*))')
        .eq('lojista_id', loj.id)
        .eq('disponivel', true)
        .order('nome');
      
      // Clean up the nested adicionais structure for easier use
      const prodsFormatted = (prods || []).map(p => ({
        ...p,
        adicionaisDisponiveis: (p.produto_adicionais || [])
          .map(pa => pa.adicionais)
          .filter(ad => ad && ad.ativo)
      }));

      setProdutos(prodsFormatted);
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!lojista?.id) return;

    console.log("Iniciando conexões Realtime para lojista:", lojista.id);

    // 1. Listen to lojistas table (open/closed state, style changes)
    const lojistaChannel = supabase
      .channel(`realtime-lojista-${lojista.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lojistas', filter: `id=eq.${lojista.id}` },
        (payload) => {
          console.log("Realtime: Lojista atualizado:", payload);
          setLojista(payload.new);
          if (payload.new?.nome) document.title = payload.new.nome;
        }
      )
      .subscribe((status) => {
        console.log("Realtime: Status lojista:", status);
      });

    // 2. Listen to categorias table
    const categoriesChannel = supabase
      .channel(`realtime-categorias-${lojista.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias', filter: `lojista_id=eq.${lojista.id}` },
        async (payload) => {
          console.log("Realtime: Categoria modificada:", payload);
          const { data: cats } = await supabase.from('categorias').select('*').eq('lojista_id', lojista.id).order('ordem');
          setCategorias(cats || []);
        }
      )
      .subscribe((status) => {
        console.log("Realtime: Status categorias:", status);
      });

    // 3. Listen to produtos table
    const productsChannel = supabase
      .channel(`realtime-produtos-${lojista.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos', filter: `lojista_id=eq.${lojista.id}` },
        async (payload) => {
          console.log("Realtime: Produto modificado:", payload);
          const { data: prods } = await supabase.from('produtos')
            .select('*, produto_adicionais(adicionais(*))')
            .eq('lojista_id', lojista.id)
            .eq('disponivel', true)
            .order('nome');
          
          const prodsFormatted = (prods || []).map(p => ({
            ...p,
            adicionaisDisponiveis: (p.produto_adicionais || [])
              .map(pa => pa.adicionais)
              .filter(ad => ad && ad.ativo)
          }));
          setProdutos(prodsFormatted);
        }
      )
      .subscribe((status) => {
        console.log("Realtime: Status produtos:", status);
      });

    return () => {
      console.log("Encerrando conexões Realtime.");
      supabase.removeChannel(lojistaChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [lojista?.id]);

  const produtosFiltrados = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(filtro.toLowerCase());
    const matchesCategory = !catAtiva || p.categoria_id === catAtiva;
    return matchesSearch && matchesCategory;
  });

  const selecionarCategoria = (id) => {
    setCatAtiva(id);
  };

  const abrirModalProduto = (produto) => {
    setProdutoModal(produto);
    setObservacao('');
    setAdicionaisSelecionados([]);
  };

  const toggleAdicional = (adicional) => {
    setAdicionaisSelecionados(prev => {
      if (prev.find(a => a.id === adicional.id)) {
        return prev.filter(a => a.id !== adicional.id);
      }
      return [...prev, adicional];
    });
  };

  const handleConfirmarItem = () => {
    if (!produtoModal) return;
    addItem(produtoModal, observacao, adicionaisSelecionados);
    toast.success('Adicionado ao carrinho!');
    setProdutoModal(null);
  };

  const precoModalCalculado = produtoModal 
    ? parseFloat(produtoModal.preco) + adicionaisSelecionados.reduce((s, ad) => s + parseFloat(ad.preco), 0)
    : 0;

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

  if (!lojista) {
    return <div className="cardapio-page"><div className="container"><h2>Restaurante não encontrado</h2></div></div>;
  }

  if (lojista.status_assinatura === 'atrasado') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24, textAlign: 'center' }}>
        {lojista.logo_url && (
          <img src={lojista.logo_url} alt={lojista.nome} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 20, opacity: 0.5 }} />
        )}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Sistema temporariamente indisponível</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 360 }}>
          O cardápio de <strong>{lojista.nome}</strong> está temporariamente fora do ar. Por favor, tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const isFechado = lojista.aberto === false;

  const whiteLabelStyles = lojista ? {
    '--bg-primary': lojista.cor_secundaria || '#f8fafc',
    '--bg-page': lojista.cor_secundaria || '#f8fafc',
    '--bg-card': lojista.cor_fundo_cards || '#ffffff',
    '--header-bg': lojista.cor_secundaria || '#111827',
    '--primary': lojista.cor_principal || '#f97316',
    '--accent': lojista.cor_principal || '#f97316',
    '--text-primary': lojista.cor_texto_normal || '#0f172a',
    '--text-secondary': lojista.cor_texto_secundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
  } : {};

  return (
    <div className="cardapio-page" style={whiteLabelStyles}>
      {/* Header */}
      <header className="cardapio-header-new" style={{ 
        backgroundImage: lojista.capa_url ? `url(${lojista.capa_url})` : 'none',
        backgroundColor: lojista.capa_url ? 'transparent' : 'var(--bg-secondary)'
      }}>
        <div className="container header-profile-container">
          {lojista.logo_url && (
            <img src={lojista.logo_url} alt="Logo" className="lojista-logo-new" />
          )}
          <div className="header-info-new">
            <div className="header-title-row">
              <h1 className="lojista-nome-new">{lojista.nome}</h1>
              <span className={`status-badge ${isFechado ? 'fechado' : 'aberto'}`}>
                {isFechado ? 'Fechado' : 'Aberto'}
              </span>
            </div>
            <p className="lojista-desc-new">{lojista.descricao || 'Peça pelo nosso cardápio digital!'}</p>
          </div>
        </div>
      </header>

      {isFechado && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: '#ef4444', 
          color: 'white', 
          textAlign: 'center', 
          padding: '12px 20px', 
          fontSize: '0.95rem',
          fontWeight: 'bold', 
          width: '100%', 
          margin: 0,
          borderRadius: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>Loja Fechada no momento. Os pedidos estão temporariamente pausados.</span>
        </div>
      )}

      {/* Sticky Nav Container for Search and Categories */}
      <div className="sticky-nav-container fade-in">
        <div className="container">
          {/* Search */}
          <div className="search-bar">
            <FiSearch size={18} />
            <input
              className="input"
              type="text"
              placeholder="Buscar no cardápio..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>

          {/* Categories */}
          {categorias.length > 0 && (
            <div className="categorias-scroll">
              <button className={`cat-chip ${!catAtiva ? 'active' : ''}`} onClick={() => selecionarCategoria(null)}>Todos</button>
              {categorias.map(c => (
                <button key={c.id} className={`cat-chip ${catAtiva === c.id ? 'active' : ''}`} onClick={() => selecionarCategoria(c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="container">
          <div className="categorias-grupos">
            {categorias.map(c => {
              const produtosDaCategoria = produtosFiltrados.filter(p => p.categoria_id === c.id);
              if (produtosDaCategoria.length === 0) return null;
              return (
                <div key={c.id} id={`cat-${c.id}`} className="categoria-secao fade-in">
                  <h2 className="categoria-titulo-grupo">{c.nome}</h2>
                  <div className="produtos-lista">
                    {produtosDaCategoria.map((p, idx) => (
                      <div 
                        key={p.id} 
                        className="produto-row" 
                        onClick={() => {
                          if (!isFechado) abrirModalProduto(p);
                        }}
                      >
                        <div className="produto-row-info">
                          <h3 className="produto-row-nome">{p.nome}</h3>
                          {p.descricao && <p className="produto-row-desc">{p.descricao}</p>}
                          <span className="produto-row-preco">R$ {p.preco.toFixed(2)}</span>
                        </div>
                        <div className="produto-row-right">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt={p.nome} className="produto-row-img" />
                          ) : (
                            <div className="produto-row-img-placeholder" />
                          )}
                          {!isFechado && <div className="btn-add-mini"><FiPlus /></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Outros (Sem categoria) */}
            {produtosFiltrados.filter(p => !categorias.some(c => c.id === p.categoria_id)).length > 0 && (
              <div id="cat-outros" className="categoria-secao fade-in">
                <h2 className="categoria-titulo-grupo">Outros</h2>
                <div className="produtos-lista">
                  {produtosFiltrados.filter(p => !categorias.some(c => c.id === p.categoria_id)).map((p, idx) => (
                    <div 
                      key={p.id} 
                      className="produto-row" 
                      onClick={() => {
                        if (!isFechado) abrirModalProduto(p);
                      }}
                    >
                      <div className="produto-row-info">
                        <h3 className="produto-row-nome">{p.nome}</h3>
                        {p.descricao && <p className="produto-row-desc">{p.descricao}</p>}
                        <span className="produto-row-preco">R$ {p.preco.toFixed(2)}</span>
                      </div>
                      <div className="produto-row-right">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.nome} className="produto-row-img" />
                        ) : (
                          <div className="produto-row-img-placeholder" />
                        )}
                        {!isFechado && <div className="btn-add-mini"><FiPlus /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        {produtosFiltrados.length === 0 && (
          <div className="empty-state">
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Modal Produto - Bottom Sheet Design */}
      {produtoModal && (
        <div className="produto-modal-overlay" onClick={() => setProdutoModal(null)}>
          <div className="produto-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setProdutoModal(null)}>
              <FiX size={20} />
            </button>
            
            {produtoModal.imagem_url && (
              <img src={produtoModal.imagem_url} alt={produtoModal.nome} className="modal-header-img" />
            )}
            
            <div className="modal-body">
              <h2 className="modal-produto-nome">{produtoModal.nome}</h2>
              {produtoModal.descricao && <p className="modal-produto-desc">{produtoModal.descricao}</p>}
              
              {produtoModal.adicionaisDisponiveis && produtoModal.adicionaisDisponiveis.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="modal-section-title">Adicionais</h3>
                  <div>
                    {produtoModal.adicionaisDisponiveis.map(ad => {
                      const isChecked = adicionaisSelecionados.some(a => a.id === ad.id);
                      return (
                        <div 
                          key={ad.id} 
                          className={`adicional-item ${isChecked ? 'selected' : ''}`}
                          onClick={() => toggleAdicional(ad)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="custom-checkbox">
                              {isChecked && <FiCheck size={14} />}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ad.nome}</span>
                          </div>
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                            {ad.preco > 0 ? `+ R$ ${parseFloat(ad.preco).toFixed(2)}` : 'Grátis'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="modal-section-title">Alguma observação?</h3>
                <textarea 
                  className="modal-textarea" 
                  placeholder="Ex: Tirar cebola, ponto da carne..."
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-add-modal" onClick={handleConfirmarItem}>
                <span>Adicionar ao pedido</span>
                <span>R$ {precoModalCalculado.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="bottom-nav">
        <button className="bottom-nav-item active" onClick={() => navigate(`/${slug}`)}>
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
        <button className="bottom-nav-item" onClick={() => navigate(`/${slug}/pedidos`)}>
          <FiClock size={20} />
          <span>Pedidos</span>
        </button>
      </div>
    </div>
  );
}
