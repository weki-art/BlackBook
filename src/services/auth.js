import { supabase, forceClearAuthCache } from '../lib/supabase';

// 检测是否属于 refresh token 失效类错误
function isRefreshTokenError(err) {
  if (!err) return false;
  const msg = String(err.message || err.msg || err.error_description || err.name || '').toLowerCase();
  return msg.includes('refresh token') || msg.includes('invalid refresh') || msg.includes('token not found');
}

// 检测是否是请求中止错误（通常无害，如页面卸载时）
function isAbortError(err) {
  if (!err) return false;
  const msg = String(err.message || err.msg || err.error_description || err.name || '').toLowerCase();
  return msg.includes('err_aborted') || msg.includes('aborted') || msg.includes('net::err_aborted');
}

export const authService = {
  async signUp(email, password, nickname) {
    try {
      // 1. 创建用户（禁用邮箱验证后会直接创建成功）
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      });

      if (signUpError) {
        console.error('注册错误:', signUpError);
        return { data: null, error: signUpError };
      }

      console.log('注册成功，用户:', signUpData.user?.email);
      
      // 2. 注册成功后立即自动登录
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('自动登录错误:', signInError);
        return { data: signUpData, error: signInError };
      }

      console.log('自动登录成功');
      return { data: signInData, error: null };

    } catch (err) {
      console.error('注册流程异常:', err);
      return { data: null, error: err };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('登录错误:', error);
        return { data: null, error };
      }

      console.log('登录成功:', data);
      return { data, error: null };
    } catch (err) {
      console.error('登录异常:', err);
      return { data: null, error: err };
    }
  },

  async signOut() {
    try {
      // 无论服务端是否成功，最终都需要清理本地状态
      // 如果 refresh token 已过期，服务端 signOut 会失败，但本地仍需清理
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          if (isAbortError(error)) {
            // 请求被中止（通常是页面卸载导致），无需处理
            console.log('[auth] signOut 请求被中止（页面可能已卸载），跳过服务端清理');
          } else {
            console.log('[auth] signOut 服务端返回错误（可能会话已过期），继续清理本地:', error.message);
          }
        }
      } catch (apiErr) {
        if (isAbortError(apiErr)) {
          // 请求被中止（通常是页面卸载导致），无需处理
          console.log('[auth] signOut 请求被中止（页面可能已卸载），跳过服务端清理');
        } else {
          console.log('[auth] signOut 网络错误，继续清理本地:', apiErr.message);
        }
      }

      // 强制清理本地会话（即使 API 调用失败/被中止）
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localErr) {
        // 忽略本地清理的错误
      }

      return { error: null };
    } catch (err) {
      if (!isAbortError(err)) {
        console.log('[auth] signOut 整体异常，视为已退出:', err.message);
      }
      return { error: null };
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.log('[auth] getSession 错误:', error.message);
        // 如果是 refresh token 类错误，强制清理本地缓存
        if (isRefreshTokenError(error)) {
          console.log('[auth] 检测到 refresh token 失效，强制清理本地缓存');
          forceClearAuthCache();
        }
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) { /* 忽略 */ }
        return null;
      }
      return session;
    } catch (err) {
      console.log('[auth] getSession 异常:', err?.message);
      if (isRefreshTokenError(err)) {
        forceClearAuthCache();
      }
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) { /* 忽略 */ }
      return null;
    }
  },

  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.log('[auth] getUser 错误:', error.message);
        if (isRefreshTokenError(error)) {
          forceClearAuthCache();
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) { /* 忽略 */ }
        }
        return null;
      }
      return user;
    } catch (err) {
      console.log('[auth] getUser 异常:', err?.message);
      if (isRefreshTokenError(err)) {
        forceClearAuthCache();
      }
      return null;
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      try {
        console.log('[auth] 认证状态变化:', event, session?.user?.email);
        callback(event, session);
      } catch (err) {
        console.log('[auth] onAuthStateChange 回调异常:', err?.message);
      }
    });
  },
};

export default authService;
