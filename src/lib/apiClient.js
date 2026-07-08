// Cliente HTTP centralizado para o novo backend Node.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('lanchonet_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Se o body for FormData (para upload), o fetch adiciona automaticamente o Content-Type correto com o boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Erro na requisição';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    
    // Se token expirado ou inválido e não for rota de login
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('lanchonet_token');
      localStorage.removeItem('lanchonet_user');
      window.location.href = '/admin/login';
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: (endpoint) => fetchAPI(endpoint, { method: 'GET' }),
  post: (endpoint, body) => fetchAPI(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (endpoint, body) => fetchAPI(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => fetchAPI(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => fetchAPI(endpoint, { method: 'DELETE' }),
};

export const SSE_URL = `${API_URL}/pedidos/stream`;
