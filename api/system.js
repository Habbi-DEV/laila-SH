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
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('id,customer_name,total,status,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['shipped', 'delivered', 'returned']),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'returned'),
      ]);

      const revenue = (orderRows || []).reduce((s, o) => s + Number(o.total || 0), 0);
      const pending = (orderRows || []).filter(o => o.status === 'pending').length;
      const delivered = deliveredCount || 0;
      const shipped = shippedCount || 0;
      const returned = returnedCount || 0;
      const deliveryRate = shipped > 0 ? Math.round((delivered / shipped) * 100) : 0;

      return res.status(200).json({
        products: products || 0,
        orders: orders || 0,
        revenue,
        pending,
        delivered,
        shipped,
        returned,
        delivery_rate: deliveryRate,
        recent_orders: orderRows || []
      });
    }

    res.status(405).json({ error: 'الطريقة المستخدمة في الطلب غير مدعومة للنظام' });
  } catch (err) {
    console.error(`حدث خطأ في النظام (${type}):`, err);
    res.status(500).json({ error: err.message });
  }
}