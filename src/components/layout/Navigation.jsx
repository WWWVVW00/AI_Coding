import React from 'react';
import { BookOpen, Globe, Users } from 'lucide-react';

function Navigation({ user, language, setLanguage, handleLogout, setCurrentView }) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setCurrentView('home')}>
              <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-800">智能學習助手</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                className="text-sm border-none bg-transparent focus:ring-0"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{user?.fullName || user?.username}</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;