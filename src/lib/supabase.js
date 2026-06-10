import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 关键字段：检测到 invalid refresh token 时强制清理
const SUPABASE_STORAGE_KEYS = [
  'supabase.auth.token',
  'sb-access-token',
  'sb-refresh-token',
];

export function forceClearAuthCache() {
  try {
    const keys = SUPABASE_STORAGE_KEYS;
    for (const key of keys) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
      }
    }
    // 同时遍历清理所有以 "sb-" 或 "supabase." 开头的键
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('supabase.'))) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  } catch (err) {
    // 忽略 storage 访问错误
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 监听全局 auth 错误：当 refresh token 失效时强制清理
supabase.auth.onAuthStateChange((event, session) => {
  // 当 SDK 主动发出 SIGNED_OUT 事件（通常是 refresh 失败触发）
  if (event === 'SIGNED_OUT') {
    forceClearAuthCache();
  }
  // 当 session 为空但 event 非 INITIAL_SESSION 时，也认为会话失效
  if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && !session) {
    forceClearAuthCache();
  }
});

export default supabase;
