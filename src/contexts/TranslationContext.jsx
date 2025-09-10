import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translationService from '../services/translationService.js';
import en from '../locales/en.json';
import zhCn from '../locales/zh-cn.json';
import zhTw from '../locales/zh-tw.json';

// 1. 語言包字典
const locales = {
  en,
  'zh-cn': zhCn,
  'zh-tw': zhTw,
};

// 2. 創建上下文
const TranslationContext = createContext();

// 3. 翻譯提供者組件
export function TranslationProvider({ children }) {
  // 語言狀態
  const [currentLanguage, setCurrentLanguage] = useState('zh-cn'); // 默認簡體中文
  const [translations, setTranslations] = useState(locales['zh-cn']);
  
  // 異步翻譯任務的加載狀態
  const [isTranslating, setIsTranslating] = useState(false);

  // 支持的語言列表
  const supportedLanguages = [
    { code: 'zh-cn', name: '简体中文', nativeName: '简体中文' },
    { code: 'zh-tw', name: '繁體中文', nativeName: '繁體中文' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];

  // 切換語言的函數
  const changeLanguage = useCallback((newLanguage) => {
    if (locales[newLanguage]) {
      setCurrentLanguage(newLanguage);
      setTranslations(locales[newLanguage]);
      localStorage.setItem('preferredLanguage', newLanguage); // 保存用戶偏好
    }
  }, []);

  // 組件掛載時，從 localStorage 讀取用戶偏好
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && locales[savedLanguage]) {
      changeLanguage(savedLanguage);
    }
  }, [changeLanguage]);

  // t 函數：用於本地化靜態 UI 文本
  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let result = translations;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) return key; // 找不到翻譯則返回 key
    }
    // 替換佔位符，例如 {count}
    if (typeof result === 'string') {
      return Object.entries(params).reduce(
        (acc, [pKey, pValue]) => acc.replace(`{${pKey}}`, pValue),
        result
      );
    }
    return result;
  }, [translations]);

  // translateDynamic 函數：用於動態翻譯用戶生成的內容 (例如課程描述)
  const translateDynamic = useCallback(async (content, targetLang = null) => {
    const toLang = targetLang || currentLanguage;
    
    // 如果目標語言是原始語言(假設是中文)，則無需翻譯
    if (toLang === 'zh-cn' || toLang === 'zh-tw') {
       // 這裡可以根據情況調整，如果原始數據有簡繁之分
       // 簡單處理：如果目標是中文，則不進行網絡請求翻譯
       return content;
    }

    setIsTranslating(true);
    try {
      if (typeof content === 'object' && content !== null) {
        return await translationService.translateObject(content, toLang);
      }
      if (typeof content === 'string') {
        return await translationService.translate(content, toLang);
      }
      return content;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage]);

  // 導出給子組件的值
  const value = {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    t,
    translateDynamic,
    isTranslating,
    setIsTranslating,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// 4. 自定義 Hook，方便子組件使用
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}