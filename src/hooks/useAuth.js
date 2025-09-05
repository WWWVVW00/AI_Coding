import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 登錄表單狀態
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });

  // 初始化認證狀態
  const initializeAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data: userData } = await authAPI.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('認證失敗:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('初始化認證失敗:', error);
      setError('認證初始化失敗，請刷新頁面重試');
    } finally {
      setLoading(false);
    }
  };

  // 登錄處理
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(loginForm.username, loginForm.password);

      if (response.success) {
        // 保存token到localStorage
        localStorage.setItem('token', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
        setSuccess('登錄成功！');
      } else {
        setError(response.message || '登錄失敗，請檢查您的用戶名或密碼');
      }
    } catch (error) {
      console.error('登錄錯誤:', error);
      setError('登錄時發生錯誤，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 註冊處理
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await authAPI.register(
        registerForm.username, 
        registerForm.email, 
        registerForm.password, 
        registerForm.fullName
      );
      
      if (response.success) {
        setSuccess('註冊成功！請登錄');
        setShowRegister(false);
        setShowLogin(true);
        setRegisterForm({ username: '', email: '', password: '', fullName: '' });
      } else {
        setError(response.message || '註冊失敗');
      }
    } catch (error) {
      console.error('註冊錯誤:', error);
      setError('註冊失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 登出處理
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setSuccess('已退出登錄');
  };

  // 清除消息
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