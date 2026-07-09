import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const CartContext = createContext({});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Cada adição agora gera um item único no carrinho, pois o mesmo produto pode ter adicionais/observações diferentes.
  const addItem = useCallback((produto, observacao = '', adicionaisSelecionados = []) => {
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
  }, []);

  const removeItem = useCallback((cartItemId) => {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantidade = useCallback((cartItemId, quantidade) => {
    if (quantidade <= 0) {
      setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
      return;
    }
    setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantidade } : i));
  }, []);

  const updateObservacao = useCallback((cartItemId, observacao) => {
    setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, observacao } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // Total agora usa o precoCalculado
  const total = useMemo(() => items.reduce((s, i) => s + i.precoCalculado * i.quantidade, 0), [items]);
  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantidade, 0), [items]);

  const value = useMemo(() => ({
    items, addItem, removeItem, updateQuantidade, updateObservacao, clearCart, total, totalItems
  }), [items, addItem, removeItem, updateQuantidade, updateObservacao, clearCart, total, totalItems]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
