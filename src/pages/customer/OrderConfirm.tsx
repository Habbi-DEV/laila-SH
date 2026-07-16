import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import TopBar from '../../components/customer/TopBar';
import BottomNav from '../../components/customer/BottomNav';
import Spinner from '../../components/customer/Spinner';
import { endpoints } from '../../lib/api'; // تم التحديث لاستخدام endpoints
import type { Order } from '../../lib/types';

export default function OrderConfirm() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // استخدام endpoints.orders.getById لجلب الطلب المحدد مباشرة
    if (id) {
      endpoints.orders.getById(Number(id))
        .then(setOrder)
        .catch(() => setOrder(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-softgray">
      <TopBar showBack />
      <main className="max-w-md mx-auto px-5 pt-10 pb-28">
        {loading ? <Spinner className="py-32" /> : order ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-burgundy mx-auto flex items-center justify-center">
              <Check size={36} className="text-white" />
            </motion.div>
            <h1 className="font-serif text-2xl mt-6">Commande confirmée</h1>
            <p className="serif-italic text-gold mt-1">Merci pour votre confiance</p>
            <div className="bg-white rounded-2xl p-5 shadow-soft mt-6 text-left">
              <div className="flex justify-between text-sm py-1"><span className="text-ink/60">N° commande</span><span className="font-medium">#{order.id}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-ink/60">Client</span><span className="font-medium">{order.customer_name}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-ink/60">Téléphone</span><span className="font-medium">{order.phone}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-ink/60">Livraison</span><span className="font-medium text-right">{order.address}, {order.city}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-ink/60">Paiement</span><span className="font-medium">À la livraison</span></div>
              <div className="gold-line my-2" />
              <div className="flex justify-between font-semibold"><span>Total</span><span className="text-burgundy">{Number(order.total).toFixed(0)} DA</span></div>
            </div>
            <Link to="/" className="tap inline-block mt-6 bg-burgundy text-white text-sm px-8 py-3 rounded-xl">Continuer mes achats</Link>
          </motion.div>
        ) : <p className="text-center text-ink/50 py-32">Commande introuvable</p>}
      </main>
      <BottomNav />
    </div>
  );
}