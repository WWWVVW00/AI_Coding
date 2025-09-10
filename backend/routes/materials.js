const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { executeQuery, executeTransaction, buildPaginationQuery, buildSearchConditions } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateMaterialUpload } = require('../middleware/validation');

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/materials');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，保留原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // ***** 核心修改 #1：手动处理文件名编码 *****
    // file.originalname 可能是乱码，我们从请求头中获取原始文件名
    // 前端需要确保在发送请求时添加 'X-Original-Filename' 头
    const originalName = req.headers['x-original-filename'] ? Buffer.from(req.headers['x-original-filename'], 'latin1').toString('utf8') : file.originalname;
    const ext = path.extname(originalName);
    cb(null, `material-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  ];
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx', '.ppt', '.pptx'];

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype || fileExt}。`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // ***** 核心修改 #2：将后端文件大小限制提高到 50MB *****
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  }
});

// 计算文件哈希
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// 获取课程的所有资料
router.get('/course/:courseId', optionalAuth, async (req, res) => { // <-- 使用 optionalAuth
  try {
    const { courseId } = req.params;
    const userId = req.user?.id; // <-- 获取当前用户ID (可能为 undefined)
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      type = '', 
      year = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    let baseQuery = `
      SELECT 
        m.*,
        u.username as uploader_name,
        u.full_name as uploader_full_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count
      FROM materials m
      JOIN users u ON m.uploaded_by = u.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
      WHERE m.course_id = ? 
    `;

    // --- 核心逻辑修改：动态构建 WHERE 条件 ---
    const params = [courseId];
    
    let visibilityCondition = 'm.is_public = TRUE';
    if (userId) {
      // 如果用户已登录，显示公开的 OR 用户自己的私有资料
      visibilityCondition = '(m.is_public = TRUE OR m.uploaded_by = ?)';
      params.push(userId);
    }
    baseQuery += ` AND ${visibilityCondition}`;
    
    // 搜索条件
    if (search) {
      const searchConditions = buildSearchConditions(['m.title', 'm.description'], search);
      baseQuery += ` AND ${searchConditions.where}`;
      params.push(...searchConditions.params);
    }

    // 类型和年份筛选 (保持不变)
    if (type) {
      baseQuery += ` AND m.material_type = ?`;
      params.push(type);
    }
    if (year) {
      baseQuery += ` AND m.year = ?`;
      params.push(parseInt(year));
    }

    baseQuery += ` GROUP BY m.id`;

    // 排序 (保持不变)
    const validSorts = ['title', 'created_at', 'download_count', 'average_rating', 'file_size'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const paginatedQuery = buildPaginationQuery(
      baseQuery, 
      parseInt(page), 
      parseInt(limit), 
      `${sortField} ${sortOrder}`
    );

    const materials = await executeQuery(paginatedQuery, params);

    // --- 同样修改获取总数的查询 ---
    let countQuery = `
      SELECT COUNT(*) as total
      FROM materials m
      WHERE m.course_id = ?
    `;
    const countParams = [courseId];
    
    if (userId) {
      countQuery += ` AND (m.is_public = TRUE OR m.uploaded_by = ?)`;
      countParams.push(userId);
    } else {
      countQuery += ` AND m.is_public = TRUE`;
    }

    if (search) {
      countQuery += ` AND (m.title LIKE ? OR m.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (type) {
      countQuery += ` AND m.material_type = ?`;
      countParams.push(type);
    }
    if (year) {
      countQuery += ` AND m.year = ?`;
      countParams.push(parseInt(year));
    }

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      materials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取课程资料失败:', error);
    res.status(500).json({ error: '获取课程资料失败' });
  }
});

// 获取单个资料详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const materials = await executeQuery(`
      SELECT 
        m.*,
        u.username as uploader_name,
        u.full_name as uploader_full_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count
      FROM materials m
      JOIN users u ON m.uploaded_by = u.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
      WHERE m.id = ? AND m.is_public = TRUE
      GROUP BY m.id
    `, [id]);

    if (materials.length === 0) {
      return res.status(404).json({ error: '资料不存在或不可访问' });
    }

    // 增加浏览次数（这里可以用Redis来优化）
    await executeQuery(
      'UPDATE materials SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );

    res.json({ material: materials[0] });

  } catch (error) {
    console.error('获取资料详情失败:', error);
    res.status(500).json({ error: '获取资料详情失败' });
  }
});

// 上传资料
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { courseId, title, description, materialType, year, tags, isPublic } = req.body;
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 验证课程是否存在
    const course = await executeQuery('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      // 如果课程不存在，先清理已上传的临时文件
      files.forEach(file => fs.unlink(file.path).catch(console.error));
      return res.status(404).json({ error: '课程不存在' });
    }

    // --- 新增：文件名重复检查 ---
    for (const file of files) {
      const { originalname } = file;
      const existingMaterial = await executeQuery(
        'SELECT id FROM materials WHERE course_id = ? AND file_name = ?',
        [courseId, originalname]
      );
      
      if (existingMaterial.length > 0) {
        // 如果文件已存在，抛出错误，这将由下方的 catch 块捕获
        throw new Error(`文件'${originalname}'已存在于此课程中。`);
      }
    }
    // --- 检查结束 ---

    const queries = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const originalName = req.headers['x-original-filename'] ? Buffer.from(req.headers['x-original-filename'], 'latin1').toString('utf8') : file.originalname;
      
      // 计算文件哈希
      const fileHash = await calculateFileHash(file.path);
      
      // 检查文件是否已存在于文件存储中
      const existingFile = await executeQuery(
        'SELECT id FROM file_storage WHERE file_hash = ?',
        [fileHash]
      );

      let fileStorageId;
      
      if (existingFile.length > 0) {
        fileStorageId = existingFile[0].id;
        queries.push({
          sql: 'UPDATE file_storage SET reference_count = reference_count + 1 WHERE id = ?',
          params: [fileStorageId]
        });
      } else {
        const fileStorageResult = await executeQuery(`
          INSERT INTO file_storage (
            file_hash, original_name, file_path, file_size, 
            mime_type, storage_type, reference_count
          ) VALUES (?, ?, ?, ?, ?, 'local', 1)
        `, [
          fileHash, file.originalname, file.path, file.size, file.mimetype
        ]);
        fileStorageId = fileStorageResult.insertId;
      }

      // 插入资料记录
      queries.push({
        sql: `
          INSERT INTO materials (
            course_id, uploaded_by, title, description, file_name, 
            file_path, file_size, file_type, mime_type, material_type, 
            year, tags, is_public
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          courseId, userId, title || originalName, description || '', // 使用 originalName 作为标题备选项
          originalName, // **** 确保这里使用的是解码后的文件名 ****
          file.path, file.size,
          path.extname(originalName).toLowerCase().slice(1),
          file.mimetype, materialType || 'other', year || new Date().getFullYear(),
          tags ? JSON.stringify(tags.split(',').map(tag => tag.trim())) : null,
          isPublic === 'true'
        ]
      });
    }

    // 执行事务
    await executeTransaction(queries);
    
    // 获取上传的资料信息
    const limit = parseInt(files.length, 10); 

    const lastInsertIds = await executeQuery(
        `SELECT id FROM materials WHERE course_id = ? ORDER BY id DESC LIMIT ${limit}`, // 使用模板字符串拼接 LIMIT
        [courseId] // 参数数组中只剩下 courseId
    );
    const materialIds = lastInsertIds.map(row => row.id).reverse();
    
    const uploadedMaterials = await executeQuery(`
        SELECT m.*, c.name as course_name, c.code as course_code
        FROM materials m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id IN (${materialIds.map(() => '?').join(',')})
      `, materialIds);

    res.status(201).json({
      message: `成功上传 ${files.length} 个文件`,
      materials: uploadedMaterials
    });

  } catch (error) {
    console.error('上传资料失败:', error);
    
    // 清理已上传的所有临时文件
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(console.error);
      });
    }
    
    // --- 新增：返回更具体的 409 Conflict 错误 ---
    if (error.message.includes('已存在')) {
      return res.status(409).json({ error: '文件冲突', message: error.message });
    }
    // --- 错误处理结束 ---
    
    res.status(500).json({ error: '上传资料失败' });
  }
});

// 下载资料
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 1. 查询资料，并验证权限 (公开 或 属于自己)
    const materials = await executeQuery(`
      SELECT m.*, c.name as course_name
      FROM materials m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = ? AND (m.is_public = TRUE OR m.uploaded_by = ?)
    `, [id, userId || 0]);

    if (materials.length === 0) {
      return res.status(404).json({ error: '资料不存在或您没有权限下载' });
    }

    const material = materials[0];
    const filePath = material.file_path;

    // 2. 检查物理文件是否存在
    if (!await fs.pathExists(filePath)) {
      console.error(`文件丢失: 数据库记录存在，但物理文件找不到。路径: ${filePath}`);
      return res.status(404).json({ error: '文件在服务器上已丢失，请联系管理员' });
    }

    // 3. 记录下载日志
    if (userId) {
      await executeQuery(`
        INSERT INTO download_logs (user_id, item_type, item_id, ip_address, user_agent)
        VALUES (?, 'material', ?, ?, ?)
      `, [userId, id, req.ip, req.get('User-Agent')]);
    }

    // 4. 更新下载计数
    await executeQuery(
      'UPDATE materials SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );

    // 5. 设置响应头并发送文件流
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(material.file_name)}"`);
    res.setHeader('Content-Type', material.mime_type || 'application/octet-stream'); // 提供备用 MIME 类型
    res.setHeader('Content-Length', material.file_size);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('下载资料失败:', error);
    res.status(500).json({ error: '下载资料失败', message: '服务器内部错误，请稍后重试' });
  }
});

// 更新资料信息
router.put('/:id', authenticateToken, validateMaterialUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, materialType, year, tags, isPublic } = req.body;
    const userId = req.user.id;

    // 检查资料是否存在且用户有权限修改
    const material = await executeQuery(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (material.length === 0) {
      return res.status(404).json({ error: '资料不存在' });
    }

    if (material[0].uploaded_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限修改此资料' });
    }

    const updateQuery = `
      UPDATE materials SET
        title = ?, description = ?, material_type = ?, 
        year = ?, tags = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      title,
      description,
      materialType,
      year,
      tags ? JSON.stringify(tags.split(',').map(tag => tag.trim())) : null,
      isPublic,
      id
    ]);

    // 获取更新后的资料信息
    const updatedMaterial = await executeQuery(`
      SELECT m.*, c.name as course_name, c.code as course_code
      FROM materials m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = ?
    `, [id]);

    res.json({
      message: '资料更新成功',
      material: updatedMaterial[0]
    });

  } catch (error) {
    console.error('更新资料失败:', error);
    res.status(500).json({ error: '更新资料失败' });
  }
});

// 删除资料
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查资料是否存在且用户有权限删除
    const material = await executeQuery(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (material.length === 0) {
      return res.status(404).json({ error: '资料不存在' });
    }

    if (material[0].uploaded_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '没有权限删除此资料' });
    }

    // 删除资料记录
    await executeQuery('DELETE FROM materials WHERE id = ?', [id]);

    // 减少文件引用计数
    const fileHash = await calculateFileHash(material[0].file_path);
    await executeQuery(
      'UPDATE file_storage SET reference_count = reference_count - 1 WHERE file_hash = ?',
      [fileHash]
    );

    // 如果引用计数为0，删除物理文件
    const [fileStorage] = await executeQuery(
      'SELECT reference_count FROM file_storage WHERE file_hash = ?',
      [fileHash]
    );

    if (fileStorage && fileStorage.reference_count <= 0) {
      await fs.unlink(material[0].file_path).catch(console.error);
      await executeQuery('DELETE FROM file_storage WHERE file_hash = ?', [fileHash]);
    }

    res.json({ message: '资料删除成功' });

  } catch (error) {
    console.error('删除资料失败:', error);
    res.status(500).json({ error: '删除资料失败' });
  }
});

// 获取热门资料
router.get('/popular/list', async (req, res) => {
  try {
    const { limit = 10, courseId } = req.query;

    let query = `
      SELECT 
        m.*,
        u.username as uploader_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count
      FROM materials m
      JOIN users u ON m.uploaded_by = u.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
      WHERE m.is_public = TRUE
    `;

    const params = [];

    if (courseId) {
      query += ` AND m.course_id = ?`;
      params.push(courseId);
    }

    query += `
      GROUP BY m.id
      ORDER BY 
        (m.download_count * 0.5 + 
         AVG(COALESCE(ur.rating, 0)) * 0.3 + 
         COUNT(ur.id) * 0.2) DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));

    const materials = await executeQuery(query, params);

    res.json({ materials });

  } catch (error) {
    console.error('获取热门资料失败:', error);
    res.status(500).json({ error: '获取热门资料失败' });
  }
});

// 搜索资料
router.get('/search/all', async (req, res) => {
  try {
    const { 
      q: search = '', 
      page = 1, 
      limit = 20, 
      type = '', 
      courseId = '',
      sort = 'relevance'
    } = req.query;

    if (!search.trim()) {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }

    let baseQuery = `
      SELECT 
        m.*,
        u.username as uploader_name,
        c.name as course_name,
        c.code as course_code,
        AVG(ur.rating) as average_rating,
        COUNT(ur.id) as rating_count,
        MATCH(m.title, m.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
      FROM materials m
      JOIN users u ON m.uploaded_by = u.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
      WHERE m.is_public = TRUE
      AND (
        MATCH(m.title, m.description) AGAINST(? IN NATURAL LANGUAGE MODE)
        OR m.title LIKE ?
        OR m.description LIKE ?
        OR c.name LIKE ?
        OR c.code LIKE ?
      )
    `;

    const params = [search, search, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];

    if (type) {
      baseQuery += ` AND m.material_type = ?`;
      params.push(type);
    }

    if (courseId) {
      baseQuery += ` AND m.course_id = ?`;
      params.push(courseId);
    }

    baseQuery += ` GROUP BY m.id`;

    // 排序
    let orderBy = 'relevance_score DESC, m.download_count DESC';
    if (sort === 'date') {
      orderBy = 'm.created_at DESC';
    } else if (sort === 'downloads') {
      orderBy = 'm.download_count DESC';
    } else if (sort === 'rating') {
      orderBy = 'average_rating DESC';
    }

    const paginatedQuery = buildPaginationQuery(
      baseQuery, 
      parseInt(page), 
      parseInt(limit), 
      orderBy
    );

    const materials = await executeQuery(paginatedQuery, params);

    // 获取总数（简化版，不包含复杂的相关性计算）
    const countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM materials m
      JOIN courses c ON m.course_id = c.id
      WHERE m.is_public = TRUE
      AND (
        m.title LIKE ? OR m.description LIKE ? OR 
        c.name LIKE ? OR c.code LIKE ?
      )
      ${type ? 'AND m.material_type = ?' : ''}
      ${courseId ? 'AND m.course_id = ?' : ''}
    `;

    const countParams = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    if (type) countParams.push(type);
    if (courseId) countParams.push(courseId);

    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      materials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      },
      searchTerm: search
    });

  } catch (error) {
    console.error('搜索资料失败:', error);
    res.status(500).json({ error: '搜索资料失败' });
  }
});

module.exports = router;