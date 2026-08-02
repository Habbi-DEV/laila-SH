import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import Spinner from '../../components/customer/Spinner';
import { ProductsAPI } from '../../lib/api';
import { effectivePrice } from '../../lib/cart';
import type { Product } from '../../lib/types';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const refresh = () => { setLoading(true); ProductsAPI.getProducts().then(setProducts).catch(e => setErr(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []);

  const del = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await ProductsAPI.deleteProduct(id);
    refresh();
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell title="Produits">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-2xl">Produits</h1>
          {!loading && <p className="text-xs text-ink/40 mt-0.5">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</p>}
        </div>
        <Link to="/admin/products/new" className="tap w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center shadow-lift shrink-0"><Plus size={20} /></Link>
      </div>
      <div className="relative mb-4 lg:max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy outline-none" />
      </div>
      {loading ? <Spinner className="py-20" /> : err ? <p className="text-rose text-sm text-center py-20">{err}</p> : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-soft"><p className="text-sm text-ink/40">Aucun produit</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p, i) => {
            const fp = effectivePrice(Number(p.price), Number(p.discount || 0));
            const cp = p as any;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="bg-white rounded-2xl overflow-hidden shadow-soft group">
                <div className="aspect-square bg-softgray relative">
                  {cp.cover_image ? <img src={cp.cover_image} className="w-full h-full object-cover" /> : <div className="w-full h-full shimmer" />}
                  <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-white/90 text-ink/50'}`}>
                    {p.status === 'active' ? 'Actif' : 'Brouillon'}
                  </span>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/admin/products/${p.id}/edit`} className="tap w-8 h-8 rounded-full bg-white/95 shadow-soft flex items-center justify-center text-ink/60"><Pencil size={14} /></Link>
                    <button onClick={() => del(p.id)} className="tap w-8 h-8 rounded-full bg-white/95 shadow-soft flex items-center justify-center text-ink/40 hover:text-rose"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-burgundy font-semibold">{fp.toFixed(0)} DA</span>
                    {Number(p.discount) > 0 && <span className="text-[10px] text-ink/40 line-through">{Number(p.price).toFixed(0)}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
