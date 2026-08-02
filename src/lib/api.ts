import supabase from './supabase';
// استيراد الواجهات من ملف types[cite: 7]
import type { 
  Category, 
  Product, 
  ProductVariant, 
  Customer, 
  Order, 
  Wilaya,
  Commune,
  CartItem 
} from './types'; 

// ==========================================
// 1. الأساسيات (Core Fetch Wrappers)
// ==========================================

export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.headers) Object.assign(headers, opts.headers as Record<string, string>);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  } catch {}

  if (opts?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function jbody(data: unknown) {
  return { body: JSON.stringify(data) };
}

// ==========================================
// 2. إدارة المستخدمين والعملاء (Users & Customers API)
// ==========================================

export const UsersAPI = {
  verifySession: () => api('/api/users?type=verify'),
  getCustomers: () => api<Customer[]>('/api/users?type=customer'), //[cite: 7]
  createCustomer: (data: { phone: string; name?: string }) => 
    api<Customer>('/api/users?type=customer', { method: 'POST', ...jbody(data) }), //[cite: 7]
  updateCustomer: (data: { phone: string; name?: string; is_blacklisted?: boolean }) => 
    api<Customer>('/api/users?type=customer', { method: 'PUT', ...jbody(data) }) //[cite: 7]
};

// ==========================================
// 3. رفع الملفات (Upload API)
// ==========================================

export const UploadAPI = {
  uploadImage: (fileName: string, fileBase64: string, contentType: string = 'image/jpeg') => 
    api<{ url: string; path: string }>('/api/upload', { method: 'POST', ...jbody({ fileName, fileBase64, contentType }) })
};

// ==========================================
// 4. إدارة الكتالوج والمنتجات (Products API)
// ==========================================

export const ProductsAPI = {
  // المنتجات (Products)[cite: 7]
  getProducts: (filters?: { category?: string; featured?: boolean }) => {
    const params = new URLSearchParams({ type: 'product' });
    if (filters?.category) params.append('cat', filters.category);
    if (filters?.featured) params.append('featured', 'true');
    return api<Product[]>(`/api/products?${params.toString()}`);
  },
  getProductById: (id: string | number) => 
    api<{ product: Product; variants: ProductVariant[] }>(`/api/products?type=product&id=${id}`), //[cite: 7]
  
  createProduct: (data: Partial<Product>) => 
    api<Product>('/api/products?type=product', { method: 'POST', ...jbody(data) }), //[cite: 7]
  
  updateProduct: (data: Partial<Product> & { id: number }) => 
    api<Product>('/api/products?type=product', { method: 'PUT', ...jbody(data) }), //[cite: 7]
  
  deleteProduct: (id: string | number) => 
    api<{ ok: boolean }>(`/api/products?type=product&id=${id}`, { method: 'DELETE' }),

  // التصنيفات (Categories)[cite: 7]
  getCategories: () => api<Category[]>('/api/products?type=category'),
  createCategory: (data: Omit<Category, 'id'>) => 
    api<Category>('/api/products?type=category', { method: 'POST', ...jbody(data) }),

  // المتغيرات (Variants)[cite: 7]
  getVariants: (productId: string | number) => 
    api<ProductVariant[]>(`/api/products?type=variant&product_id=${productId}`),
  
  createVariants: (variants: Omit<ProductVariant, 'id'>[]) => 
    api<ProductVariant[]>('/api/products?type=variant', { method: 'POST', ...jbody(variants) }),
  
  updateVariants: (productId: string | number, variants: Omit<ProductVariant, 'id'>[]) => 
    api<ProductVariant[]>('/api/products?type=variant', { method: 'PUT', ...jbody({ product_id: productId, variants }) }),
  
  deleteVariant: (variantId: string | number) => 
    api<{ ok: boolean }>(`/api/products?type=variant&id=${variantId}`, { method: 'DELETE' }),

  // المخزون (Inventory)
  getInventory: () => api<{ products: any[]; logs: any[] }>('/api/products?type=inventory'),
  updateStock: (variant_id: string | number, size: string, stock: number) => 
    api<{ ok: boolean }>('/api/products?type=inventory', { method: 'PUT', ...jbody({ variant_id, size, stock }) })
};

// ==========================================
// 5. الطلبات والشحن (Orders API)
// ==========================================

export const OrdersAPI = {
  // الولايات (Wilayas)[cite: 7]
  getWilayas: () => api<Wilaya[]>('/api/orders?type=wilayas'),

  // البلديات (Communes) — مرتبطة بالولاية المختارة
  getCommunes: (wilayaId: string | number) =>
    api<Commune[]>(`/api/orders?type=communes&wilaya_id=${wilayaId}`),

  // الطلبات (Orders)[cite: 7]
  getOrders: () => api<Order[]>('/api/orders?type=order'),
  getOrderById: (id: string | number) => api<Order>(`/api/orders?type=order&id=${id}`),
  
  createOrder: (data: {
    customer_name: string;
    phone: string;
    address: string;
    city: string;
    commune_id?: number | null;
    items: CartItem[];
    wilaya_id: number;
    wilaya_name: string;
    delivery_type: 'home' | 'desk';
    payment_method?: string;
  }) => api<Order>('/api/orders?type=order', { method: 'POST', ...jbody(data) }), //[cite: 7]

  updateOrderStatus: (id: string | number, status: string) => 
    api<Order>('/api/orders?type=order', { method: 'PUT', ...jbody({ id, status }) }), //[cite: 7]

  // عمليات متقدمة (Advanced Order Actions)
  mergeOrders: (primary_id: string | number, secondary_ids: (string | number)[]) => 
    api<{ primary: Order; merged_count: number }>('/api/orders?type=merge', { method: 'POST', ...jbody({ primary_id, secondary_ids }) }), //[cite: 7]
  
  // الشحن وإنشاء طرد ياليدين (Yalidine Shipping)
  createShippingParcel: (order_id: string | number) => 
    api<{ tracking_number: string; voucher_url: string; mock: boolean; status_updated: boolean }>('/api/orders?type=shipping', { method: 'POST', ...jbody({ order_id }) })
};

// ==========================================
// 6. إحصائيات النظام (System API)
// ==========================================

export const SystemAPI = {
  getStats: () => api<{
    products: number;
    orders: number;
    revenue: number;
    pending: number;
    delivered: number;
    shipped: number;
    returned: number;
    delivery_rate: number;
    recent_orders: Partial<Order>[]; //[cite: 7]
    weekly_sales: { label: string; amount: number; count: number }[];
    top_products: { name: string; qty: number }[];
    low_stock: { id: number; name: string; stock: number; image: string | null }[];
  }>('/api/system?type=stats')
};
