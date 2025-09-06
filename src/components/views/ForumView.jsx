import React from 'react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function ForumView({ setCurrentView }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center text-gray-600 hover:text-cityu-orange transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('forum.title')}</h2>
        <div className="text-center py-16 text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">{t('forum.subtitle')}</p>
          <p>{t('forum.comingSoon')}</p>
        </div>
      </div>
    </div>
  );
}

export default ForumView;