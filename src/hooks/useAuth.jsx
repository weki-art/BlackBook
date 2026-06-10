import { useState, useEffect, createContext, useContext } from 'react';
import authService from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const session = await authService.getSession();
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (err) {
        console.log('[useAuth] 初始化会话失败:', err?.message);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth event:', event);
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        // 会话已失效（可能是 refresh token 过期触发）
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION' && !session) {
        // 初始会话不存在 → 未登录
        setUser(null);
        setLoading(false);
        return;
      }

      // 正常会话：SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION 且 session 存在
      setUser(session?.user || null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        setRegisterSuccess(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, nickname) => {
    const { data, error } = await authService.signUp(email, password, nickname);
    if (!error && data?.user) {
      setRegisterSuccess(true);
    }
    return { data, error };
  };

  const signIn = async (email, password) => {
    return authService.signIn(email, password);
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      // 忽略任何错误，继续清理本地状态
      console.log('[useAuth] signOut 过程中出现错误，继续清理本地状态:', err?.message);
    }
    // 无论成功与否，都强制清空本地用户状态
    setUser(null);
    return { error: null };
  };

  const clearRegisterSuccess = () => {
    setRegisterSuccess(false);
  };

  const value = {
    user,
    loading,
    registerSuccess,
    signUp,
    signIn,
    signOut,
    clearRegisterSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
