import supabase from './_utils/db-client.js';
import { verifyAdmin } from './_utils/verify-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'مطلوب صلاحية مدير نظام لرفع الصور والملفات' });

  try {
    if (req.method === 'POST') {
      const { fileName, fileBase64, contentType } = req.body;
      if (!fileBase64) return res.status(400).json({ error: 'بيانات الملف المرفوع غير مكتملة' });
      
      const buffer = Buffer.from(fileBase64, 'base64');
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${Date.now()}_${safeName}`;
      
      const { data, error } = await supabase.storage.from('product-images').upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      return res.status(200).json({ url: urlData.publicUrl, path });
    }
    
    res.status(405).json({ error: 'الطريقة المطلوبة للطلب غير مدعومة' });
  } catch (err) {
    console.error('حدث خطأ أثناء معالجة رفع الملف:', err);
    res.status(500).json({ error: err.message });
  }
}