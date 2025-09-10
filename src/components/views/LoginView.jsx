import React from 'react';
import { BookOpen } from 'lucide-react';
import LoginModal from '../modals/LoginModal.jsx'; // .jsx
import RegisterModal from '../modals/RegisterModal.jsx'; // .jsx

function LoginView({ 
  showLogin, 
  setShowLogin, 
  showRegister, 
  setShowRegister, 
  handleLogin, 
  loginForm, 
  setLoginForm, 
  handleRegister, 
  registerForm, 
  setRegisterForm, 
  loading 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-cityu-gradient rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">城大智学坊 (CityU LearnSphere)</h1>
            <p className="text-gray-600">讓學習更智能，讓知識更有趣</p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={() => setShowLogin(true)} 
              className="w-full bg-cityu-gradient text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              登錄
            </button>
            <button 
              onClick={() => setShowRegister(true)} 
              className="w-full border border-cityu-orange text-cityu-orange py-3 rounded-lg hover:bg-orange-50 transition-colors font-medium"
            >
              註冊
            </button>
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>體驗智能化學習管理系統</p>
            <p className="mt-1">• 課程管理 • 資料上傳 • 智能試卷生成</p>
          </div>
        </div>
      </div>
      
      {showLogin && (
        <LoginModal 
          setShowLogin={setShowLogin} 
          setShowRegister={setShowRegister} 
          handleLogin={handleLogin} 
          loginForm={loginForm} 
          setLoginForm={setLoginForm} 
          loading={loading} 
        />
      )}
      
      {showRegister && (
        <RegisterModal 
          setShowRegister={setShowRegister} 
          setShowLogin={setShowLogin} 
          handleRegister={handleRegister} 
          registerForm={registerForm} 
          setRegisterForm={setRegisterForm} 
          loading={loading} 
        />
      )}
    </div>
  );
}

export default LoginView;