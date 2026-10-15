import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Code2, MapPin, Menu, Search, ShoppingBag, UserRound, X, Truck, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
export function Layout() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth(); const { count } = useCart();
  const submitSearch = (event: FormEvent) => { event.preventDefault(); navigate(`/shop?q=${encodeURIComponent(search.trim())}`); setMobileMenu(false); };
  return <div className="site-shell">
    <div className="announcement">Good things are closer than you think. <span>Free delivery on orders over KSh 5,000</span> <ArrowRight size={14} /></div>
    <div className="utility-bar"><div className="container utility-inner"><span><MapPin size={14}/> Proudly serving Kenya</span><span><Truck size={14}/> Delivery nationwide</span></div></div>
    <header className="site-header"><div className="container header-inner">
      <Link to="/" className="brand" aria-label="Jirani Shop Home"><span className="brand-symbol">j<span>.</span></span><span className="brand-name">jirani<span>shop</span><small>GOOD THINGS. CLOSER.</small></span></Link>
      <nav className="desktop-nav"><NavLink end to="/">Home</NavLink><NavLink to="/shop">Shop all</NavLink><NavLink to="/shop?category=electronics">Electronics</NavLink><NavLink to="/shop?category=fashion">Fashion</NavLink><NavLink to="/shop?category=home-living">Home & living</NavLink></nav>
      <div className="header-actions">
        <form className="header-search" onSubmit={submitSearch}><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search products" placeholder="What are you looking for?"/><button aria-label="Search"><Search size={19}/></button></form>
        <Link className="icon-button account-button" title="My account" to={user?.role === 'ADMIN' ? '/admin' : user ? '/orders' : '/login'}><UserRound size={21}/></Link>
        <Link className="icon-button bag-button" title="Shopping bag" to="/cart"><ShoppingBag size={22}/>{count > 0 && <span className="bag-count">{count}</span>}</Link>
        <button className="icon-button menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      </div>
    </div></header>
    {mobileMenu && <div className="mobile-nav"><div className="container"><form onSubmit={submitSearch} className="mobile-search"><input placeholder="Search the shop…" value={search} onChange={e => setSearch(e.target.value)}/><button><Search size={19}/></button></form>{[['Home','/'],['Shop all','/shop'],['Electronics','/shop?category=electronics'],['Fashion','/shop?category=fashion'],['Home & living','/shop?category=home-living'],['My orders','/orders']].map(([label,to])=><Link key={label} onClick={() => setMobileMenu(false)} to={to}>{label}</Link>)}</div></div>}
    <main><Outlet/></main>
    <section className="service-band"><div className="container service-grid">
      <div><span className="service-icon"><Truck size={23}/></span><span><strong>We deliver around Kenya</strong><small>From Nairobi to your neighbourhood</small></span></div>
      <div><span className="service-icon"><CreditCard size={23}/></span><span><strong>Easy M-Pesa checkout</strong><small>Pay simply and securely on your phone</small></span></div>
      <div><span className="service-icon"><Heart size={23}/></span><span><strong>Curated with care</strong><small>Everyday essentials, thoughtfully picked</small></span></div>
    </div></section>
    <footer className="site-footer"><div className="container footer-grid">
      <div className="footer-brand"><Link to="/" className="brand brand-light"><span className="brand-symbol">j<span>.</span></span><span className="brand-name">jirani<span>shop</span><small>GOOD THINGS. CLOSER.</small></span></Link><p>More than a shop. Your go-to corner of the internet for the things that make everyday life a little better.</p><span className="made-in">Made with <span>♥</span> for Kenya 🇰🇪</span></div>
      <div><h4>Explore</h4><Link to="/shop">Shop all products</Link><Link to="/shop?category=electronics">Electronics</Link><Link to="/shop?category=fashion">Fashion</Link><Link to="/shop?category=home-living">Home & living</Link></div>
      <div><h4>Your Jirani</h4><Link to="/orders">Track your orders</Link><Link to="/cart">Your shopping bag</Link><Link to="/login">Account & sign in</Link><Link to="/shop">Discover favourites</Link></div>
      <div><h4>Shop with confidence</h4><p><ShieldCheck size={16}/> Backend-verified checkout</p><p><CreditCard size={16}/> M-Pesa payment integration</p><p><Code2 size={16}/> A portfolio demonstration project</p><Link className="footer-cta" to="/shop">Find something good <ArrowRight size={16}/></Link></div>
    </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Jirani Shop. A demonstration e-commerce project.</span><span>Built for Kenya, crafted for the web.</span></div></footer>
  </div>;
}
