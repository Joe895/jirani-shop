import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/Layout';
import { Busy, Empty, PageIntro } from './components/Shared';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { AuthPage } from './pages/AuthPage';
import { Orders, OrderDetails } from './pages/Orders';
import { Admin } from './pages/Admin';
import './styles.css';
function Protected({children, admin = false}: {children: React.ReactNode; admin?: boolean}) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container"><Busy label="Loading your account…"/></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname)}`} replace/>;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace/>;
  return <>{children}</>;
}
function NotFound() { return <><PageIntro title="Well, this is awkward." description="Looks like you've wandered into a quiet corner of the neighbourhood."/><div className="container"><Empty title="Page not found" message="Let's get you back to the good stuff."/></div></>; }
function App() { return <BrowserRouter><AuthProvider><CartProvider><Routes><Route element={<Layout/>}>
  <Route index element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:slug" element={<ProductDetails/>}/>
  <Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Protected><Checkout/></Protected>}/>
  <Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/>
  <Route path="/orders" element={<Protected><Orders/></Protected>}/><Route path="/orders/:id" element={<Protected><OrderDetails/></Protected>}/>
  <Route path="/admin" element={<Protected admin><Admin/></Protected>}/><Route path="*" element={<NotFound/>}/>
</Route></Routes></CartProvider></AuthProvider></BrowserRouter>; }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
