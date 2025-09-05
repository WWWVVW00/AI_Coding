-- 学习助手数据库架构设计
-- 支持大规模数据存储和高效查询

-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    student_id VARCHAR(20),
    department VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_student_id (student_id)
);

-- 课程表
CREATE TABLE courses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    credits INT DEFAULT 3,
    semester VARCHAR(20),
    year INT,
    instructor VARCHAR(100),
    created_by BIGINT,
    is_official BOOLEAN DEFAULT FALSE, -- 官方课程 vs 用户创建
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_department (department),
    INDEX idx_name (name),
    INDEX idx_created_by (created_by),
    UNIQUE KEY unique_course_code (code, year, semester)
);

-- 学习资料表
CREATE TABLE materials (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, ppt, doc, etc.
    mime_type VARCHAR(100),
    download_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    tags JSON, -- 存储标签数组
    year INT,
    material_type ENUM('lecture', 'assignment', 'exam', 'notes', 'other') DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_file_type (file_type),
    INDEX idx_material_type (material_type),
    INDEX idx_year (year),
    INDEX idx_created_at (created_at)
);

-- 生成的试卷表
CREATE TABLE generated_papers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    total_questions INT NOT NULL,
    estimated_time INT, -- 预计完成时间（分钟）
    language VARCHAR(10) DEFAULT 'zh', -- zh, en
    is_public BOOLEAN DEFAULT FALSE,
    download_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    source_materials JSON, -- 存储生成试卷所用的资料ID数组
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_created_by (created_by),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
);

-- 试卷题目表
CREATE TABLE paper_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    paper_id BIGINT NOT NULL,
    question_number INT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'calculation') NOT NULL,
    question_text TEXT NOT NULL,
    options JSON, -- 选择题选项
    correct_answer TEXT,
    explanation TEXT,
    points INT DEFAULT 1,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (paper_id) REFERENCES generated_papers(id) ON DELETE CASCADE,
    INDEX idx_paper_id (paper_id),
    INDEX idx_question_type (question_type),
    INDEX idx_difficulty (difficulty),
    UNIQUE KEY unique_paper_question (paper_id, question_number)
);

-- 用户收藏表
CREATE TABLE user_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    item_type ENUM('course', 'material', 'paper') NOT NULL,
    item_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_item_type_id (item_type, item_id),
    UNIQUE KEY unique_user_favorite (user_id, item_type, item_id)
);

-- 用户评分表
CREATE TABLE user_ratings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    item_type ENUM('material', 'paper') NOT NULL,
    item_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_item_type_id (item_type, item_id),
    INDEX idx_rating (rating),
    UNIQUE KEY unique_user_rating (user_id, item_type, item_id)
);

-- 评论表
CREATE TABLE comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    parent_id BIGINT, -- 用于回复评论
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_parent_id (parent_id)
);

-- 下载记录表
CREATE TABLE download_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    item_type ENUM('material', 'paper') NOT NULL,
    item_id BIGINT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_item_type_id (item_type, item_id),
    INDEX idx_downloaded_at (downloaded_at)
);

-- 用户学习进度表
CREATE TABLE user_progress (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    materials_viewed INT DEFAULT 0,
    papers_completed INT DEFAULT 0,
    total_study_time INT DEFAULT 0, -- 总学习时间（分钟）
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_last_activity (last_activity),
    UNIQUE KEY unique_user_course_progress (user_id, course_id)
);

-- 系统统计表
CREATE TABLE system_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stat_date DATE NOT NULL,
    total_users INT DEFAULT 0,
    total_courses INT DEFAULT 0,
    total_materials INT DEFAULT 0,
    total_papers INT DEFAULT 0,
    daily_downloads INT DEFAULT 0,
    daily_uploads INT DEFAULT 0,
    daily_paper_generations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_stat_date (stat_date),
    INDEX idx_stat_date (stat_date)
);

-- 文件存储表（用于管理文件存储）
CREATE TABLE file_storage (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    file_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
    original_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    storage_type ENUM('local', 's3', 'oss') DEFAULT 'local',
    reference_count INT DEFAULT 1, -- 引用计数，用于垃圾回收
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_file_hash (file_hash),
    INDEX idx_storage_type (storage_type),
    INDEX idx_reference_count (reference_count)
);

-- 创建视图：课程统计
CREATE VIEW course_stats AS
SELECT 
    c.id,
    c.name,
    c.code,
    c.department,
    COUNT(DISTINCT m.id) as material_count,
    COUNT(DISTINCT p.id) as paper_count,
    COUNT(DISTINCT up.user_id) as enrolled_users,
    AVG(ur.rating) as average_rating,
    c.created_at
FROM courses c
LEFT JOIN materials m ON c.id = m.course_id AND m.is_public = TRUE
LEFT JOIN generated_papers p ON c.id = p.course_id AND p.is_public = TRUE
LEFT JOIN user_progress up ON c.id = up.course_id
LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id IN (
    SELECT id FROM materials WHERE course_id = c.id
)
GROUP BY c.id, c.name, c.code, c.department, c.created_at;

-- 创建视图：热门资料
CREATE VIEW popular_materials AS
SELECT 
    m.*,
    c.name as course_name,
    c.code as course_code,
    u.username as uploader_name,
    AVG(ur.rating) as average_rating,
    COUNT(ur.id) as rating_count
FROM materials m
JOIN courses c ON m.course_id = c.id
JOIN users u ON m.uploaded_by = u.id
LEFT JOIN user_ratings ur ON ur.item_type = 'material' AND ur.item_id = m.id
WHERE m.is_public = TRUE
GROUP BY m.id
ORDER BY m.download_count DESC, average_rating DESC;

-- 创建索引优化查询性能
CREATE INDEX idx_materials_course_type ON materials(course_id, material_type);
CREATE INDEX idx_papers_course_public ON generated_papers(course_id, is_public);
CREATE INDEX idx_questions_paper_number ON paper_questions(paper_id, question_number);
CREATE INDEX idx_users_active ON users(is_active, created_at);