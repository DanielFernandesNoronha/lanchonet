import { useNavigate } from 'react-router-dom';
import { FiCheck, FiSmartphone, FiMonitor, FiDollarSign, FiMessageCircle, FiArrowRight, FiStar, FiShoppingBag } from 'react-icons/fi';
import MenuLogo from '../../assets/MENU.svg';
import './LandingPage.css';

const WHATSAPP_SUPORTE = 'https://wa.me/5588981583938?text=Ol%C3%A1%2C+preciso+de+suporte+com+a+LanchoNet';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page admin-theme">
      {/* Glow effects */}
      <div className="landing-glow landing-glow-1"></div>
      <div className="landing-glow landing-glow-2"></div>

      {/* Fixed Header */}
      <header className="landing-header">
        <div className="lp-container lp-nav-inner">
          <div className="landing-logo">
            <img src={MenuLogo} alt="LanchoNet Logo" style={{ height: '34px' }} />
            <span className="logo-name">LanchoNet</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#features">Funcionalidades</a>
            <a href="#preview">Como funciona</a>
            <a href="#pricing">Planos</a>
          </nav>
          <div className="landing-nav-actions">
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Falar com Suporte
            </a>
            <button className="btn btn-primary" onClick={() => navigate('/admin/login')}>
              Criar Loja Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section — texto + stats */}
      <section className="hero-section lp-container">
        <div className="hero-content slide-up">
          <div className="hero-eyebrow">
            <FiStar /> Cardápio Digital Profissional
          </div>
          <h1 className="hero-title">
            Sua lanchonete vende mais<br />
            <span className="text-gradient">sem pagar comissão</span>
          </h1>
          <p className="hero-subtitle">
            Crie seu cardápio digital em minutos, receba pedidos em tempo real no painel e confirme pagamentos via PIX automaticamente. Uma mensalidade fixa. Zero taxa por pedido.
          </p>
          <div className="hero-cta-row">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login')}>
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
            <span className="stat-number">R$0</span>
            <span className="stat-label">Taxa por pedido</span>
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
        <div className="preview-label">Sistema em uso real</div>
        <h2 className="section-title">Veja como funciona na prática</h2>
        <p className="section-subtitle">
          Seu cliente pede pelo celular, você vê o pedido na tela, recebe o PIX e envia a confirmação automática pelo WhatsApp. Simples assim.
        </p>
        <div className="preview-grid">
          <div className="preview-card">
            <div className="preview-card-label">Cardápio Digital</div>
            <img
              src="/img-cardapio.jpg"
              alt="Cardápio digital da loja Anaçai no LanchoNet"
              className="preview-img"
            />
            <p className="preview-desc">Cada loja tem seu próprio link. Clientes pedem pelo celular, sem baixar nenhum app.</p>
          </div>
          <div className="preview-card">
            <div className="preview-card-label">Confirmação no WhatsApp</div>
            <img
              src="/img-whatsapp.jpg"
              alt="Pedido confirmado sendo enviado pelo WhatsApp"
              className="preview-img"
            />
            <p className="preview-desc">Assim que o pedido é feito, o cliente recebe a confirmação completa com detalhes e previsão de entrega.</p>
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
            <div className="feature-icon"><FiDollarSign /></div>
            <h3>PIX Automatizado</h3>
            <p>QR Code exclusivo por pedido. O sistema confirma o pagamento automaticamente, sem precisar verificar comprovante.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMonitor /></div>
            <h3>Painel em Tempo Real</h3>
            <p>Você recebe um alerta sonoro a cada novo pedido. Gerencie e avance os status direto no painel.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FiMessageCircle /></div>
            <h3>Confirmação no WhatsApp</h3>
            <p>Cliente recebe os detalhes do pedido pelo WhatsApp automaticamente. Pode acompanhar o status pelo link.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing-section lp-container">
        <div className="preview-label">Planos</div>
        <h2 className="section-title">Preço justo, sem surpresas</h2>
        <p className="section-subtitle">
          Uma mensalidade fixa. Chega de perder 15–20% de cada pedido nos apps de delivery!
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
              onClick={() => navigate('/admin/login')}
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
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/login')}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img src={MenuLogo} alt="LanchoNet" style={{ height: '32px' }} />
              <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>LanchoNet</span>
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
          <p>© {new Date().getFullYear()} LanchoNet · Todos os direitos reservados · Suporte: (88) 98158-3938</p>
        </div>
      </footer>
    </div>
  );
}
