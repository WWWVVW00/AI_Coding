import { useState, useEffect } from 'react';
import { authAPI } from '../services/apiService.js'; // .js

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // <--- 初始化时设为 true
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });

  const initializeAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setLoading(true);
        const { user: userData } = await authAPI.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('认证失败:', error);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    } else {
        setLoading(false); // 没有 token，直接结束加载
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(loginForm);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      setShowLogin(false);
      setLoginForm({ username: '', password: '' });
      setSuccess('登录成功！');
    } catch (error) {
      setError(error.message || '登录失败，请检查您的用户名或密码');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.register(registerForm);
      setSuccess('注册成功！请登录');
      setShowRegister(false);
      setShowLogin(true);
      setRegisterForm({ username: '', email: '', password: '', fullName: '' });
    } catch (error) {
      setError(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setSuccess('已退出登录');
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    success,
    showLogin,
    setShowLogin,
    loginForm,
    setLoginForm,
    showRegister,
    setShowRegister,
    registerForm,
    setRegisterForm,
    initializeAuth,
    handleLogin,
    handleRegister,
    handleLogout,
    setError,
    setSuccess
  };
}