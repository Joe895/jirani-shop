import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Category, Product } from '../types';
import { get } from '../lib/api';
import { Busy, InlineError, PageIntro, ProductCard } from '../components/Shared';

export function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const [text, setText] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { setText(q); }, [q]);
  useEffect(() => { get<{ categories: Category[] }>('/catalog/categories').then(data => setCategories(data.categories)).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    get<{ products: Product[] }>(`/catalog/products?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort)}`)
      .then(data => { if (!cancelled) setProducts(data.products); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, q, sort]);
  const update = (key: string, value: string) => setParams(prev => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next; });
  return <><PageIntro overline="THE JIRANI COLLECTION" title="The good stuff lives here." description="Your favourite finds, all in one happy place. Browse, discover, fall in love."/>
    <section className="container shop-section"><div className="shop-top-bar"><div className="results-count"><SlidersHorizontal size={18}/><strong>Browse collection</strong><span>{products.length} products</span></div>
      <div className="shop-controls"><form className="shop-search" onSubmit={e => { e.preventDefault(); update('q', text.trim()); }}><Search size={17}/><input value={text} onChange={e => setText(e.target.value)} placeholder="Search products" aria-label="Search products"/><button type="submit">Search</button></form>
        <select value={sort} onChange={e => update('sort', e.target.value)} aria-label="Sort products"><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div></div>
      <div className="filter-chips"><button className={!category ? 'active' : ''} onClick={() => update('category', '')}>Everything</button>{categories.map(c => <button key={c.id} className={category === c.slug ? 'active' : ''} onClick={() => update('category', c.slug)}>{c.name}</button>)}{q && <button className="clear-filter" onClick={() => { update('q',''); setText(''); }}>“{q}” <X size={14}/></button>}</div>
      {loading ? <Busy/> : error ? <InlineError message={error}/> : products.length ? <div className="product-grid shop-products">{products.map(p => <ProductCard key={p.id} product={p}/>)}</div> : <div className="empty-state"><Search size={38}/><h2>No matches this time</h2><p>Try a different search or explore the whole collection.</p><Link to="/shop" className="btn btn-primary">Shop everything</Link></div>}
    </section>
  </>;
}
