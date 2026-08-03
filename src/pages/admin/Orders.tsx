import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, GitMerge, Check, Home, Store, Ban, ShieldAlert, Undo2, RotateCcw, Eye, EyeOff,
  Truck, FileText, Package, Search, Phone, ChevronDown, Table2, LayoutGrid, Download, MapPin,
} from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { OrdersAPI, UsersAPI } from '../../lib/api';
import supabase from '../../lib/supabase';
import type { Order } from '../../lib/types';

const statusLabel: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée',
  delivered: 'Livrée', cancelled: 'Annulée', returned: 'Retourné', merged: 'Fusionnée',
};
const statusColor: Record<string, string> = {
  pending: 'bg-gold/20 text-gold', confirmed: 'bg-burgundy/10 text-burgundy',
  shipped: 'bg-rose/15 text-rose', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-ink/10 text-ink/50', returned: 'bg-rose/20 text-rose', merged: 'bg-ink/10 text-ink/40',
};
const flow = ['pending', 'confirmed', 'shipped', 'delivered'];
const KANBAN_COLUMNS = ['pending', 'confirmed', 'shipped', 'delivered'];
const FILTER_TABS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled'];
const DAY = 24 * 60 * 60 * 1000;

// Export CSV léger, sans dépendance — génère et télécharge le fichier côté navigateur.
function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' · ' + new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [showMerged, setShowMerged] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeErr, setMergeErr] = useState('');
  const [blacklistLoading, setBlacklistLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [overrideMode, setOverrideMode] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState<number | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const refresh = () => {
    setLoading(true);
    OrdersAPI.getOrders().then(setOrders).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  // Realtime Supabase — dès qu'une nouvelle commande arrive, la liste se met à jour toute seule, sans refresh manuel.
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-list-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const { dupIds, dupGroups } = useMemo(() => {
    const now = Date.now();
    const recent = orders.filter(o => o.status !== 'merged' && now - new Date(o.created_at).getTime() < DAY);
    const byPhone = new Map<string, Order[]>();
    recent.forEach(o => {
      const p = (o.phone || '').replace(/\s/g, '');
      if (!p) return;
      if (!byPhone.has(p)) byPhone.set(p, []);
      byPhone.get(p)!.push(o);
    });
    const groups: Order[][] = [];
    const ids = new Set<number>();
    byPhone.forEach(group => {
      if (group.length >= 2) {
        groups.push(group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        group.forEach(o => ids.add(o.id));
      }
    });
    return { dupIds: ids, dupGroups: groups };
  }, [orders]);

  const nonMerged = useMemo(() => orders.filter(o => o.status !== 'merged'), [orders]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: nonMerged.length };
    FILTER_TABS.slice(1).forEach(s => { map[s] = nonMerged.filter(o => o.status === s).length; });
    return map;
  }, [nonMerged]);

  const visibleOrders = useMemo(() => {
    const base = showMerged ? orders : nonMerged;
    const q = query.trim().toLowerCase();
    return base.filter(o => {
      const matchQ = !q || String(o.id).includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.phone || '').includes(q) || (o.city || '').toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || o.status === statusFilter;
      return matchQ && matchS;
    });
  }, [orders, nonMerged, showMerged, query, statusFilter]);

  const advance = async (o: Order) => {
    const idx = flow.indexOf(o.status);
    const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : o.status;
    await OrdersAPI.updateOrderStatus(o.id, next);
    refresh();
  };

  const changeStatus = async (o: Order, status: string) => {
    setActionLoading(o.id);
    try {
      await OrdersAPI.updateOrderStatus(o.id, status);
      refresh();
    } catch (e: any) { setErr(e.message); }
    setActionLoading(null);
  };

  const sendToShipping = async (o: Order) => {
    setShippingLoading(o.id);
    try {
      await OrdersAPI.createShippingParcel(o.id);
      refresh();
    } catch (e: any) { setErr(e.message); }
    setShippingLoading(null);
  };

  const toggleBlacklist = async (o: Order, blacklist: boolean) => {
    setBlacklistLoading(o.phone);
    try {
      await UsersAPI.updateCustomer({ phone: o.phone, is_blacklisted: blacklist, name: o.customer_name });
      refresh();
    } catch (e: any) { setErr(e.message); }
    setBlacklistLoading(null);
  };

  const productsTotal = (o: Order) => (o.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);

  const openMerge = (o: Order) => {
    setMergeErr('');
    setMergeTarget(o.id);
    setMergePrimaryId(o.id);
  };

  const confirmMerge = async () => {
    if (!mergeTarget || !mergePrimaryId) return;
    const dupGroup = dupGroups.find(g => g.some(x => x.id === mergeTarget)) || [];
    const secondaryIds = dupGroup.filter(x => x.id !== mergePrimaryId).map(x => x.id);
    if (!secondaryIds.length) { setMergeErr('Aucune commande secondaire à fusionner'); return; }
    setMerging(true); setMergeErr('');
    try {
      await OrdersAPI.mergeOrders(mergePrimaryId, secondaryIds);
      setMergeTarget(null); setMergePrimaryId(null);
      refresh();
    } catch (e: any) { setMergeErr(e.message); }
    setMerging(false);
  };

  const onDropTo = (status: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    const o = orders.find(x => x.id === id);
    if (o && o.status !== status) changeStatus(o, status);
  };

  const exportCsv = () => {
    if (visibleOrders.length === 0) return;
    downloadCsv(`commandes-laila-${new Date().toISOString().slice(0, 10)}.csv`, visibleOrders.map(o => ({
      Reference: o.id,
      Date: new Date(o.created_at).toLocaleString('fr-FR'),
      Statut: statusLabel[o.status] || o.status,
      Client: o.customer_name,
      Telephone: o.phone,
      Ville: o.city,
      Wilaya: o.shipping?.wilaya_name || '',
      Livraison: o.shipping?.delivery_type === 'desk' ? 'Stopdesk' : 'Domicile',
      Articles: (o.items || []).map(it => `${it.qty}x ${it.name}`).join(' | '),
      Total: Number(o.total),
      Suivi: o.tracking_number || '',
    })));
  };

  return (
    <AdminShell title="Commandes">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">Centre de traitement</p>
          <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Commandes</h1>
          {!loading && <p className="mt-1 text-[13px] text-ink/50">{counts.pending || 0} en attente · {counts.shipped || 0} en cours de livraison</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-full border border-bordergray bg-white px-4 py-2.5 text-[12.5px] font-bold text-ink transition hover:bg-softgray">
            <Download size={14} /> Exporter CSV
          </button>
          <button onClick={() => setShowMerged(s => !s)} className={`text-xs px-3.5 py-2.5 rounded-full border font-bold transition ${showMerged ? 'border-burgundy text-burgundy bg-burgundy/5' : 'border-bordergray text-ink/50 bg-white'}`}>
            {showMerged ? 'Masquer fusionnées' : 'Voir fusionnées'}
          </button>
          <div className="flex rounded-full border border-bordergray bg-white p-1">
            {([{ v: 'table', icon: Table2 }, { v: 'kanban', icon: LayoutGrid }] as const).map(({ v, icon: Icon }) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition ${view === v ? 'bg-ink text-white' : 'text-ink/50 hover:text-ink'}`}>
                <Icon size={14} /> {v === 'table' ? 'Table' : 'Kanban'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + status filter pills */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher : réf, client, téléphone, ville…"
            className="w-full rounded-full border border-bordergray bg-white py-3 pl-11 pr-4 text-[13px] outline-none transition focus:border-burgundy focus:ring-2 focus:ring-burgundy/10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition ${statusFilter === f ? 'bg-ink text-white' : 'border border-bordergray bg-white text-ink/50 hover:border-ink/20'}`}>
              {f === 'all' ? 'Toutes' : statusLabel[f]} · {counts[f] || 0}
            </button>
          ))}
        </div>
      </div>

      {dupGroups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-3.5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{dupGroups.length} groupe(s) de commandes en double détecté(s)</p>
            <p className="text-xs text-amber-700/80 mt-0.5">{dupIds.size} commande(s) — même numéro, moins de 24h. Vérifiez et fusionnez ci-dessous.</p>
          </div>
        </motion.div>
      )}

      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : visibleOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-soft"><p className="text-sm text-ink/40">Aucune commande ne correspond</p></div>
      ) : view === 'table' ? (
        /* ============== TABLE VIEW ============== */
        <div className="space-y-2.5">
          {visibleOrders.map((o, i) => {
            const isDup = dupIds.has(o.id);
            const dupGroup = dupGroups.find(g => g.some(x => x.id === o.id)) || [];
            const siblings = dupGroup.filter(x => x.id !== o.id);
            const shipping = o.shipping;
            const grandTotal = Number(o.total);
            const isBlacklisted = !!o.is_blacklisted;
            const isActive = ['pending', 'confirmed', 'shipped', 'delivered'].includes(o.status);
            const allStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
            const isOverride = overrideMode === o.id;
            const isOpen = open === o.id;
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                className={`overflow-hidden rounded-[20px] border bg-white shadow-soft ${isBlacklisted ? 'border-rose/40' : isDup ? 'border-amber-300/70' : 'border-black/[0.06]'}`}>

                {/* Collapsed row */}
                <button onClick={() => setOpen(isOpen ? null : o.id)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5 text-left">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-softgray text-ink/50 transition ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={15} />
                  </span>
                  <div className="min-w-[90px]">
                    <p className="text-[13px] font-extrabold">#{o.id}</p>
                    <p className="text-[10.5px] text-ink/40">{fmtDate(o.created_at)}</p>
                  </div>
                  <div className="min-w-[130px] flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-[13px] font-semibold">{o.customer_name}</p>
                      {isBlacklisted && <span className="shrink-0 rounded-full bg-rose/15 px-1.5 py-0.5 text-[8.5px] font-bold text-rose flex items-center gap-0.5"><ShieldAlert size={8} />Blacklisté</span>}
                      {isDup && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8.5px] font-bold text-amber-700 flex items-center gap-0.5"><AlertTriangle size={8} />Doublon</span>}
                    </div>
                    <p className="text-[10.5px] text-ink/40">{o.phone}</p>
                  </div>
                  <div className="hidden min-w-[150px] md:block">
                    <p className="flex items-center gap-1 text-[12px] font-medium text-ink/60"><MapPin size={12} className="text-gold" />{o.city}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink/40">
                      {shipping?.delivery_type === 'desk' ? <Store size={11} /> : <Home size={11} />}
                      {shipping ? (shipping.delivery_type === 'desk' ? 'Stopdesk' : 'Domicile') : '—'}
                    </p>
                  </div>
                  <div className="min-w-[95px]">
                    <p className="text-[13.5px] font-extrabold">{grandTotal.toFixed(0)} DA</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold ${statusColor[o.status] || statusColor.pending}`}>{statusLabel[o.status] || o.status}</span>
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <a href={`tel:${o.phone}`} onClick={e => e.stopPropagation()} title="Appeler" className="tap flex h-8 w-8 items-center justify-center rounded-lg border border-bordergray text-ink/50 hover:border-burgundy hover:text-burgundy"><Phone size={14} /></a>
                  </div>
                </button>

                {isBlacklisted && (
                  <div className="mx-3.5 mb-3 rounded-xl bg-rose/10 border border-rose/30 p-3 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-rose mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-rose">⚠️ High-Risk: client a refusé des livraisons avant.</p>
                      <p className="text-[11px] text-rose/70 mt-0.5">Ce numéro ({o.phone}) est sur liste noire. Vérifiez avant d'expédier.</p>
                    </div>
                  </div>
                )}

                {isDup && siblings.length > 0 && (
                  <div className="mx-3.5 mb-3 rounded-xl bg-amber-50/60 border border-amber-200/70 p-3">
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-2">
                      <AlertTriangle size={13} /> Commandes en double ({dupGroup.length}) — même téléphone {o.phone}
                    </div>
                    <div className="space-y-1.5 mb-2.5">
                      {dupGroup.map(x => (
                        <div key={x.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-2.5 py-1.5 border border-amber-100">
                          <span>#{x.id} · {x.customer_name} · {new Date(x.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-ink/50">{(x.items || []).length} art.</span>
                        </div>
                      ))}
                    </div>
                    {mergeTarget === o.id ? (
                      <div className="bg-white rounded-lg p-2.5 border border-amber-200">
                        <p className="text-[11px] text-ink/60 mb-2">Choisir la commande principale (les autres seront fusionnées) :</p>
                        <div className="space-y-1.5 mb-2.5">
                          {dupGroup.map(x => (
                            <label key={x.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="radio" name={`merge-${o.id}`} checked={mergePrimaryId === x.id}
                                onChange={() => setMergePrimaryId(x.id)} className="accent-burgundy w-3.5 h-3.5" />
                              <span>#{x.id} · {x.customer_name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={confirmMerge} disabled={merging || !mergePrimaryId}
                            className="tap flex-1 h-9 rounded-lg bg-burgundy text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {merging ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><GitMerge size={13} /> Confirmer la fusion</>}
                          </button>
                          <button onClick={() => { setMergeTarget(null); setMergePrimaryId(null); setMergeErr(''); }} className="tap h-9 px-3 rounded-lg border border-bordergray text-ink/60 text-xs">Annuler</button>
                        </div>
                        {mergeErr && <p className="text-[11px] text-rose mt-2 text-center">{mergeErr}</p>}
                      </div>
                    ) : (
                      <button onClick={() => openMerge(o)} className="tap w-full h-9 rounded-lg bg-amber-500 text-white text-xs font-medium flex items-center justify-center gap-1.5">
                        <GitMerge size={13} /> Fusionner les commandes
                      </button>
                    )}
                  </div>
                )}

                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-bordergray bg-softgray/50 px-4 py-4">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Articles commandés</p>
                        <div className="mt-2 space-y-1.5">
                          {(o.items || []).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs"><span className="text-ink/70">{it.name} · {it.colorName} · T.{it.size} ×{it.qty}</span><span>{(it.qty * it.price).toFixed(0)} DA</span></div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1 border-t border-black/8 pt-3 text-[12px] text-ink/50">
                          <p className="flex justify-between">Sous-total produits <span>{productsTotal(o).toFixed(0)} DA</span></p>
                          <p className="flex justify-between">Frais de livraison <span className={shipping ? 'text-gold' : 'text-ink/40'}>{shipping ? `${Number(shipping.shipping_price).toFixed(0)} DA` : '—'}</span></p>
                          <p className="flex justify-between font-semibold text-ink text-sm pt-1"><span>Total</span><span className="text-burgundy">{grandTotal.toFixed(0)} DA</span></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Livraison</p>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-ink/60">
                          📞 {o.phone}<br />📍 {o.address}, {o.city}<br />💳 {o.payment_method === 'cod' ? 'Paiement à la livraison (COD)' : o.payment_method}
                          {shipping && <><br />{shipping.delivery_type === 'desk' ? '🏪' : '🏠'} Wilaya {shipping.wilaya_id} — {shipping.wilaya_name}</>}
                        </p>

                        {(o.status === 'returned' || o.status === 'cancelled') && (
                          <div className="mt-3 rounded-xl bg-rose/5 border border-rose/20 p-2.5 flex items-center gap-2">
                            <RotateCcw size={14} className="text-rose" />
                            <p className="text-[11px] text-rose/80">Stock restauré automatiquement pour chaque variante/taille.</p>
                          </div>
                        )}

                        {o.tracking_number && (
                          <div className="mt-3 rounded-xl bg-burgundy/[0.04] border border-burgundy/15 p-3">
                            <div className="flex items-center gap-2 mb-2"><Package size={14} className="text-burgundy" /><p className="text-[11px] font-semibold text-burgundy">Colis envoyé au transporteur</p></div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0"><p className="text-[10px] text-ink/40 tracking-wide">N° de suivi</p><p className="text-sm font-mono font-medium text-ink truncate">{o.tracking_number}</p></div>
                              {o.shipping_voucher_url && (
                                <a href={o.shipping_voucher_url} target="_blank" rel="noopener noreferrer" className="tap shrink-0 h-9 px-3 rounded-lg bg-burgundy text-white text-xs font-medium flex items-center gap-1.5"><FileText size={14} /> Bordereau</a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 space-y-2">
                          <div className="flex justify-end -mb-1">
                            <button onClick={() => setOverrideMode(isOverride ? null : o.id)}
                              className={`tap p-1.5 rounded-lg transition-colors ${isOverride ? 'bg-burgundy/10 text-burgundy' : 'text-ink/30 hover:text-ink/60'}`}
                              title={isOverride ? 'Fermer le mode override' : 'Mode override (changement direct)'}>
                              {isOverride ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>

                          {isOverride ? (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-burgundy/20 bg-burgundy/[0.02] p-2.5">
                              <p className="text-[10px] text-burgundy/70 font-medium mb-2 px-1 flex items-center gap-1"><Eye size={11} /> Override — forcer le statut</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {allStatuses.map(s => {
                                  const isCurrent = o.status === s;
                                  return (
                                    <button key={s} onClick={() => changeStatus(o, s)} disabled={isCurrent || actionLoading === o.id}
                                      className={`tap h-9 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 ${isCurrent ? 'border-burgundy bg-burgundy text-white' : s === 'cancelled' || s === 'returned' ? 'border-rose/30 text-rose hover:bg-rose/5' : 'border-bordergray text-ink/70 hover:border-burgundy/40'}`}>
                                      {statusLabel[s]}
                                    </button>
                                  );
                                })}
                              </div>
                              {actionLoading === o.id && <div className="flex justify-center mt-2"><span className="w-4 h-4 border-2 border-burgundy/20 border-t-burgundy rounded-full animate-spin" /></div>}
                            </motion.div>
                          ) : (
                            <>
                              {isActive && flow.indexOf(o.status) >= 0 && flow.indexOf(o.status) < flow.length - 1 && (
                                <button onClick={() => advance(o)} disabled={actionLoading === o.id}
                                  className="tap w-full h-10 rounded-xl bg-burgundy text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                                  {actionLoading === o.id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={15} /> Marquer: {statusLabel[flow[flow.indexOf(o.status) + 1]]}</>}
                                </button>
                              )}
                              {(o.status === 'confirmed' || o.status === 'pending') && !o.tracking_number && (
                                <button onClick={() => sendToShipping(o)} disabled={shippingLoading === o.id}
                                  className="tap w-full h-10 rounded-xl border border-burgundy/30 text-burgundy text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                                  {shippingLoading === o.id ? <span className="w-4 h-4 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" /> : <><Truck size={15} /> Envoyer à la livraison</>}
                                </button>
                              )}
                              {(o.status === 'shipped' || o.status === 'delivered') && (
                                <button onClick={() => changeStatus(o, 'returned')} disabled={actionLoading === o.id}
                                  className="tap w-full h-10 rounded-xl border border-rose/40 text-rose text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                                  {actionLoading === o.id ? <span className="w-4 h-4 border-2 border-rose/30 border-t-rose rounded-full animate-spin" /> : <><Undo2 size={15} /> Marquer: Retourné (+ stock)</>}
                                </button>
                              )}
                              {isBlacklisted ? (
                                <button onClick={() => toggleBlacklist(o, false)} disabled={blacklistLoading === o.phone}
                                  className="tap w-full h-10 rounded-xl border border-bordergray text-ink/60 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                                  {blacklistLoading === o.phone ? <span className="w-4 h-4 border-2 border-ink/20 border-t-ink/60 rounded-full animate-spin" /> : <><Ban size={15} /> Retirer de la liste noire</>}
                                </button>
                              ) : (
                                <button onClick={() => toggleBlacklist(o, true)} disabled={blacklistLoading === o.phone}
                                  className="tap w-full h-10 rounded-xl border border-rose/30 text-rose text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                                  {blacklistLoading === o.phone ? <span className="w-4 h-4 border-2 border-rose/30 border-t-rose rounded-full animate-spin" /> : <><Ban size={15} /> Blacklist Customer</>}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ============== KANBAN VIEW ============== */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(status => {
            const cols = visibleOrders.filter(o => o.status === status);
            return (
              <div key={status} onDragOver={e => e.preventDefault()} onDrop={onDropTo(status)}
                className="w-[270px] shrink-0 rounded-[20px] border border-black/[0.06] bg-white/60 p-3">
                <div className="mb-3 flex items-center justify-between px-1.5">
                  <span className={`rounded-full px-3 py-1 text-[10.5px] font-bold ${statusColor[status]}`}>{statusLabel[status]}</span>
                  <span className="text-[11px] font-bold text-ink/40">{cols.length}</span>
                </div>
                <div className="space-y-2.5">
                  {cols.map(o => (
                    <div key={o.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', String(o.id))}
                      className="cursor-grab rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing">
                      <div className="flex items-center justify-between">
                        <p className="text-[12.5px] font-extrabold">#{o.id}</p>
                        <p className="text-[10px] text-ink/40">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <p className="mt-1 truncate text-[12px] font-semibold">{o.customer_name}</p>
                      <p className="text-[10.5px] text-ink/40">{o.city}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] font-extrabold text-burgundy">{Number(o.total).toFixed(0)} DA</p>
                        <div className="flex items-center gap-1">
                          <a href={`tel:${o.phone}`} className="tap flex h-7 w-7 items-center justify-center rounded-lg border border-bordergray text-ink/50 hover:border-burgundy hover:text-burgundy"><Phone size={12} /></a>
                          {flow.indexOf(status) < flow.length - 1 && (
                            <button onClick={() => changeStatus(o, flow[flow.indexOf(status) + 1])} className="tap flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white"><Check size={12} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {cols.length === 0 && <div className="rounded-2xl border-2 border-dashed border-bordergray py-6 text-center text-[11px] font-medium text-ink/30">Glisser une commande ici</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
