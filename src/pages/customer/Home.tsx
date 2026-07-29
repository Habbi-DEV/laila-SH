import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import type { Product, Category } from '../lib/types';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProducts({ status: 'active' }),
      api.getCategories(),
    ]).then(([p, c]) => {
      setProducts(p);
      setCategories(c);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const featured = products.filter(p => p.is_featured).slice(0, 4);
  const coupsDeCoeur = products.slice(0, 6);

  const categoryImage = (slug: string) => {
    if (slug === 'shoes') return '/images/heels-red.jpg';
    if (slug === 'bags') return '/images/bag-tote.jpg';
    return '/images/hero-banner.jpg';
  };

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Hero Banner */}
      <section className="relative h-[420px] overflow-hidden">
        <img src="/images/hero-banner.jpg" alt="Laila Shoes" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-end items-center text-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-serif italic text-gold text-xs tracking-wide mb-2">Pièces sélectionnées</p>
            <h1 className="font-serif text-4xl text-white mb-4 leading-tight">Laila Shoes</h1>
            <p className="text-white/80 text-sm max-w-xs mx-auto mb-6">L'élégance à chaque pas. Découvrez notre collection exclusive.</p>
            <Link to="/shop">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="bg-ink text-gold-light px-8 py-3 rounded-full text-sm font-semibold tracking-wide shadow-lg transition-colors"
              >
                Découvrir
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="gold-line mx-16 mt-3" />

      {/* Category Cards */}
      <section className="px-4 mt-6 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/shop?category=${cat.slug}`}>
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group">
                  <img src={categoryImage(cat.slug)} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-serif text-white text-lg">{cat.name}</h3>
                    <span className="text-gold text-xs flex items-center gap-1 mt-1">Tout voir <ChevronRight size={12} /></span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="px-4 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-ink">Sélection</h2>
            <Link to="/shop" className="text-burgundy text-xs font-medium flex items-center gap-1">
              Tout voir <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Coups de cœur */}
      <section className="px-4 mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-burgundy" size={18} fill="currentColor" />
          <h2 className="font-serif text-xl text-ink">Coups de cœur</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-sand animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {coupsDeCoeur.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>

      {/* Brand strip */}
      <section className="mt-12 mx-4">
        <div className="bg-ink rounded-2xl p-6 text-center">
          <Sparkles className="text-gold mx-auto mb-2" size={24} />
          <p className="font-serif text-white text-lg">Livraison dans toute l'Algérie</p>
          <p className="text-white/70 text-xs mt-1">Paiement à la livraison · 58 wilayas</p>
        </div>
      </section>
    </div>
  );
}
