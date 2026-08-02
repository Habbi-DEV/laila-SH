import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Plus, ShoppingBag, Store, Boxes, LogOut, Bell, X, Menu, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../lib/supabase';

const NAV = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Produits', icon: Package },
  { to: '/admin/products/new', label: 'Ajouter un produit', icon: Plus },
  { to: '/admin/inventory', label: 'Stock', icon: Boxes },
  { to: '/admin/orders', label: 'Commandes', icon: ShoppingBag },
];

// Barre mobile (bas d'écran) — sous-ensemble des 5 actions principales,
// gardée pour un accès rapide au pouce sur petit écran.
const MOBILE_TABS = [
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

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-6 pb-6 pt-7">
        <Link to="/" className="inline-flex items-center gap-2">
          <p className="font-serif text-[24px] font-bold text-white">
            Laila<span className="text-gold">.</span>
          </p>
        </Link>
        <p className="mt-0.5 text-[8.5px] font-semibold tracking-[0.4em] text-white/35">
          ADMINISTRATION
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => {
          const active = end ? pathname === to : pathname === to || pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition ${
                active ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-nav-bar"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gold"
                />
              )}
              <Icon size={17} className={active ? 'text-gold' : ''} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Return to storefront */}
      <div className="px-3 pb-3">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-burgundy px-4 py-3 text-[12.5px] font-bold text-white shadow-lift transition hover:bg-burgundy-dark"
        >
          <Globe size={15} />
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
}

export default function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <div className="flex min-h-screen bg-softgray">
      {/* Toasts — nouvelles commandes en temps réel */}
      <div className="fixed top-3 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none lg:left-64 lg:right-0">
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

      {/* Desktop sidebar — toujours visible à partir de lg */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-ink lg:block">
        <SidebarContent pathname={loc.pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-ink px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="tap flex h-9 w-9 items-center justify-center rounded-lg text-white"
        >
          <Menu size={19} />
        </button>
        <p className="font-serif text-lg font-bold text-white">
          Laila<span className="text-gold">.</span>
        </p>
        <button onClick={handleLogout} className="tap flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-rose">
          <LogOut size={16} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-full w-72 bg-ink"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="tap absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
              <SidebarContent pathname={loc.pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* En-tête desktop (titre de page + déconnexion) */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-bordergray/70 bg-white/85 px-8 backdrop-blur-xl lg:flex">
          <span className="font-serif text-lg text-ink/80">{title || 'Tableau de bord'}</span>
          <button onClick={handleLogout} className="tap flex items-center gap-1.5 text-sm text-ink/40 hover:text-rose">
            <LogOut size={15} /> Déconnexion
          </button>
        </header>

        <main className="px-4 pb-28 pt-20 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="max-w-md mx-auto h-16 grid grid-cols-5">
          {MOBILE_TABS.map(({ to, label, icon: Icon, primary }) => {
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
