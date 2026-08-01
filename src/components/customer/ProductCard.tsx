import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Product } from '../../lib/types';
import { effectivePrice } from '../../lib/cart';

interface CardProduct extends Product { cover_image?: string; in_stock?: boolean }

export default function ProductCard({ product, index = 0 }: { product: CardProduct; index?: number }) {
  const final = effectivePrice(Number(product.price), Number(product.discount || 0));
  return (
    <Link to={`/product/${product.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, delay: (index % 4) * 0.06 }}
        className="group"
      >
        <div className="rounded-2xl overflow-hidden bg-softgray shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
          <div className="relative aspect-[4/5] bg-white">
            {product.cover_image ? (
              <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full shimmer" />
            )}
            {Number(product.discount) > 0 && (
              <span className="absolute top-3 left-3 bg-burgundy text-white text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full">−{product.discount}%</span>
            )}
            {product.in_stock === false && (
              <span className="absolute top-3 right-3 bg-ink/70 text-white text-[10px] tracking-wide px-2.5 py-1 rounded-full">Épuisé</span>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-serif text-[15px] leading-snug text-ink truncate">{product.name}</h3>
            {product.colors && product.colors[0]?.name && (
              <p className="text-xs text-ink/50 mt-0.5">{product.colors[0].name}</p>
            )}
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-baseline gap-1.5">
                {Number(product.discount) > 0 && <span className="text-xs text-ink/40 line-through">{Number(product.price).toFixed(0)} DA</span>}
                <span className="text-sm font-semibold text-burgundy">{final.toFixed(0)} DA</span>
              </div>
              {product.colors && product.colors.length > 0 && (
                <div className="flex -space-x-1">
                  {product.colors.slice(0, 4).map((c, i) => (
                    <span key={i} className="w-3 h-3 rounded-full ring-1 ring-white" style={{ background: c.hex }} />
                  ))}
                </div>
              )}
            </div>
            <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${product.in_stock === false ? 'bg-rose/10 text-rose' : 'bg-green-50 text-green-700'}`}>
              ● {product.in_stock === false ? 'Rupture de stock' : 'En stock'}
            </span>
            <div
              className={`tap mt-2 w-full h-9 rounded-full flex items-center justify-center text-xs font-medium ${product.in_stock === false ? 'bg-softgray text-ink/35' : 'bg-black text-white'}`}
            >
              {product.in_stock === false ? 'Indisponible' : 'Commander'}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
