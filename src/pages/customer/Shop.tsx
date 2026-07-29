import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import type { Product, Category } from '../lib/types';
import { SANDALE_KEYWORDS } from '../lib/types';
import ProductCard from '../components/ProductCard';

type CatFilter = 'all' | 'shoes' | 'bags';
type ShoeFilter = 'all' | 'soulier' | 'sandales';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<CatFilter>('all');
  const [shoeFilter, setShoeFilter] = useState<ShoeFilter>('all');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getProducts({ status: 'active' }),
      api.getCategories(),
    ]).then(([p, c]) => {
      setProducts(p);
      setCategories(c);
      const catSlug = searchParams.get('category');
      if (catSlug === 'shoes') setCatFilter('shoes');
      else if (catSlug === 'bags') setCatFilter('bags');
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const catBySlug = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => { map[c.slug] = c; });
    return map;
  }, [categories]);

  // Filter products by category
  const catFiltered = useMemo(() => {
    if (catFilter === 'all') return products;
    const cat = catBySlug[catFilter];
    if (!cat) return products;
    return products.filter(p => p.category_id === cat.id);
  }, [products, catFilter, catBySlug]);

  // Apply shoe sub-filter
  const shoeFiltered = useMemo(() => {
    if (catFilter !== 'shoes' || shoeFilter === 'all') return catFiltered;
    return catFiltered.filter(p => {
      const titleLower = p.title.toLowerCase();
      const isSandale = SANDALE_KEYWORDS.some(kw => titleLower.includes(kw));
      return shoeFilter === 'sandales' ? isSandale : !isSandale;
    });
  }, [catFiltered, catFilter, shoeFilter]);

  // Compute available sizes from current product set
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    shoeFiltered.forEach(p => {
      p.variants.forEach(v => {
        Object.entries(v.sizes || {}).forEach(([size, stock]) => {
          if (Number(stock) > 0) sizeSet.add(size);
        });
      });
    });
    return Array.from(sizeSet).sort((a, b) => Number(a) - Number(b));
  }, [shoeFiltered]);

  // Apply size filter
  const finalProducts = useMemo(() => {
    if (!selectedSize) return shoeFiltered;
    return shoeFiltered.filter(p =>
      p.variants.some(v => Number((v.sizes || {})[selectedSize]) > 0)
    );
  }, [shoeFiltered, selectedSize]);

  const handleCatChange = (cat: CatFilter) => {
    setCatFilter(cat);
    setShoeFilter('all');
    setSelectedSize(null);
    setSearchParams(cat === 'all' ? {} : { category: cat });
  };

  const pills: { key: CatFilter; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'shoes', label: 'Soulier & Sandales' },
    { key: 'bags', label: 'Sacs' },
  ];

  const shoePills: { key: ShoeFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'soulier', label: 'Soulier' },
    { key: 'sandales', label: 'Sandales' },
  ];

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 border-b border-sandline">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="font-serif text-xl text-ink text-center">Boutique</h1>
        </div>
        {/* Category Pills */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {pills.map(p => (
              <button
                key={p.key}
                onClick={() => handleCatChange(p.key)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  catFilter === p.key
                    ? 'bg-burgundy text-white shadow-md'
                    : 'bg-sand text-ink/60 hover:bg-sandline'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {/* Shoe Sub-filters */}
        <AnimatePresence>
          {catFilter === 'shoes' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-2">
                <div className="flex gap-2">
                  {shoePills.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setShoeFilter(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        shoeFilter === p.key
                          ? 'bg-rose-light text-burgundy border-burgundy'
                          : 'bg-white text-gray-500 border-sandline'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Size Pills */}
        {availableSizes.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide whitespace-nowrap">Taille</span>
              {availableSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                  className={`min-w-[36px] h-9 px-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedSize === size
                      ? 'bg-burgundy text-white shadow-md'
                      : 'bg-sand text-ink/60 hover:bg-sandline'
                  }`}
                >
                  {size}
                </button>
              ))}
              {selectedSize && (
                <button
                  onClick={() => setSelectedSize(null)}
                  className="flex items-center gap-1 text-xs text-red-500 font-medium ml-1"
                >
                  <X size={12} /> Effacer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : finalProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-serif text-lg">Aucun produit trouvé</p>
            <p className="text-sm mt-1">Essayez d'autres filtres</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{finalProducts.length} produit{finalProducts.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 gap-3">
              {finalProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
