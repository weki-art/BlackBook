import { useState } from 'react';
import './Login.css';
import LogoIcon from './assets/logo.svg';
import EyeIcon from './assets/eye-icon.svg';
import { useAuth } from './hooks/useAuth.jsx';

function Login() {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        // 根据错误类型显示更友好的提示
        if (signInError.message?.includes('Invalid login credentials')) {
          setError('账号或密码错误，请先注册账号后登录');
        } else if (signInError.message?.includes('email') && signInError.message?.includes('confirm')) {
          setError('请先验证邮箱后再登录');
        } else {
          setError(signInError.message);
        }
        throw signInError;
      }
    } catch (err) {
      console.error('登录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!nickname || !email || !password) {
      setError('请填写所有字段');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const { error: signUpError } = await signUp(email, password, nickname);
      if (signUpError) {
        setError(signUpError.message);
        throw signUpError;
      }
      // 注册成功后自动登录，AuthProvider 会检测状态并跳转到首页
    } catch (err) {
      console.error('注册失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page ${activeTab}`}>
      <div className="auth-container">
        <div className="logo-section">
          <div className="logo-wrapper">
            <img src={LogoIcon} alt="Logo" className="logo-icon" />
          </div>
          <h1 className="app-title">避雷笔记本</h1>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
          >
            登录
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
          >
            注册
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeTab === 'login' ? (
          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">邮箱</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <div className="forgot-password-wrapper">
                <label className="form-label">密码</label>
                <button type="button" className="forgot-password">
                  忘记密码？
                </button>
              </div>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="至少6位密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <img src={EyeIcon} alt="Toggle password" />
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        ) : (
          <form className="register-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label register-label">昵称</label>
              <input
                type="text"
                className="form-input register-input"
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label register-label">邮箱</label>
              <input
                type="email"
                className="form-input register-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label register-label">密码</label>
              <div className="form-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input register-input"
                  placeholder="至少6位密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle register-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <img src={EyeIcon} alt="Toggle password" />
                </button>
              </div>
            </div>

            <button type="submit" className="register-button" disabled={loading}>
              {loading ? '创建中...' : '创建账号'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
