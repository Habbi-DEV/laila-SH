import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package } from 'lucide-react';
import { api } from '../lib/api';
import type { Order } from '../lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../lib/types';

export default function Orders() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.getOrders(phone.replace(/\s/g, ''));
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-20">
      <div className="bg-white border-b border-sandline">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="font-serif text-xl text-ink">Mes Commandes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Suivez vos commandes par téléphone</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Votre numéro de téléphone"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sandline text-sm focus:border-burgundy focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-burgundy text-white px-5 rounded-xl text-sm font-medium hover:bg-burgundy-dark"
          >
            {loading ? '...' : 'Chercher'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <AnimatePresence>
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gray-500">{order.order_number}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-sandline'}`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="space-y-1">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 line-clamp-1">{item.title} · {item.size} ×{item.qty}</span>
                      <span className="text-gray-700">{(item.price * item.qty).toLocaleString('fr-FR')} DA</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-sandline mt-2 pt-2 flex justify-between">
                  <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                  <span className="text-burgundy font-bold">{order.total.toLocaleString('fr-FR')} DA</span>
                </div>
                {order.tracking && (
                  <div className="mt-3 bg-burgundy/5 rounded-xl p-2.5 border border-burgundy/20">
                    <p className="text-[10px] text-burgundy font-medium uppercase tracking-wide">Suivi</p>
                    <p className="font-mono text-sm text-gray-700 mt-0.5">{order.tracking.tracking_number}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {searched && !loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Aucune commande trouvée</p>
              <p className="text-gray-400 text-xs mt-1">Vérifiez votre numéro de téléphone</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
