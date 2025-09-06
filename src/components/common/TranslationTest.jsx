import React, { useState } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';

function TranslationTest() {
  const { translateText, currentLanguage, changeLanguage, supportedLanguages } = useTranslation();
  const [testText, setTestText] = useState('人工智能课程');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    setIsLoading(true);
    try {
      const result = await translateText(testText, 'en');
      setTranslatedText(result);
      console.log('翻译结果:', result);
    } catch (error) {
      console.error('翻译错误:', error);
      setTranslatedText('翻译失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">翻译功能测试</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            当前语言: {currentLanguage}
          </label>
          <div className="flex space-x-2">
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-3 py-1 rounded text-sm ${
                  currentLanguage === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试文本:
          </label>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要翻译的文本"
          />
        </div>

        <button
          onClick={handleTranslate}
          disabled={isLoading || !testText.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '翻译中...' : '翻译到英文'}
        </button>

        {translatedText && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              翻译结果:
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              {translatedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationTest;