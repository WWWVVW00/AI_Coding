import React from 'react';
import { X } from 'lucide-react';

function LoginModal({ setShowLogin, setShowRegister, handleLogin, loginForm, setLoginForm, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">用戶登錄</h2>
          <button onClick={() => setShowLogin(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用戶名</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '登錄中...' : '登錄'}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setShowLogin(false);
              setShowRegister(true);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            還沒有賬號？點擊註冊
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;