const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || '/webhook';

export async function criarCobranca(lojistaId, carrinho, clienteDados) {
  const res = await fetch(`${N8N_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lojista_id: lojistaId,
      itens: carrinho,
      total: clienteDados.total_final || carrinho.reduce((s, i) => s + (i.preco_calculado || i.preco || 0) * i.quantidade, 0),
      cliente: clienteDados,
    }),
  });
  return res.json();
}

export async function obterQRCodeWhatsApp(lojistaId) {
  const res = await fetch(`${N8N_BASE}/whatsapp-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId }),
  });
  return res.json();
}

export async function verificarStatusWhatsApp(lojistaId) {
  const res = await fetch(`${N8N_BASE}/whatsapp-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId }),
  });
  return res.json();
}

export async function desconectarWhatsApp(lojistaId) {
  const res = await fetch(`${N8N_BASE}/whatsapp-logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId }),
  });
  return res.json();
}

export async function obterNomeWhatsApp(lojistaId, number) {
  const res = await fetch(`${N8N_BASE}/whatsapp-profile-name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId, number }),
  });
  return res.json();
}

export async function gerarCobrancaMensalidade(lojistaId) {
  const res = await fetch(`${N8N_BASE}/saas-gerar-cobranca`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId }),
  });
  return res.json();
}

export async function cadastrarContaRecebimento(lojistaId, dadosBancarios) {
  const res = await fetch(`${N8N_BASE}/saas-cadastrar-conta-recebimento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lojista_id: lojistaId, ...dadosBancarios }),
  });
  return res.json();
}
