import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, Sparkles } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import ProductCard from '../../components/customer/ProductCard';
import Spinner from '../../components/customer/Spinner';
import { ProductsAPI } from '../../lib/api';
import type { Product, Category } from '../../lib/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      ProductsAPI.getProducts().then(setProducts),
      ProductsAPI.getCategories().then(setCategories),
    ]).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  const active = products.filter(p => p.status === 'active');
  const featured = active.filter(p => p.featured).slice(0, 4);
  const selection = featured.length ? featured : active.slice(0, 4);
  const coupsDeCoeur = active.slice(0, 6);

  return (
    <div className="min-h-screen bg-softgray pb-24">
      <TopBar />

      {/* Hero Banner */}
      <section className="relative h-[420px] overflow-hidden">
        <img src="/images/hero-campaign.jpg" alt="Laila Shoes" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-end items-center text-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2">Nouvelle collection</p>
            <h1 className="font-serif text-4xl text-white mb-4 leading-tight">Laila Shoes</h1>
            <p className="text-white/80 text-sm max-w-xs mx-auto mb-6">L'élégance à chaque pas. Découvrez notre collection exclusive.</p>
            <Link to="/shop">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="tap bg-gold hover:bg-gold-light text-white px-8 py-3 rounded-full text-sm font-semibold tracking-wide shadow-lg transition-colors"
              >
                Découvrir
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="max-w-md mx-auto px-4">
        {/* Category Cards */}
        <section className="-mt-8 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/shop/${c.slug}`}>
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-serif text-white text-lg leading-tight">{c.name}</h3>
                      <span className="text-gold text-xs flex items-center gap-1 mt-1">Tout voir <ChevronRight size={12} /></span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Sélection */}
        {!loading && selection.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-ink">Sélection</h2>
              <Link to="/shop" className="text-burgundy text-xs font-medium flex items-center gap-1">
                Tout voir <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {selection.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}

        {/* Coups de cœur */}
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-burgundy" size={18} fill="currentColor" />
            <h2 className="font-serif text-xl text-ink">Coups de cœur</h2>
          </div>
          {loading ? <Spinner className="py-16" /> : err ? (
            <p className="text-sm text-rose text-center py-12">{err}</p>
          ) : coupsDeCoeur.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-12">Aucun produit pour le moment</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {coupsDeCoeur.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>

        {/* Brand strip */}
        <section className="mt-12 mb-2">
          <div className="bg-burgundy rounded-2xl p-6 text-center">
            <Sparkles className="text-gold mx-auto mb-2" size={24} />
            <p className="font-serif text-white text-lg">Livraison dans toute l'Algérie</p>
            <p className="text-white/70 text-xs mt-1">Paiement à la livraison · 58 wilayas</p>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
