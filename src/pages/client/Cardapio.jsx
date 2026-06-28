import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { FiShoppingCart, FiPlus, FiMinus, FiSearch, FiList, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Cardapio.css';

export default function Cardapio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQuantidade, totalItems, total } = useCart();
  const [lojista, setLojista] = useState(null);
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

  const produtosFiltrados = produtos.filter(p => {
    const matchFiltro = p.nome.toLowerCase().includes(filtro.toLowerCase());
    const matchCat = !catAtiva || p.categoria_id === catAtiva;
    return matchFiltro && matchCat;
  });

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
      <div className="cardapio-page">
        <div className="container">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (!lojista) {
    return <div className="cardapio-page"><div className="container"><h2>Restaurante não encontrado</h2></div></div>;
  }

  const isFechado = lojista.aberto === false;

  const whiteLabelStyles = lojista ? {
    '--bg-primary': lojista.cor_secundaria || '#111827',
    '--bg-card': lojista.cor_fundo_cards || 'rgba(128, 128, 128, 0.15)',
    '--bg-secondary': lojista.cor_fundo_cards || 'rgba(128, 128, 128, 0.08)',
    '--bg-glass': lojista.cor_fundo_cards || 'rgba(128, 128, 128, 0.2)',
    '--primary': lojista.cor_principal || '#f97316',
    '--accent': lojista.cor_principal || '#f97316',
    '--accent-light': lojista.cor_principal || '#fb923c',
    '--accent-dark': lojista.cor_principal || '#ea580c',
    '--text-primary': lojista.cor_texto_normal || '#ffffff',
    '--text-secondary': lojista.cor_texto_secundaria || '#9ca3af',
    '--text-muted': lojista.cor_texto_secundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
    '--border-hover': 'rgba(128, 128, 128, 0.35)',
  } : {};

  return (
    <div className="cardapio-page" style={whiteLabelStyles}>
      {/* Header */}
      <header className="cardapio-header-new" style={{ 
        backgroundImage: lojista.capa_url ? `url(${lojista.capa_url})` : 'none',
        backgroundColor: lojista.capa_url ? 'transparent' : 'var(--bg-secondary)'
      }}>
        <div className="header-top-actions">
          <button className="btn-meus-pedidos" onClick={() => navigate(`/${slug}/pedidos`)}>
            <FiList /> Meus Pedidos
          </button>
        </div>
        
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
        <div style={{ background: '#ef4444', color: 'white', textAlign: 'center', padding: '12px', fontWeight: 'bold', margin: '0 auto 20px auto', maxWidth: '1200px', width: 'calc(100% - 40px)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
          Loja Fechada no momento. Os pedidos estão temporariamente pausados.
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
              <button className={`cat-chip ${!catAtiva ? 'active' : ''}`} onClick={() => setCatAtiva(null)}>Todos</button>
              {categorias.map(c => (
                <button key={c.id} className={`cat-chip ${catAtiva === c.id ? 'active' : ''}`} onClick={() => setCatAtiva(c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container">

        {/* Products Grid */}
        <div className="produtos-grid">
          {produtosFiltrados.map((p, idx) => (
            <div 
              key={p.id} 
              className="produto-card fade-in" 
              style={{ animationDelay: `${idx * 0.03}s` }}
              onClick={() => {
                if (!isFechado) abrirModalProduto(p);
              }}
            >
              {p.imagem_url ? (
                <img src={p.imagem_url} alt={p.nome} className="produto-img" />
              ) : (
                <div className="produto-img-placeholder" />
              )}
              <div className="produto-info">
                <h3 className="produto-nome">{p.nome}</h3>
                {p.descricao && <p className="produto-desc">{p.descricao}</p>}
                <div className="produto-footer">
                  <span className="produto-preco">R$ {p.preco.toFixed(2)}</span>
                  <div className={`btn-add-pill ${isFechado ? 'disabled' : ''}`}>
                    <FiPlus /> Adicionar
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="empty-state">
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Floating Cart */}
      {totalItems > 0 && (
        <div className="cart-float" onClick={() => navigate(`/${slug}/checkout`)}>
          <div className="cart-float-left">
            <div className="cart-icon-wrapper">
              <FiShoppingCart size={18} />
              <span className="cart-badge">{totalItems}</span>
            </div>
            <span className="cart-text">Ver carrinho</span>
          </div>
          <span className="cart-total">R$ {total.toFixed(2)}</span>
        </div>
      )}

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
    </div>
  );
}
