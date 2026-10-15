import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';
type CartContextValue = {
  items: CartItem[]; count: number; subtotal: number;
  add: (product: Product, quantity?: number) => void;
  changeQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void; clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
function initialCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem('jirani_cart') ?? '[]') as CartItem[];
    return Array.isArray(saved) ? saved.filter(i => i?.product?.id && Number.isInteger(i.quantity) && i.quantity > 0) : [];
  } catch { return []; }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initialCart);
  useEffect(() => { localStorage.setItem('jirani_cart', JSON.stringify(items)); }, [items]);
  function add(product: Product, quantity = 1) {
    setItems(current => {
      const exists = current.find(item => item.product.id === product.id);
      if (exists) return current.map(item => item.product.id === product.id ? { product, quantity: Math.min(product.stock, item.quantity + quantity) } : item);
      return [...current, { product, quantity: Math.min(product.stock, quantity) }];
    });
  }
  function changeQuantity(id: string, quantity: number) {
    setItems(current => current.map(item => item.product.id === id ? { ...item, quantity: Math.min(item.product.stock, Math.max(1, quantity)) } : item));
  }
  function remove(id: string) { setItems(current => current.filter(item => item.product.id !== id)); }
  function clear() { setItems([]); }
  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);
  return <CartContext.Provider value={{ items, count, subtotal, add, changeQuantity, remove, clear }}>{children}</CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('CartProvider missing'); return context; }
