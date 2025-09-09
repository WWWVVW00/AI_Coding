/**
 * 驗證中間件
 * 用於驗證用戶輸入數據的格式和有效性
 */

// 用戶註冊驗證
const validateUserRegistration = (req, res, next) => {
  const { username, email, password, fullName, studentId, department } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!username) {
    errors.push('用戶名是必填項');
  } else if (username.length < 3 || username.length > 30) {
    errors.push('用戶名長度必須在3-30個字符之間');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('用戶名只能包含字母、數字和下劃線');
  }

  if (!email) {
    errors.push('郵箱是必填項');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('郵箱格式不正確');
  }

  if (!password) {
    errors.push('密碼是必填項');
  } else if (password.length < 6 || password.length > 128) {
    errors.push('密碼長度必須在6-128個字符之間');
  }

  // 可選字段驗證
  if (fullName && (fullName.length < 2 || fullName.length > 100)) {
    errors.push('姓名長度必須在2-100個字符之間');
  }

  if (studentId && (studentId.length < 1 || studentId.length > 20)) {
    errors.push('學號長度必須在1-20個字符之間');
  }

  if (department && department.length > 100) {
    errors.push('學系名稱不能超過100個字符');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '輸入驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 用戶登錄驗證
const validateUserLogin = (req, res, next) => {
  const { username, password } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!username) {
    errors.push('用戶名/郵箱是必填項');
  } else if (username.length < 3 || username.length > 100) {
    errors.push('用戶名/郵箱長度不正確');
  }

  if (!password) {
    errors.push('密碼是必填項');
  } else if (password.length < 6 || password.length > 128) {
    errors.push('密碼長度不正確');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '登錄驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 課程創建驗證
const validateCourseCreation = (req, res, next) => {
  const { name, code, description, credits, semester, instructor } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!name) {
    errors.push('課程名稱是必填項');
  } else if (name.length < 2 || name.length > 200) {
    errors.push('課程名稱長度必須在2-200個字符之間');
  }

  if (!code) {
    errors.push('課程代碼是必填項');
  } else if (code.length < 2 || code.length > 20) {
    errors.push('課程代碼長度必須在2-20個字符之間');
  }

  if (description && description.length > 2000) {
    errors.push('課程描述不能超過2000個字符');
  }

  if (credits && (isNaN(credits) || credits < 0 || credits > 10)) {
    errors.push('學分必須是0-10之間的數字');
  }

  if (semester && semester.length > 50) {
    errors.push('學期信息不能超過50個字符');
  }

  if (instructor && instructor.length > 100) {
    errors.push('教師名稱不能超過100個字符');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '課程驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 學習材料上傳驗證
const validateMaterialUpload = (req, res, next) => {
  const { title, courseId, type, description } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!title) {
    errors.push('材料標題是必填項');
  } else if (title.length < 2 || title.length > 200) {
    errors.push('材料標題長度必須在2-200個字符之間');
  }

  if (!courseId) {
    errors.push('課程ID是必填項');
  } else if (isNaN(courseId) || courseId <= 0) {
    errors.push('課程ID必須是正整數');
  }

  if (!type) {
    errors.push('材料類型是必填項');
  } else if (!['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'other'].includes(type)) {
    errors.push('材料類型不正確');
  }

  if (description && description.length > 1000) {
    errors.push('材料描述不能超過1000個字符');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '材料驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 試卷生成驗證
const validatePaperGeneration = (req, res, next) => {
  const { 
    materialIds, 
    questionCount, 
    difficulty, 
    questionTypes, 
    title, 
    timeLimit 
  } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
    errors.push('至少需要選擇一個學習材料');
  } else {
    // 驗證每個材料ID都是有效的數字
    for (const id of materialIds) {
      if (isNaN(id) || id <= 0) {
        errors.push('材料ID格式不正確');
        break;
      }
    }
  }

  if (!questionCount) {
    errors.push('題目數量是必填項');
  } else if (isNaN(questionCount) || questionCount < 1 || questionCount > 100) {
    errors.push('題目數量必須在1-100之間');
  }

  if (!difficulty) {
    errors.push('難度級別是必填項');
  } else if (!['easy', 'medium', 'hard', 'mixed'].includes(difficulty)) {
    errors.push('難度級別必須是 easy、medium、hard 或 mixed');
  }

  if (!questionTypes || !Array.isArray(questionTypes) || questionTypes.length === 0) {
    errors.push('至少需要選擇一種題目類型');
  } else {
    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay'];
    for (const type of questionTypes) {
      if (!validTypes.includes(type)) {
        errors.push('題目類型不正確');
        break;
      }
    }
  }

  if (!title) {
    errors.push('試卷標題是必填項');
  } else if (title.length < 2 || title.length > 200) {
    errors.push('試卷標題長度必須在2-200個字符之間');
  }

  if (timeLimit && (isNaN(timeLimit) || timeLimit < 10 || timeLimit > 300)) {
    errors.push('考試時間限制必須在10-300分鐘之間');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '試卷生成驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 通用ID驗證
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({
        error: '無效的ID',
        message: `${paramName} 必須是正整數`
      });
    }

    req.params[paramName] = parseInt(id);
    next();
  };
};

// 分頁參數驗證
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // 限制分頁參數範圍
  if (page < 1 || page > 1000) {
    return res.status(400).json({
      error: '分頁參數錯誤',
      message: '頁碼必須在1-1000之間'
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: '分頁參數錯誤',
      message: '每頁項目數必須在1-100之間'
    });
  }

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};

// 文件上傳驗證
const validateFileUpload = (allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        error: '文件上傳失敗',
        message: '沒有選擇文件'
      });
    }

    const file = req.file;

    // 檢查文件類型
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: '文件類型不支持',
        message: `只支持以下類型: ${allowedTypes.join(', ')}`
      });
    }

    // 檢查文件大小
    if (file.size > maxSize) {
      return res.status(400).json({
        error: '文件過大',
        message: `文件大小不能超過 ${Math.round(maxSize / (1024 * 1024))} MB`
      });
    }

    next();
  };
};

// 評分驗證
const validateRating = (req, res, next) => {
  const { rating, comment } = req.body;
  const errors = [];

  // 評分驗證
  if (rating === undefined || rating === null) {
    errors.push('評分是必填項');
  } else if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.push('評分必須是1-5之間的數字');
  }

  // 評論驗證（可選）
  if (comment && comment.length > 500) {
    errors.push('評論不能超過500個字符');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '評分驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

// 問題驗證
const validateQuestion = (req, res, next) => {
  const { question, options, correctAnswer, explanation, difficulty } = req.body;
  const errors = [];

  // 必填字段驗證
  if (!question) {
    errors.push('問題內容是必填項');
  } else if (question.length < 5 || question.length > 1000) {
    errors.push('問題內容長度必須在5-1000個字符之間');
  }

  if (options && Array.isArray(options)) {
    if (options.length < 2 || options.length > 6) {
      errors.push('選項數量必須在2-6個之間');
    }
    for (const option of options) {
      if (!option || option.length > 200) {
        errors.push('每個選項不能為空且不能超過200個字符');
        break;
      }
    }
  }

  if (correctAnswer && correctAnswer.length > 1000) {
    errors.push('正確答案不能超過1000個字符');
  }

  if (explanation && explanation.length > 1000) {
    errors.push('解釋說明不能超過1000個字符');
  }

  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('難度級別必須是 easy、medium 或 hard');
  }

  // 如果有錯誤，返回錯誤信息
  if (errors.length > 0) {
    return res.status(400).json({
      error: '問題驗證失敗',
      message: '請檢查以下字段',
      errors: errors
    });
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateCourseCreation,
  validateMaterialUpload,
  validatePaperGeneration,
  validateRating,
  validateQuestion,
  validateId,
  validatePagination,
  validateFileUpload
};
