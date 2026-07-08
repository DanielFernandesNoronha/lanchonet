const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/Financeiro.jsx', 'utf8');

const modelos = `
          {/* Planos (Modelos de Assinatura) */}
          <div style={{ marginTop: 40, marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Planos Disponíveis</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Escolha o melhor plano para a sua loja e pague via AbacatePay.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -12, right: 24, background: 'var(--accent)', color: '#000', padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 'bold' }}>RECOMENDADO</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 16, fontSize: '1.2rem' }}>PIX Recorrente</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 150<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Cobrança automática todo mês no seu PIX via AbacatePay. Sem dor de cabeça.</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Assinar com PIX</button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 16, fontSize: '1.2rem' }}>PIX Avulso</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 160<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Você gera um PIX manualmente todo mês para renovar a loja.</div>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#4ade80', color: '#4ade80' }}>Pagar 1 Mês (PIX)</button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid rgba(96, 165, 250, 0.2)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, color: '#60a5fa', marginBottom: 16, fontSize: '1.2rem' }}>Cartão (6 Meses)</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>R$ 145<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/mês</span></div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: 24 }}>Plano semestral cobrado no cartão de crédito. Maior economia para o seu negócio!</div>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#60a5fa', color: '#60a5fa' }}>Assinar Semestral</button>
              </div>
            </div>
          </div>
`;

content = content.replace(
  '{/* TAB: HISTÓRICO */}',
  modelos + '\n\n          {/* TAB: HISTÓRICO */}'
);

fs.writeFileSync('src/pages/admin/Financeiro.jsx', content);
