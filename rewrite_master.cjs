const fs = require('fs');

const content = `import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiGrid, FiLogOut, FiSearch, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiClock,
  FiDollarSign, FiMenu, FiX, FiMoreVertical,
  FiEdit, FiKey, FiTrash2, FiPlay, FiPause, FiPieChart
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import MenuLogo from '../../assets/MENU.svg';
import '../admin/Dashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_LABELS = {
  trial:    { label: 'Trial',       color: '#60a5fa', icon: <FiClock size={12} /> },
  ativo:    { label: 'Ativo',       color: '#4ade80', icon: <FiCheckCircle size={12} /> },
  atrasado: { label: 'Inadimplente', color: '#f87171', icon: <FiAlertCircle size={12} /> },
  pendente: { label: 'Aguardando Pgto', color: '#fbbf24', icon: <FiClock size={12} /> },
};

// Mock Timeline
const MOCK_TIMELINE = [
  { id: 6, data: '2026-06-25', loja: 'Cantina B', valor: 160, tipo: 'PIX Avulso' },
  { id: 5, data: '2026-06-30', loja: 'Kombi do Lanche', valor: 150, tipo: 'PIX Assinatura' },
  { id: 4, data: '2026-07-01', loja: 'Açaí Tropical', valor: 180, tipo: 'Cartão Avulso' },
  { id: 3, data: '2026-07-04', loja: 'Sushi Master', valor: 870, tipo: 'Cartão 6 Meses' },
  { id: 2, data: '2026-07-05', loja: 'Pizzaria do Zé', valor: 160, tipo: 'PIX Avulso' },
  { id: 1, data: '2026-07-06', loja: 'Burger House', valor: 150, tipo: 'PIX Assinatura' },
];

const MOCK_TIPOS_ASSINATURA = [
  { name: 'PIX Assinatura', value: 2, color: '#f97316' },
  { name: 'PIX Avulso', value: 2, color: '#4ade80' },
  { name: 'Cartão', value: 2, color: '#60a5fa' },
];

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

  // Modals de exclusão
  const [lojaParaDeletar, setLojaParaDeletar] = useState(null);
  const [confirmacaoExtra, setConfirmacaoExtra] = useState(false);

  useEffect(() => {
    carregarLojas();
    
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
      const res = await fetch(\`\${API_URL}/master/lojas\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLojas(data || []);
    } catch (e) {
      toast.error('Erro ao carregar lojas.');
    }
    setLoading(false);
  }

  async function alterarStatus(lojaId, novoStatus) {
    setAtualizando(lojaId);
    setOpenDropdownId(null);
    try {
      const res = await fetch(\`\${API_URL}/master/lojas/\${lojaId}/status\`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ status_assinatura: novoStatus })
      });
      if (!res.ok) throw new Error('Erro');

      toast.success('Status atualizado!');
      carregarLojas();
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
    setAtualizando(null);
  }

  async function executarExclusao() {
    if (!lojaParaDeletar) return;
    setAtualizando(lojaParaDeletar.id);
    try {
      const res = await fetch(\`\${API_URL}/master/lojas/\${lojaParaDeletar.id}\`, {
        method: 'DELETE',
        headers: { 'Authorization': \`Bearer \${token}\` }
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

  function resetarSenha(loja) {
    setOpenDropdownId(null);
    const novaSenha = window.prompt(\`Como as senhas são criptografadas, não é possível visualizá-las.\\nDigite uma NOVA SENHA para \${loja.nome}:\`);
    if (novaSenha && novaSenha.length >= 6) {
      toast.success('Funcionalidade de redefinir senha seria chamada aqui com: ' + novaSenha);
    } else if (novaSenha) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
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
  const faturamentoMock = MOCK_TIMELINE.reduce((acc, curr) => acc + curr.valor, 0);

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
    <div className="admin-dashboard">
      <div className="mobile-header">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={MenuLogo} alt="MENU" style={{ height: '38px' }}/>
        </div>
        <button className="btn btn-ghost" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <aside className={\`sidebar \${menuOpen ? 'open' : ''}\`}>
        <div className="sidebar-header hide-mobile">
          <span className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'column', alignItems: 'center' }}>
            <img src={MenuLogo} alt="MENU" style={{ height: '48px', marginBottom: '8px' }}/>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: 2 }}>MASTER</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <button className={\`nav-link \${activeTab === 'lojas' ? 'active' : ''}\`} onClick={() => {setActiveTab('lojas'); setMenuOpen(false);}} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
            <FiGrid /> Gestão de Lojas
          </button>
          <button className={\`nav-link \${activeTab === 'financeiro' ? 'active' : ''}\`} onClick={() => {setActiveTab('financeiro'); setMenuOpen(false);}} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
            <FiPieChart /> Financeiro
          </button>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-user" style={{ marginBottom: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>{masterEmail}</p>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ padding: '24px' }}>
        
        {activeTab === 'lojas' && (
          <div className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>Gestão de Lojas</h2>
              <button className="btn btn-secondary" onClick={carregarLojas} disabled={loading}>
                <FiRefreshCw className={loading ? 'spin' : ''} /> Atualizar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 4 }}>Total de Lojas</p>
                <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{totalLojas}</h3>
              </div>
              <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <p style={{ color: '#4ade80', fontSize: '0.85rem', marginBottom: 4 }}>Lojas Ativas</p>
                <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#4ade80' }}>{totalAtivas}</h3>
              </div>
              <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                <p style={{ color: '#60a5fa', fontSize: '0.85rem', marginBottom: 4 }}>Em Trial</p>
                <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#60a5fa' }}>{totalTrial}</h3>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><FiDollarSign /> Faturamento (Mês)</p>
                <h3 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--accent)' }}>R$ {faturamentoMock.toFixed(2)}</h3>
              </div>
            </div>

            <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Lojas Cadastradas</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)' }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="input-icon" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                  <FiSearch />
                  <input className="input" type="text" placeholder="Buscar loja..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
                </div>
                <select className="input" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ margin: 0, width: 'auto' }}>
                  <option value="todos">Todos os status</option>
                  <option value="trial">Trial</option>
                  <option value="ativo">Ativo</option>
                  <option value="atrasado">Inadimplente</option>
                  <option value="pendente">Aguardando Pgto</option>
                </select>
              </div>
              
              <div style={{ overflowX: 'auto', minHeight: 250 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Restaurante</th>
                      <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vencimento</th>
                      <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Opções</th>
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
                          <tr key={loja.id} style={{ borderTop: '1px solid var(--border)', opacity: isAtualizando ? 0.5 : 1 }}>
                            <td style={{ padding: '16px' }}>
                              <div style={{ fontWeight: 600 }}>{loja.nome}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loja.email}</div>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: \`\${st.color}15\`, color: st.color, border: \`1px solid \${st.color}30\` }}>
                                {st.icon} {st.label}
                              </span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                              {loja.status_assinatura === 'trial' ? formatDate(loja.trial_expira_em) : formatDate(loja.proximo_vencimento)}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', position: 'relative' }}>
                              <div className="action-dropdown" style={{ display: 'inline-block' }}>
                                <button className="btn btn-ghost btn-sm" style={{ outline: 'none' }} onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : loja.id); }}>
                                  <FiMoreVertical size={18} />
                                </button>
                                
                                {isOpen && (
                                  <div style={{
                                    position: 'absolute', right: '16px', top: '50%', background: 'var(--bg-secondary)', 
                                    border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', 
                                    zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '180px',
                                    display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left'
                                  }}>
                                    
                                    {loja.status_assinatura !== 'ativo' && (
                                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#4ade80' }} onClick={() => alterarStatus(loja.id, 'ativo')}>
                                        <FiPlay /> Ativar Loja
                                      </button>
                                    )}
                                    
                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#60a5fa' }} onClick={() => alterarStatus(loja.id, 'trial')}>
                                      <FiClock /> Dar Trial (Teste)
                                    </button>

                                    {loja.status_assinatura !== 'atrasado' && (
                                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: '#f87171' }} onClick={() => alterarStatus(loja.id, 'atrasado')}>
                                        <FiPause /> Bloquear Loja
                                      </button>
                                    )}
                                    
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}></div>
                                    
                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setOpenDropdownId(null); toast('Modo de edição em breve'); }}>
                                      <FiEdit /> Atualizar Cadastro
                                    </button>
                                    
                                    <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => resetarSenha(loja)}>
                                      <FiKey /> Redefinir Senha
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
                  <ResponsiveContainer>
                    <LineChart data={MOCK_TIMELINE} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <Line type="monotone" dataKey="valor" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)' }} activeDot={{ r: 8 }} />
                      <CartesianGrid stroke="#333" strokeDasharray="5 5" vertical={false} />
                      <XAxis dataKey="data" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}
                        itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
                        formatter={(value) => [\`R$ \${value.toFixed(2)}\`, 'Faturamento']}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grafico de Pizza */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Distribuição de Assinaturas</h3>
                <div style={{ width: '100%', height: 250, display: 'flex', justifyContent: 'center', flex: 1 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={MOCK_TIPOS_ASSINATURA}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {MOCK_TIPOS_ASSINATURA.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}
                        formatter={(value, name) => [value, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
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

      {/* Modal Deleção Passo 2 */}
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
  );
}
`;

fs.writeFileSync('src/pages/master/MasterDashboard.jsx', content);
