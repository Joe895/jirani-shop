export type Category = { id: string; name: string; slug: string; tagline?: string | null; imageUrl?: string | null };
export type Product = {
  id: string; name: string; slug: string; description: string; price: number; compareAt?: number | null;
  stock: number; imageUrl: string; badge?: string | null; featured: boolean; isActive: boolean;
  categoryId: string; category?: Category;
};
export type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' };
export type CartItem = { product: Product; quantity: number };
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type OrderItem = { id: string; name: string; imageUrl: string; unitPrice: number; quantity: number; lineTotal: number };
export type Order = {
  id: string; orderNumber: string; fullName: string; phone: string; county: string; town: string; address: string;
  deliveryMethod: string; subtotal: number; deliveryFee: number; total: number; status: OrderStatus;
  createdAt: string; items: OrderItem[]; payment?: { status: string; failureReason?: string | null } | null;
  user?: { name: string; email?: string };
};
export const money = (amount: number): string => `KSh ${Number(amount).toLocaleString('en-KE')}`;
export const niceStatus = (status: string): string => status.toLowerCase().split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
