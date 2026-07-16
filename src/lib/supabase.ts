// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// تأكد من أن هذه المتغيرات موجودة في ملف .env الخاص بك
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;