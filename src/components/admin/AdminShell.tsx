import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Plus, ShoppingBag, Store, Boxes, LogOut, Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../lib/supabase';

const tabs = [
  { to: '/admin/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Produits', icon: Package },
  { to: '/admin/products/new', label: 'Ajouter', icon: Plus, primary: true },
  { to: '/admin/inventory', label: 'Stock', icon: Boxes },
  { to: '/admin/orders', label: 'Commandes', icon: ShoppingBag },
];

interface OrderToast {
  id: string;
  orderId: number;
  customerName: string;
  total: number;
}

export default function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [toasts, setToasts] = useState<OrderToast[]>([]);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const dismissToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  // Realtime Supabase — notifie l'admin instantanément à chaque nouvelle commande, sans refresh manuel.
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-orders-toast')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new as any;
        const toastId = `${o.id}-${Date.now()}`;
        setToasts(t => [...t, { id: toastId, orderId: o.id, customerName: o.customer_name, total: Number(o.total || 0) }]);
        setTimeout(() => dismissToast(toastId), 6000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-softgray">
      {/* Toasts — nouvelles commandes en temps réel */}
      <div className="fixed top-3 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              className="pointer-events-auto w-full max-w-md bg-burgundy text-white rounded-2xl shadow-lift p-3.5 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <button
                onClick={() => { navigate('/admin/orders'); dismissToast(t.id); }}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium">Nouvelle commande #{t.orderId}</p>
                <p className="text-xs text-white/70">{t.customerName} · {t.total.toFixed(0)} DA</p>
              </button>
              <button onClick={() => dismissToast(t.id)} className="tap p-1 text-white/60 hover:text-white shrink-0">
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-bordergray/70">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="tap"><Store size={18} className="text-burgundy" /></Link>
            <div>
              <span className="font-serif text-base leading-none">Laila</span>
              <span className="text-[9px] text-ink/40 tracking-[0.25em] ml-1">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {title && <span className="font-serif text-sm text-ink/70 hidden sm:block">{title}</span>}
            <button onClick={handleLogout} className="tap p-2 text-ink/40 hover:text-rose"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-5 pb-28 pt-4">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto h-16 grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, primary }) => {
            const active = loc.pathname === to;
            return (
              <button key={to} onClick={() => navigate(to)} className="tap flex flex-col items-center justify-center gap-0.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${primary ? 'bg-burgundy text-white shadow-lift' : active ? 'bg-burgundy/10 text-burgundy' : 'text-ink/40'}`}>
                  <Icon size={16} strokeWidth={primary ? 2.2 : 1.7} />
                </div>
                <span className={`text-[8px] tracking-wide ${active || primary ? 'text-burgundy font-medium' : 'text-ink/40'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
