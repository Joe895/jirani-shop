import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CreditCard, MapPin, PackageCheck, Sparkles } from 'lucide-react';
import type { Category, Product } from '../types';
import { get } from '../lib/api';
import { Busy, InlineError, ProductCard, SectionHeader } from '../components/Shared';

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([get<{ products: Product[] }>('/catalog/products?featured=true'), get<{ categories: Category[] }>('/catalog/categories')])
      .then(([p,c]) => { setProducts(p.products); setCategories(c.categories); })
      .catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);
  return <>
    <section className="hero container"><div className="hero-copy"><div className="hero-pill"><span className="hero-pill-dot"/> THIS IS YOUR KIND OF SHOP</div>
      <h1>Good things.<br/><em>Closer to you.</em></h1>
      <p>From the little essentials to your next big favourite. Discover beautifully chosen products, delivered to your doorstep across Kenya.</p>
      <div className="hero-actions"><Link to="/shop" className="btn btn-dark">Explore the shop <ArrowUpRight size={19}/></Link><Link to="/shop?category=fashion" className="hero-secondary">Find your style <ArrowRight size={18}/></Link></div>
      <div className="hero-foot"><div className="hero-foot-kenya">🇰🇪</div><div><strong className="hero-foot-title">Rooted in Kenya</strong><small>Good finds for every neighbourhood.</small></div></div>
    </div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=88" alt="Warm, modern shop interior"/><div className="hero-visual-overlay"/><div className="hero-float-card"><div className="float-icon"><Sparkles size={21}/></div><div><small>THE JIRANI EDIT</small><strong>Everyday made better.</strong></div><ArrowUpRight size={20}/></div><div className="hero-number">01 <span>/ 04</span></div></div></section>
    <div className="container"><section className="perks-row"><div><PackageCheck size={19}/><strong>Thoughtfully chosen finds</strong></div><i/><div><CreditCard size={19}/><strong>Seamless M-Pesa checkout</strong></div><i/><div><MapPin size={19}/><strong>Across Kenya, with care</strong></div></section></div>
    <section className="section container category-section"><SectionHeader overline="FIND YOUR THING" title="A little something for everyone." subtitle="Whatever your day calls for, we've got a corner for it." href="/shop" linkLabel="Shop everything"/>
      {loading ? <Busy/> : error ? <InlineError message={error}/> : <div className="category-grid">{categories.map((cat, idx) => <Link className={`category-card category-${idx}`} key={cat.id} to={`/shop?category=${cat.slug}`}>
        <img src={cat.imageUrl ?? ''} alt={cat.name}/><div className="category-overlay"/><div className="category-content"><span>{String(idx+1).padStart(2,'0')} / COLLECTION</span><strong>{cat.name}</strong><small>{cat.tagline}</small></div><span className="category-arrow"><ArrowUpRight size={20}/></span>
      </Link>)}</div>}
    </section>
    <section className="section product-section container"><SectionHeader overline="HANDPICKED FOR YOU" title="Meet your new favourites." subtitle="Good finds don't have to be hard to come by." href="/shop" linkLabel="See all products"/>
      {loading ? <Busy/> : error ? <InlineError message={error}/> : products.length ? <div className="product-grid">{products.slice(0,8).map(product => <ProductCard key={product.id} product={product}/>)}</div> : <p>No featured products yet. Add products in the admin dashboard.</p>}
    </section>
    <section className="feature-panel container"><div className="feature-panel-image"><img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1100&q=85" alt="Shopping bags and gifts"/><span className="feature-sticker">MADE FOR<br/><b>YOUR DAY</b></span></div><div className="feature-panel-content"><div className="eyebrow">A FRIENDLY REMINDER</div><h2>Life's busy.<br/><em>Shopping shouldn't be.</em></h2><p>Skip the queues, save the time, and shop what you love from wherever you are. Easy checkout, everyday prices, and a little neighbourhood spirit.</p><ul><li><span>01</span> Shop the things you actually need</li><li><span>02</span> Checkout using M-Pesa</li><li><span>03</span> We'll handle the rest</li></ul><Link className="btn btn-primary" to="/shop">Discover Jirani Shop <ArrowRight size={19}/></Link></div></section>
    <section className="newsletter-panel container"><div><span className="eyebrow">COME ON IN</span><h2>There's always something good around the corner.</h2><p>Discover easy finds for everyday Kenyan living.</p></div><Link to="/shop" className="btn btn-cream">Find your next favourite <ArrowUpRight size={19}/></Link></section>
  </>;
}
