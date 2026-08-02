import supabase from './_utils/db-client.js';
import { verifyAdmin } from './_utils/verify-admin.js';

// --- دوال مساعدة (من ملف products القديم) ---
function withCategoryName(products, categories) {
  const cmap = new Map(categories.map(c => [c.id, c]));
  return products.map(p => ({
    ...p,
    category_name: cmap.get(p.category_id)?.name || null,
    category_slug: cmap.get(p.category_id)?.slug || null,
  }));
}

function attachVariantsSummary(products, variants) {
  const byPid = new Map();
  for (const v of variants) {
    if (!byPid.has(v.product_id)) byPid.set(v.product_id, []);
    byPid.get(v.product_id).push(v);
  }
  return products.map(p => {
    const pv = byPid.get(p.id) || [];
    const def = pv.find(v => v.is_default) || pv[0];
    const cover = def?.images?.[0] || pv[0]?.images?.[0] || null;
    const colors = pv.map(v => ({ hex: v.color_hex, name: v.color_name, type: v.color_type }));
    const totalStock = pv.reduce((s, v) => s + ((v.sizes || []).reduce((q, sz) => q + Number(sz.stock || 0), 0)), 0);
    const sizeSet = new Set();
    for (const v of pv) {
      for (const sz of (v.sizes || [])) {
        if (Number(sz.stock) > 0) sizeSet.add(sz.size);
      }
    }
    const sizes = [...sizeSet].sort((a, b) => Number(a) - Number(b));
    return { ...p, cover_image: cover, colors, in_stock: totalStock > 0, sizes };
  });
}

// --- الدالة الرئيسية للـ API ---
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // تحديد نوع العملية المطلوبة (افتراضياً product)
  // الأنواع المتاحة: 'product', 'category', 'variant', 'inventory'
  const type = req.query.type || 'product';

  try {
    // ==========================================
    // 1. طلبات الجلب (GET)
    // ==========================================
    if (req.method === 'GET') {
      
      // --- الجرد (Inventory) [يتطلب صلاحيات مدير] ---
      if (type === 'inventory') {
        const admin = await verifyAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

        const { data: categories } = await supabase.from('categories').select('*');
        const catMap = new Map((categories || []).map(c => [c.id, c.name]));

        const { data: products } = await supabase.from('products').select('*').order('name', { ascending: true });
        const { data: variants } = await supabase.from('product_variants').select('*').order('product_id', { ascending: true });
        const { data: logs } = await supabase.from('stock_logs').select('*').order('created_at', { ascending: false }).limit(20);

        const variantsByProduct = new Map();
        for (const v of variants || []) {
          if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
          variantsByProduct.get(v.product_id).push(v);
        }

        const result = (products || []).map(p => {
          const pvars = variantsByProduct.get(p.id) || [];
          const def = pvars.find(v => v.is_default) || pvars[0];
          const cover = def?.images?.[0] || pvars[0]?.images?.[0] || null;
          return {
            id: p.id,
            name: p.name,
            category_name: catMap.get(p.category_id) || null,
            cover_image: cover,
            variants: pvars.map(v => ({
              id: v.id, color_name: v.color_name, color_hex: v.color_hex, sizes: v.sizes || [], images: v.images || [],
            })),
          };
        });
        return res.status(200).json({ products: result, logs: logs || [] });
      }

      // --- التصنيفات (Categories) ---
      if (type === 'category') {
        const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      }

      // --- المتغيرات (Variants) ---
      if (type === 'variant') {
        const pid = req.query.product_id;
        const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', Number(pid)).order('is_default', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      // --- المنتجات (Products) [الافتراضي] ---
      if (type === 'product') {
        // Le client envoie le paramètre sous le nom "cat" (voir ProductsAPI.getProducts
        // dans src/lib/api.ts : params.append('cat', filters.category)). Lire "category"
        // ici ne matchait jamais aucune clé de req.query → le filtre de catégorie était
        // silencieusement ignoré et l'API renvoyait toujours tous les produits, quelle
        // que soit la catégorie sélectionnée côté client.
        const { id, cat, featured } = req.query;
        const { data: categories, error: cerr } = await supabase.from('categories').select('*');
        if (cerr) throw cerr;

        let q = supabase.from('products').select('*');
        if (id) q = q.eq('id', id);
        else if (cat) {
          const cid = (categories.find(c => c.slug === cat) || {}).id;
          if (cid) q = q.eq('category_id', cid);
        }
        if (featured === 'true' && !id) q = q.eq('featured', true);
        
        const { data: products, error: perr } = await q.order('created_at', { ascending: false });
        if (perr) throw perr;

        const out = withCategoryName(products, categories);

        if (id) {
          const { data: variants, error: verr } = await supabase.from('product_variants').select('*').eq('product_id', Number(id)).order('is_default', { ascending: false });
          if (verr) throw verr;
          return res.status(200).json({ product: out[0], variants });
        }

        const pids = out.map(p => p.id);
        let variants = [];
        if (pids.length) {
          const { data: vdata } = await supabase.from('product_variants').select('*').in('product_id', pids);
          variants = vdata || [];
        }
        return res.status(200).json(attachVariantsSummary(out, variants));
      }
    }

    // ==========================================
    // حماية التعديلات: جميع عمليات POST, PUT, DELETE تتطلب مدير
    // ==========================================
    const admin = await verifyAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Accès administrateur requis' });

    // 2. طلبات الإضافة (POST)
    if (req.method === 'POST') {
      if (type === 'category') {
        const { name, slug, image } = req.body;
        const { data, error } = await supabase.from('categories').insert({ name, slug, image }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      
      if (type === 'variant') {
        const rows = Array.isArray(req.body) ? req.body : [req.body];
        const { data, error } = await supabase.from('product_variants').insert(rows).select();
        if (error) throw error;
        return res.status(201).json(data);
      }
      
      if (type === 'product') {
        const { name, description, category_id, price, discount, status, featured } = req.body;
        const { data, error } = await supabase.from('products').insert({
          name, description, category_id, price, discount: discount || 0, status: status || 'draft', featured: !!featured,
        }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
    }

    // 3. طلبات التحديث (PUT)
    if (req.method === 'PUT') {
      if (type === 'inventory') {
        const { variant_id, size, stock } = req.body;
        if (!variant_id || !size) return res.status(400).json({ error: 'variant_id et size requis' });

        const { data: variant, error: verr } = await supabase.from('product_variants').select('id,sizes,color_name,product_id').eq('id', Number(variant_id)).single();
        if (verr) throw verr;

        const { data: product } = await supabase.from('products').select('name').eq('id', variant.product_id).single();

        const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
        const oldStock = sizes.find(s => s.size === size)?.stock || 0;
        const updated = sizes.map(s => s.size === size ? { ...s, stock: Number(stock) } : s);
        if (!updated.some(s => s.size === size)) updated.push({ size, stock: Number(stock) });

        const { error: uerr } = await supabase.from('product_variants').update({ sizes: updated }).eq('id', variant.id);
        if (uerr) throw uerr;

        await supabase.from('stock_logs').insert({
          variant_id: variant.id, product_name: product?.name || '', color_name: variant.color_name || '',
          size, old_stock: oldStock, new_stock: Number(stock), change_type: 'manual',
        });
        return res.status(200).json({ ok: true });
      }

      if (type === 'variant') {
        const { product_id, variants } = req.body;
        await supabase.from('product_variants').delete().eq('product_id', product_id);
        if (variants && variants.length) {
          const { data, error } = await supabase.from('product_variants').insert(variants).select();
          if (error) throw error;
          return res.status(200).json(data);
        }
        return res.status(200).json([]);
      }

      if (type === 'product') {
        const { id, name, description, category_id, price, discount, status, featured } = req.body;
        const { data, error } = await supabase.from('products').update({
          name, description, category_id, price, discount, status, featured,
        }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
    }

    // 4. طلبات الحذف (DELETE)
    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      
      if (type === 'variant') {
        const { error } = await supabase.from('product_variants').delete().eq('id', Number(id));
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      
      if (type === 'product') {
        await supabase.from('product_variants').delete().eq('product_id', Number(id));
        const { error } = await supabase.from('products').delete().eq('id', Number(id));
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`Catalog API Error (${type}):`, err);
    res.status(500).json({ error: err.message });
  }
}
