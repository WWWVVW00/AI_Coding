import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function ForumView() {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('forum.title')}</h2>
      <div className="text-center py-16 text-gray-500">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">{t('forum.subtitle')}</p>
        <p>{t('forum.comingSoon')}</p>
      </div>
    </div>
  );
}

export default ForumView;