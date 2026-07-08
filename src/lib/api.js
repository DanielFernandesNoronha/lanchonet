import { api } from './apiClient';

const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || '/webhook';

export async function criarCobranca(lojistaId, carrinho, clienteDados, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${N8N_BASE}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      lojista_id: lojistaId,
      itens: carrinho,
      total: clienteDados.total_final || carrinho.reduce((s, i) => s + (i.preco_calculado || i.preco || 0) * i.quantidade, 0),
      cliente: clienteDados,
    }),
  });
  return res.json();
}

export async function obterQRCodeWhatsApp(lojistaId, token = '') {
  const res = await api.post('/lojistas/whatsapp/qr');
  return res;
}

export async function verificarStatusWhatsApp(lojistaId, token = '') {
  const res = await api.get('/lojistas/whatsapp/status');
  return res;
}

export async function desconectarWhatsApp(lojistaId, token = '') {
  const res = await api.delete('/lojistas/whatsapp/logout');
  return res;
}

export async function obterNomeWhatsApp(lojistaId, number, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${N8N_BASE}/whatsapp-profile-name`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lojista_id: lojistaId, number }),
  });
  return res.json();
}

export async function gerarCobrancaMensalidade(lojistaId, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || localStorage.getItem('lanchonet_token');
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}/lojistas/assinatura/gerar-pix`, {
    method: 'POST',
    headers,
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
