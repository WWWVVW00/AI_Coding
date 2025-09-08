import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translationService from '../services/translationService.js';
import en from '../locales/en.json';
import zhCn from '../locales/zh-cn.json';
import zhTw from '../locales/zh-tw.json';

// 语言包
const locales = {
  en,
  'zh-cn': zhCn,
  'zh-tw': zhTw,
};

// 创建翻译上下文
const TranslationContext = createContext();

// 翻译提供者组件
export function TranslationProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('zh-cn');
  const [translations, setTranslations] = useState(locales['zh-cn']);
  const [isTranslating, setIsTranslating] = useState(false);

  // 支持的语言列表
  const supportedLanguages = [
    { code: 'zh-cn', name: '简体中文', nativeName: '简体中文' },
    { code: 'zh-tw', name: '繁體中文', nativeName: '繁體中文' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];

  // 切换语言
  const changeLanguage = useCallback((newLanguage) => {
    if (locales[newLanguage]) {
      setCurrentLanguage(newLanguage);
      setTranslations(locales[newLanguage]);
      localStorage.setItem('preferredLanguage', newLanguage);
    }
  }, []);

  // 初始化语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && locales[savedLanguage]) {
      changeLanguage(savedLanguage);
    }
  }, [changeLanguage]);

  // 全局翻译函数 (i18n)
  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let result = translations;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        return key; // 如果找不到，返回原始键
      }
    }

    // 替换占位符
    if (typeof result === 'string' && Object.keys(params).length > 0) {
      return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
        return acc.replace(`{${paramKey}}`, paramValue);
      }, result);
    }

    return result;
  }, [translations]);

  // 翻译动态内容 (如课程)
  const translateDynamic = useCallback(async (content, targetLang = null) => {
    if (!content) return content;
    const toLang = targetLang || currentLanguage;

    // 如果内容是对象，则翻译其属性
    if (typeof content === 'object' && content !== null) {
      const translatedObject = { ...content };
      for (const key in content) {
        if (typeof content[key] === 'string') {
          translatedObject[key] = await translationService.translate(content[key], toLang);
        }
      }
      return translatedObject;
    }
    
    // 如果是字符串，直接翻译
    if (typeof content === 'string') {
      return await translationService.translate(content, toLang);
    }

    return content;
  }, [currentLanguage]);

  const contextValue = {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    t,
    translateDynamic,
    isTranslating,
    setIsTranslating,
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

// 自定义Hook
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}