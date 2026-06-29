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
            Atendimento <br />
            <span className="text-gradient">Inteligente</span> com PIX
          </h1>
          <p className="hero-subtitle">
            Crie sua loja, personalize o cardápio com as suas cores e receba pedidos no painel com pagamentos PIX automatizados. Pague só uma mensalidade fixa.
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
          <div className="phone-mockup">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="app-header">
                <div className="app-logo"></div>
                <div className="app-title">Lanchonete</div>
              </div>
              <div className="app-body">
                <div className="app-item"><div className="app-img"></div><div className="app-txt-box"><div className="app-txt1"></div><div className="app-txt2"></div></div></div>
                <div className="app-item"><div className="app-img"></div><div className="app-txt-box"><div className="app-txt1"></div><div className="app-txt2"></div></div></div>
              </div>
              <div className="app-footer">
                <div className="app-total">Total: R$ 45,00</div>
                <div className="app-pay-btn">Pagar com PIX</div>
              </div>
            </div>
            {/* Pop-up flutuante PIX */}
            <div className="hero-float-alert">
              <FiCheck color="#22c55e" size={20} />
              <span>PIX Aprovado!</span>
            </div>
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

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <img src={MenuLogo} alt="LanchoNet" style={{ height: '32px', marginBottom: '16px' }} />
          <p>© {new Date().getFullYear()} LanchoNet. Todos os direitos reservados.</p>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
            Feito para lanchonetes modernas que querem lucrar mais e pagar menos taxas.
          </p>
        </div>
      </footer>
    </div>
  );
}
