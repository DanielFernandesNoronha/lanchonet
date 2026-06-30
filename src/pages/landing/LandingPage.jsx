import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiSmartphone, FiMonitor, FiDollarSign, FiMessageCircle, FiArrowRight, FiShoppingBag, FiMenu, FiX, FiMessageSquare } from 'react-icons/fi';
import MenuLogo from '../../assets/MENU.svg';
import './LandingPage.css';

const WHATSAPP_SUPORTE = 'https://wa.me/5588981583038?text=Ol%C3%A1%2C+preciso+de+suporte+com+a+LanchoNet';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-page admin-theme">
      {/* Glow effects */}
      <div className="landing-glow landing-glow-1"></div>
      <div className="landing-glow landing-glow-2"></div>

      {/* Fixed Header */}
      <header className={`landing-header ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <div className="landing-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src={MenuLogo} alt="LanchoNet Logo" style={{ height: '34px' }} />
            <span className="logo-name">LanchoNet</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="landing-nav-links">
            <a href="#preview">Como funciona</a>
            <a href="#features">Funcionalidades</a>
            <a href="#pricing">Planos</a>
          </nav>

          <div className="landing-nav-actions">
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Falar com Suporte
            </a>
            <button className="btn btn-primary btn-header-cta" onClick={() => navigate('/admin/login', { state: { mode: 'register' } })}>
              Criar Loja Grátis
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}>
          <nav className="mobile-nav-links">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              Funcionalidades
            </a>
            <a href="#preview" onClick={() => setMobileMenuOpen(false)}>
              Como funciona
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Planos
            </a>
            <hr className="mobile-menu-divider" />
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="mobile-menu-support" onClick={() => setMobileMenuOpen(false)}>
              Falar com Suporte
            </a>
            <button
              className="btn btn-primary btn-full"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/admin/login', { state: { mode: 'register' } });
              }}
            >
              Criar Loja Grátis
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section — texto + stats */}
      <section className="hero-section lp-container">
        <div className="hero-content slide-up">
          <h1 className="hero-title">
            Sua lanchonete vende mais <br className="desktop-only" />
            <span className="text-gradient">sem pagar comissão</span>
          </h1>
          <p className="hero-subtitle">
            Crie seu cardápio digital personalizado, receba pedidos em tempo real no painel e confirme pagamentos via PIX. Pague uma mensalidade fixa — sem comissão por pedido para a LanchoNet.
          </p>
          <div className="hero-cta-row">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login', { state: { mode: 'register' } })}>
              Criar Loja Grátis <FiArrowRight />
            </button>
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="btn btn-outline-accent btn-lg">
              Ver uma demonstração
            </a>
          </div>
          <p className="hero-disclaimer">Teste 30 dias grátis · Sem cartão de crédito</p>
        </div>

        {/* Stats cards */}
        <div className="hero-stats slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card">
            <FiShoppingBag className="stat-icon" />
            <span className="stat-number">100%</span>
            <span className="stat-label">Digital, sem papel</span>
          </div>
          <div className="stat-card accent">
            <FiDollarSign className="stat-icon" />
            <span className="stat-number">Fixo</span>
            <span className="stat-label">Mensalidade sem comissão de delivery</span>
          </div>
          <div className="stat-card">
            <FiMonitor className="stat-icon" />
            <span className="stat-number">24/7</span>
            <span className="stat-label">Painel em tempo real</span>
          </div>
          <div className="stat-card">
            <FiMessageCircle className="stat-icon" />
            <span className="stat-number">PIX</span>
            <span className="stat-label">Confirmação automática</span>
          </div>
        </div>
      </section>

      {/* Preview real do sistema */}
      <section id="preview" className="preview-section lp-container">
        <div className="preview-layout-grid">
          <div className="preview-text-col">
            <div className="preview-label">Visualização do Sistema</div>
            <h2 className="section-title">Veja como funciona na prática</h2>
            <p className="section-subtitle">
              Seu cliente acessa o link da sua loja, monta o pedido pelo celular e finaliza com PIX. Você recebe o pedido no painel e o bot cuida do resto.
            </p>
          </div>
          <div className="preview-grid">
            <div className="preview-card">
              <div className="preview-card-label">Cardápio Digital</div>
              <div className="preview-img-wrapper">
                <img
                  src="https://i.imgur.com/oN97xnw.png"
                  alt="Cardápio digital da loja"
                  className="preview-img menu-img"
                />
              </div>
              <p className="preview-desc">
                Cada loja tem seu próprio link personalizado. O cliente acessa, escolhe os produtos e finaliza o pedido diretamente pelo celular — sem baixar nenhum aplicativo.
              </p>
            </div>
            <div className="preview-card">
              <div className="preview-card-label">Bot de WhatsApp</div>
              <div className="preview-img-wrapper">
                <img
                  src="/bot-preview.png"
                  alt="Robô no WhatsApp"
                  className="preview-img bot-img"
                />
              </div>
              <p className="preview-desc">
                O robô responde instantaneamente, envia o cardápio digital e atualiza o cliente a cada mudança de status do pedido. Tudo no automático.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features-section lp-container">
        <div className="preview-label">Funcionalidades</div>
        <h2 className="section-title">Tudo que sua lanchonete precisa</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FiSmartphone /></div>
            <h3>Cardápio Personalizado</h3>
            <p>Cores, logo e nome do seu restaurante. Seu cliente acessa pelo link no celular, sem baixar app.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMessageSquare /></div>
            <h3>Bot de WhatsApp</h3>
            <p>Atendimento automático para o seu WhatsApp. O robô responde os clientes, envia o cardápio e direciona o pedido.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiDollarSign /></div>
            <h3>PIX Automático</h3>
            <p>QR Code exclusivo por pedido gerado pelo nosso gateway de pagamento. O sistema reconhece e confirma o pagamento automaticamente — apenas R$ 0,80 fixos por transação.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMonitor /></div>
            <h3>Painel em Tempo Real</h3>
            <p>Receba um alerta sonoro a cada novo pedido. Gerencie e avance os status direto no painel administrativo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMessageCircle /></div>
            <h3>Acompanhamento de Pedido</h3>
            <p>O cliente acompanha o status do pedido pelo link da loja e tem acesso rápido ao WhatsApp do estabelecimento.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing-section lp-container">
        <div className="preview-label">Planos</div>
        <h2 className="section-title">Preço justo, sem surpresas</h2>
        <p className="section-subtitle">
          Pague uma mensalidade fixa à LanchoNet. Sem comissão por pedido para nós — a única taxa que incide é de apenas R$ 0,80 fixos por transação no processamento do PIX.
        </p>

        <div className="pricing-grid">
          {/* Básico */}
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
              <li><FiCheck /> Cardápio Digital</li>
              <li><FiCheck /> Até 100 Pedidos / Mês</li>
              <li><FiCheck /> Painel Administrativo</li>
              <li className="missing">Sem PIX Automático</li>
              <li className="missing">Sem WhatsApp</li>
            </ul>
            <button className="btn btn-secondary btn-full" disabled>Em breve</button>
          </div>

          {/* Padrão */}
          <div className="pricing-card popular slide-up">
            <div className="popular-badge">Mais Popular</div>
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
              <li><FiCheck /> Cardápio Personalizado (cor + logo)</li>
              <li><FiCheck /> PIX Automatizado por pedido</li>
              <li><FiCheck /> Painel em Tempo Real + Alertas</li>
              <li><FiCheck /> Confirmação no WhatsApp</li>
              <li><FiCheck /> Suporte via WhatsApp</li>
            </ul>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={() => navigate('/admin/login', { state: { mode: 'register' } })}
            >
              Começar agora (30 dias grátis)
            </button>
          </div>

          {/* Premium */}
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
              <li><FiCheck /> Impressora Térmica (em breve)</li>
              <li><FiCheck /> Relatórios Avançados</li>
            </ul>
            <button className="btn btn-secondary btn-full" disabled>Em breve</button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="cta-final lp-container">
        <h2>Pronto para modernizar sua lanchonete?</h2>
        <p>Crie sua conta agora e comece a receber pedidos em minutos.</p>
        <div className="cta-final-btns">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login', { state: { mode: 'register' } })}>
            Criar Loja Grátis <FiArrowRight />
          </button>
          <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
            Falar com Suporte
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="lp-container footer-grid">
          <div className="footer-brand">
            <div className="landing-logo footer-logo-container">
              <img src={MenuLogo} alt="LanchoNet" />
              <span>LanchoNet</span>
            </div>
            <p>Sistema criado para lanchonetes que querem atender melhor e lucrar mais, sem pagar comissões abusivas.</p>
          </div>

          <div className="footer-links">
            <h4>Produto</h4>
            <a href="#features">Funcionalidades</a>
            <a href="#preview">Como Funciona</a>
            <a href="#pricing">Planos e Preços</a>
          </div>

          <div className="footer-links">
            <h4>Suporte</h4>
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
            <a href="/admin/login">Acessar Painel</a>
            <a href="#pricing">Criar Conta Grátis</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} LanchoNet · Todos os direitos reservados · Suporte: (88) 98158-3038</p>
        </div>
      </footer>
    </div>
  );
}
