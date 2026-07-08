import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiGrid, FiLogOut, FiSearch, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiClock,
  FiDollarSign, FiMenu, FiX, FiMoreVertical,
  FiEdit, FiKey, FiTrash2, FiPlay, FiPause, FiPieChart, FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import MenuLogo from '../../assets/MENU.svg';
import './MasterDashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_LABELS = {
  trial:    { label: 'Trial',       color: '#60a5fa', icon: <FiClock size={12} /> },
  ativo:    { label: 'Ativo',       color: '#4ade80', icon: <FiCheckCircle size={12} /> },
  atrasado: { label: 'Inadimplente', color: '#f87171', icon: <FiAlertCircle size={12} /> },
  pendente: { label: 'Pendente', color: '#fbbf24', icon: <FiClock size={12} /> },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function MasterDashboard() {
  const navigate = useNavigate();
  const masterEmail = sessionStorage.getItem('master_email') || '';
  const token = sessionStorage.getItem('master_token') || '';

  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [atualizando, setAtualizando] = useState(null);
  
  const [activeTab, setActiveTab] = useState('lojas'); // 'lojas' | 'financeiro'
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  const [financeiro, setFinanceiro] = useState({ total: 0, timeline: [], tipos: [] });

  // Modals de exclusão
  const [lojaParaDeletar, setLojaParaDeletar] = useState(null);
  const [confirmacaoExtra, setConfirmacaoExtra] = useState(false);

  useEffect(() => {
    carregarLojas();
    carregarFinanceiro();
    
    // Fechar dropdown ao clicar fora
    const handleClickFora = (e) => {
      if (!e.target.closest('.action-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  async function carregarLojas() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/master/lojas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.status === 401) {
        sessionStorage.removeItem('master_token');
        sessionStorage.removeItem('master_email');
        navigate('/master/login');
        return;
      }
      if (!res.ok) throw new Error(data.error);

      setLojas(data || []);
    } catch (e) {
      toast.error('Erro ao carregar lojas.');
    }
    setLoading(false);
  }

  async function carregarFinanceiro() {
    try {
      const res = await fetch(`${API_URL}/master/financeiro`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFinanceiro({
          total: data.totalFaturamento,
          timeline: data.timeline,
          tipos: data.tipos
        });
      }
    } catch (e) {
      toast.error('Erro ao carregar dados financeiros.');
    }
  }

  async function alterarStatus(lojaId, novoStatus) {
    setAtualizando(lojaId);
    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/master/lojas/${lojaId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: novoStatus })
      });
      if (!res.ok) throw new Error('Erro');

      toast.success('Status atualizado!');
      carregarLojas();
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
    setAtualizando(null);
  }

  async function concederTrial(lojaId, dias) {
    setAtualizando(lojaId);
    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/master/lojas/${lojaId}/trial`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dias })
      });
      if (!res.ok) throw new Error('Erro');

      toast.success(`Trial de ${dias} dias concedido!`);
      carregarLojas();
    } catch (e) {
      toast.error('Erro ao conceder trial.');
    }
    setAtualizando(null);
  }

  async function executarExclusao() {
    if (!lojaParaDeletar) return;
    setAtualizando(lojaParaDeletar.id);
    try {
      const res = await fetch(`${API_URL}/master/lojas/${lojaParaDeletar.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro');
      toast.success('Loja deletada permanentemente!');
      carregarLojas();
    } catch (e) {
      toast.error('Erro ao deletar loja.');
    }
    setAtualizando(null);
    setLojaParaDeletar(null);
    setConfirmacaoExtra(false);
  }

  function iniciarDelecao(loja) {
    setOpenDropdownId(null);
    setLojaParaDeletar(loja);
    setConfirmacaoExtra(false);
  }

  async function handleLogout() {
    sessionStorage.removeItem('master_uid');
    sessionStorage.removeItem('master_email');
    navigate('/master/login');
  }

  // Stats
  const totalLojas  = lojas.length;
  const totalAtivas  = lojas.filter(l => l.status_assinatura === 'ativo').length;
  const totalTrial   = lojas.filter(l => l.status_assinatura === 'trial').length;
  const faturamentoMock = financeiro.total || 0;

  // Filtros
  const lojasFiltradas = lojas.filter(l => {
    const matchSearch = !search.trim() ||
      l.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.slug?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || l.status_assinatura === filtroStatus;
    return matchSearch && matchStatus;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="master-page">
      <div className="master-layout">
        <aside className={`master-sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="master-sidebar-logo">
            <div className="master-sidebar-icon">
              <FiGrid />
            </div>
            <span className="master-sidebar-name">MASTER</span>
          </div>

          <nav className="sidebar-nav" style={{ flex: 1 }}>
            <button className={`master-nav-link ${activeTab === 'lojas' ? 'active' : ''}`} onClick={() => {setActiveTab('lojas'); setMenuOpen(false);}}>
              <FiGrid /> Gestão de Lojas
            </button>
            <button className={`master-nav-link ${activeTab === 'financeiro' ? 'active' : ''}`} onClick={() => {setActiveTab('financeiro'); setMenuOpen(false);}}>
              <FiPieChart /> Financeiro
            </button>
          </nav>

          <div className="master-sidebar-footer">
            <p className="sidebar-user" style={{ marginBottom: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>{masterEmail}</p>
            <button className="master-nav-link" onClick={handleLogout} style={{ color: '#ef4444' }}>
              <FiLogOut /> Sair
            </button>
          </div>
        </aside>

        <main className="master-main">
        
        {activeTab === 'lojas' && (
          <div className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>Gestão de Lojas</h2>
              <button className="btn btn-secondary" onClick={carregarLojas} disabled={loading}>
                <FiRefreshCw className={loading ? 'spin' : ''} /> Atualizar
              </button>
            </div>

            <div className="master-stats">
              <div className="master-stat-card">
                <p className="master-stat-label">Total de Lojas</p>
                <h3 className="master-stat-value">{totalLojas}</h3>
              </div>
              <div className="master-stat-card">
                <p className="master-stat-label" style={{color: '#4ade80'}}>Lojas Ativas</p>
                <h3 className="master-stat-value" style={{color: '#4ade80'}}>{totalAtivas}</h3>
              </div>
              <div className="master-stat-card">
                <p className="master-stat-label" style={{color: '#60a5fa'}}>Em Trial</p>
                <h3 className="master-stat-value" style={{color: '#60a5fa'}}>{totalTrial}</h3>
              </div>
              <div className="master-stat-card" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))' }}>
                <p className="master-stat-label" style={{ color: 'var(--master-accent)' }}>Faturamento</p>
                <h3 className="master-stat-value" style={{ color: 'var(--master-accent)' }}>R$ {faturamentoMock.toFixed(2)}</h3>
              </div>
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Lojas Cadastradas</h3>
            <div className="master-table-wrap">
              <div className="master-table-header">
                <h3 className="master-table-title">Lojas Cadastradas</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="master-search-wrap">
                    <FiSearch />
                    <input className="master-search" type="text" placeholder="Buscar loja..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="master-search" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: '150px', paddingLeft: '14px' }}>
                    <option value="todos">Status: Todos</option>
                    <option value="trial">Trial</option>
                    <option value="ativo">Ativo</option>
                    <option value="atrasado">Inadimplente</option>
                  </select>
                </div>
              </div>
              
              <table className="master-table">
                <thead>
                  <tr>
                    <th>Restaurante</th>
                    <th>Status</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                  <tbody>
                    {lojasFiltradas.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Nenhuma loja encontrada</td></tr>
                    ) : (
                      lojasFiltradas.map(loja => {
                        const st = STATUS_LABELS[loja.status_assinatura] || STATUS_LABELS.trial;
                        const isAtualizando = atualizando === loja.id;
                        const isOpen = openDropdownId === loja.id;
                        return (
                          <tr key={loja.id} style={{ opacity: isAtualizando ? 0.5 : 1 }}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{loja.nome}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--master-text-secondary)' }}>{loja.email}</div>
                            </td>
                            <td>
                              <span className={`master-badge master-badge--${loja.status_assinatura || 'trial'}`}>
                                {st.icon} {st.label}
                              </span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                              {loja.status_assinatura === 'pendente' 
                                ? <span style={{ color: 'var(--master-text-muted)' }}>—</span>
                                : (loja.status_assinatura === 'trial' ? formatDate(loja.trial_expira_em) : formatDate(loja.proximo_vencimento))}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', position: 'relative' }}>
                              <div className="action-dropdown" style={{ display: 'inline-block' }}>
                                <button className="btn btn-ghost btn-sm" style={{ outline: 'none', border: 'none' }} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : loja.id); }}>
                                  <FiMoreVertical size={18} />
                                </button>
                                
                                {isOpen && (
                                  <div style={{
                                    position: 'absolute', right: '16px', top: '50%', background: 'var(--bg-secondary)', 
                                    border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', 
                                    zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '180px',
                                    display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left'
                                  }}>
                                    
                                    {/* Botão de Ativar removido para evitar bypass do pagamento. Use os botões de Trial para dar tempo grátis com expiração automática */}
                                    
                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#60a5fa' }} onClick={() => concederTrial(loja.id, 7)}>
                                      <FiClock /> Dar +7 Dias Trial
                                    </button>

                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#60a5fa' }} onClick={() => concederTrial(loja.id, 30)}>
                                      <FiClock /> Dar +30 Dias Trial
                                    </button>

                                    {loja.status_assinatura === 'trial' && (
                                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#fbbf24' }} onClick={() => alterarStatus(loja.id, 'pendente')}>
                                        <FiX /> Tirar Trial
                                      </button>
                                    )}

                                    {loja.status_assinatura !== 'atrasado' && (
                                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#f87171' }} onClick={() => alterarStatus(loja.id, 'atrasado')}>
                                        <FiPause /> Bloquear Loja
                                      </button>
                                    )}
                                    
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}></div>
                                    
                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setOpenDropdownId(null); toast('Modo de edição em breve'); }}>
                                      <FiEdit /> Atualizar Cadastro
                                    </button>
                                    
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}></div>

                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#ef4444' }} onClick={() => iniciarDelecao(loja)}>
                                      <FiTrash2 /> Deletar Conta
                                    </button>

                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="slide-up">
            <div style={{ marginBottom: 32 }}>
              <h2>Financeiro Master</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Visão geral de recebimentos e métricas de assinaturas da plataforma.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 32 }}>
              
              {/* Grafico de Linha */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Recebimentos Recentes</h3>
                <div style={{ width: '100%', height: 300 }}>
                  {financeiro.timeline.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--master-text-muted)' }}>
                      <FiPieChart size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                      <p>Nenhum dado financeiro encontrado ainda.</p>
                      <p style={{ fontSize: '0.8rem' }}>Assim que as lojas pagarem as assinaturas, os dados aparecerão aqui.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <LineChart data={financeiro.timeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <Line type="monotone" dataKey="valor" stroke="var(--master-accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--master-accent)' }} activeDot={{ r: 8 }} />
                        <CartesianGrid stroke="var(--master-border)" strokeDasharray="5 5" vertical={false} />
                        <XAxis dataKey="data" stroke="var(--master-text-secondary)" tick={{ fill: 'var(--master-text-secondary)' }} tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />
                        <YAxis stroke="var(--master-text-secondary)" tick={{ fill: 'var(--master-text-secondary)' }} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'var(--master-card)', border: '1px solid var(--master-border)', borderRadius: 8 }}
                          itemStyle={{ color: 'var(--master-accent)', fontWeight: 'bold' }}
                          formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                          labelStyle={{ color: 'var(--master-text-secondary)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Grafico de Pizza */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Distribuição de Assinaturas</h3>
                <div style={{ width: '100%', height: 250, display: 'flex', justifyContent: 'center', flex: 1 }}>
                  {financeiro.tipos.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--master-text-muted)' }}>
                      Sem dados de assinaturas
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={financeiro.tipos}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {financeiro.tipos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'var(--master-card)', border: '1px solid var(--master-border)', borderRadius: 8 }}
                          formatter={(value, name) => [value, name]}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Modal Deleção Passo 1 */}
      {lojaParaDeletar && !confirmacaoExtra && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="slide-up" style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Deletar Loja?</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Você estÃ¡ prestes a iniciar a exclusÃ£o da loja <strong>{lojaParaDeletar.nome}</strong>. Tem certeza disso?</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setLojaParaDeletar(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: '#ef4444', color: '#fff' }} onClick={() => setConfirmacaoExtra(true)}>Sim, tenho certeza</button>
            </div>
          </div>
        </div>
      )}

      {lojaParaDeletar && confirmacaoExtra && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="slide-up" style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', border: '2px solid #ef4444' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}><FiAlertTriangle /> AVISO FINAL</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Esta conta serÃ¡ <strong>apagada permanentemente</strong> do banco de dados.</p>
            <p style={{ color: 'var(--text-secondary)' }}>Todos os produtos, pedidos e clientes de <strong>{lojaParaDeletar.nome}</strong> serão perdidos. Não será possível retornar.</p>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setConfirmacaoExtra(false); setLojaParaDeletar(null); }}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: '#ef4444', color: '#fff' }} onClick={executarExclusao} disabled={atualizando}>
                {atualizando ? 'Deletando...' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
