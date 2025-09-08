import React, { useState } from 'react';
import { useTranslation } from '../../contexts/TranslationContext.jsx'; // .jsx
import { Languages, Check, Loader2 } from 'lucide-react';

function TranslationControls() {
  const {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    isTranslating,
  } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const currentLangInfo = supportedLanguages.find(lang => lang.code === currentLanguage);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        onBlur={() => setTimeout(() => setShowMenu(false), 150)} // 使用 onBlur 配合延迟来关闭菜单
        disabled={isTranslating}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      >
        {isTranslating ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <Languages className="h-4 w-4 text-gray-500" />
        )}
        <span className="text-gray-700">
          {currentLangInfo?.nativeName || 'Language'}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-20 border">
          <div className="py-1">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
              >
                <span>{lang.nativeName}</span>
                {currentLanguage === lang.code && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslationControls;