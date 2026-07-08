import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { useCart } from '../../contexts/CartContext';
import { FiShoppingCart, FiPlus, FiMinus, FiSearch, FiList, FiX, FiCheck, FiClock, FiAlertTriangle, FiLock } from 'react-icons/fi';
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

  const loadData = async () => {
    try {
      const safeSlug = slug ? slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '') : '';
      const data = await api.get(`/cardapio/${safeSlug}`);
      
      if (!data || !data.id) { 
        if(loading) toast.error('Restaurante não encontrado'); 
        setLoading(false);
        return; 
      }
      
      setLojista(data);
      
      if (data.logoUrl) {
        try { localStorage.setItem(`lanchonet_logo_${slug}`, data.logoUrl); } catch(e) {}
        setCachedLogo(data.logoUrl);
      }
      
      if (data.nome) document.title = data.nome;
      if (data.logoUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.logoUrl;
      }

      setCategorias(data.categorias || []);
      
      // Flatten products from categories
      const prodsList = [];
      (data.categorias || []).forEach(cat => {
        (cat.produtos || []).forEach(p => {
          // Flatten adicionais for easy usage
          const prodsFormatted = {
            ...p,
            categoria_id: cat.id,
            // Assuming the backend nested include returns:
            // produto_adicionais: [{ adicional: { id, nome, preco, ativo } }]
            // Or maybe it's not nested this way? Wait, we need to adapt to Prisma structure.
            // In Prisma, we might just have `adicionais` directly if many-to-many, 
            // but the backend only returns Lojista -> Categorias -> Produtos. 
            // Wait, we need to fetch all active adicionais for the lojista.
            adicionaisDisponiveis: (data.adicionais || []).filter(a => a.ativo)
          };
          prodsList.push(prodsFormatted);
        });
      });
      
      setProdutos(prodsList);
    } catch (err) {
      console.error("Erro no load cardápio", err);
      if(loading) toast.error("Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Fallback Polling since SSE for clients is not implemented yet
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [slug]);

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

  const isBloqueado = lojista?.statusAssinatura === 'atrasado' || 
    lojista?.statusAssinatura === 'pendente' ||
    (lojista?.statusAssinatura === 'trial' && new Date() > new Date(lojista?.trialExpiraEm));

  if (!lojista) {
    return <div className="cardapio-page"><div className="container"><h2>Restaurante não encontrado</h2></div></div>;
  }

  if (isBloqueado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24, textAlign: 'center' }}>
        {lojista.logoUrl && (
          <img src={lojista.logoUrl} alt={lojista.nome} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 20, opacity: 0.5 }} />
        )}
        <div style={{ 
          width: 80, height: 80, 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(239, 68, 68, 0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ea580c',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(249, 115, 22, 0.15)',
          border: '1px solid rgba(249, 115, 22, 0.2)'
        }}>
          <FiLock size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Sistema temporariamente indisponível</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 360 }}>
          O cardápio de <strong>{lojista.nome}</strong> está temporariamente fora do ar. Por favor, tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const isFechado = lojista.aberto === false;

  const whiteLabelStyles = lojista ? {
    '--bg-primary': lojista.corSecundaria || '#f8fafc',
    '--bg-page': lojista.corSecundaria || '#f8fafc',
    '--bg-card': lojista.corFundoCards || '#ffffff',
    '--header-bg': lojista.corSecundaria || '#111827',
    '--primary': lojista.corPrincipal || '#f97316',
    '--accent': lojista.corPrincipal || '#f97316',
    '--text-primary': lojista.corTextoNormal || '#0f172a',
    '--text-secondary': lojista.corTextoSecundaria || '#64748b',
    '--border': 'rgba(128, 128, 128, 0.2)',
  } : {};

  return (
    <div className="cardapio-page" style={whiteLabelStyles}>
      <header className="cardapio-header-new" style={{ 
        backgroundImage: lojista.capaUrl ? `url(${lojista.capaUrl})` : 'none',
        backgroundColor: lojista.capaUrl ? 'transparent' : 'var(--bg-secondary)'
      }}>
        <div className="container header-profile-container">
          {lojista.logoUrl && (
            <img src={lojista.logoUrl} alt="Logo" className="lojista-logo-new" />
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

      <div className="sticky-nav-container fade-in">
        <div className="container">
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
                          <span className="produto-row-preco">R$ {parseFloat(p.preco).toFixed(2)}</span>
                        </div>
                        <div className="produto-row-right">
                          {p.imagemUrl ? (
                            <img src={p.imagemUrl} alt={p.nome} className="produto-row-img" />
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
          </div>

        {produtosFiltrados.length === 0 && (
          <div className="empty-state">
            <p>Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {produtoModal && (
        <div className="produto-modal-overlay" onClick={() => setProdutoModal(null)}>
          <div className="produto-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setProdutoModal(null)}>
              <FiX size={20} />
            </button>
            
            {produtoModal.imagemUrl && (
              <img src={produtoModal.imagemUrl} alt={produtoModal.nome} className="modal-header-img" />
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
                            {parseFloat(ad.preco) > 0 ? `+ R$ ${parseFloat(ad.preco).toFixed(2)}` : 'Grátis'}
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
