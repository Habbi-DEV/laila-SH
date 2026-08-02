import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
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
        // Liste (une ligne par produit) — plus facile à parcourir/rechercher qu'une grille de
        // photos. Sur grand écran, deux colonnes pour profiter de la largeur sans perdre la
        // lisibilité de la ligne.
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {filtered.map((p, i) => {
            const fp = effectivePrice(Number(p.price), Number(p.discount || 0));
            const cp = p as any;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-softgray shrink-0">
                  {cp.cover_image ? <img src={cp.cover_image} className="w-full h-full object-cover" /> : <Package size={20} className="m-auto mt-5 text-ink/20" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[15px] truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-burgundy font-semibold">{fp.toFixed(0)} DA</span>
                    {Number(p.discount) > 0 && <span className="text-[10px] text-ink/40 line-through">{Number(p.price).toFixed(0)}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-softgray text-ink/50'}`}>
                      {p.status === 'active' ? 'Actif' : 'Brouillon'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link to={`/admin/products/${p.id}/edit`} className="tap w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-softgray"><Pencil size={16} /></Link>
                  <button onClick={() => del(p.id)} className="tap w-9 h-9 rounded-full flex items-center justify-center text-ink/40 hover:bg-rose/10 hover:text-rose"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
