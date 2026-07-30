import supabase from './_utils/db-client.js';
import { verifyAdmin } from './_utils/verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const type = req.query.type || 'customer';

  try {
    const admin = await verifyAdmin(req);

    // مسار التحقق السريع من صلاحيات جلسة المدير (Verify Session Endpoint)
    if (type === 'verify') {
      if (!admin) return res.status(401).json({ error: 'الجلسة منتهية أو غير صالحة' });
      return res.status(200).json({ success: true, user: admin });
    }

    // جميع العمليات الأخرى للعملاء تطلب صلاحية مدير بشكل صارم
    if (!admin) return res.status(403).json({ error: 'مطلوب صلاحية مدير نظام لإتمام العملية' });

    // 1. جلب العملاء (GET)
    if (req.method === 'GET') {
      if (type === 'customer') {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
    }

    // 2. إنشاء عميل جديد يدوياً (POST)
    if (req.method === 'POST') {
      if (type === 'customer') {
        const { phone, name } = req.body;
        if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب لتسجيل العميل' });

        const { data: existing } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
        if (existing) return res.status(200).json(existing);

        const { data, error } = await supabase.from('customers').insert({ phone, name }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
    }

    // 3. تعديل بيانات عميل أو حظره (PUT)
    if (req.method === 'PUT') {
      if (type === 'customer') {
        const { phone, is_blacklisted, name } = req.body;
        if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب للبحث عن العميل وتعديل بياناته' });

        const { data: existing } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
        if (existing) {
          const { data, error } = await supabase.from('customers').update({
            is_blacklisted,
            name: name || existing.name
          }).eq('id', existing.id).select().single();
          if (error) throw error;
          return res.status(200).json(data);
        }

        const { data, error } = await supabase.from('customers').insert({ phone, name, is_blacklisted }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
    }

    res.status(405).json({ error: 'الطريقة المستخدمة للطلب غير مسموحة' });
  } catch (err) {
    console.error(`حدث خطأ في واجهة المستخدمين (${type}):`, err);
    res.status(500).json({ error: err.message });
  }
}