function validateUserRegistration(req, res, next) {
  const { username, email, password } = req.body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: '用户名长度必须≥3' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: '密码长度必须≥6' });
  }
  next();
}

function validateUserLogin(req, res, next) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名/邮箱与密码均为必填' });
  }
  next();
}

// 课程字段基础校验
function validateCourse(req, res, next) {
  const {
    name, code, department, description,
    credits, semester, year, instructor
  } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: '课程名称至少2个字符' });
  }
  if (!code || typeof code !== 'string' || code.trim().length < 2) {
    return res.status(400).json({ error: '课程代码至少2个字符' });
  }
  if (credits !== undefined) {
    const c = Number(credits);
    if (!Number.isFinite(c) || c <= 0 || c > 50) {
      return res.status(400).json({ error: '学分应为1-50之间的数字' });
    }
  }
  if (year !== undefined) {
    const y = Number(year);
    const now = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1970 || y > now + 5) {
      return res.status(400).json({ error: '年份不合法' });
    }
  }
  if (semester && !['Fall', 'Spring', 'Summer', 'Winter'].includes(semester)) {
    return res.status(400).json({ error: '学期取值不正确' });
  }
  if (department && typeof department !== 'string') {
    return res.status(400).json({ error: '学系应为字符串' });
  }
  if (description && typeof description !== 'string') {
    return res.status(400).json({ error: '描述应为字符串' });
  }
  if (instructor && typeof instructor !== 'string') {
    return res.status(400).json({ error: '任课教师应为字符串' });
  }
  next();
}

// 资料字段基础校验
function validateMaterial(req, res, next) {
  const { title, description, materialType, year, tags, isPublic } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 1)) {
    return res.status(400).json({ error: '资料标题不能为空' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: '描述应为字符串' });
  }
  if (materialType !== undefined && typeof materialType !== 'string') {
    return res.status(400).json({ error: '资料类型应为字符串' });
  }
  if (year !== undefined) {
    const y = Number(year);
    const now = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1970 || y > now + 5) {
      return res.status(400).json({ error: '年份不合法' });
    }
  }
  if (tags !== undefined && typeof tags !== 'string') {
    return res.status(400).json({ error: '标签应为以逗号分隔的字符串' });
  }
  if (isPublic !== undefined && !(isPublic === true || isPublic === false || isPublic === 'true' || isPublic === 'false')) {
    return res.status(400).json({ error: 'isPublic 应为布尔值' });
  }
  next();
}

// 试卷生成参数校验
function validatePaperGeneration(req, res, next) {
  const {
    courseId, title, difficultyLevel, totalQuestions,
    estimatedTime, language, isPublic, sourceMaterials
  } = req.body || {};

  if (!courseId || isNaN(Number(courseId))) {
    return res.status(400).json({ error: '缺少或不合法的 courseId' });
  }
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ error: '试卷标题至少2个字符' });
  }
  if (totalQuestions === undefined || !Number.isInteger(Number(totalQuestions)) || Number(totalQuestions) <= 0 || Number(totalQuestions) > 200) {
    return res.status(400).json({ error: '题目数量应为 1-200 的整数' });
  }
  if (estimatedTime !== undefined) {
    const t = Number(estimatedTime);
    if (!Number.isFinite(t) || t < 0 || t > 1000) {
      return res.status(400).json({ error: '预计时间不合法' });
    }
  }
  if (language && typeof language !== 'string') {
    return res.status(400).json({ error: 'language 应为字符串' });
  }
  if (isPublic !== undefined && !(isPublic === true || isPublic === false || isPublic === 'true' || isPublic === 'false')) {
    return res.status(400).json({ error: 'isPublic 应为布尔值' });
  }
  if (!Array.isArray(sourceMaterials) || sourceMaterials.length === 0) {
    return res.status(400).json({ error: '请至少选择一个学习资料' });
  }
  next();
}

// 单题目基础校验
function validateQuestion(req, res, next) {
  const { type, text, options, answer, points } = req.body || {};
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: '题目类型必填' });
  }
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    return res.status(400).json({ error: '题目文本至少2个字符' });
  }
  if (options !== undefined && !Array.isArray(options)) {
    return res.status(400).json({ error: '选项应为数组' });
  }
  if (answer === undefined || (typeof answer !== 'string' && typeof answer !== 'number')) {
    return res.status(400).json({ error: '答案必填' });
  }
  if (points !== undefined) {
    const p = Number(points);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      return res.status(400).json({ error: '分值不合法' });
    }
  }
  next();
}

// 评分提交校验（用于 POST /users/ratings）
function validateRating(req, res, next) {
  const { itemType, itemId, rating, review } = req.body || {};
  if (!['material', 'paper'].includes(itemType)) {
    return res.status(400).json({ error: '无效的评分类型' });
  }
  if (!itemId || isNaN(Number(itemId))) {
    return res.status(400).json({ error: '无效的项目ID' });
  }
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: '评分必须是 1-5 的数字' });
  }
  if (review !== undefined && typeof review !== 'string') {
    return res.status(400).json({ error: '评论应为字符串' });
  }
  next();
}

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateCourse,
  validateMaterial,
  validatePaperGeneration,
  validateQuestion,
  validateRating,
};