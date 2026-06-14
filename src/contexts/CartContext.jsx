import { createContext, useContext, useState } from 'react';

const CartContext = createContext({});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Cada adição agora gera um item único no carrinho, pois o mesmo produto pode ter adicionais/observações diferentes.
  function addItem(produto, observacao = '', adicionaisSelecionados = []) {
    setItems(prev => {
      // Calcular preço total unitário (Preço Base + Soma dos Adicionais)
      const precoAdicionais = adicionaisSelecionados.reduce((s, ad) => s + parseFloat(ad.preco), 0);
      const precoFinal = parseFloat(produto.preco) + precoAdicionais;

      return [...prev, { 
        ...produto, 
        cartItemId: Date.now().toString() + Math.random().toString(), 
        quantidade: 1, 
        observacao, 
        adicionais: adicionaisSelecionados,
        precoOriginal: produto.preco,
        precoCalculado: precoFinal
      }];
    });
  }

  function removeItem(cartItemId) {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  }

  function updateQuantidade(cartItemId, quantidade) {
    if (quantidade <= 0) return removeItem(cartItemId);
    setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantidade } : i));
  }

  function updateObservacao(cartItemId, observacao) {
    setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, observacao } : i));
  }

  function clearCart() { setItems([]); }

  // Total agora usa o precoCalculado
  const total = items.reduce((s, i) => s + i.precoCalculado * i.quantidade, 0);
  const totalItems = items.reduce((s, i) => s + i.quantidade, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantidade, updateObservacao, clearCart, total, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
