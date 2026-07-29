import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { WILAYAS } from '../lib/wilayas';
import type { OrderItem } from '../lib/types';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { show } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaId, setWilayaId] = useState('');
  const [commune, setCommune] = useState('');
  const [deliveryType, setDeliveryType] = useState<'home' | 'stopdesk'>('home');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Nom requis';
  if (!phone.trim()) errors.phone = 'Téléphone requis';
  else if (!/^0[5-7][0-9]{8}$/.test(phone.replace(/\s/g, ''))) errors.phone = 'Numéro invalide (ex: 0555123456)';
  if (!wilayaId) errors.wilaya = 'Wilaya requise';
  if (!commune.trim()) errors.commune = 'Commune requise';

  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0) {
      show('Veuillez corriger les champs', 'error');
      return;
    }
    const wilaya = WILAYAS.find(w => w.id === Number(wilayaId));
    const orderItems: OrderItem[] = items.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      title: item.title,
      color: item.color_hex,
      color_name: item.color_name,
      size: item.size,
      qty: item.qty,
      price: item.discount_price ?? item.price,
      image: item.image,
    }));

    setSubmitting(true);
    try {
      const order = await api.createOrder({
        customer_name: name,
        phone: phone.replace(/\s/g, ''),
        wilaya: wilaya?.name || '',
        wilaya_id: Number(wilayaId),
        commune,
        delivery_type: deliveryType,
        items: orderItems,
      });
      setOrderNumber(order.order_number);
      setSuccess(true);
      clearCart();
      show('Commande passée!', 'success');
    } catch (err: any) {
      show(err.message || 'Erreur lors de la commande', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <CheckCircle size={64} className="text-green-500 mb-4" />
        </motion.div>
        <h1 className="font-serif text-2xl text-ink mb-2">Commande confirmée!</h1>
        <p className="text-sm text-gray-500 mb-1">Votre numéro de commande</p>
        <p className="font-mono text-burgundy font-bold text-lg mb-6">{orderNumber}</p>
        <p className="text-sm text-gray-500 mb-6">Nous vous contacterons bientôt pour confirmer la livraison.</p>
        <button onClick={() => navigate('/')} className="bg-burgundy text-white px-8 py-3 rounded-full text-sm font-medium">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Votre panier est vide</p>
        <Link to="/shop" className="text-burgundy font-medium">Découvrir</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-20">
      <div className="bg-white border-b border-sandline">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ChevronLeft size={20} className="text-gray-700" /></button>
          <h1 className="font-serif text-lg text-ink">Commander</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Résumé</p>
          {items.map(item => (
            <div key={`${item.variant_id}-${item.size}`} className="flex justify-between text-sm py-1">
              <span className="text-gray-600 line-clamp-1">{item.title} · {item.size} ×{item.qty}</span>
              <span className="font-medium">{((item.discount_price ?? item.price) * item.qty).toLocaleString('fr-FR')} DA</span>
            </div>
          ))}
          <div className="border-t border-sandline mt-2 pt-2 flex justify-between">
            <span className="font-serif text-ink">Total</span>
            <span className="text-burgundy font-bold">{total.toLocaleString('fr-FR')} DA</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Nom complet *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Votre nom"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sandline text-sm focus:border-burgundy focus:outline-none"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Téléphone *</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0555 12 34 56"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sandline text-sm focus:border-burgundy focus:outline-none"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Wilaya *</label>
            <select
              value={wilayaId}
              onChange={e => setWilayaId(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sandline text-sm focus:border-burgundy focus:outline-none bg-white"
            >
              <option value="">Sélectionner</option>
              {WILAYAS.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name}</option>)}
            </select>
            {errors.wilaya && <p className="text-xs text-red-500 mt-1">{errors.wilaya}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Commune *</label>
            <input
              type="text"
              value={commune}
              onChange={e => setCommune(e.target.value)}
              placeholder="Votre commune"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-sandline text-sm focus:border-burgundy focus:outline-none"
            />
            {errors.commune && <p className="text-xs text-red-500 mt-1">{errors.commune}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2 block">Type de livraison</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeliveryType('home')}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${deliveryType === 'home' ? 'bg-burgundy text-white border-burgundy' : 'bg-white text-gray-600 border-sandline'}`}
              >
                À domicile
              </button>
              <button
                onClick={() => setDeliveryType('stopdesk')}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${deliveryType === 'stopdesk' ? 'bg-burgundy text-white border-burgundy' : 'bg-white text-gray-600 border-sandline'}`}
              >
                Stop desk
              </button>
            </div>
          </div>
          <div className="bg-rose-light/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-xs text-gray-600">💵 Paiement à la livraison (COD)</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-burgundy text-white py-3.5 rounded-full font-semibold text-sm hover:bg-burgundy-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (<><Loader2 size={18} className="animate-spin" /> Traitement...</>) : `Confirmer · ${total.toLocaleString('fr-FR')} DA`}
        </button>
      </div>
    </div>
  );
}
