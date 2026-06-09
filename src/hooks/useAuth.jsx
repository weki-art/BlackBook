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
      const session = await authService.getSession();
      if (mounted) {
        setUser(session?.user || null);
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (mounted) {
        setUser(session?.user || null);
        setLoading(false);
        if (event === 'SIGNED_IN') {
          setRegisterSuccess(false);
        }
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
    const { error } = await authService.signOut();
    if (!error) {
      setUser(null);
    }
    return { error };
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
