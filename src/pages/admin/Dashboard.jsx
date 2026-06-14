import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiGrid, FiPackage, FiMessageSquare, FiSettings, FiLogOut, FiExternalLink, FiMenu, FiX, FiCoffee } from 'react-icons/fi';
import './Dashboard.css';

export default function Dashboard() {
  const { lojista, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="dashboard admin-theme">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="sidebar-logo"><FiCoffee style={{ color: 'var(--accent)' }} /> <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>LanchoNet</span></div>
        <button className="btn btn-ghost" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header hide-mobile">
          <span className="sidebar-logo"><FiCoffee style={{ color: 'var(--accent)' }} /></span>
          <h2 className="sidebar-title">LanchoNet</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin/pedidos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <FiGrid /> Pedidos
          </NavLink>
          <NavLink to="/admin/produtos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <FiPackage /> Produtos
          </NavLink>
          <NavLink to="/admin/whatsapp" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <FiMessageSquare /> WhatsApp
          </NavLink>
          <NavLink to="/admin/config" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            <FiSettings /> Configurações
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {lojista && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginBottom: '1rem' }}>
              <p className="sidebar-user" style={{ marginBottom: '0' }}>{lojista.nome}</p>
              <a 
                href={`/${lojista.slug}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', textDecoration: 'none' }}
              >
                <FiExternalLink /> Acessar meu site
              </a>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%' }}><FiLogOut /> Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
