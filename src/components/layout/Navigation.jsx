import React from 'react';
import { BookOpen, Users } from 'lucide-react';
import TranslationControls from '../common/TranslationControls';
import { useTranslation } from '../../contexts/TranslationContext';

function Navigation({ user, handleLogout, setCurrentView }) {
  const { t } = useTranslation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setCurrentView('home')}>
              <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-800">{t('nav.title')}</h1>
            </div>
            
            {/* 导航菜单 */}
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => setCurrentView('home')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('nav.home')}
              </button>
              <button
                onClick={() => setCurrentView('courses')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('nav.courses')}
              </button>
              <button
                onClick={() => setCurrentView('forum')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('nav.forum')}
              </button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <TranslationControls />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{user?.fullName || user?.username}</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;