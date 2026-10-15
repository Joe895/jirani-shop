import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, CreditCard, PackageCheck, Plus, RefreshCcw, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import type { Category, Order, Product } from '../types';
import { money, niceStatus } from '../types';
import { get, post, patch } from '../lib/api';
import { Busy, InlineError, PageIntro } from '../components/Shared';

type Overview = { customers: number; products: number; orders: number; paidOrders: number; revenue: number; recentOrders: Order[] };
const blank = { name: '', description: '', price: '', stock: '', categoryId: '', imageUrl: '', compareAt: '', badge: '', featured: false };
export function Admin() {
  const [tab, setTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  async function load() {
    setError('');
    try {
      const [o,p,ord,c] = await Promise.all([get<Overview>('/admin/overview'),get<{products:Product[]}>('/admin/products'),get<{orders:Order[]}>('/admin/orders'),get<{categories:Category[]}>('/catalog/categories')]);
      setOverview(o); setProducts(p.products); setOrders(ord.orders); setCategories(c.categories);
    } catch(e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function editProduct(product: Product) {
    setEditing(product.id); setFormOpen(true); setTab('products');
    setForm({ name: product.name, description: product.description, price: String(product.price), stock: String(product.stock), categoryId: product.categoryId, imageUrl: product.imageUrl, compareAt: product.compareAt ? String(product.compareAt) : '', badge: product.badge ?? '', featured: product.featured });
  }
  async function saveProduct(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const payload = { name: form.name, description: form.description, price: Number(form.price), stock: Number(form.stock), categoryId: form.categoryId, imageUrl: form.imageUrl, compareAt: form.compareAt ? Number(form.compareAt) : null, badge: form.badge || null, featured: form.featured };
      if (editing) await patch(`/admin/products/${editing}`, payload); else await post('/admin/products', payload);
      setSuccess(editing ? 'Product updated.' : 'New product added.'); setEditing(null); setForm(blank); setFormOpen(false); await load();
    } catch(e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function toggleActive(product: Product) {
    try { await patch(`/admin/products/${product.id}`, { isActive: !product.isActive }); setSuccess('Product visibility updated.'); await load(); }
    catch(e) { setError((e as Error).message); }
  }
  async function advanceOrder(order: Order) {
    const next: Record<string, string> = { PAID:'PROCESSING', PROCESSING:'SHIPPED', SHIPPED:'DELIVERED' };
    const status = next[order.status]; if (!status) return;
    try { await patch(`/admin/orders/${order.id}/status`, { status }); setSuccess(`Order moved to ${niceStatus(status)}.`); await load(); }
    catch(e) { setError((e as Error).message); }
  }
  return <><PageIntro overline="JIRANI CONTROL ROOM" title="Shop management." description="A little overview of the big things happening at your shop."/>
    <section className="container admin-section"><div className="admin-top"><span><ShieldCheck size={17}/> Admin access</span><Link to="/shop">View storefront <ArrowRight size={17}/></Link><button onClick={() => { setLoading(true); void load(); }}><RefreshCcw size={17}/> Refresh</button></div>
      <div className="admin-tabs"><button className={tab==='overview'?'active':''} onClick={() => setTab('overview')}><BarChart3 size={17}/> Overview</button><button className={tab==='products'?'active':''} onClick={() => setTab('products')}><Boxes size={17}/> Products</button><button className={tab==='orders'?'active':''} onClick={() => setTab('orders')}><PackageCheck size={17}/> Orders</button></div>
      {error && <InlineError message={error}/>} {success && <div className="success"><PackageCheck size={17}/>{success}</div>}
      {loading ? <Busy/> : <>
        {tab==='overview' && <><div className="admin-stats"><div><span><CreditCard size={21}/></span><small>Confirmed revenue</small><strong>{money(overview?.revenue ?? 0)}</strong><p>Paid, processing and fulfilled orders</p></div><div><span><ShoppingBag size={21}/></span><small>Orders placed</small><strong>{overview?.orders ?? 0}</strong><p>{overview?.paidOrders ?? 0} paid orders</p></div><div><span><Boxes size={21}/></span><small>Live products</small><strong>{overview?.products ?? 0}</strong><p>Products visible in the shop</p></div><div><span><Users size={21}/></span><small>Customers</small><strong>{overview?.customers ?? 0}</strong><p>Registered shopper accounts</p></div></div>
          <div className="admin-table-block"><div className="admin-block-head"><div><span className="eyebrow accent">WHAT'S NEW</span><h2>Recent orders</h2></div><button className="text-link" onClick={() => setTab('orders')}>Manage orders <ArrowRight size={16}/></button></div><div className="table-scroller"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>{overview?.recentOrders.map(o=><tr key={o.id}><td><b>{o.orderNumber}</b></td><td>{o.user?.name}</td><td>{new Date(o.createdAt).toLocaleDateString('en-KE')}</td><td><b>{money(o.total)}</b></td><td><span className={`status-pill status-${o.status.toLowerCase()}`}>{niceStatus(o.status)}</span></td></tr>)}</tbody></table>{!overview?.recentOrders.length && <p className="admin-empty">No orders yet.</p>}</div></div></>}
        {tab==='products' && <><div className="admin-block-head"><div><span className="eyebrow accent">PRODUCT CATALOGUE</span><h2>Stock & products <span className="small-number">({products.length})</span></h2></div><button className="btn btn-primary btn-small" onClick={() => {setEditing(null);setForm(blank);setFormOpen(!formOpen);}}><Plus size={17}/> Add product</button></div>
          {formOpen && <form className="admin-product-form" onSubmit={saveProduct}><h3>{editing ? 'Edit product' : 'Create a new product'}</h3><div className="input-grid"><label>Product name<input required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Category<select value={form.categoryId} required onChange={e=>setForm({...form,categoryId:e.target.value})}><option value="">Select category</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Price (KSh)<input type="number" min={1} required value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Compare-at price (optional)<input type="number" min={1} value={form.compareAt} onChange={e=>setForm({...form,compareAt:e.target.value})}/></label><label>Available stock<input type="number" min={0} required value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>Badge (optional)<input value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="New, Bestseller…"/></label></div><label>Description<textarea required minLength={10} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Image URL<input type="url" required value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://images.example.com/product.jpg"/></label><label className="check-row"><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Feature on homepage</label><div className="admin-form-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save product'} <ArrowRight size={18}/></button><button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Cancel</button></div></form>}
          <div className="admin-table-block"><div className="table-scroller"><table className="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Action</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><div className="admin-product-cell"><img src={p.imageUrl} alt=""/><div><b>{p.name}</b><small>{p.category?.name}</small></div></div></td><td>{money(p.price)}</td><td><span className={p.stock<5?'low-stock':''}>{p.stock}</span></td><td>{p.isActive ? 'Live' : 'Hidden'}</td><td><div className="admin-actions"><button onClick={()=>editProduct(p)}>Edit</button><button onClick={()=>toggleActive(p)}>{p.isActive?'Hide':'Show'}</button></div></td></tr>)}</tbody></table></div></div></>}
        {tab==='orders' && <><div className="admin-block-head"><div><span className="eyebrow accent">FULFILMENT DESK</span><h2>All orders <span className="small-number">({orders.length})</span></h2></div></div><div className="admin-order-list">{orders.map(order => <article className="admin-order-card" key={order.id}><div><span className="eyebrow muted">{order.orderNumber}</span><h3>{order.user?.name ?? order.fullName}</h3><p>{order.town}, {order.county} · {order.items.length} item(s)</p><small>{order.phone} · {new Date(order.createdAt).toLocaleString('en-KE')}</small></div><div><strong>{money(order.total)}</strong><span className={`status-pill status-${order.status.toLowerCase()}`}>{niceStatus(order.status)}</span></div><div className="admin-order-control">{['PAID','PROCESSING','SHIPPED'].includes(order.status) ? <button className="btn btn-primary btn-small" onClick={()=>advanceOrder(order)}>Mark {niceStatus(({PAID:'PROCESSING',PROCESSING:'SHIPPED',SHIPPED:'DELIVERED'} as Record<string,string>)[order.status])} <ArrowRight size={16}/></button> : <span className="muted">{order.status === 'PENDING_PAYMENT' ? 'Awaiting verified payment' : 'No further action'}</span>}</div></article>)}{!orders.length && <p className="admin-empty">Your first order will appear here.</p>}</div></>}
      </>}
    </section>
  </>;
}
