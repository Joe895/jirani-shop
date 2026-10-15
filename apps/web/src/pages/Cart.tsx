import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Empty, PageIntro } from '../components/Shared';
import { money } from '../types';
export function Cart() {
  const { items, count, subtotal, changeQuantity, remove } = useCart();
  return <><PageIntro overline="READY WHEN YOU ARE" title="Your shopping bag." description="All your good finds, gathered in one place."/><section className="container bag-section">{!items.length ? <Empty title="Nothing in your bag (yet)" message="There's something lovely waiting around the corner."/> : <div className="bag-layout">
    <div className="bag-main"><div className="bag-heading"><h2>Your picks <span>({count})</span></h2><Link to="/shop"><ArrowLeft size={16}/> Continue shopping</Link></div>
      {items.map(({product,quantity}) => <div className="bag-item" key={product.id}><Link to={`/product/${product.slug}`} className="bag-item-image"><img src={product.imageUrl} alt={product.name}/></Link><div className="bag-item-details"><span className="eyebrow muted">{product.category?.name ?? 'Jirani Edit'}</span><Link to={`/product/${product.slug}`} className="bag-item-name">{product.name}</Link><b>{money(product.price)}</b><button className="remove-link" onClick={() => remove(product.id)}><Trash2 size={14}/> Remove</button></div><div className="bag-item-right"><strong>{money(product.price * quantity)}</strong><div className="quantity-stepper small"><button aria-label="Decrease quantity" onClick={() => quantity === 1 ? remove(product.id) : changeQuantity(product.id, quantity - 1)}><Minus size={15}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => changeQuantity(product.id, quantity + 1)}><Plus size={15}/></button></div></div></div>)}
    </div><aside className="order-summary"><div className="order-summary-head"><h3>Order summary</h3><p>You're one step away from something good.</p></div><div className="summary-row"><span>Subtotal ({count} items)</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Shipping</span><span>{subtotal >= 5000 ? 'FREE' : 'Calculated at checkout'}</span></div><hr/><div className="summary-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><Link to="/checkout" className="btn btn-primary btn-wide">Continue to checkout <ArrowRight size={19}/></Link><p className="summary-note"><Truck size={17}/> Free delivery for orders over KSh 5,000.</p></aside>
  </div>}</section></>;
}
