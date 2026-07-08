const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/Financeiro.jsx', 'utf8');

// 1. Add pendente to STATUS_CONFIG
if (!content.includes('pendente:')) {
  content = content.replace(
    /atrasado: \{ label: 'Inadimplente',      color: '#ef4444', bg: 'rgba\(239,68,68,0.1\)',   icon: <FiAlertCircle \/> \},/,
    "atrasado: { label: 'Inadimplente',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <FiAlertCircle /> },\n  pendente: { label: 'Aguardando Pgto', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <FiClock /> },"
  );
}

// 2. Add Planos section if it's not there yet
if (!content.includes('PLANOS DISPONÍVEIS')) {
  const planosJSX = `
      {/* ===== PLANOS DISPONÍVEIS ===== */}
      <div className="fin-section-title" style={{ marginTop: 40 }}><FiCreditCard /> Planos Disponíveis</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Escolha o melhor plano para a sua loja e pague via AbacatePay.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
        {/* PIX RECORRENTE */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.5)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, right: 24, background: 'var(--accent)', color: '#000', padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 'bold' }}>RECOMENDADO</div>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 16, fontSize: '1.2rem' }}>PIX Recorrente</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 150<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Cobrança automática todo mês no seu PIX via AbacatePay. Sem dor de cabeça.</div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)' }}>Assinar com PIX</button>
        </div>

        {/* PIX AVULSO */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 16, fontSize: '1.2rem' }}>PIX Avulso</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 160<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Você gera um PIX manualmente todo mês para renovar a loja.</div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#4ade80', color: '#4ade80' }}>Pagar 1 Mês (PIX)</button>
        </div>

        {/* CARTÃO */}
        <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(96, 165, 250, 0.2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 16, fontSize: '1.2rem' }}>Cartão de Crédito</div>
          <div style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>De R$ 180</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8, color: '#60a5fa' }}>R$ 145<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Desconto exclusivo pagando 6 meses ou mais de uma vez. Aproveite a economia!</div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#60a5fa', color: '#60a5fa' }}>Assinar Semestral</button>
        </div>
      </div>
`;

  content = content.replace(
    '      {/* ===== PAGAMENTO DA MENSALIDADE ===== */}',
    planosJSX + '\n      {/* ===== PAGAMENTO DA MENSALIDADE ===== */}'
  );
}

fs.writeFileSync('src/pages/admin/Financeiro.jsx', content);
