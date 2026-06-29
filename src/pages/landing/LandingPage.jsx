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

      {/* Navigation */}
      <nav className="landing-nav container">
        <div className="landing-logo">
          <img src={MenuLogo} alt="LanchoNet Logo" style={{ height: '40px' }} />
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/admin/login')}>
            Já tenho conta
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/login')}>
            Criar minha loja <FiArrowRight />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section container">
        <div className="hero-content slide-up">
          <div className="hero-badge">🚀 O Sistema Definitivo para Lanchonetes</div>
          <h1 className="hero-title">
            Transforme seu atendimento com um <span className="text-gradient">Cardápio Digital Automático</span>
          </h1>
          <p className="hero-subtitle">
            Crie sua loja em 3 minutos, receba pedidos direto no painel com integração PIX automatizada e atenda seus clientes de forma profissional. Sem taxas abusivas por pedido!
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login')} style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
              Começar Agora Grátis
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Teste grátis por 30 dias. Não exigimos cartão de crédito.
            </p>
          </div>
        </div>
        <div className="hero-visual slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="mockup-window">
            <div className="mockup-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="mockup-body">
              <div className="mockup-content">
                <div className="mockup-item skeleton"></div>
                <div className="mockup-item skeleton" style={{ width: '80%' }}></div>
                <div className="mockup-item skeleton" style={{ width: '60%' }}></div>
                <div className="mockup-badge">Novo Pedido Recebido! 🍔</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section container">
        <h2 className="section-title">Por que escolher a LanchoNet?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FiSmartphone /></div>
            <h3>Cardápio Lindo e Responsivo</h3>
            <p>Seus clientes pedem pelo celular de forma simples. Cores e logo do seu restaurante, sem baixar nenhum app.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiDollarSign /></div>
            <h3>PIX Automatizado</h3>
            <p>Esqueça conferir comprovantes! O cliente escaneia o QR Code e o sistema confirma o pagamento sozinho na hora.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMonitor /></div>
            <h3>Gestão em Tempo Real</h3>
            <p>Painel administrativo elegante. Seja notificado com um alerta sonoro a cada novo pedido na sua tela.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMessageCircle /></div>
            <h3>Integração WhatsApp</h3>
            <p>Seus clientes podem acompanhar o status do pedido direto no WhatsApp, além de receberem alertas das mudanças de status.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section container">
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
