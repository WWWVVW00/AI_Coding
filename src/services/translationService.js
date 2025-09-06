// 简化的翻译服务 - 只支持中英文翻译
class TranslationService {
  constructor() {
    this.cache = new Map(); // 翻译缓存
  }

  // 生成缓存键
  getCacheKey(text, fromLang, toLang) {
    return `${fromLang}-${toLang}-${text}`;
  }

  // 检测文本语言
  detectLanguage(text) {
    const simplifiedChineseRegex = /[\u4e00-\u9fff]/;
    const traditionalChineseRegex = /[\u4e00-\u9fff]/;
    const englishRegex = /[a-zA-Z]/;
    
    if (simplifiedChineseRegex.test(text)) {
      return 'zh-cn';
    } else if (englishRegex.test(text)) {
      return 'en';
    }
    return 'zh-cn'; // 默认简体中文
  }

  // 简单的本地翻译映射（作为备用方案）
  getLocalTranslation(text, toLang) {
    const translations = {
      'zh-cn': {
        'Course': '课程',
        'Courses': '课程',
        'Learning': '学习',
        'Study': '学习',
        'Material': '材料',
        'Materials': '材料',
        'Paper': '试卷',
        'Question': '问题',
        'Answer': '答案',
        'Description': '描述',
        'Title': '标题',
        'Content': '内容',
        'Instructor': '教师',
        'Teacher': '教师',
        'Student': '学生',
        'Time': '时间',
        'Duration': '时长',
        'Difficulty': '难度',
        'Easy': '简单',
        'Medium': '中等',
        'Hard': '困难',
        'Upload': '上传',
        'Download': '下载',
        'Generate': '生成',
        'Save': '保存',
        'Delete': '删除',
        'Edit': '编辑',
        'View': '查看',
        'Search': '搜索',
        'Home': '首页',
        'Forum': '论坛',
        'Login': '登录',
        'Register': '注册',
        'Logout': '退出'
      },
      'en': {
        '课程': 'Course',
        '学习': 'Learning',
        '材料': 'Material',
        '试卷': 'Paper',
        '问题': 'Question',
        '答案': 'Answer',
        '描述': 'Description',
        '标题': 'Title',
        '内容': 'Content',
        '教师': 'Instructor',
        '学生': 'Student',
        '时间': 'Time',
        '时长': 'Duration',
        '难度': 'Difficulty',
        '简单': 'Easy',
        '中等': 'Medium',
        '困难': 'Hard',
        '上传': 'Upload',
        '下载': 'Download',
        '生成': 'Generate',
        '保存': 'Save',
        '删除': 'Delete',
        '编辑': 'Edit',
        '查看': 'View',
        '搜索': 'Search',
        '首页': 'Home',
        '论坛': 'Forum',
        '登录': 'Login',
        '注册': 'Register',
        '退出': 'Logout',
        '人工智能': 'Artificial Intelligence',
        '机器学习': 'Machine Learning',
        '深度学习': 'Deep Learning',
        '数据科学': 'Data Science',
        '计算机科学': 'Computer Science',
        '软件工程': 'Software Engineering',
        '网络安全': 'Cybersecurity',
        '数据库': 'Database',
        '算法': 'Algorithm',
        '编程': 'Programming'
      },
      'zh-tw': {
        '课程': '課程',
        '学习': '學習',
        '材料': '材料',
        '试卷': '試卷',
        '问题': '問題',
        '答案': '答案',
        '描述': '描述',
        '标题': '標題',
        '内容': '內容',
        '教师': '教師',
        '学生': '學生',
        '时间': '時間',
        '时长': '時長',
        '难度': '難度',
        '简单': '簡單',
        '中等': '中等',
        '困难': '困難',
        '上传': '上傳',
        '下载': '下載',
        '生成': '生成',
        '保存': '保存',
        '删除': '刪除',
        '编辑': '編輯',
        '查看': '查看',
        '搜索': '搜索',
        '首页': '首頁',
        '论坛': '論壇',
        '登录': '登錄',
        '注册': '註冊',
        '退出': '退出'
      }
    };

    const langMap = translations[toLang];
    if (!langMap) return text;

    // 直接匹配
    if (langMap[text]) {
      return langMap[text];
    }

    // 部分匹配替换
    let result = text;
    Object.keys(langMap).forEach(key => {
      const regex = new RegExp(key, 'g');
      result = result.replace(regex, langMap[key]);
    });

    return result;
  }

  // 使用Google翻译API (免费版本) - 带CORS代理
  async translateWithGoogle(text, fromLang, toLang) {
    try {
      // 尝试使用CORS代理
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      const data = await response.json();
      
      if (data && data[0] && data[0][0]) {
        return data[0][0][0];
      }
      
      throw new Error('翻译响应格式错误');
    } catch (error) {
      console.error('Google翻译失败:', error);
      // 使用本地翻译作为备用
      return this.getLocalTranslation(text, toLang);
    }
  }

  // 主翻译方法 - 简化版本
  async translate(text, toLang = 'en') {
    if (!text || text.trim() === '') {
      return text;
    }

    // 检测源语言
    const fromLang = this.detectLanguage(text);
    
    // 如果目标语言和源语言相同，直接返回
    if (fromLang === toLang) {
      return text;
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(text, fromLang, toLang);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 转换语言代码为Google翻译支持的格式
      const googleFromLang = fromLang === 'zh-cn' ? 'zh' : fromLang;
      const googleToLang = toLang === 'zh-cn' ? 'zh' : (toLang === 'zh-tw' ? 'zh-TW' : toLang);
      
      const translatedText = await this.translateWithGoogle(text, googleFromLang, googleToLang);
      
      // 缓存翻译结果
      this.cache.set(cacheKey, translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('翻译失败:', error);
      // 翻译失败时返回原文
      return text;
    }
  }

  // 翻译课程对象
  async translateCourse(course, toLang = 'en') {
    const translatedCourse = { ...course };
    
    if (course.name) {
      translatedCourse.name = await this.translate(course.name, toLang);
    }
    
    if (course.description) {
      translatedCourse.description = await this.translate(course.description, toLang);
    }
    
    if (course.instructor) {
      translatedCourse.instructor = await this.translate(course.instructor, toLang);
    }
    
    return translatedCourse;
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
  }

  // 获取缓存大小
  getCacheSize() {
    return this.cache.size;
  }
}

// 创建单例实例
const translationService = new TranslationService();

export default translationService;