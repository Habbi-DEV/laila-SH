import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ChevronLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function Cart() {
  const { items, removeItem, updateQty, total, count } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream pb-20">
      <div className="bg-white border-b border-sandline">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="font-serif text-xl text-ink">Panier</h1>
          {count > 0 && <p className="text-xs text-gray-400 mt-0.5">{count} article{count > 1 ? 's' : ''}</p>}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag size={48} className="text-gray-300 mb-4" />
            <p className="font-serif text-lg text-gray-500">Votre panier est vide</p>
            <p className="text-sm text-gray-400 mt-1">Découvrez nos collections</p>
            <Link to="/shop" className="mt-6 bg-burgundy text-white px-6 py-2.5 rounded-full text-sm font-medium">
              Découvrir
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={`${item.variant_id}-${item.size}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm"
                  >
                    <Link to={`/product/${item.product_id}`}>
                      <img src={item.image} alt={item.title} className="w-20 h-24 rounded-xl object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-sm text-ink line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-3 h-3 rounded-full border border-sandline" style={{ backgroundColor: item.color_hex }} />
                        <span className="text-xs text-gray-500">{item.color_name} · Taille {item.size}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-burgundy font-semibold text-sm">
                          {(item.discount_price ?? item.price).toLocaleString('fr-FR')} DA
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.variant_id, item.size, item.qty - 1)} className="w-7 h-7 rounded-lg bg-sand flex items-center justify-center hover:bg-sandline">
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-medium w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.variant_id, item.size, item.qty + 1)} className="w-7 h-7 rounded-lg bg-sand flex items-center justify-center hover:bg-sandline">
                            <Plus size={14} />
                          </button>
                          <button onClick={() => removeItem(item.variant_id, item.size)} className="ml-1 text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Total */}
            <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Sous-total</span>
                <span className="text-sm font-medium">{total.toLocaleString('fr-FR')} DA</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Livraison</span>
                <span className="text-sm text-gray-400">Calculée à l'étape suivante</span>
              </div>
              <div className="border-t border-sandline pt-3 flex items-center justify-between">
                <span className="font-serif text-base text-ink">Total</span>
                <span className="text-burgundy font-bold text-lg">{total.toLocaleString('fr-FR')} DA</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full mt-4 bg-burgundy text-white py-3.5 rounded-full font-semibold text-sm hover:bg-burgundy-dark active:scale-[0.98] transition-all"
            >
              Commander
            </button>
          </>
        )}
      </div>
    </div>
  );
}
