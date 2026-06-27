import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { FiShoppingCart, FiPlus, FiMinus, FiSearch } from 'react-icons/fi';
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
      <header className="cardapio-header-new">
        <div className="header-banner" style={{ 
          backgroundImage: lojista.capa_url ? `url(${lojista.capa_url})` : 'none',
          backgroundColor: lojista.capa_url ? 'transparent' : 'var(--bg-secondary)'
        }} />
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

      <div className="container">
        {/* Search */}
        <div className="search-bar fade-in">
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
          <div className="categorias-scroll fade-in">
            <button className={`cat-chip ${!catAtiva ? 'active' : ''}`} onClick={() => setCatAtiva(null)}>Todos</button>
            {categorias.map(c => (
              <button key={c.id} className={`cat-chip ${catAtiva === c.id ? 'active' : ''}`} onClick={() => setCatAtiva(c.id)}>
                {c.nome}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {catAtiva ? (
          <div className="produtos-grid">
            {produtosFiltrados.map((p, idx) => (
              <div key={p.id} className="produto-card fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="produto-img" />}
                <div className="produto-info">
                  <h3 className="produto-nome">{p.nome}</h3>
                  {p.descricao && <p className="produto-desc">{p.descricao}</p>}
                  <div className="produto-footer">
                    <span className="produto-preco">R$ {p.preco.toFixed(2)}</span>
                    <div className="quantidade-control">
                      <button className="btn btn-primary btn-sm" onClick={() => abrirModalProduto(p)} disabled={isFechado}>
                        <FiPlus /> {isFechado ? 'Fechado' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="categorias-grupos">
            {categorias.map(c => {
              const produtosDaCategoria = produtosFiltrados.filter(p => p.categoria_id === c.id);
              if (produtosDaCategoria.length === 0) return null;
              return (
                <div key={c.id} className="categoria-secao fade-in">
                  <h2 className="categoria-titulo-grupo">{c.nome}</h2>
                  <div className="produtos-grid">
                    {produtosDaCategoria.map((p, idx) => (
                      <div key={p.id} className="produto-card" style={{ animationDelay: `${idx * 0.03}s` }}>
                        {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="produto-img" />}
                        <div className="produto-info">
                          <h3 className="produto-nome">{p.nome}</h3>
                          {p.descricao && <p className="produto-desc">{p.descricao}</p>}
                          <div className="produto-footer">
                            <span className="produto-preco">R$ {p.preco.toFixed(2)}</span>
                            <div className="quantidade-control">
                              <button className="btn btn-primary btn-sm" onClick={() => abrirModalProduto(p)} disabled={isFechado}>
                                <FiPlus /> {isFechado ? 'Fechado' : 'Adicionar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Products without category */}
            {produtosFiltrados.filter(p => !categorias.some(c => c.id === p.categoria_id)).length > 0 && (
              <div className="categoria-secao fade-in">
                <h2 className="categoria-titulo-grupo">Outros</h2>
                <div className="produtos-grid">
                  {produtosFiltrados.filter(p => !categorias.some(c => c.id === p.categoria_id)).map((p, idx) => (
                    <div key={p.id} className="produto-card">
                      {p.imagem_url && <img src={p.imagem_url} alt={p.nome} className="produto-img" />}
                      <div className="produto-info">
                        <h3 className="produto-nome">{p.nome}</h3>
                        {p.descricao && <p className="produto-desc">{p.descricao}</p>}
                        <div className="produto-footer">
                          <span className="produto-preco">R$ {p.preco.toFixed(2)}</span>
                          <div className="quantidade-control">
                            <button className="btn btn-primary btn-sm" onClick={() => abrirModalProduto(p)} disabled={isFechado}>
                              <FiPlus /> {isFechado ? 'Fechado' : 'Adicionar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            <FiShoppingCart size={20} />
            <span className="cart-badge">{totalItems}</span>
          </div>
          <span className="cart-text">Ver carrinho</span>
          <span className="cart-total">R$ {total.toFixed(2)}</span>
        </div>
      )}

      {/* Modal Produto */}
      {produtoModal && (
        <div className="modal-overlay" onClick={() => setProdutoModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal card" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, padding: 0, overflow: 'hidden' }}>
            {produtoModal.imagem_url && (
              <img src={produtoModal.imagem_url} alt={produtoModal.nome} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 20 }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>{produtoModal.nome}</h2>
              {produtoModal.descricao && <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{produtoModal.descricao}</p>}
              
              {produtoModal.adicionaisDisponiveis && produtoModal.adicionaisDisponiveis.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Adicionais</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {produtoModal.adicionaisDisponiveis.map(ad => {
                      const isChecked = adicionaisSelecionados.some(a => a.id === ad.id);
                      return (
                        <label key={ad.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 12px', background: 'var(--bg-card)', border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleAdicional(ad)}
                              style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontWeight: 500 }}>{ad.nome}</span>
                          </div>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {ad.preco > 0 ? `+ R$ ${parseFloat(ad.preco).toFixed(2)}` : 'Grátis'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Alguma observação?</h3>
                <textarea 
                  className="input" 
                  placeholder="Ex: Tirar cebola, ponto da carne..."
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  style={{ minHeight: 80, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }} onClick={handleConfirmarItem}>
                  <span style={{ fontWeight: 600 }}>Adicionar</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>R$ {precoModalCalculado.toFixed(2)}</span>
                </button>
                <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={() => setProdutoModal(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
