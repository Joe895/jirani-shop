import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, LogOut, PackageCheck, RefreshCcw, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { get, post } from '../lib/api';
import type { Order } from '../types';
import { money, niceStatus } from '../types';
import { Busy, Empty, InlineError, PageIntro } from '../components/Shared';
export function Orders() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setError(''); try { const data = await get<{ orders: Order[] }>('/orders/my'); setOrders(data.orders); } catch(e) { setError((e as Error).message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  async function cancel(id: string) { try { await post(`/orders/${id}/cancel`); await load(); } catch(e) { setError((e as Error).message); } }
  return <><PageIntro overline="YOUR JIRANI CORNER" title={`Hi, ${user?.name.split(' ')[0] ?? 'neighbour'}!`} description="Your orders, happy finds and everything in between."/>
    <section className="container orders-section"><div className="orders-header"><div className="user-chip"><div><UserRound size={21}/></div><span><strong>{user?.name}</strong><small>{user?.email}</small></span></div><div className="order-actions"><button className="btn btn-outline btn-small" onClick={() => { setLoading(true); void load(); }}><RefreshCcw size={16}/> Refresh</button><button className="btn btn-outline btn-small" onClick={async () => { await logout(); navigate('/'); }}><LogOut size={16}/> Sign out</button></div></div>
    <div className="order-list-heading"><h2>Order history</h2><span>{orders.length} orders</span></div>{error && <InlineError message={error}/>}{loading ? <Busy/> : !orders.length ? <Empty title="No orders yet" message="Your first favourite is out there waiting for you."/> : <div className="order-list">{orders.map(order => <article className="order-tile" key={order.id}><div className="order-tile-top"><div><span className="eyebrow muted">ORDER NUMBER</span><h3>{order.orderNumber}</h3><small>{new Date(order.createdAt).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'})}</small></div><span className={`status-pill status-${order.status.toLowerCase()}`}>{niceStatus(order.status)}</span></div><div className="order-thumbs">{order.items.slice(0,4).map(item => <img key={item.id} src={item.imageUrl} alt={item.name}/>)}<div>{order.items.length} item{order.items.length!==1?'s':''}<strong>{money(order.total)}</strong></div></div><div className="order-tile-bottom"><span><PackageCheck size={16}/>{order.county} · {order.town}</span><div>{order.status === 'PENDING_PAYMENT' && !order.payment && <button className="mini-action" onClick={() => cancel(order.id)}>Cancel unpaid order</button>}<Link className="text-link" to={`/orders/${order.id}`}>View details <ArrowRight size={16}/></Link></div></div></article>)}</div>}</section>
  </>;
}
export function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error,setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); get<{order:Order}>(`/orders/${id}`).then(data => setOrder(data.order)).catch(e => setError((e as Error).message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [id]);
  return <><PageIntro overline="YOUR ORDER" title="Order details."/><section className="container single-order-section"><Link to="/orders" className="text-link">← Back to orders</Link>{loading ? <Busy/> : error ? <InlineError message={error}/> : order && <div className="single-order-card"><div className="single-order-top"><div><span className="eyebrow muted">ORDER REFERENCE</span><h2>{order.orderNumber}</h2></div><span className={`status-pill status-${order.status.toLowerCase()}`}>{niceStatus(order.status)}</span></div><div className="single-order-items">{order.items.map(item => <div key={item.id}><img src={item.imageUrl} alt={item.name}/><div><strong>{item.name}</strong><small>Quantity: {item.quantity} × {money(item.unitPrice)}</small></div><b>{money(item.lineTotal)}</b></div>)}</div><div className="single-order-bottom"><div><h3>Delivery details</h3><p>{order.fullName}<br/>{order.phone}<br/>{order.address}<br/>{order.town}, {order.county}</p></div><div><h3>Payment summary</h3><p>Items: {money(order.subtotal)}<br/>Delivery: {money(order.deliveryFee)}<br/><b>Total: {money(order.total)}</b></p><p>Payment: {order.payment?.status ?? 'Not initiated'}</p>{order.payment?.failureReason && <p>{order.payment.failureReason}</p>}</div></div><button onClick={load} className="btn btn-outline btn-small">Refresh order status <RefreshCcw size={16}/></button></div>}</section></>;
}
