import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { FiSave, FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import toast from 'react-hot-toast';
import './Configuracoes.css';

const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

function ColorPickerField({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const popover = useRef();

  const close = useCallback(() => setIsOpen(false), []);
  useClickOutside(popover, close);

  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="config-color-row" style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
        <div 
          onClick={() => setIsOpen(true)}
          style={{ width: 36, height: 36, borderRadius: 8, background: value, border: '1px solid var(--border)', flexShrink: 0, cursor: 'pointer' }} 
        />
        <input className="input" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }} />
        
        {isOpen && (
          <div className="popover" ref={popover} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, marginTop: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: 8 }}>
            <HexColorPicker color={value} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}

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

  const [bancoForm, setBancoForm] = useState({ tipoChave: 'cpf', chavePix: '', nomeTitular: '' });
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  useEffect(() => {
    if (!lojista) return;
    setForm({ 
      nome: lojista.nome, 
      descricao: lojista.descricao || '', 
      slug: lojista.slug || '',
      cor_principal: lojista.corPrincipal || '#f97316',
      cor_secundaria: lojista.corSecundaria || '#111827',
      cor_fundo_cards: lojista.corFundoCards || '#1a1a2e',
      cor_texto_normal: lojista.corTextoNormal || '#ffffff',
      cor_texto_secundaria: lojista.corTextoSecundaria || '#9ca3af',
      logo_url: lojista.logoUrl || '',
      capa_url: lojista.capaUrl || '',
      tempo_novo: lojista.tempoNovo ?? 5,
      tempo_preparando: lojista.tempoPreparando ?? 30,
      tempo_entrega: lojista.tempoEntrega ?? 40,
      tempo_concluido: lojista.tempoConcluido ?? 10
    });
    loadTaxas();
    loadCategorias();
    loadAdicionais();
    loadFinanceiro();
  }, [lojista]);

  async function loadFinanceiro() {
    try {
      const data = await api.get('/lojistas/financeiro');
      if (data && data.dadosBancarios) {
        setBancoForm({
          tipoChave: data.dadosBancarios.tipoChave || 'cpf',
          chavePix: data.dadosBancarios.chavePix || '',
          nomeTitular: data.dadosBancarios.nomeTitular || ''
        });
      }
    } catch(e) {}
  }

  async function loadTaxas() {
    try {
      const data = await api.get('/lojistas/taxas');
      setTaxas(data || []);
    } catch(e) {}
  }

  async function loadCategorias() {
    try {
      const data = await api.get('/categorias');
      setCategorias(data || []);
    } catch(e) {}
  }

  async function loadAdicionais() {
    try {
      const data = await api.get('/lojistas/adicionais');
      setAdicionais(data || []);
    } catch(e) {}
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    if (!lojista) return;

    // Apenas os campos permitidos para o lojista alterar (Fix de Segurança)
    const camposPermitidos = {
      nome: form.nome,
      descricao: form.descricao,
      slug: form.slug,
      corPrincipal: form.cor_principal,
      corSecundaria: form.cor_secundaria,
      corFundoCards: form.cor_fundo_cards,
      corTextoNormal: form.cor_texto_normal,
      corTextoSecundaria: form.cor_texto_secundaria,
      logoUrl: form.logo_url,
      capaUrl: form.capa_url,
      tempoNovo: parseInt(form.tempo_novo, 10),
      tempoPreparando: parseInt(form.tempo_preparando, 10),
      tempoEntrega: parseInt(form.tempo_entrega, 10),
      tempoConcluido: parseInt(form.tempo_concluido, 10),
    };

    try {
      await api.patch('/lojistas/config', camposPermitidos);
      toast.success('Perfil atualizado!');
      fetchLojista();
    } catch(e) {
      toast.error('Erro ao salvar perfil');
    }
  }

  async function salvarBanco(e) {
    e.preventDefault();
    setSalvandoBanco(true);
    try {
      await api.post('/lojistas/financeiro/dados-bancarios', bancoForm);
      toast.success('Chave PIX salva com sucesso!');
    } catch(e) {
      toast.error('Erro ao salvar chave PIX');
    }
    setSalvandoBanco(false);
  }

  async function handleUploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setForm(prev => ({ ...prev, logo_url: res.url }));
    } catch(err) {
      toast.error('Erro no upload');
    }
    setUploadingLogo(false);
  }

  async function handleUploadCapa(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCapa(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setForm(prev => ({ ...prev, capa_url: res.url }));
    } catch(err) {
      toast.error('Erro no upload');
    }
    setUploadingCapa(false);
  }



  async function addTaxa() {
    if (!novaTaxa.bairro || !novaTaxa.valor) return toast.error('Preencha bairro e valor');
    try {
      await api.post('/lojistas/taxas', { bairro: novaTaxa.bairro, valor: parseFloat(novaTaxa.valor) });
      toast.success('Taxa adicionada!');
      setNovaTaxa({ bairro: '', valor: '' });
      loadTaxas();
    } catch(e) {
      toast.error('Erro ao adicionar taxa');
    }
  }

  async function removeTaxa(id) {
    try {
      await api.delete(`/lojistas/taxas/${id}`);
      toast.success('Removida');
      loadTaxas();
    } catch(e) {
      toast.error('Erro ao remover taxa');
    }
  }

  async function addCategoria() {
    if (!novaCat) return;
    const ordem = categorias.length + 1;
    try {
      await api.post('/categorias', { nome: novaCat, ordem });
      toast.success('Categoria criada!');
      setNovaCat('');
      loadCategorias();
    } catch(e) {
      toast.error('Erro ao criar categoria');
    }
  }

  async function removeCategoria(id) {
    try {
      await api.delete(`/categorias/${id}`);
      toast.success('Removida');
      loadCategorias();
    } catch(e) {
      toast.error('Erro ao remover categoria');
    }
  }

  async function addAdicional() {
    if (!novoAdicional.nome) return toast.error('Preencha o nome do adicional');
    try {
      await api.post('/lojistas/adicionais', {
        nome: novoAdicional.nome,
        preco: parseFloat(novoAdicional.preco) || 0
      });
      toast.success('Adicional criado!');
      setNovoAdicional({ nome: '', preco: '' });
      loadAdicionais();
    } catch(e) {
      toast.error('Erro ao salvar adicional');
    }
  }

  async function removeAdicional(id) {
    try {
      await api.delete(`/lojistas/adicionais/${id}`);
      toast.success('Removido');
      loadAdicionais();
    } catch(e) {
      toast.error('Erro ao remover adicional');
    }
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
            <ColorPickerField label="Cor Principal (Destaques)" value={form.cor_principal} onChange={c => setForm({ ...form, cor_principal: c })} />
            <ColorPickerField label="Cor Secundária (Fundo da Página)" value={form.cor_secundaria} onChange={c => setForm({ ...form, cor_secundaria: c })} />
            <ColorPickerField label="Cor Terciária (Fundo dos Cards)" value={form.cor_fundo_cards} onChange={c => setForm({ ...form, cor_fundo_cards: c })} />
            <ColorPickerField label="Cor do Texto Normal" value={form.cor_texto_normal} onChange={c => setForm({ ...form, cor_texto_normal: c })} />
            <ColorPickerField label="Cor do Texto Secundário" value={form.cor_texto_secundaria} onChange={c => setForm({ ...form, cor_texto_secundaria: c })} />
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

      {/* Financeiro (PIX) */}
      <form onSubmit={salvarBanco}>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="config-section-title">Financeiro / Recebimento PIX</h3>
          <p className="config-section-desc">Cadastre sua Chave PIX para habilitar e receber os pagamentos de PIX feitos pelo site diretamente na sua conta. Rápido, seguro e sem taxas ocultas.</p>
          
          <div className="form-grid">
            <div className="input-group">
              <label>Tipo de Chave PIX</label>
              <select className="input" value={bancoForm.tipoChave} onChange={e => setBancoForm({ ...bancoForm, tipoChave: e.target.value })}>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Chave Aleatória</option>
              </select>
            </div>
            <div className="input-group">
              <label>Chave PIX</label>
              <input className="input" value={bancoForm.chavePix} onChange={e => setBancoForm({ ...bancoForm, chavePix: e.target.value })} placeholder="Sua chave PIX" />
            </div>
            <div className="input-group" style={{ gridColumn: '1/-1' }}>
              <label>Nome Completo do Titular</label>
              <input className="input" value={bancoForm.nomeTitular} onChange={e => setBancoForm({ ...bancoForm, nomeTitular: e.target.value })} placeholder="Nome igual ao da conta bancária" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={salvandoBanco} style={{ marginTop: 10, width: 'fit-content', padding: '12px 28px', fontSize: '0.95rem' }}>
            <FiSave /> {salvandoBanco ? 'Salvando...' : 'Salvar Dados de Recebimento'}
          </button>
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
