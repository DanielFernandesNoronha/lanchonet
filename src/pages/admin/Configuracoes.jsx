import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Configuracoes.css';

export default function Configuracoes() {
  const { lojista, fetchLojista, user } = useAuth();
  const [form, setForm] = useState({ 
    nome: '', descricao: '', slug: '', 
    cor_principal: '#f97316', cor_secundaria: '#111827', cor_fundo_cards: '#1a1a2e',
    cor_texto_normal: '#ffffff', cor_texto_secundaria: '#9ca3af', logo_url: '', capa_url: '',
    tempo_novo: 5, tempo_preparando: 30, tempo_entrega: 40, tempo_concluido: 10
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [taxas, setTaxas] = useState([]);
  const [novaTaxa, setNovaTaxa] = useState({ bairro: '', valor: '' });
  const [categorias, setCategorias] = useState([]);
  const [novaCat, setNovaCat] = useState('');
  const [adicionais, setAdicionais] = useState([]);
  const [novoAdicional, setNovoAdicional] = useState({ nome: '', preco: '' });

  useEffect(() => {
    if (!lojista) return;
    setForm({ 
      nome: lojista.nome, 
      descricao: lojista.descricao || '', 
      slug: lojista.slug || '',
      cor_principal: lojista.cor_principal || '#f97316',
      cor_secundaria: lojista.cor_secundaria || '#111827',
      cor_fundo_cards: lojista.cor_fundo_cards || '#1a1a2e',
      cor_texto_normal: lojista.cor_texto_normal || '#ffffff',
      cor_texto_secundaria: lojista.cor_texto_secundaria || '#9ca3af',
      logo_url: lojista.logo_url || '',
      capa_url: lojista.capa_url || '',
      tempo_novo: lojista.tempo_novo ?? 5,
      tempo_preparando: lojista.tempo_preparando ?? 30,
      tempo_entrega: lojista.tempo_entrega ?? 40,
      tempo_concluido: lojista.tempo_concluido ?? 10
    });
    loadTaxas();
    loadCategorias();
    loadAdicionais();
  }, [lojista]);

  async function loadTaxas() {
    const { data } = await supabase.from('taxas_entrega').select('*').eq('lojista_id', lojista.id);
    setTaxas(data || []);
  }

  async function loadCategorias() {
    const { data } = await supabase.from('categorias').select('*').eq('lojista_id', lojista.id).order('ordem');
    setCategorias(data || []);
  }

  async function loadAdicionais() {
    const { data } = await supabase.from('adicionais').select('*').eq('lojista_id', lojista.id).order('nome');
    setAdicionais(data || []);
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    if (!lojista) return;

    // Apenas os campos permitidos para o lojista alterar (Fix de Segurança)
    const camposPermitidos = {
      nome: form.nome,
      descricao: form.descricao,
      slug: form.slug,
      cor_principal: form.cor_principal,
      cor_secundaria: form.cor_secundaria,
      cor_fundo_cards: form.cor_fundo_cards,
      cor_texto_normal: form.cor_texto_normal,
      cor_texto_secundaria: form.cor_texto_secundaria,
      logo_url: form.logo_url,
      capa_url: form.capa_url,
      tempo_novo: form.tempo_novo,
      tempo_preparando: form.tempo_preparando,
      tempo_entrega: form.tempo_entrega,
      tempo_concluido: form.tempo_concluido,
    };

    const { error } = await supabase.from('lojistas').update(camposPermitidos).eq('id', lojista.id);
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Perfil atualizado!'); fetchLojista(user.id); }
  }

  async function handleUploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `logos/${lojista.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('imagens').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro no upload'); setUploadingLogo(false); return; }
    const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(path);
    setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploadingLogo(false);
    toast.success('Logo enviada, não esqueça de Salvar!');
  }

  async function handleUploadCapa(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCapa(true);
    const ext = file.name.split('.').pop();
    const path = `capas/${lojista.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('imagens').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro no upload'); setUploadingCapa(false); return; }
    const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(path);
    setForm(prev => ({ ...prev, capa_url: urlData.publicUrl }));
    setUploadingCapa(false);
    toast.success('Capa enviada, não esqueça de Salvar!');
  }

  async function addTaxa() {
    if (!novaTaxa.bairro || !novaTaxa.valor) return toast.error('Preencha bairro e valor');
    const { error } = await supabase.from('taxas_entrega').insert({ ...novaTaxa, valor: parseFloat(novaTaxa.valor), lojista_id: lojista.id });
    if (error) toast.error('Erro');
    else { toast.success('Taxa adicionada!'); setNovaTaxa({ bairro: '', valor: '' }); loadTaxas(); }
  }

  async function removeTaxa(id) {
    await supabase.from('taxas_entrega').delete().eq('id', id);
    toast.success('Removida');
    loadTaxas();
  }

  async function addCategoria() {
    if (!novaCat) return;
    const ordem = categorias.length + 1;
    const { error } = await supabase.from('categorias').insert({ nome: novaCat, ordem, lojista_id: lojista.id });
    if (error) toast.error('Erro');
    else { toast.success('Categoria criada!'); setNovaCat(''); loadCategorias(); }
  }

  async function removeCategoria(id) {
    await supabase.from('categorias').delete().eq('id', id);
    toast.success('Removida');
    loadCategorias();
  }

  async function addAdicional() {
    if (!novoAdicional.nome) return toast.error('Preencha o nome do adicional');
    const { error } = await supabase.from('adicionais').insert({
      nome: novoAdicional.nome,
      preco: parseFloat(novoAdicional.preco) || 0,
      lojista_id: lojista.id
    });
    if (error) toast.error('Erro ao salvar adicional');
    else {
      toast.success('Adicional criado!');
      setNovoAdicional({ nome: '', preco: '' });
      loadAdicionais();
    }
  }

  async function removeAdicional(id) {
    await supabase.from('adicionais').delete().eq('id', id);
    toast.success('Removido');
    loadAdicionais();
  }

  if (!lojista) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Carregando ou sem loja cadastrada.</h2>
        <p>Se você for o administrador master, utilize o painel em /master.</p>
      </div>
    );
  }

  return (
    <div className="config-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="page-title">Configurações</h1>
 
      <form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Perfil */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="config-section-title">Perfil do Restaurante</h3>
          <div className="input-group">
            <label>Nome do restaurante</label>
            <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="input-group">
            <label>Slug (URL do cardápio)</label>
            <input className="input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '') })} placeholder="meu-restaurante" />
            {form.slug && <small style={{ color: 'var(--text-muted)' }}>URL: lanchonet.shop/{form.slug}</small>}
          </div>
          <div className="input-group">
            <label>Descrição</label>
            <textarea className="input" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
          </div>
        </section>
 
        {/* Temporizadores */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="config-section-title">Temporizadores Automáticos (Minutos)</h3>
          <div className="form-grid">
            <div className="input-group">
              <label>Tempo em "Novo"</label>
              <input type="number" className="input" value={form.tempo_novo} onChange={e => setForm({ ...form, tempo_novo: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Tempo em "Preparando"</label>
              <input type="number" className="input" value={form.tempo_preparando} onChange={e => setForm({ ...form, tempo_preparando: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Tempo em "Entrega"</label>
              <input type="number" className="input" value={form.tempo_entrega} onChange={e => setForm({ ...form, tempo_entrega: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Tempo em "Concluído" (Exclusão Auto)</label>
              <input type="number" className="input" value={form.tempo_concluido} onChange={e => setForm({ ...form, tempo_concluido: e.target.value })} />
            </div>
          </div>
        </section>
 
        {/* Aparência */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="config-section-title">Aparência (White Label)</h3>
          <div className="form-grid">
            <div className="input-group">
              <label>Cor Principal (Destaques)</label>
              <div className="config-color-row">
                <input type="color" className="config-color-input" value={form.cor_principal} onChange={e => setForm({ ...form, cor_principal: e.target.value })} />
                <input className="input" value={form.cor_principal} onChange={e => setForm({ ...form, cor_principal: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="input-group">
              <label>Cor Secundária (Fundo da Página)</label>
              <div className="config-color-row">
                <input type="color" className="config-color-input" value={form.cor_secundaria} onChange={e => setForm({ ...form, cor_secundaria: e.target.value })} />
                <input className="input" value={form.cor_secundaria} onChange={e => setForm({ ...form, cor_secundaria: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="input-group">
              <label>Cor Terciária (Fundo dos Cards)</label>
              <div className="config-color-row">
                <input type="color" className="config-color-input" value={form.cor_fundo_cards} onChange={e => setForm({ ...form, cor_fundo_cards: e.target.value })} />
                <input className="input" value={form.cor_fundo_cards} onChange={e => setForm({ ...form, cor_fundo_cards: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="input-group">
              <label>Cor do Texto Normal</label>
              <div className="config-color-row">
                <input type="color" className="config-color-input" value={form.cor_texto_normal} onChange={e => setForm({ ...form, cor_texto_normal: e.target.value })} />
                <input className="input" value={form.cor_texto_normal} onChange={e => setForm({ ...form, cor_texto_normal: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="input-group">
              <label>Cor do Texto Secundário</label>
              <div className="config-color-row">
                <input type="color" className="config-color-input" value={form.cor_texto_secundaria} onChange={e => setForm({ ...form, cor_texto_secundaria: e.target.value })} />
                <input className="input" value={form.cor_texto_secundaria} onChange={e => setForm({ ...form, cor_texto_secundaria: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
 
          <div className="form-grid">
            <div className="input-group">
              <label>Logo do Restaurante</label>
              <div className="config-upload-box">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="config-img-preview" />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sem logo</div>
                )}
                <div className="config-upload-actions">
                  <input type="file" accept="image/*" onChange={handleUploadLogo} id="logo-upload" style={{ display: 'none' }} />
                  <label htmlFor="logo-upload" className="btn btn-secondary" style={{ display: 'inline-flex', padding: '8px 16px', cursor: 'pointer' }}>
                    {uploadingLogo ? 'Enviando...' : 'Fazer Upload'}
                  </label>
                  {form.logo_url && (
                    <button type="button" className="btn btn-ghost" style={{ color: 'var(--red)', padding: '8px 12px' }} onClick={() => setForm({ ...form, logo_url: '' })}>Remover</button>
                  )}
                </div>
              </div>
            </div>
 
            <div className="input-group">
              <label>Imagem de Capa (Fundo do Cabeçalho)</label>
              <div className="config-upload-box">
                {form.capa_url ? (
                  <img src={form.capa_url} alt="Capa" className="config-img-preview" style={{ width: 90 }} />
                ) : (
                  <div style={{ width: 90, height: 60, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sem capa</div>
                )}
                <div className="config-upload-actions">
                  <input type="file" accept="image/*" onChange={handleUploadCapa} id="capa-upload" style={{ display: 'none' }} />
                  <label htmlFor="capa-upload" className="btn btn-secondary" style={{ display: 'inline-flex', padding: '8px 16px', cursor: 'pointer' }}>
                    {uploadingCapa ? 'Enviando...' : 'Fazer Upload'}
                  </label>
                  {form.capa_url && (
                    <button type="button" className="btn btn-ghost" style={{ color: 'var(--red)', padding: '8px 12px' }} onClick={() => setForm({ ...form, capa_url: '' })}>Remover</button>
                  )}
                </div>
              </div>
            </div>
          </div>
 
          <button className="btn btn-primary" type="submit" style={{ marginTop: 10, width: 'fit-content', padding: '12px 28px', fontSize: '0.95rem' }}><FiSave /> Salvar Configurações</button>
        </section>
      </form>
 
      {/* Categorias */}
      <section className="card">
        <h3 className="config-section-title">Categorias</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input className="input" placeholder="Nome da categoria" value={novaCat} onChange={e => setNovaCat(e.target.value)} />
          <button className="btn btn-primary" onClick={addCategoria} style={{ padding: '0 16px' }}><FiPlus /></button>
        </div>
        <div className="config-list">
          {categorias.map(c => (
            <div key={c.id} className="config-list-item">
              <span className="config-item-name">{c.nome}</span>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => removeCategoria(c.id)}><FiTrash2 size={16} /></button>
            </div>
          ))}
          {categorias.length === 0 && <p className="config-section-desc" style={{ margin: '8px 0 0 0' }}>Nenhuma categoria criada.</p>}
        </div>
      </section>
 
      {/* Adicionais Globais */}
      <section className="card">
        <h3 className="config-section-title">Adicionais Disponíveis</h3>
        <p className="config-section-desc">Cadastre os adicionais aqui. Depois, vá na tela de Produtos para vinculá-los a cada item.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input className="input" placeholder="Ex: Bacon, Cheddar" value={novoAdicional.nome} onChange={e => setNovoAdicional({ ...novoAdicional, nome: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Valor (R$)" value={novoAdicional.preco} onChange={e => setNovoAdicional({ ...novoAdicional, preco: e.target.value })} style={{ maxWidth: 120 }} />
          <button className="btn btn-primary" onClick={addAdicional} style={{ padding: '0 16px' }}><FiPlus /></button>
        </div>
        <div className="config-list">
          {adicionais.map(a => (
            <div key={a.id} className="config-list-item">
              <span className="config-item-name">{a.nome}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="config-item-val">{a.preco > 0 ? `R$ ${parseFloat(a.preco).toFixed(2)}` : 'Grátis'}</span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => removeAdicional(a.id)}><FiTrash2 size={16} /></button>
              </div>
            </div>
          ))}
          {adicionais.length === 0 && <p className="config-section-desc" style={{ margin: '8px 0 0 0' }}>Nenhum adicional cadastrado.</p>}
        </div>
      </section>
 
      {/* Taxas de Entrega */}
      <section className="card">
        <h3 className="config-section-title">Taxas de Entrega</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input className="input" placeholder="Bairro" value={novaTaxa.bairro} onChange={e => setNovaTaxa({ ...novaTaxa, bairro: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Valor (R$)" value={novaTaxa.valor} onChange={e => setNovaTaxa({ ...novaTaxa, valor: e.target.value })} style={{ maxWidth: 120 }} />
          <button className="btn btn-primary" onClick={addTaxa} style={{ padding: '0 16px' }}><FiPlus /></button>
        </div>
        <div className="config-list">
          {taxas.map(t => (
            <div key={t.id} className="config-list-item">
              <span className="config-item-name">{t.bairro}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="config-item-val">R$ {parseFloat(t.valor).toFixed(2)}</span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => removeTaxa(t.id)}><FiTrash2 size={16} /></button>
              </div>
            </div>
          ))}
          {taxas.length === 0 && <p className="config-section-desc" style={{ margin: '8px 0 0 0' }}>Nenhuma taxa cadastrada.</p>}
        </div>
      </section>
    </div>
  );
}
