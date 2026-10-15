import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../types';
import { money } from '../types';
import { useCart } from '../contexts/CartContext';

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return <article className="product-card">
    <div className="product-art">
      <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`}><img src={product.imageUrl} alt={product.name} loading="lazy" /></Link>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button className="quick-add" type="button" disabled={product.stock === 0} title={`Add ${product.name} to bag`}
        onClick={() => { add(product); setAdded(true); window.setTimeout(() => setAdded(false), 1400); }}>
        {added ? 'Added ✓' : product.stock ? '+ Add to bag' : 'Sold out'}
      </button>
    </div>
    <div className="product-meta">
      <span className="eyebrow muted">{product.category?.name ?? 'Jirani Edit'}</span>
      <Link to={`/product/${product.slug}`} className="product-title">{product.name}</Link>
      <div className="price-line"><b>{money(product.price)}</b>{product.compareAt && <s>{money(product.compareAt)}</s>}</div>
    </div>
  </article>;
}
export function SectionHeader({ overline, title, subtitle, href, linkLabel }: { overline?: string; title: string; subtitle?: string; href?: string; linkLabel?: string }) {
  return <div className="section-head"><div>{overline && <span className="eyebrow accent">{overline}</span>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    {href && <Link className="text-link" to={href}>{linkLabel ?? 'View all'} <ArrowRight size={17} /></Link>}</div>;
}
export function PageIntro({ overline, title, description }: { overline?: string; title: string; description?: string }) {
  return <div className="page-intro"><div className="container">{overline && <div className="eyebrow accent">{overline}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div></div>;
}
export function Busy({ label = 'Getting things ready…' }: { label?: string }) { return <div className="state"><span className="spinner"/><p>{label}</p></div>; }
export function InlineError({ message }: { message: string }) { return <div className="error"><AlertCircle size={17}/><span>{message}</span></div>; }
export function Empty({ title, message, to = '/shop', button = 'Browse the shop' }: { title: string; message: string; to?: string; button?: string }) {
  return <div className="empty-state"><div className="empty-icon"><ShoppingBag size={33}/></div><h2>{title}</h2><p>{message}</p><Link to={to} className="btn btn-primary">{button} <ArrowRight size={18}/></Link></div>;
}
