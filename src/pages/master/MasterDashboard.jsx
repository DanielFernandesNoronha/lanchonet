import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  FiGrid, FiLogOut, FiSearch, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiClock,
  FiUsers, FiDollarSign, FiAlertTriangle, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Master.css';

const STATUS_LABELS = {
  trial:    { label: 'Trial',       cls: 'master-badge--trial',    icon: <FiClock size={11} /> },
  ativo:    { label: 'Ativo',       cls: 'master-badge--ativo',    icon: <FiCheckCircle size={11} /> },
  atrasado: { label: 'Inadimplente', cls: 'master-badge--atrasado', icon: <FiAlertCircle size={11} /> },
};

export default function MasterDashboard() {
  const navigate = useNavigate();
  const masterEmail = sessionStorage.getItem('master_email') || '';

  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [atualizando, setAtualizando] = useState(null);

  useEffect(() => {
    // Verificar se está autenticado como master
    const uid = sessionStorage.getItem('master_uid');
    if (!uid) { navigate('/master/login'); return; }
    carregarLojas();
  }, []);

  async function carregarLojas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lojistas')
        .select(`
          id, nome, slug, email, status_assinatura,
          trial_expira_em, proximo_vencimento, ultima_cobranca,
          aberto, created_at,
          planos(nome, valor_mensal)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLojas(data || []);
    } catch (e) {
      toast.error('Erro ao carregar lojas.');
    } finally {
      setLoading(false);
    }
  }

  async function alterarStatus(lojaId, novoStatus) {
    setAtualizando(lojaId);
    try {
      const { error } = await supabase
        .from('lojistas')
        .update({ status_assinatura: novoStatus })
        .eq('id', lojaId);

      if (error) throw error;

      setLojas(prev => prev.map(l =>
        l.id === lojaId ? { ...l, status_assinatura: novoStatus } : l
      ));
      toast.success(`Loja ${novoStatus === 'ativo' ? 'ativada' : 'bloqueada'} com sucesso!`);
    } catch (e) {
      toast.error('Erro ao alterar status.');
    } finally {
      setAtualizando(null);
    }
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
  const totalAtraso  = lojas.filter(l => l.status_assinatura === 'atrasado').length;

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
        {/* Sidebar */}
        <aside className="master-sidebar">
          <div className="master-sidebar-logo">
            <div className="master-sidebar-icon">🛡️</div>
            <span className="master-sidebar-name">Master</span>
          </div>

          <button className="master-nav-link active">
            <FiGrid /> Lojas
          </button>

          <div className="master-sidebar-footer">
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px 8px' }}>
              {masterEmail}
            </p>
            <button className="master-nav-link" onClick={handleLogout}>
              <FiLogOut /> Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="master-main">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Gestão de Lojas</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                Visão geral de todas as lojas cadastradas no LanchoNET
              </p>
            </div>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              onClick={carregarLojas}
              disabled={loading}
            >
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Atualizar
            </button>
          </div>

          {/* Stats */}
          <div className="master-stats">
            <div className="master-stat-card">
              <p className="master-stat-label"><FiUsers size={11} /> Total de Lojas</p>
              <p className="master-stat-value">{totalLojas}</p>
              <p className="master-stat-sub">cadastradas</p>
            </div>
            <div className="master-stat-card">
              <p className="master-stat-label"><FiCheckCircle size={11} /> Ativas</p>
              <p className="master-stat-value" style={{ color: '#4ade80' }}>{totalAtivas}</p>
              <p className="master-stat-sub">pagando mensalidade</p>
            </div>
            <div className="master-stat-card">
              <p className="master-stat-label"><FiClock size={11} /> Em Trial</p>
              <p className="master-stat-value" style={{ color: '#60a5fa' }}>{totalTrial}</p>
              <p className="master-stat-sub">período gratuito</p>
            </div>
            <div className="master-stat-card">
              <p className="master-stat-label"><FiAlertTriangle size={11} /> Inadimplentes</p>
              <p className="master-stat-value" style={{ color: '#f87171' }}>{totalAtraso}</p>
              <p className="master-stat-sub">bloqueadas</p>
            </div>
          </div>

          {/* Table */}
          <div className="master-table-wrap">
            <div className="master-table-header">
              <h2 className="master-table-title">Lojas</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Filtro status */}
                <select
                  value={filtroStatus}
                  onChange={e => setFiltroStatus(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="todos">Todos os status</option>
                  <option value="trial">Trial</option>
                  <option value="ativo">Ativo</option>
                  <option value="atrasado">Inadimplente</option>
                </select>
                {/* Busca */}
                <div className="master-search-wrap">
                  <FiSearch size={14} />
                  <input
                    className="master-search"
                    type="text"
                    placeholder="Buscar loja..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="master-loading">
                <div className="master-spinner" />
                Carregando lojas...
              </div>
            ) : (
              <table className="master-table">
                <thead>
                  <tr>
                    <th>Restaurante</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Vencimento</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lojasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>
                        Nenhuma loja encontrada
                      </td>
                    </tr>
                  )}
                  {lojasFiltradas.map(loja => {
                    const st = STATUS_LABELS[loja.status_assinatura] || STATUS_LABELS.trial;
                    const isAtualizando = atualizando === loja.id;
                    return (
                      <tr key={loja.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{loja.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>/{loja.slug}</div>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{loja.email || '—'}</td>
                        <td>
                          <span className={`master-badge ${st.cls}`}>
                            {st.icon} {st.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {loja.status_assinatura === 'trial'
                            ? formatDate(loja.trial_expira_em)
                            : formatDate(loja.proximo_vencimento)
                          }
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                          {formatDate(loja.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {loja.status_assinatura !== 'ativo' && (
                              <button
                                className="master-action-btn master-action-btn--ativar"
                                onClick={() => alterarStatus(loja.id, 'ativo')}
                                disabled={isAtualizando}
                              >
                                {isAtualizando ? '...' : <><FiToggleRight size={12} /> Ativar</>}
                              </button>
                            )}
                            {loja.status_assinatura !== 'atrasado' && (
                              <button
                                className="master-action-btn master-action-btn--bloquear"
                                onClick={() => alterarStatus(loja.id, 'atrasado')}
                                disabled={isAtualizando}
                              >
                                {isAtualizando ? '...' : <><FiToggleLeft size={12} /> Bloquear</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
