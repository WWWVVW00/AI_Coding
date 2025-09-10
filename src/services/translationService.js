/**
 * 翻譯服務
 * 使用免費的 Google Translate API (通過 CORS 代理) 進行動態翻譯，並帶有緩存。
 */
class TranslationService {
  constructor() {
    // 簡單的內存緩存，防止重複翻譯相同文本
    this.cache = new Map();
  }

  /**
   * 使用 Google Translate API 進行翻譯
   * @param {string} text - 需要翻譯的文本
   * @param {string} toLang - 目標語言代碼 (e.g., 'en', 'zh-cn', 'zh-tw')
   * @returns {Promise<string>} - 翻譯後的文本
   */
  async translate(text, toLang) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return text;
    }
    
    // 創建緩存鍵
    const cacheKey = `${toLang}-${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 將我們的語言代碼轉換為 Google API 支持的格式
    const targetLangCode = toLang === 'zh-cn' ? 'zh-CN' : (toLang === 'zh-tw' ? 'zh-TW' : toLang);

    try {
      // 使用 CORS 代理來繞過瀏覽器同源策略限制
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
      if (!response.ok) {
        throw new Error(`Google Translate API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // 解析 Google API 返回的複雜數組結構
      const translatedText = data[0].map(item => item[0]).join('');
      
      this.cache.set(cacheKey, translatedText);
      return translatedText;

    } catch (error) {
      console.error('Translation failed:', error);
      // 翻譯失敗時返回原文，確保應用不會崩潰
      return text;
    }
  }

  /**
   * 異步翻譯一個對象中所有字符串類型的值
   * @param {object} content - 包含需要翻譯文本的對象
   * @param {string} toLang - 目標語言
   * @returns {Promise<object>} - 值被翻譯後的新對象
   */
  async translateObject(content, toLang) {
    if (typeof content !== 'object' || content === null) {
      return content;
    }

    const translatedObject = { ...content };
    const translationPromises = [];
    const keysToTranslate = [];

    // 收集所有需要翻譯的字符串
    for (const key in content) {
      if (typeof content[key] === 'string' && content[key].trim()) {
        keysToTranslate.push(key);
        translationPromises.push(this.translate(content[key], toLang));
      }
    }

    // 並發執行所有翻譯請求
    const translations = await Promise.all(translationPromises);

    // 將翻譯結果填回對象
    keysToTranslate.forEach((key, index) => {
      translatedObject[key] = translations[index];
    });

    return translatedObject;
  }
}

// 導出單例
const translationService = new TranslationService();
export default translationService;