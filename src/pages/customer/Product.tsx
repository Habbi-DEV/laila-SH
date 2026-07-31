import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag, Share2 } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import Spinner from '../../components/customer/Spinner';
import { ProductsAPI } from '../../lib/api';
import { addToCart, effectivePrice } from '../../lib/cart';
import type { Product, ProductVariant } from '../../lib/types';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selVariant, setSelVariant] = useState(0);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ProductsAPI.getProductById(id)
      .then(d => {
        setProduct(d.product);
        setVariants(d.variants || []);
        const di = (d.variants || []).findIndex((v: ProductVariant) => v.is_default);
        setSelVariant(di >= 0 ? di : 0);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { setImgIdx(0); setSelSize(null); }, [selVariant]);

  const variant = variants[selVariant];
  const images = variant?.images || [];
  const final = product ? effectivePrice(Number(product.price), Number(product.discount || 0)) : 0;
  const stockFor = (size: string) => variant?.sizes?.find(s => s.size === size)?.stock || 0;
  const totalStock = variant?.sizes?.reduce((s, x) => s + Number(x.stock || 0), 0) || 0;

  const handleAdd = () => {
    if (!product || !variant) return;
    if (!selSize) {
      setErr('Veuillez choisir une taille');
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    addToCart({
      key: `${product.id}-${variant.id}-${selSize}`,
      productId: product.id, variantId: variant.id,
      name: product.name, colorName: variant.color_name, colorHex: variant.color_hex,
      size: selSize, qty: 1, price: final, image: images[0] || '',
    });
    setAdded(true); setErr('');
    setTimeout(() => setAdded(false), 1800);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, text: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // partage annulé par l'utilisateur, on ignore
    }
  };

  if (loading) return (<div className="min-h-screen bg-white"><TopBar showBack /><Spinner className="py-32" /></div>);
  if (err && !product) return (<div className="min-h-screen bg-white"><TopBar showBack /><p className="text-center text-rose py-32">{err}</p></div>);
  if (!product) return null;

  return (
    <div className="min-h-screen bg-white">
      <TopBar showBack />
      <main className="max-w-md mx-auto pb-32">
        <div className="px-4 pt-3 flex gap-3">
          <div className="flex-1 aspect-[4/5] rounded-2xl overflow-hidden border border-black shadow-lg bg-softgray">
            {images.length ? (
              <img src={images[imgIdx]} alt={`${product.name} ${imgIdx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full shimmer" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex flex-col gap-2 w-16 overflow-y-auto no-scrollbar">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`tap w-16 aspect-square rounded-xl overflow-hidden border shrink-0 transition-all ${i === imgIdx ? 'border-2 border-gold' : 'border-black/70'}`}
                >
                  <img src={src} alt={`${product.name} miniature ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-5 bg-burgundy' : 'w-1.5 bg-ink/25'}`} />
            ))}
          </div>
          <button onClick={handleShare} className="tap w-9 h-9 rounded-full border border-black bg-white flex items-center justify-center shadow-md">
            <Share2 size={16} />
          </button>
        </div>
        {shared && <p className="text-xs text-ink/60 text-center -mt-1">Lien copié</p>}

        <div className="px-5 pt-4">
          <p className="text-xs text-gold tracking-[0.2em] uppercase mb-1">{product.category_name}</p>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-serif text-xl leading-tight">{product.name}</h1>
            <div className="flex items-baseline gap-1.5 shrink-0">
              {Number(product.discount) > 0 && <span className="text-xs text-ink/40 line-through">{Number(product.price).toFixed(0)} DA</span>}
              <span className="text-base font-semibold text-burgundy whitespace-nowrap">{final.toFixed(0)} DA</span>
            </div>
          </div>
          {Number(product.discount) > 0 && (
            <span className="inline-block mt-1 text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">−{product.discount}%</span>
          )}

          {variants.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-ink/60 mb-1.5">Couleur — <span className="text-ink font-medium">{variant?.color_name}</span></p>
              <div className="flex gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <button key={v.id || i} onClick={() => setSelVariant(i)} className="tap relative">
                    <span className={`block w-[22px] h-[22px] rounded-full border transition-all ${selVariant === i ? 'border-2 border-gold' : 'border border-black/70'}`} style={{ background: v.color_hex }} />
                    {v.is_default && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variant && variant.sizes?.length > 0 && (
            <div className="mt-4" ref={sizeRef}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium">Taille</span>
                <span className="text-xs text-ink/50">Stock total: {totalStock}</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {variant.sizes.map(s => {
                  const out = Number(s.stock) <= 0;
                  const sel = selSize === s.size;
                  return (
                    <button key={s.size} disabled={out} onClick={() => { setSelSize(s.size); setErr(''); }}
                      className={`tap h-11 rounded-xl text-sm font-medium border transition-all ${sel ? 'border-burgundy bg-burgundy text-white' : out ? 'border-bordergray bg-softgray text-ink/25 line-through' : 'border-bordergray bg-white text-ink hover:border-burgundy/40'}`}>
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.description && (
            <div className="mt-5">
              <h2 className="text-sm font-medium mb-2">Description</h2>
              <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {err && !added && <p className="text-sm text-rose mt-4 text-center">{err}</p>}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bordergray/70 pb-[env(safe-area-inset-bottom)]">
        {err && (
          <p className="text-xs text-rose text-center pt-2 px-5">{err}</p>
        )}
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-ink/50 tracking-wide">Prix</p>
            <p className="font-semibold text-burgundy">{final.toFixed(0)} DA</p>
          </div>
          <button onClick={handleAdd} disabled={totalStock <= 0}
            className="tap flex-1 h-12 rounded-xl bg-burgundy text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40">
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><Check size={18} /> Ajouté</motion.span>
              ) : (
                <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><ShoppingBag size={18} /> Ajouter au panier</motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
