import supabase from './_utils/db-client.js';
import { verifyAdmin } from './_utils/verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const type = req.query.type || 'stats';

  try {
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(403).json({ error: 'مطلوب صلاحية مدير نظام للوصول لإحصائيات النظام' });

    if (type === 'stats') {
      const [
        { count: products },
        { count: orders },
        { data: orderRows },
        { count: deliveredCount },
        { count: shippedCount },
        { count: returnedCount },
        { data: recentAllOrders },
        { data: variants },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('id,customer_name,total,status,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['shipped', 'delivered', 'returned']),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'returned'),
        // 7 derniers jours + calcul "top produits" : on récupère total/items/created_at/status
        // sur une fenêtre large (200 dernières commandes) pour rester correct sans scanner toute la table.
        supabase.from('orders').select('total,items,status,created_at').order('created_at', { ascending: false }).limit(200),
        // Stock actuel de toutes les variantes, pour calculer les alertes de stock faible.
        supabase.from('product_variants').select('id,product_id,color_name,images,sizes'),
      ]);

      const revenue = (orderRows || []).reduce((s, o) => s + Number(o.total || 0), 0);
      const pending = (orderRows || []).filter(o => o.status === 'pending').length;
      const delivered = deliveredCount || 0;
      const shipped = shippedCount || 0;
      const returned = returnedCount || 0;
      const deliveryRate = shipped > 0 ? Math.round((delivered / shipped) * 100) : 0;

      // --- Ventes des 7 derniers jours (hors commandes retournées) ---
      const validRecent = (recentAllOrders || []).filter(o => o.status !== 'returned');
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (6 - i));
        const next = d.getTime() + 86_400_000;
        const dayOrders = validRecent.filter(o => {
          const t = new Date(o.created_at).getTime();
          return t >= d.getTime() && t < next;
        });
        return {
          label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
          amount: dayOrders.reduce((s, o) => s + Number(o.total || 0), 0),
          count: dayOrders.length,
        };
      });

      // --- Produits les plus vendus (quantités depuis orders.items, jsonb) ---
      const soldMap = new Map();
      validRecent.forEach(o => {
        (o.items || []).forEach(it => {
          const key = it.productId ?? it.name;
          const cur = soldMap.get(key) || { name: it.name, qty: 0 };
          cur.qty += Number(it.qty || 0);
          soldMap.set(key, cur);
        });
      });
      const topProducts = [...soldMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 4);

      // --- Alertes de stock faible (stock total par produit <= 5) ---
      const { data: allProducts } = await supabase.from('products').select('id,name');
      const nameById = new Map((allProducts || []).map(p => [p.id, p.name]));
      const stockByProduct = new Map();
      const imageByProduct = new Map();
      for (const v of variants || []) {
        const total = (v.sizes || []).reduce((s, sz) => s + Number(sz.stock || 0), 0);
        stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + total);
        if (!imageByProduct.has(v.product_id) && v.images?.[0]) imageByProduct.set(v.product_id, v.images[0]);
      }
      const lowStock = [...stockByProduct.entries()]
        .filter(([, stock]) => stock <= 5)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 5)
        .map(([pid, stock]) => ({ id: pid, name: nameById.get(pid) || `#${pid}`, stock, image: imageByProduct.get(pid) || null }));

      return res.status(200).json({
        products: products || 0,
        orders: orders || 0,
        revenue,
        pending,
        delivered,
        shipped,
        returned,
        delivery_rate: deliveryRate,
        recent_orders: orderRows || [],
        weekly_sales: days,
        top_products: topProducts,
        low_stock: lowStock,
      });
    }

    res.status(405).json({ error: 'الطريقة المستخدمة في الطلب غير مدعومة للنظام' });
  } catch (err) {
    console.error(`حدث خطأ في النظام (${type}):`, err);
    res.status(500).json({ error: err.message });
  }
}
