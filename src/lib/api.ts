// src/lib/api.ts
import supabase from './supabase';
import type { Order, Customer } from './types';

// الجزء الخاص بدالة الاتصال التقليدية (أبقيتها كما طلبت)
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

// دالة مساعدة للأخطاء
const handleSupabaseError = (error: any) => {
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error(error.message || 'حدث خطأ في قاعدة البيانات');
  }
};

export const endpoints = {
  // المنتجات (اتصال مباشر بـ Supabase)
  products: {
    getAll: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
      handleSupabaseError(error);
      return data;
    },
    getOne: async (id: string | number) => {
      const { data, error } = await supabase.from('products').select('*, product_variants(*)').eq('id', Number(id)).single();
      handleSupabaseError(error);
      return data;
    },
    create: async (data: any) => {
      const { data: res, error } = await supabase.from('products').insert(data).select().single();
      handleSupabaseError(error);
      return res;
    },
    update: async (data: any) => {
      const { data: res, error } = await supabase.from('products').update(data).eq('id', data.id).select().single();
      handleSupabaseError(error);
      return res;
    },
    delete: async (id: number) => {
      await supabase.from('product_variants').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      handleSupabaseError(error);
      return { ok: true };
    },
  },
  
  // المتغيرات (اتصال مباشر)
  variants: {
    update: async (data: any) => {
      const { data: res, error } = await supabase.from('product_variants').update(data).eq('id', data.id).select().single();
      handleSupabaseError(error);
      return res;
    },
  },

  // المخزون (اتصال مباشر)
  inventory: {
    get: async () => {
      const { data, error } = await supabase.from('product_variants').select('*');
      handleSupabaseError(error);
      return data;
    },
    update: async (data: any) => {
      const { data: res, error } = await supabase.from('product_variants').update({ sizes: data.sizes }).eq('id', data.id).select().single();
      handleSupabaseError(error);
      return res;
    },
  },

  // الطلبات (اتصال مباشر)
  orders: {
    getAll: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      handleSupabaseError(error);
      return data;
    },
    updateStatus: async (id: number, status: string) => {
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
      handleSupabaseError(error);
      return data;
    },
    merge: async (data: any) => {
      const { data: res, error } = await supabase.from('order_merges').insert(data).select();
      handleSupabaseError(error);
      return res;
    },
    ship: async (order_id: number) => {
      const { data, error } = await supabase.from('order_tracking').insert({ order_id }).select();
      handleSupabaseError(error);
      return data;
    }
  },

  // العملاء (اتصال مباشر)
  customers: {
    update: async (data: any) => {
      const { data: res, error } = await supabase.from('customers').update(data).eq('phone', data.phone).select().single();
      handleSupabaseError(error);
      return res;
    }
  },

  // أخرى (ابقائها تستخدم api القديمة إذا كنت لا تزال بحاجة لها)
  categories: {
    getAll: () => api('/api/categories'),
  },
  stats: {
    get: () => api('/api/stats'),
  },
  upload: (data: any) => api('/api/upload', { method: 'POST', ...jbody(data) })
};