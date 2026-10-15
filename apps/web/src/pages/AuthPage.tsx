import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { InlineError } from '../components/Shared';
export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, login, register: registerAccount } = useAuth();
  const [search] = useSearchParams();
  const next = search.get('next')?.startsWith('/') && !search.get('next')?.startsWith('//') ? search.get('next')! : '/orders';
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { const logged = register ? await registerAccount(name, email, password) : await login(email, password); navigate(logged.role === 'ADMIN' ? '/admin' : next, { replace: true }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : next} replace/>;
  return <section className="auth-section"><div className="container auth-grid"><div className="auth-side"><div className="auth-side-content"><div className="eyebrow">WELCOME TO YOUR NEIGHBOURHOOD SHOP</div><h2>Good finds.<br/><em>Good company.</em></h2><p>All your favourites, an easy checkout and a whole lot of neighbourhood love.</p><ul><li><CheckCircle2 size={17}/> Save your order history</li><li><CheckCircle2 size={17}/> Secure M-Pesa checkout</li><li><CheckCircle2 size={17}/> Keep track of your deliveries</li></ul></div><div className="auth-art"><ShoppingBag size={144}/><Sparkles size={36}/></div></div>
    <div className="auth-form-panel"><span className="eyebrow accent">{register ? 'JOIN THE JIRANI FAMILY' : 'HEY, GOOD TO SEE YOU!'}</span><h1>{register ? 'Create your account.' : 'Welcome back.'}</h1><p>{register ? 'Sign up and shop your favourites in minutes.' : 'Sign in to continue your shopping journey.'}</p>
      <form onSubmit={submit} className="auth-form">{register && <label>Your name<input autoComplete="name" required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amina Wanjiku"/></label>}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : 1} value={password} onChange={e => setPassword(e.target.value)} placeholder={register ? 'At least 10 characters' : 'Enter your password'}/></label>{error && <InlineError message={error}/>}<button disabled={busy} className="btn btn-primary btn-wide">{busy ? 'One moment…' : register ? 'Create account' : 'Sign in'} <ArrowRight size={19}/></button></form>
      <p className="auth-switch">{register ? 'Already part of the family?' : 'New to Jirani Shop?'} <Link to={`${register ? '/login' : '/register'}?next=${encodeURIComponent(next)}`}>{register ? 'Sign in' : 'Create an account'}</Link></p><div className="auth-safety"><LockKeyhole size={15}/> Your password is securely hashed. We never store M-Pesa PINs.</div>
    </div></div></section>;
}
