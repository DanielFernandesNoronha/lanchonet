import { useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowRight, FiSmartphone, FiMonitor, FiDollarSign, FiMessageCircle } from 'react-icons/fi';
import MenuLogo from '../../assets/MENU.svg';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page admin-theme">
      {/* Background glow effects */}
      <div className="landing-glow landing-glow-1"></div>
      <div className="landing-glow landing-glow-2"></div>

      {/* Fixed Header */}
      <header className="landing-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
          <div className="landing-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <img src={MenuLogo} alt="LanchoNet Logo" style={{ height: '36px' }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginLeft: '10px', letterSpacing: '-0.5px' }}>LanchoNet</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#features">Funcionalidades</a>
            <a href="#pricing">Planos</a>
          </nav>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/admin/login')}>
              Entrar
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/admin/login')}>
              Criar Loja Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section hero-split container">
        <div className="hero-content slide-up">
          <h1 className="hero-title">
            O Sistema Definitivo para<br />
            <span className="text-gradient">Lanchonetes Inteligentes</span>
          </h1>
          <p className="hero-subtitle">
            Automatize o atendimento no WhatsApp, exiba um cardápio digital irresistível e receba via PIX sem pagar taxas por pedido. Assuma o controle total das suas vendas!
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login')}>
              Criar Loja Grátis
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Teste 30 dias sem compromisso.
            </p>
          </div>
        </div>
        
        <div className="hero-visual slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="hero-images-showcase">
            <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=800&fit=crop&q=80" alt="Exemplo do Cardápio LanchoNet" className="showcase-img back-img" />
            <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=700&fit=crop&q=80" alt="Confirmação de Pedido no WhatsApp" className="showcase-img front-img" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section container">
        <h2 className="section-title">O que tem no nosso sistema?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FiSmartphone /></div>
            <h3>Cardápio Personalizado</h3>
            <p>Seus clientes pedem pelo celular. Você escolhe as cores, envia sua logomarca e deixa o sistema com a cara do seu negócio.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiDollarSign /></div>
            <h3>PIX Automatizado</h3>
            <p>O cliente finaliza com um Pix exclusivo para aquele pedido. O sistema reconhece e confirma o pagamento sozinho.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMonitor /></div>
            <h3>Alerta de Pedido Real-time</h3>
            <p>Painel administrativo prático e sonoro! Seja notificado com um alerta sonoro a cada novo pedido na sua tela.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMessageCircle /></div>
            <h3>Link com o Restaurante</h3>
            <p>O cliente acompanha o status do pedido pelo link dele ou aciona seu estabelecimento rapidamente pelo botão do WhatsApp.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section container">
        <h2 className="section-title">Planos justos para o seu negócio crescer</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Você só paga uma mensalidade fixa. Chega de deixar 15% ou 20% das suas vendas nos grandes aplicativos de delivery!
        </p>

        <div className="pricing-grid">
          {/* Básico - Em Breve */}
          <div className="pricing-card disabled">
            <div className="pricing-header">
              <h3>Básico</h3>
              <div className="pricing-price">
                <span className="currency">R$</span>
                <span className="amount">79</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li><FiCheck /> Cardápio Digital Simples</li>
              <li><FiCheck /> Até 100 Pedidos / Mês</li>
              <li><FiCheck /> Painel de Acompanhamento</li>
              <li className="missing">Sem Integração Pix</li>
            </ul>
            <button className="btn btn-secondary btn-full" disabled>
              Em breve
            </button>
          </div>

          {/* Padrão - Destaque */}
          <div className="pricing-card popular slide-up">
            <div className="popular-badge">Mais Escolhido</div>
            <div className="pricing-header">
              <h3>Padrão</h3>
              <div className="pricing-price">
                <span className="currency">R$</span>
                <span className="amount">150</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li><FiCheck /> Pedidos Ilimitados</li>
              <li><FiCheck /> Cardápio com as suas Cores</li>
              <li><FiCheck /> Checkout PIX Automatizado</li>
              <li><FiCheck /> Dashboard de Vendas</li>
              <li><FiCheck /> Botão de Acompanhar Pedido</li>
              <li><FiCheck /> Suporte Dedicado</li>
            </ul>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/admin/login')}>
              Criar Loja (30 Dias Grátis)
            </button>
          </div>

          {/* Premium - Em Breve */}
          <div className="pricing-card disabled">
            <div className="pricing-header">
              <h3>Premium</h3>
              <div className="pricing-price">
                <span className="currency">R$</span>
                <span className="amount">249</span>
                <span className="period">/mês</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li><FiCheck /> Tudo do plano Padrão</li>
              <li><FiCheck /> Domínio Personalizado</li>
              <li><FiCheck /> Impressão Automática (Térmica)</li>
              <li><FiCheck /> Mensagens Disparadas no WhatsApp</li>
            </ul>
            <button className="btn btn-secondary btn-full" disabled>
              Em breve
            </button>
          </div>
        </div>
      </section>

      {/* Footer Melhorado */}
      <footer className="landing-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src={MenuLogo} alt="LanchoNet" style={{ height: '36px', marginBottom: '16px' }} />
            <p>O sistema criado para descomplicar a vida das lanchonetes modernas, focando em lucros sem taxas embutidas.</p>
          </div>
          
          <div className="footer-links">
            <h4>Produto</h4>
            <a href="#features">Funcionalidades</a>
            <a href="#pricing">Planos e Preços</a>
            <a href="#">Integração PIX</a>
          </div>

          <div className="footer-links">
            <h4>Suporte</h4>
            <a href="#">Central de Ajuda</a>
            <a href="#">Falar no WhatsApp</a>
            <a href="#">Termos de Uso</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} LanchoNet. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
