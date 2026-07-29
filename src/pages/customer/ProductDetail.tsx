import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { Product, Variant } from '../lib/types';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/Toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { show } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getProduct(Number(id)).then(p => {
      setProduct(p);
      const def = p.variants.find(v => v.is_default) || p.variants[0];
      setSelectedVariant(def || null);
      setImageIdx(0);
      setSelectedSize(null);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const images = selectedVariant?.images || [];
  const price = product?.discount_price ?? product?.price ?? 0;
  const hasDiscount = product?.discount_price !== null && product?.discount_price !== undefined && product.discount_price < product.price;

  const availableSizes = selectedVariant
    ? Object.entries(selectedVariant.sizes || {}).filter(([, stock]) => Number(stock) > 0).map(([size]) => size).sort((a, b) => Number(a) - Number(b))
    : [];

  const handleAddToCart = () => {
    if (!product || !selectedVariant || !selectedSize) return;
    addItem({
      product_id: product.id,
      variant_id: selectedVariant.id,
      title: product.title,
      color_hex: selectedVariant.color_hex,
      color_name: selectedVariant.color_name,
      size: selectedSize,
      qty: 1,
      price: product.price,
      discount_price: product.discount_price,
      image: images[0] || '',
    });
    setAdded(true);
    show('Ajouté au panier', 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSwipe = (dir: number) => {
    if (!images.length) return;
    setImageIdx(prev => (prev + dir + images.length) % images.length);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) handleSwipe(diff > 0 ? -1 : 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-burgundy border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Produit introuvable</p>
        <Link to="/shop" className="text-burgundy font-medium">Retour à la boutique</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="fixed top-4 left-4 z-40 bg-white/90 backdrop-blur rounded-full p-2 shadow-md">
        <ChevronLeft size={20} className="text-gray-700" />
      </button>

      {/* Gallery */}
      <div className="relative aspect-square bg-white overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="wait">
          <motion.img
            key={imageIdx}
            src={images[imageIdx] || '/images/placeholder.jpg'}
            alt={product.title}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === imageIdx ? 'w-6 bg-burgundy' : 'w-1.5 bg-gray-300'}`}
                />
              ))}
            </div>
            {/* Thumbnails */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imageIdx ? 'border-burgundy' : 'border-transparent opacity-60'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <h1 className="font-serif text-2xl text-ink">{product.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-burgundy text-xl font-semibold">{price.toLocaleString('fr-FR')} DA</span>
          {hasDiscount && (
            <span className="text-gray-400 text-sm line-through">{product.price.toLocaleString('fr-FR')} DA</span>
          )}
        </div>

        {/* Colors */}
        {product.variants.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
              Couleur: <span className="text-ink normal-case font-semibold">{selectedVariant?.color_name}</span>
            </p>
            <div className="flex gap-2">
              {product.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVariant(v); setImageIdx(0); setSelectedSize(null); }}
                  className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                    selectedVariant?.id === v.id ? 'border-burgundy scale-110' : 'border-sandline'
                  }`}
                  style={{ backgroundColor: v.color_hex }}
                  title={v.color_name}
                >
                  {selectedVariant?.id === v.id && (
                    <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        <div className="mt-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Taille</p>
          {availableSizes.length === 0 ? (
            <p className="text-sm text-red-500">Rupture de stock</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {availableSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[44px] h-11 rounded-lg text-sm font-semibold border transition-all ${
                    selectedSize === size
                      ? 'bg-burgundy text-white border-burgundy'
                      : 'bg-white text-gray-700 border-sandline hover:border-burgundy'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      {/* Sticky Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-sandline shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            onClick={handleAddToCart}
            disabled={!selectedSize || availableSizes.length === 0}
            className={`w-full py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              !selectedSize || availableSizes.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : added
                ? 'bg-green-600 text-white'
                : 'bg-burgundy text-white hover:bg-burgundy-dark active:scale-[0.98]'
            }`}
          >
            {added ? (<><Check size={18} /> Ajouté!</>) : (<><ShoppingBag size={18} /> {selectedSize ? 'Ajouter au panier' : 'Sélectionnez une taille'}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
