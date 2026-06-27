import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Produtos.css';

export default function Produtos() {
  const { lojista } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [adicionaisGlobais, setAdicionaisGlobais] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', preco: '', categoria_id: '', descricao: '', disponivel: true, adicionais: [] });
  const [uploading, setUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  useEffect(() => {
    if (!lojista) return;
    loadData();
  }, [lojista]);

  async function loadData() {
    const [{ data: prods }, { data: cats }, { data: adds }] = await Promise.all([
      supabase.from('produtos').select('*, categorias(nome), produto_adicionais(adicional_id)').eq('lojista_id', lojista.id).order('nome'),
      supabase.from('categorias').select('*').eq('lojista_id', lojista.id).order('ordem'),
      supabase.from('adicionais').select('*').eq('lojista_id', lojista.id).order('nome')
    ]);
    setProdutos(prods || []);
    setCategorias(cats || []);
    setAdicionaisGlobais(adds || []);
  }

  function abrirModal(produto = null) {
    if (produto) {
      setEditando(produto);
      setForm({ 
        nome: produto.nome, 
        preco: produto.preco, 
        categoria_id: produto.categoria_id || '', 
        descricao: produto.descricao || '', 
        disponivel: produto.disponivel,
        adicionais: produto.produto_adicionais?.map(pa => pa.adicional_id) || []
      });
    } else {
      setEditando(null);
      setForm({ nome: '', preco: '', categoria_id: '', descricao: '', disponivel: true, adicionais: [] });
    }
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = { 
      nome: form.nome, 
      preco: parseFloat(form.preco), 
      categoria_id: form.categoria_id || null, 
      descricao: form.descricao, 
      disponivel: form.disponivel, 
      lojista_id: lojista.id 
    };

    let produtoId = null;

    if (editando) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', editando.id);
      if (error) { toast.error('Erro ao salvar'); return; }
      produtoId = editando.id;
      toast.success('Produto atualizado!');
    } else {
      const { data, error } = await supabase.from('produtos').insert(payload).select('id').single();
      if (error) { toast.error('Erro ao criar'); return; }
      produtoId = data.id;
      toast.success('Produto criado!');
    }

    // Salvar adicionais vinculados
    if (produtoId) {
      await supabase.from('produto_adicionais').delete().eq('produto_id', produtoId);
      if (form.adicionais.length > 0) {
        const adicPayload = form.adicionais.map(adId => ({ produto_id: produtoId, adicional_id: adId }));
        await supabase.from('produto_adicionais').insert(adicPayload);
      }
    }

    setShowModal(false);
    loadData();
  }

  function toggleAdicionalForm(adicionalId) {
    setForm(prev => {
      if (prev.adicionais.includes(adicionalId)) {
        return { ...prev, adicionais: prev.adicionais.filter(id => id !== adicionalId) };
      } else {
        return { ...prev, adicionais: [...prev.adicionais, adicionalId] };
      }
    });
  }

  async function handleUpload(produtoId, file) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `produtos/${lojista.id}/${produtoId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('imagens').upload(path, file, { upsert: true });
    if (upErr) { toast.error('Erro no upload'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(path);
    await supabase.from('produtos').update({ imagem_url: urlData.publicUrl }).eq('id', produtoId);
    toast.success('Imagem atualizada!');
    setUploading(false);
    loadData();
  }

  function triggerDelete(id) {
    setIdToDelete(id);
    setShowConfirmModal(true);
  }

  async function handleDeleteConfirmado() {
    setShowConfirmModal(false);
    if (!idToDelete) return;
    await supabase.from('produtos').delete().eq('id', idToDelete);
    toast.success('Produto removido com sucesso!');
    setIdToDelete(null);
    loadData();
  }

  async function toggleDisponivel(produto) {
    await supabase.from('produtos').update({ disponivel: !produto.disponivel }).eq('id', produto.id);
    loadData();
  }

  return (
    <div className="produtos-page">
      <div className="page-header">
        <h1 className="page-title">Produtos</h1>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          <FiPlus /> Novo Produto
        </button>
      </div>

      <div className="produtos-table-wrap">
        <table className="produtos-table">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(p => (
              <tr key={p.id} className="fade-in">
                <td>
                  <label className="img-upload">
                    {p.imagem_url ? <img src={p.imagem_url} alt="" className="prod-thumb" /> : <FiImage size={24} />}
                    <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && handleUpload(p.id, e.target.files[0])} />
                  </label>
                </td>
                <td className="prod-name">{p.nome}</td>
                <td>{p.categorias?.nome || '-'}</td>
                <td className="prod-price">R$ {parseFloat(p.preco).toFixed(2)}</td>
                <td>
                  <button className={`toggle ${p.disponivel ? 'on' : 'off'}`} onClick={() => toggleDisponivel(p)}>
                    {p.disponivel ? 'Ativo' : 'Pausa'}
                  </button>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(p)}><FiEdit2 /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => triggerDelete(p.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {produtos.length === 0 && <p className="empty-msg">Nenhum produto cadastrado ainda.</p>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSave} className="modal-form">
              <div className="input-group">
                <label>Nome</label>
                <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Preço</label>
                <input className="input" type="number" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Categoria</label>
                <select className="input" value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                  <option value="">Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea className="input" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
              
              {adicionaisGlobais.length > 0 && (
                <div className="input-group">
                  <label>Adicionais Permitidos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', padding: '10px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {adicionaisGlobais.map(ad => (
                      <label key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={form.adicionais.includes(ad.id)}
                          onChange={() => toggleAdicionalForm(ad.id)}
                        />
                        {ad.nome} <span style={{ color: 'var(--text-muted)' }}>({ad.preco > 0 ? `+ R$ ${ad.preco}` : 'Grátis'})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-card slide-up">
            <div className="confirm-modal-icon danger">
              <FiTrash2 />
            </div>
            <h3 className="confirm-modal-title">Excluir Produto</h3>
            <p className="confirm-modal-message">
              Tem certeza que deseja remover este produto do seu cardápio? Esta ação não pode ser desfeita.
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirmado}>Excluir Produto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
