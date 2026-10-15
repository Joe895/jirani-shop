import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, LockKeyhole, MapPin, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Empty, InlineError, PageIntro } from '../components/Shared';
import { get, post } from '../lib/api';
import { money, type Order } from '../types';

const counties = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang’a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita Taveta','Tana River','Tharaka Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];
type Mode = 'mock' | 'daraja';
type FormData = { fullName: string; phone: string; county: string; town: string; address: string; deliveryMethod: 'delivery' | 'pickup' };

export function Checkout() {
  const { user } = useAuth();
  const { items, count, subtotal, clear } = useCart();
  const [mode, setMode] = useState<Mode | null>(null);
  const [info, setInfo] = useState<FormData>({ fullName: user?.name ?? '', phone: '', county: 'Nairobi', town: '', address: '', deliveryMethod: 'delivery' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [phase, setPhase] = useState<'details' | 'pending' | 'paid' | 'cancelled'>('details');
  useEffect(() => { get<{mode:Mode}>('/payments/mode').then(data => setMode(data.mode)).catch(e => setError((e as Error).message)); }, []);
  useEffect(() => {
    if (phase !== 'pending' || mode !== 'daraja' || !order) return;
    let alive = true;
    const check = async () => {
      try {
        await post('/payments/mpesa/verify', { orderId: order.id });
        const result = await get<{ order: Order }>(`/orders/${order.id}`);
        if (!alive) return;
        setOrder(result.order);
        if (['PAID','PROCESSING','SHIPPED','DELIVERED'].includes(result.order.status)) { clear(); setPhase('paid'); }
        else if (result.order.status === 'CANCELLED') setPhase('cancelled');
      } catch { /* Network errors can be temporary. Keep order pending. */ }
    };
    const interval = window.setInterval(check, 7000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [phase, mode, order?.id, clear]);
  const shipping = info.deliveryMethod === 'pickup' || subtotal >= 5000 ? 0 : info.county === 'Nairobi' ? 250 : 450;
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy || !mode) return; setBusy(true); setError('');
    try {
      const result = await post<{order:Order}>('/orders', { ...info, items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })) });
      setOrder(result.order); setPhase('pending');
      if (mode === 'daraja') await post('/payments/mpesa/stk', { orderId: result.order.id });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function mockComplete() {
    if (!order) return; setBusy(true); setError('');
    try { await post('/payments/mock/complete', { orderId: order.id }); clear(); setPhase('paid'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (phase === 'paid') return <section className="checkout-result container"><div className="result-icon"><Check size={42}/></div><span className="eyebrow accent">ALL SORTED!</span><h1>Great choice, neighbour.</h1><p>Your order <b>{order?.orderNumber}</b> has been placed successfully. {mode === 'mock' ? 'This was a simulated payment; no money was charged.' : 'We have confirmed your M-Pesa payment.'}</p><div className="result-actions"><Link to="/orders" className="btn btn-primary">View my orders <ArrowRight size={19}/></Link><Link to="/shop" className="btn btn-outline">Keep shopping</Link></div></section>;
  if (phase === 'cancelled') return <section className="checkout-result container"><span className="eyebrow accent">PAYMENT NOT COMPLETED</span><h1>Let's try that again.</h1><p>The M-Pesa payment was cancelled or did not complete. No successful payment has been recorded. Your items are still in your shopping bag.</p><Link to="/cart" className="btn btn-primary">Back to bag <ArrowRight size={19}/></Link></section>;
  if (phase === 'pending') return <section className="checkout-result container"><div className="result-icon pending-icon"><Smartphone size={40}/></div><span className="eyebrow accent">JUST ONE MORE STEP</span><h1>{mode === 'mock' ? 'Ready for demo checkout?' : 'Check your phone.'}</h1>
    <p>{mode === 'mock' ? 'This portfolio project is currently in simulated M-Pesa mode. Select the button below to mark this demo order as paid. No actual money is sent.' : 'If the STK prompt arrives, enter your M-Pesa PIN on your phone. We will wait for payment confirmation before marking the order paid.'}</p>
    <div className="pending-order"><span>Order reference</span><strong>{order?.orderNumber}</strong><span>Amount</span><strong>{money(order?.total ?? 0)}</strong></div>
    {error && <InlineError message={error}/>}<div className="result-actions">{mode === 'mock' && <button onClick={mockComplete} disabled={busy} className="btn btn-primary">{busy ? 'Finishing demo…' : 'Complete demo payment'} <CheckCircle2 size={18}/></button>}<Link to="/orders" className="btn btn-outline">View order status <ArrowRight size={17}/></Link></div>
    {mode === 'daraja' && <p className="help-text">Still pending? Keep this page open, or check your order history later. Never send an M-Pesa PIN through this website.</p>}
  </section>;
  if (!items.length) return <><PageIntro title="Your checkout"/><div className="container"><Empty title="Your bag is empty" message="Find something good first, then head back to checkout."/></div></>;
  return <><PageIntro overline="YOUR ORDER, YOUR WAY" title="Easy as one, two, Jirani." description="A few details and you're on your way to something good."/>
    <section className="container checkout-section"><div className="checkout-layout"><div className="checkout-main"><div className="checkout-step"><span>01</span><div><h2>Delivery details</h2><p>Where should we send your goodies?</p></div></div>
      <form id="checkout-form" onSubmit={submit} className="checkout-form"><div className="input-grid"><label>Full name<input required minLength={2} value={info.fullName} onChange={e => setInfo({...info,fullName:e.target.value})} placeholder="Your full name"/></label><label>M-Pesa phone number<input required type="tel" value={info.phone} onChange={e => setInfo({...info,phone:e.target.value})} placeholder="0712 345 678"/></label><label>County<select required value={info.county} onChange={e => setInfo({...info,county:e.target.value})}>{counties.map(c => <option key={c}>{c}</option>)}</select></label><label>Town / estate<input required value={info.town} onChange={e => setInfo({...info,town:e.target.value})} placeholder="e.g. Kilimani"/></label></div><label>Delivery address<input required={info.deliveryMethod === 'delivery'} value={info.address} onChange={e => setInfo({...info,address:e.target.value})} placeholder="Street, building, apartment, landmark"/></label>
      <div className="payment-step"><div className="checkout-step"><span>02</span><div><h2>Payment method</h2><p>Fast, familiar and Kenyan.</p></div></div><div className="payment-method"><span className="mpesa-icon">M<span>•</span>PESA</span><div><strong>M-Pesa STK Push</strong><small>{mode === 'mock' ? 'Demo mode — no actual money changes hands' : 'Secure prompt to your phone after placing order'}</small></div><span className="payment-checked"><Check size={17}/></span></div><div className="security-note"><LockKeyhole size={17}/> We never ask you to enter your M-Pesa PIN on this website.</div></div>
      {error && <InlineError message={error}/>}<button disabled={busy || !mode} type="submit" className="btn btn-primary checkout-submit">{busy ? 'Preparing your order…' : 'Place order & continue to payment'} <ArrowRight size={19}/></button><Link className="checkout-back" to="/cart"><ArrowLeft size={16}/> Back to shopping bag</Link>
      </form></div><aside className="order-summary checkout-summary"><h3>Order summary</h3><div className="checkout-item-list">{items.map(i => <div className="checkout-mini-item" key={i.product.id}><img src={i.product.imageUrl} alt={i.product.name}/><span>{i.product.name}<small>Qty {i.quantity}</small></span><strong>{money(i.product.price * i.quantity)}</strong></div>)}</div>
      <div className="summary-row"><span>Subtotal ({count} items)</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{shipping === 0 ? 'FREE' : money(shipping)}</strong></div><hr/><div className="summary-total"><span>Estimated total</span><strong>{money(subtotal+shipping)}</strong></div><p className="summary-note"><ShieldCheck size={17}/> Final totals are recalculated securely by the server.</p><p className="summary-note"><MapPin size={17}/> Shipping: Nairobi KSh 250, other counties KSh 450. Free above KSh 5,000.</p><p className="summary-note"><CreditCard size={17}/> M-Pesa checkout for Kenyan mobile numbers.</p></aside></div></section>
  </>;
}
