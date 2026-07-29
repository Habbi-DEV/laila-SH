import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Product } from '../lib/types';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const variant = product.variants.find(v => v.is_default) || product.variants[0];
  const image = variant?.images?.[0] || '/images/placeholder.jpg';
  const price = product.discount_price ?? product.price;
  const hasDiscount = product.discount_price !== null && product.discount_price < product.price;

  const totalStock = product.variants.reduce((sum, v) =>
    sum + Object.values(v.sizes || {}).reduce((s, n) => s + Number(n), 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/product/${product.id}`} className="block group">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-sand shadow-sm">
          <img
            src={image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <span className="piece-tag absolute top-2 left-2">
            N° {String(index + 1).padStart(3, '0')}
          </span>
          {hasDiscount && (
            <span className="absolute top-2 right-2 bg-burgundy text-white text-[10px] font-bold px-2 py-1 rounded-full">
              -{Math.round((1 - price / product.price) * 100)}%
            </span>
          )}
          {totalStock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-semibold bg-ink px-3 py-1 rounded-full">Épuisé</span>
            </div>
          )}
        </div>
        <div className="mt-2 px-1">
          <h3 className="font-serif text-sm text-ink line-clamp-1">{product.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-burgundy font-semibold text-sm">{price.toLocaleString('fr-FR')} DA</span>
            {hasDiscount && (
              <span className="text-gray-400 text-xs line-through">{product.price.toLocaleString('fr-FR')} DA</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
