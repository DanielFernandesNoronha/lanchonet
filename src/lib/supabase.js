import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage wrapper to handle blocked localStorage in in-app browsers like WhatsApp/Instagram
const customStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch (e) {}
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
