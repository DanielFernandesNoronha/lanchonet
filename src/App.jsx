import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/ProtectedRoute';

// Client Pages
import Cardapio from './pages/client/Cardapio';
import Checkout from './pages/client/Checkout';
import MeusPedidos from './pages/client/MeusPedidos';

// Admin Pages
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Produtos from './pages/admin/Produtos';
import Pedidos from './pages/admin/Pedidos';
import WhatsApp from './pages/admin/WhatsApp';
import Configuracoes from './pages/admin/Configuracoes';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'toast-custom',
              duration: 3000,
            }}
          />
          <Routes>
            {/* Client routes */}
            <Route path="/:slug" element={<Cardapio />} />
            <Route path="/:slug/checkout" element={<Checkout />} />
            <Route path="/:slug/pedidos" element={<MeusPedidos />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route index element={<Pedidos />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="whatsapp" element={<WhatsApp />} />
              <Route path="config" element={<Configuracoes />} />
            </Route>

            <Route path="/" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
