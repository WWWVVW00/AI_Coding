const Joi = require('joi');

// 通用验证中间件
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // 返回所有错误
      allowUnknown: false, // 不允许未知字段
      stripUnknown: true // 移除未知字段
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: '数据验证失败',
        details: errorMessages
      });
    }

    // 将验证后的数据替换原始数据
    req[property] = value;
    next();
  };
};

// 用户注册验证
const userRegistrationSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名至少需要3个字符',
      'string.max': '用户名不能超过30个字符',
      'any.required': '用户名是必填项'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '请输入有效的邮箱地址',
      'any.required': '邮箱是必填项'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': '密码至少需要6个字符',
      'string.max': '密码不能超过128个字符',
      'string.pattern.base': '密码必须包含至少一个大写字母、一个小写字母和一个数字',
      'any.required': '密码是必填项'
    }),
  
  fullName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': '姓名至少需要2个字符',
      'string.max': '姓名不能超过100个字符'
    }),
  
  studentId: Joi.string()
    .alphanum()
    .max(20)
    .optional()
    .messages({
      'string.alphanum': '学号只能包含字母和数字',
      'string.max': '学号不能超过20个字符'
    }),
  
  department: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': '学系名称不能超过100个字符'
    })
});

// 用户登录验证
const userLoginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': '用户名或邮箱是必填项'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': '密码是必填项'
    })
});

// 课程创建/更新验证
const courseSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': '课程名称至少需要2个字符',
      'string.max': '课程名称不能超过200个字符',
      'any.required': '课程名称是必填项'
    }),
  
  code: Joi.string()
    .alphanum()
    .min(2)
    .max(20)
    .required()
    .messages({
      'string.alphanum': '课程代码只能包含字母和数字',
      'string.min': '课程代码至少需要2个字符',
      'string.max': '课程代码不能超过20个字符',
      'any.required': '课程代码是必填项'
    }),
  
  department: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '学系名称不能超过100个字符'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '课程描述不能超过1000个字符'
    }),
  
  credits: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .messages({
      'number.integer': '学分必须是整数',
      'number.min': '学分至少为1',
      'number.max': '学分不能超过10'
    }),
  
  semester: Joi.string()
    .valid('Spring', 'Summer', 'Fall', 'Winter')
    .optional()
    .messages({
      'any.only': '学期必须是Spring、Summer、Fall或Winter之一'
    }),
  
  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .optional()
    .messages({
      'number.integer': '年份必须是整数',
      'number.min': '年份不能早于2020年',
      'number.max': '年份不能晚于2030年'
    }),
  
  instructor: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '教师姓名不能超过100个字符'
    })
});

// 资料上传验证
const materialSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': '课程ID必须是整数',
      'number.positive': '课程ID必须是正数',
      'any.required': '课程ID是必填项'
    }),
  
  title: Joi.string()
    .min(1)
    .max(300)
    .optional()
    .messages({
      'string.min': '标题不能为空',
      'string.max': '标题不能超过300个字符'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '描述不能超过1000个字符'
    }),
  
  materialType: Joi.string()
    .valid('lecture', 'assignment', 'exam', 'notes', 'other')
    .optional()
    .messages({
      'any.only': '资料类型必须是lecture、assignment、exam、notes或other之一'
    }),
  
  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .optional()
    .messages({
      'number.integer': '年份必须是整数',
      'number.min': '年份不能早于2020年',
      'number.max': '年份不能晚于2030年'
    }),
  
  tags: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': '标签不能超过500个字符'
    }),
  
  isPublic: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': '公开设置必须是true或false'
    })
});

// 试卷生成验证
const paperGenerationSchema = Joi.object({
  courseId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': '课程ID必须是整数',
      'number.positive': '课程ID必须是正数',
      'any.required': '课程ID是必填项'
    }),
  
  title: Joi.string()
    .min(1)
    .max(300)
    .required()
    .messages({
      'string.min': '试卷标题不能为空',
      'string.max': '试卷标题不能超过300个字符',
      'any.required': '试卷标题是必填项'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '试卷描述不能超过1000个字符'
    }),
  
  difficultyLevel: Joi.string()
    .valid('easy', 'medium', 'hard')
    .optional()
    .messages({
      'any.only': '难度等级必须是easy、medium或hard之一'
    }),
  
  totalQuestions: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.integer': '题目数量必须是整数',
      'number.min': '题目数量至少为1',
      'number.max': '题目数量不能超过100',
      'any.required': '题目数量是必填项'
    }),
  
  estimatedTime: Joi.number()
    .integer()
    .min(5)
    .max(300)
    .optional()
    .messages({
      'number.integer': '预计时间必须是整数',
      'number.min': '预计时间至少5分钟',
      'number.max': '预计时间不能超过300分钟'
    }),
  
  language: Joi.string()
    .valid('zh', 'en')
    .optional()
    .messages({
      'any.only': '语言必须是zh或en'
    }),
  
  isPublic: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': '公开设置必须是true或false'
    }),
  
  sourceMaterials: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .messages({
      'array.base': '源资料必须是数组',
      'number.integer': '资料ID必须是整数',
      'number.positive': '资料ID必须是正数'
    })
});

// 试卷题目验证
const questionSchema = Joi.object({
  paperId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': '试卷ID必须是整数',
      'number.positive': '试卷ID必须是正数',
      'any.required': '试卷ID是必填项'
    }),
  
  questionNumber: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.integer': '题目编号必须是整数',
      'number.min': '题目编号至少为1',
      'any.required': '题目编号是必填项'
    }),
  
  questionType: Joi.string()
    .valid('multiple_choice', 'true_false', 'short_answer', 'essay', 'calculation')
    .required()
    .messages({
      'any.only': '题目类型必须是multiple_choice、true_false、short_answer、essay或calculation之一',
      'any.required': '题目类型是必填项'
    }),
  
  questionText: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.min': '题目内容不能为空',
      'string.max': '题目内容不能超过2000个字符',
      'any.required': '题目内容是必填项'
    }),
  
  options: Joi.array()
    .items(Joi.string().max(500))
    .optional()
    .messages({
      'array.base': '选项必须是数组',
      'string.max': '每个选项不能超过500个字符'
    }),
  
  correctAnswer: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '正确答案不能超过1000个字符'
    }),
  
  explanation: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': '解析不能超过2000个字符'
    }),
  
  points: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.integer': '分值必须是整数',
      'number.min': '分值至少为1',
      'number.max': '分值不能超过100'
    }),
  
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .optional()
    .messages({
      'any.only': '难度必须是easy、medium或hard之一'
    }),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional()
    .messages({
      'array.base': '标签必须是数组',
      'string.max': '每个标签不能超过50个字符'
    })
});

// 用户评分验证
const ratingSchema = Joi.object({
  itemType: Joi.string()
    .valid('material', 'paper')
    .required()
    .messages({
      'any.only': '评分类型必须是material或paper',
      'any.required': '评分类型是必填项'
    }),
  
  itemId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': '项目ID必须是整数',
      'number.positive': '项目ID必须是正数',
      'any.required': '项目ID是必填项'
    }),
  
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.integer': '评分必须是整数',
      'number.min': '评分至少为1',
      'number.max': '评分不能超过5',
      'any.required': '评分是必填项'
    }),
  
  review: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '评价内容不能超过1000个字符'
    })
});

// 分页参数验证
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': '页码必须是整数',
      'number.min': '页码至少为1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.integer': '每页数量必须是整数',
      'number.min': '每页数量至少为1',
      'number.max': '每页数量不能超过100'
    }),
  
  sort: Joi.string()
    .optional()
    .messages({
      'string.base': '排序字段必须是字符串'
    }),
  
  order: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .optional()
    .messages({
      'any.only': '排序方向必须是ASC或DESC'
    }),
  
  search: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '搜索关键词不能超过100个字符'
    })
});

// 导出验证中间件
module.exports = {
  validate,
  validateUserRegistration: validate(userRegistrationSchema),
  validateUserLogin: validate(userLoginSchema),
  validateCourse: validate(courseSchema),
  validateMaterial: validate(materialSchema),
  validatePaperGeneration: validate(paperGenerationSchema),
  validateQuestion: validate(questionSchema),
  validateRating: validate(ratingSchema),
  validatePagination: validate(paginationSchema, 'query'),
  
  // 导出schema以供其他地方使用
  schemas: {
    userRegistrationSchema,
    userLoginSchema,
    courseSchema,
    materialSchema,
    paperGenerationSchema,
    questionSchema,
    ratingSchema,
    paginationSchema
  }
};