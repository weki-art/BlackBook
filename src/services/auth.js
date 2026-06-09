import { supabase } from '../lib/supabase';

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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('退出错误:', error);
      }
      return { error };
    } catch (err) {
      console.error('退出异常:', err);
      return { error: err };
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('获取会话错误:', error);
        return null;
      }
      return session;
    } catch (err) {
      console.error('获取会话异常:', err);
      return null;
    }
  },

  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('获取用户错误:', error);
        return null;
      }
      return user;
    } catch (err) {
      console.error('获取用户异常:', err);
      return null;
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event, session?.user?.email);
      callback(event, session);
    });
  },
};

export default authService;
