import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Banknote, ShoppingBag, Hourglass, AlertTriangle, ArrowRight, Package, TrendingUp, PackageCheck, Undo2 } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { SystemAPI } from '../../lib/api';
import supabase from '../../lib/supabase';

interface Stats {
  products: number; orders: number; revenue: number; pending: number;
  recent: any[]; delivered: number; shipped: number; returned: number; deliveryRate: number;
  weeklySales: { label: string; amount: number; count: number }[];
  topProducts: { name: string; qty: number }[];
  lowStock: { id: number; name: string; stock: number; image: string | null }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const loadStats = () => {
    SystemAPI.getStats()
      .then(d => setStats({
        products: d.products,
        orders: d.orders,
        revenue: d.revenue,
        pending: d.pending,
        delivered: d.delivered,
        shipped: d.shipped,
        returned: d.returned,
        deliveryRate: d.delivery_rate,
        recent: d.recent_orders,
        weeklySales: d.weekly_sales || [],
        topProducts: d.top_products || [],
        lowStock: d.low_stock || [],
      }))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  // Realtime Supabase — les statistiques et les commandes récentes se rafraîchissent
  // automatiquement dès qu'une nouvelle commande arrive, sans refresh manuel ni polling.
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <AdminShell title="Tableau de bord"><Spinner className="py-32" /></AdminShell>;
  if (err) return <AdminShell title="Tableau de bord"><p className="text-rose text-sm text-center py-32">{err}</p></AdminShell>;
  if (!stats) return null;

  const kpis = [
    { icon: Banknote, label: "Chiffre d'affaires", value: `${stats.revenue.toFixed(0)} DA`, chip: 'bg-gold/20 text-gold' },
    { icon: Hourglass, label: 'Commandes en attente', value: String(stats.pending), chip: 'bg-amber-100 text-amber-700' },
    { icon: ShoppingBag, label: 'Total commandes', value: String(stats.orders), chip: 'bg-burgundy/10 text-burgundy' },
    { icon: AlertTriangle, label: 'Alertes stock', value: String(stats.lowStock.length), chip: 'bg-rose/15 text-rose' },
  ];

  const maxAmount = Math.max(...stats.weeklySales.map(d => d.amount), 1);
  const maxSold = Math.max(...stats.topProducts.map(t => t.qty), 1);

  return (
    <AdminShell title="Tableau de bord">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">Console Laila</p>
        <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Tableau de bord</h1>
        <p className="mt-1.5 text-[13.5px] text-ink/50">Voici l'activité de la boutique en temps réel.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, chip }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-bordergray/70 bg-white p-5 shadow-soft">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${chip}`}><Icon size={18} /></span>
            <p className="mt-3.5 truncate text-xl font-extrabold tracking-tight sm:text-[22px]">{value}</p>
            <p className="mt-0.5 text-[11.5px] font-medium text-ink/40">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Delivery rate + weekly chart */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-bordergray/70 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold">Ventes — 7 derniers jours</h2>
              <p className="mt-0.5 text-[12px] text-ink/40">Montant encaissé par jour</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700">
              +{stats.weeklySales.reduce((s, d) => s + d.amount, 0).toFixed(0)} DA
            </span>
          </div>
          <div className="mt-7 flex h-44 items-end justify-between gap-2 sm:gap-3">
            {stats.weeklySales.map(d => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-ink/40">{d.count > 0 ? d.count : ''}</span>
                <div className="flex h-32 w-full items-end rounded-xl bg-softgray px-1 pb-0">
                  <div title={`${d.amount.toFixed(0)} DA`} className="w-full rounded-lg bg-gradient-to-t from-burgundy to-gold transition-all"
                    style={{ height: `${Math.max(4, Math.round((d.amount / maxAmount) * 100))}%` }} />
                </div>
                <span className="text-[10.5px] font-semibold capitalize text-ink/40">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery rate ring + top products */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-bordergray/70 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={15} className="text-burgundy" />
              <h2 className="font-serif text-base">Taux de livraison</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-serif text-3xl text-burgundy">{stats.deliveryRate}%</span>
              <div className="flex-1 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5"><PackageCheck size={12} className="text-green-600" /> Livrées: <b>{stats.delivered}</b></div>
                <div className="flex items-center gap-1.5"><Undo2 size={12} className="text-rose" /> Retournées: <b>{stats.returned}</b></div>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-bordergray/70 bg-white p-5 shadow-soft">
            <h2 className="font-serif text-base font-semibold">Produits les plus vendus</h2>
            <div className="mt-3.5 space-y-3">
              {stats.topProducts.map(t => (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="truncate font-semibold">{t.name}</span>
                    <span className="ml-2 shrink-0 font-bold text-burgundy">{t.qty}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-softgray">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round((t.qty / maxSold) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && <p className="text-[12.5px] text-ink/40">Aucune vente pour le moment.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders + low stock */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-bordergray/70 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Commandes récentes</h2>
            <Link to="/admin/orders" className="flex items-center gap-1 text-[11.5px] font-bold text-burgundy hover:underline">
              Tout voir <ArrowRight size={12} />
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink/40">Aucune commande</p>
          ) : (
            <div className="mt-4 divide-y divide-black/5">
              {stats.recent.slice(0, 5).map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-softgray text-ink/50"><ShoppingBag size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold">#{o.id} <span className="font-medium text-ink/40">· {o.customer_name || 'Client'}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-extrabold">{Number(o.total).toFixed(0)} DA</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold ${o.status === 'pending' ? 'bg-gold/20 text-gold' : o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'returned' ? 'bg-rose/15 text-rose' : 'bg-burgundy/10 text-burgundy'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-bordergray/70 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Stock faible</h2>
            <Link to="/admin/inventory" className="flex items-center gap-1 text-[11.5px] font-bold text-burgundy hover:underline">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {stats.lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                {p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded-lg bg-softgray object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-softgray text-ink/30"><Package size={14} /></span>}
                <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{p.name}</p>
                <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[10.5px] font-bold text-rose">{p.stock} restants</span>
              </div>
            ))}
            {stats.lowStock.length === 0 && <p className="text-[12.5px] text-ink/40">Tous les stocks sont sains.</p>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
