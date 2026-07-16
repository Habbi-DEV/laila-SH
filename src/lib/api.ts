// src/lib/api.ts - نسخة نهائية متوافقة
import supabase from './supabase';

// دالة الاتصال الأصلية (للحفاظ على توافق المشروع بالكامل)
export async function api(path: string, opts?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  } catch {}
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const jbody = (data: unknown) => ({ body: JSON.stringify(data) });

const handleErr = (err: any) => { if (err) throw err; };

export const endpoints = {
  products: {
    getAll: async () => { const { data, error } = await supabase.from('products').select('*'); handleErr(error); return data; },
    getOne: async (id: any) => { const { data, error } = await supabase.from('products').select('*').eq('id', id).single(); handleErr(error); return data; },
    getById: async (id: any) => { const { data, error } = await supabase.from('products').select('*').eq('id', id).single(); handleErr(error); return data; },
    get: async () => { const { data, error } = await supabase.from('products').select('*'); handleErr(error); return data; },
    create: async (d: any) => { const { data, error } = await supabase.from('products').insert(d).select().single(); handleErr(error); return data; },
    update: async (d: any) => { const { data, error } = await supabase.from('products').update(d).eq('id', d.id).select().single(); handleErr(error); return data; },
    delete: async (id: number) => { const { error } = await supabase.from('products').delete().eq('id', id); handleErr(error); return { ok: true }; },
  },
  variants: {
    update: async (d: any) => { const { data, error } = await supabase.from('product_variants').update(d).eq('id', d.id).select().single(); handleErr(error); return data; },
  },
  inventory: {
    get: async () => { const { data, error } = await supabase.from('product_variants').select('*'); handleErr(error); return data; },
    update: async (d: any) => { const { data, error } = await supabase.from('product_variants').update(d).eq('id', d.id).select().single(); handleErr(error); return data; },
  },
  orders: {
    getAll: async () => { const { data, error } = await supabase.from('orders').select('*'); handleErr(error); return data; },
    getById: async (id: any) => { const { data, error } = await supabase.from('orders').select('*').eq('id', id).single(); handleErr(error); return data; },
    updateStatus: async (id: number, status: string) => { const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single(); handleErr(error); return data; },
    merge: async (d: any) => { const { data, error } = await supabase.from('order_merges').insert(d).select(); handleErr(error); return data; },
    ship: async (order_id: number) => { const { data, error } = await supabase.from('order_tracking').insert({ order_id }).select(); handleErr(error); return data; }
  },
  customers: {
    update: async (d: any) => { const { data, error } = await supabase.from('customers').update(d).eq('phone', d.phone).select().single(); handleErr(error); return data; },
  },
  categories: {
    getAll: async () => { const { data, error } = await supabase.from('categories').select('*'); handleErr(error); return data; },
  },
  wilayas: { // أضيفت لحل خطأ Checkout.tsx
    getAll: async () => { const { data, error } = await supabase.from('wilayas').select('*'); handleErr(error); return data; },
  },
  stats: {
    get: async () => { const { count: products } = await supabase.from('products').select('*', { count: 'exact' }); return { products }; }
  },
  upload: (d: any) => api('/api/upload', { method: 'POST', ...jbody(d) })
};