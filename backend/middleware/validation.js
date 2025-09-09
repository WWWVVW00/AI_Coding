// backend/middleware/validation.js

const Joi = require('joi');

// 通用的验证中间件生成器
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // 报告所有错误，而不是第一个
      allowUnknown: true, // 允许请求体中包含未在 schema 中定义的字段
      stripUnknown: true  // 移除未定义的字段
    });

    if (error) {
      // 从 Joi 错误对象中提取有用的信息
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      // 创建一个 ValidationError 类型的错误，以便全局错误处理器可以识别
      const validationError = new Error(errorMessage);
      validationError.name = 'ValidationError';
      return next(validationError); // 将错误传递给全局错误处理器
    }

    next();
  };
};

// ==========================================================
// 定义各个路由所需的 Schema
// ==========================================================

// --- Auth Schemas ---
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$')).required().messages({
    'string.pattern.base': '密码必须包含至少一个大写字母、一个小写字母和一个数字，且长度至少为6位'
  }),
  fullName: Joi.string().min(2).max(100).optional(),
  studentId: Joi.string().max(20).optional(),
  department: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// --- Course Schema ---
const courseSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  code: Joi.string().uppercase().alphanum().min(3).max(10).required(),
  department: Joi.string().max(100).optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  credits: Joi.number().integer().min(0).max(10).optional(),
  semester: Joi.string().valid('Fall', 'Spring', 'Summer', 'Sem A', 'Sem B').optional(),
  year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 5).optional(),
  instructor: Joi.string().max(100).optional().allow(null, '')
});

// --- Material Schema ---
const materialSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().optional().allow(null, ''),
  materialType: Joi.string().optional(),
  year: Joi.number().integer().optional(),
  tags: Joi.string().optional(),
  isPublic: Joi.boolean().required()
});


// --- Paper Schemas ---
const paperGenerationSchema = Joi.object({
  courseId: Joi.number().integer().required(),
  title: Joi.string().min(5).max(255).required(),
  description: Joi.string().optional().allow(null, ''),
  difficultyLevel: Joi.string().valid('easy', 'medium', 'hard').optional(),
  totalQuestions: Joi.number().integer().min(1).max(50).required(),
  estimatedTime: Joi.number().integer().optional(),
  language: Joi.string().valid('zh', 'en').optional(),
  isPublic: Joi.boolean().optional(),
  sourceMaterials: Joi.array().items(Joi.number().integer()).optional()
});

const questionSchema = Joi.object({
    // 可以在这里为更新或添加单个问题定义验证规则
});

// --- User Schemas ---
const ratingSchema = Joi.object({
  itemType: Joi.string().valid('material', 'paper').required(),
  itemId: Joi.number().integer().required(),
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().max(1000).optional().allow(null, '')
});


// ==========================================================
// 导出验证中间件
// ==========================================================
module.exports = {
  validateUserRegistration: validateRequest(registerSchema),
  validateUserLogin: validateRequest(loginSchema),
  validateCourse: validateRequest(courseSchema),
  validateMaterial: validateRequest(materialSchema),
  validatePaperGeneration: validateRequest(paperGenerationSchema),
  validateQuestion: validateRequest(questionSchema),
  validateRating: validateRequest(ratingSchema)
};