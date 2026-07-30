import supabase from './_utils/db-client.js';
import { verifyAdmin } from './_utils/verify-admin.js';

// --- دوال مساعدة لإدارة المخزون وحساب الأسعار ---

function productsTotal(items) {
  return (items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
}

async function shippingFor(wilayaId, deliveryType) {
  const { data, error } = await supabase.from('wilayas').select('*').eq('id', Number(wilayaId)).single();
  if (error) throw new Error('الولاية المطلوبة غير موجودة في قاعدة البيانات');
  const price = deliveryType === 'desk' ? Number(data.desk_shipping_price) : Number(data.home_shipping_price);
  return { price, name: data.name };
}

async function attachShipping(orders) {
  const ids = (orders || []).map(o => o.id);
  if (!ids.length) return orders;
  const { data: ship, error } = await supabase.from('order_shipping').select('*').in('order_id', ids);
  if (error) throw error;
  const smap = new Map((ship || []).map(s => [s.order_id, s]));
  return orders.map(o => ({ ...o, shipping: smap.get(o.id) || null }));
}

async function attachTracking(orders) {
  const ids = (orders || []).map(o => o.id);
  if (!ids.length) return orders;
  const { data: track, error } = await supabase.from('order_tracking').select('*').in('order_id', ids);
  if (error) throw error;
  const tmap = new Map((track || []).map(t => [t.order_id, t]));
  return orders.map(o => ({ ...o, tracking: tmap.get(o.id) || null }));
}

async function deductStock(orderId) {
  const { data: order } = await supabase.from('orders').select('items').eq('id', orderId).single();
  if (!order || !order.items) return;
  for (const item of order.items) {
    if (!item.variantId || !item.size) continue;
    const { data: variant } = await supabase.from('product_variants').select('sizes').eq('id', item.variantId).single();
    if (!variant) continue;
    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const updated = sizes.map(s => {
      if (s.size === item.size) {
        return { ...s, stock: Math.max(0, Number(s.stock || 0) - Number(item.qty || 0)) };
      }
      return s;
    });
    await supabase.from('product_variants').update({ sizes: updated }).eq('id', item.variantId);
  }
}

async function restoreStock(orderId) {
  const { data: order } = await supabase.from('orders').select('items').eq('id', orderId).single();
  if (!order || !order.items) return;
  for (const item of order.items) {
    if (!item.variantId || !item.size) continue;
    const { data: variant } = await supabase.from('product_variants').select('sizes').eq('id', item.variantId).single();
    if (!variant) continue;
    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const updated = sizes.map(s => {
      if (s.size === item.size) {
        return { ...s, stock: Number(s.stock || 0) + Number(item.qty || 0) };
      }
      return s;
    });
    await supabase.from('product_variants').update({ sizes: updated }).eq('id', item.variantId);
  }
}

// --- دوال الشحن لشركة Yalidine الجزائر ---

const YALIDINE_API_URL = 'https://api.yalidine.app/v1/parcel';

function splitName(fullName) {
  const parts = (fullName || 'عميل مجهول').trim().split(/\s+/);
  if (parts.length >= 2) {
    return { prenom: parts[0], nom: parts.slice(1).join(' ') };
  }
  return { prenom: parts[0] || 'عميل', nom: 'مجهول' };
}

function buildItemSummary(items) {
  if (!items || !items.length) return 'طلب متجر أحذية حقائب';
  return items.map(it => `${it.name} (${it.colorName || ''} مقاس.${it.size || ''}) x${it.qty}`).join(', ');
}

async function createYalidineParcel(order, shipping) {
  const apiKey = process.env.SHIPPING_API_KEY;
  const apiToken = process.env.SHIPPING_API_TOKEN;

  if (!apiKey || !apiToken) {
    throw new Error('بيانات الاتصال بشركة الشحن Yalidine غير متوفرة في الإعدادات');
  }

  const { prenom, nom } = splitName(order.customer_name);
  const payload = [{
    order_id: String(order.id),
    firstname: prenom,
    familyname: nom,
    contact_phone: order.phone,
    address: order.address || 'غير محدد',
    to_wilaya_name: shipping.wilaya_name,
    to_commune_name: order.city || 'غير محدد',
    stop_desk: shipping.delivery_type === 'desk' ? 1 : 0,
    height: 10,
    width: 20,
    length: 30,
    weight: 1,
    product_list: buildItemSummary(order.items),
    price: Number(order.total),
    declared_value: Number(order.total),
    freeshipping: 0,
    is_insurance: 0,
    has_exchange: 0
  }];

  const res = await fetch(YALIDINE_API_URL, {
    method: 'POST',
    headers: {
      'X-API-ID': apiKey,
      'X-API-TOKEN': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`فشل الطلب من Yalidine: ${text}`);
  }

  const data = await res.json();
  const parcel = data[String(order.id)];
  if (!parcel || parcel.status === 'error') {
    throw new Error(parcel?.err || 'حدث خطأ أثناء إنشاء الطرد في نظام Yalidine');
  }

  return {
    tracking_number: parcel.tracking,
    voucher_url: parcel.pdf,
  };
}

function mockShippingResponse(order) {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return {
    tracking_number: `YLND${order.id}${rand}`,
    voucher_url: `https://yalidine.app/v1/voucher/YLND${order.id}${rand}`,
  };
}

// --- معالج الـ API الرئيسي ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const type = req.query.type || 'order'; // القيمة الافتراضية للنوع هي طلبات

  try {
    // ==========================================
    // 1. عمليات جلب البيانات (GET)
    // ==========================================
    if (req.method === 'GET') {
      
      // جلب تكاليف الولايات والشحن (متاح للجميع)
      if (type === 'wilayas') {
        const { data, error } = await supabase.from('wilayas').select('*').order('id', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      }

      // جلب بلديات ولاية معينة (متاح للجميع، تُستخدم في صفحة الدفع)
      if (type === 'communes') {
        const wilayaId = req.query.wilaya_id;
        if (!wilayaId) return res.status(400).json({ error: 'wilaya_id مطلوب' });
        const { data, error } = await supabase.from('communes').select('*').eq('wilaya_id', Number(wilayaId)).order('name', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      }

      // جلب الطلبات (يتطلب صلاحية مدير النظام)
      if (type === 'order') {
        const admin = await verifyAdmin(req);
        if (!admin) return res.status(403).json({ error: 'مطلوب تسجيل الدخول كمدير نظام للوصول للطلبات' });

        const id = req.query.id;
        if (id) {
          const { data: order, error } = await supabase.from('orders').select('*').eq('id', Number(id)).single();
          if (error) throw error;
          const [withShip, withTrack] = await Promise.all([
            attachShipping([order]),
            attachTracking([order])
          ]);
          return res.status(200).json(withTrack[0]);
        } else {
          const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          const withShip = await attachShipping(orders);
          const withTrack = await attachTracking(withShip);
          return res.status(200).json(withTrack);
        }
      }
    }

    // ==========================================
    // 2. عمليات الإضافة والإنشاء (POST)
    // ==========================================
    if (req.method === 'POST') {

      // إنشاء طلب جديد للعملاء من المتجر (متاح للجميع دون تسجيل دخول)
      if (type === 'order') {
        const { customer_name, phone, address, city, commune_id, items, wilaya_id, wilaya_name, delivery_type, payment_method } = req.body;
        if (!customer_name || !phone || !items || !items.length || !wilaya_id) {
          return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة لإنشاء الطلب' });
        }

        // إذا تم اختيار بلدية من القائمة، تحقق أنها فعلاً تابعة للولاية المختارة
        // واستخدم اسمها الرسمي كقيمة city (يبقى النص القديم كخيار احتياطي)
        let resolvedCity = city;
        if (commune_id) {
          const { data: commune, error: cerr } = await supabase
            .from('communes').select('id,name,wilaya_id').eq('id', Number(commune_id)).single();
          if (cerr || !commune) return res.status(400).json({ error: 'البلدية المختارة غير صالحة' });
          if (commune.wilaya_id !== Number(wilaya_id)) {
            return res.status(400).json({ error: 'البلدية المختارة لا تنتمي إلى الولاية المختارة' });
          }
          resolvedCity = commune.name;
        }
        if (!resolvedCity) return res.status(400).json({ error: 'يرجى تحديد البلدية' });

        const { price: shipping_price } = await shippingFor(wilaya_id, delivery_type);
        const pTotal = productsTotal(items);
        const grandTotal = pTotal + shipping_price;

        const { data: order, error } = await supabase.from('orders').insert({
          customer_name, phone, address, city: resolvedCity, commune_id: commune_id || null,
          total: grandTotal, payment_method: payment_method || 'cod', status: 'pending', items,
        }).select().single();
        if (error) throw error;

        await deductStock(order.id);

        const { error: serr } = await supabase.from('order_shipping').insert({
          order_id: order.id, wilaya_id: Number(wilaya_id), wilaya_name, delivery_type, shipping_price,
        });
        if (serr) throw serr;

        try {
          await supabase.from('customers').upsert({ phone, name: customer_name }, { onConflict: 'phone' });
        } catch (e) { /* خطأ غير حرج لا يوقف العملية */ }

        const { data: shipRow } = await supabase.from('order_shipping').select('*').eq('order_id', order.id).single();
        return res.status(201).json({ ...order, shipping: shipRow });
      }

      // عمليات POST التالية تطلب صلاحيات مدير نظام بالكامل
      const admin = await verifyAdmin(req);
      if (!admin) return res.status(403).json({ error: 'مطلوب صلاحية مدير نظام لإجراء هذه العملية' });

      // دمج الطلبات المكررة لعميل واحد (Orders Merge)
      if (type === 'merge') {
        const { primary_id, secondary_ids } = req.body;
        if (!primary_id || !Array.isArray(secondary_ids) || !secondary_ids.length) {
          return res.status(400).json({ error: 'الرجاء إرسال الطلب الأساسي والطلبات المراد دمجها' });
        }

        const { data: primary, error: perr } = await supabase.from('orders').select('*').eq('id', Number(primary_id)).single();
        if (perr) throw perr;

        const { data: secondaries, error: serr } = await supabase.from('orders').select('*').in('id', secondary_ids.map(Number));
        if (serr) throw serr;

        const combined = [...(primary.items || []), ...secondaries.flatMap(s => s.items || [])];
        const pTotal = productsTotal(combined);

        const { data: ship, error: sherr } = await supabase.from('order_shipping').select('*').eq('order_id', primary.id).single();
        const shippingPrice = ship ? Number(ship.shipping_price) : 0;
        const grandTotal = pTotal + shippingPrice;

        const { data: updated, error: uerr } = await supabase.from('orders').update({ items: combined, total: grandTotal }).eq('id', primary.id).select().single();
        if (uerr) throw uerr;

        const { error: merr } = await supabase.from('order_merges').insert(
          secondary_ids.map(sid => ({ primary_order_id: primary.id, merged_order_id: Number(sid) }))
        );
        if (merr) throw merr;

        const { error: superr } = await supabase.from('orders').update({ status: 'merged' }).in('id', secondary_ids.map(Number));
        if (superr) throw superr;

        return res.status(200).json({ primary: { ...updated, shipping: ship }, merged_count: secondary_ids.length });
      }

      // إرسال الطلب لشركة الشحن Yalidine وإنشاء رمز التتبع والملصق
      if (type === 'shipping') {
        const { order_id } = req.body;
        if (!order_id) return res.status(400).json({ error: 'رقم الطلب order_id مطلوب للبدء بعملية الشحن' });

        const { data: order, error: oerr } = await supabase.from('orders').select('*').eq('id', Number(order_id)).single();
        if (oerr) throw oerr;

        const { data: shipping, error: sherr } = await supabase.from('order_shipping').select('*').eq('order_id', Number(order_id)).single();
        if (sherr) throw sherr;

        const hasCredentials = !!(process.env.SHIPPING_API_KEY && process.env.SHIPPING_API_TOKEN);
        let result;

        try {
          result = hasCredentials ? await createYalidineParcel(order, shipping) : mockShippingResponse(order);
        } catch (apiErr) {
          console.error('فشلت عملية الشحن عبر نظام Yalidine، تم التحول لبيانات تجريبية:', apiErr.message);
          result = { ...mockShippingResponse(order), mock: true, api_error: apiErr.message };
        }

        const { data: trackingRow, error: terr } = await supabase.from('order_tracking').insert({
          order_id: Number(order_id),
          tracking_number: result.tracking_number,
          shipping_voucher_url: result.voucher_url,
        }).select().single();
        if (terr) throw terr;

        if (order.status === 'pending' || order.status === 'confirmed') {
          await supabase.from('orders').update({ status: 'shipped' }).eq('id', Number(order_id));
        }

        return res.status(200).json({
          tracking_number: result.tracking_number,
          voucher_url: result.voucher_url,
          mock: !!result.mock,
          status_updated: order.status === 'pending' || order.status === 'confirmed',
        });
      }
    }

    // ==========================================
    // 3. عمليات تحديث الحالات والتعديل (PUT)
    // ==========================================
    if (req.method === 'PUT') {
      const admin = await verifyAdmin(req);
      if (!admin) return res.status(403).json({ error: 'مطلوب صلاحيات مدير نظام لتعديل الحالات' });

      // تحديث حالة الطلب وإرجاع المنتجات للمخزون إذا ألغي الطلب أو استرجع
      if (type === 'order') {
        const { id, status } = req.body;
        if (status === 'returned' || status === 'cancelled') {
          await restoreStock(id);
        }
        const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
    }

    res.status(405).json({ error: 'الطريقة المطلوبة للطلب غير مدعومة' });
  } catch (err) {
    console.error(`حدث خطأ داخلي في نظام الطلبات (${type}):`, err);
    res.status(500).json({ error: err.message });
  }
}
