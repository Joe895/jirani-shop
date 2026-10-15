import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { get } from '../lib/api';
import type { Product } from '../types';
import { money } from '../types';
import { Busy, InlineError, PageIntro } from '../components/Shared';
export function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  useEffect(() => { setLoading(true); setError(''); setAdded(false); get<{ product: Product }>(`/catalog/products/${slug}`).then(data => setProduct(data.product)).catch(e => setError((e as Error).message)).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <div className="container"><Busy/></div>;
  if (error || !product) return <><PageIntro title="Something's missing"/><div className="container"><InlineError message={error || 'Product not found'}/><Link to="/shop" className="text-link">Back to shop <ArrowRight size={16}/></Link></div></>;
  return <section className="container product-detail-section"><div className="breadcrumb"><Link to="/shop"><ArrowLeft size={15}/> Shop</Link><span>/</span><Link to={`/shop?category=${product.category?.slug ?? ''}`}>{product.category?.name}</Link><span>/</span>{product.name}</div>
    <div className="product-detail-grid"><div className="detail-image"><img src={product.imageUrl} alt={product.name}/>{product.badge && <span className="product-badge">{product.badge}</span>}</div>
      <div className="detail-content"><span className="eyebrow accent">{product.category?.name} / THE JIRANI EDIT</span><h1>{product.name}</h1><div className="detail-price"><strong>{money(product.price)}</strong>{product.compareAt && <s>{money(product.compareAt)}</s>}</div><p className="detail-description">{product.description}</p>
        <div className="detail-stock"><CheckCircle2 size={17}/>{product.stock > 0 ? `${product.stock} in stock · ready to order` : 'Currently unavailable'}</div>
        <div className="detail-purchase"><div className="quantity-stepper"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={16}/></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} aria-label="Increase quantity"><Plus size={16}/></button></div><button className="btn btn-primary btn-add" disabled={product.stock <= 0} onClick={() => { add(product, quantity); setAdded(true); }}><ShoppingBag size={19}/>{added ? 'Added to your bag!' : 'Add to shopping bag'} <ArrowRight size={18}/></button></div>
        {added && <Link className="text-link detail-view-bag" to="/cart">View shopping bag <ArrowRight size={17}/></Link>}
        <div className="detail-benefits"><p><Truck size={19}/> Nationwide delivery. Free over KSh 5,000.</p><p><ShieldCheck size={19}/> Secure order verification and M-Pesa checkout.</p><p><CheckCircle2 size={19}/> Prices are shown in Kenyan shillings.</p></div>
      </div></div></section>;
}
