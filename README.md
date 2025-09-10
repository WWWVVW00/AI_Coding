# 城大智学坊 (CityU LearnSphere): AI 驱动的协作式学习中心

**一个为香港城市大学（CityU）学生量身打造的次世代学习平台。我们将独立的 AI 学习过程，转变为一个强大、共享、充满活力的集体学习生态系统。**

*项目启动日期: 2025年9月5日*

-----

## 🚀 项目愿景与核心问题

在人工智能时代，香港城市大学的学生已普遍开始使用 AI 工具来生成练习题，以巩固课程知识。然而，这种模式也带来了一个显著的问题：**“知识孤岛”**。由 AI 生成的宝贵学习资料被禁锢在个人设备中，导致了重复性的劳动和集体智慧的浪费。

与此同时，作为一所高度国际化的大学，城大的语言多样性在促进文化交融的同时，有时也构成了学术协作的无形壁垒。学生们在用母语进行深度思考和知识创造时最为舒适，但这也在一定程度上限制了跨语言、跨文化的知识分享。

**“城大智学坊 (CityU LearnSphere)”** 应运而生。我们的目标是创建一个中心化的协作平台，赋能每一位学生分享他们由 AI 生成的试卷，共同构建一个规模庞大、动态更新且支持多语言的“众包”题库。我们的愿景是：**打破知识壁垒，跨越语言障碍，让城大多元化的学生群体能够真正凝聚集体智慧，实现共赢。**

## ✨ 核心功能

*   **🧠 AI 智能出题:** 内置简洁易用的 AI 工具，学生可以针对任何课程的特定知识点，快速生成定制化的练习试卷。
*   **📚 协作式课程题库:** 城大的每一门课程都有一个专属的共享空间。学生可以一键发布自己生成的试卷，为这个“共建题库”贡献一份力量。
*   **🌍 无缝多语言支持:**
    *   **母语创作:** 学生可以用自己最熟悉的语言（如中文、韩语、法语等）来生成试卷。
    *   **全球分享:** 平台会自动将分享的试卷翻译成课程的通用教学语言（通常是英语），同时保留原始语言版本以供参照。
    *   **无碍学习:** 其他同学可以无障碍地浏览和练习来自不同国家同学分享的试卷，创造一个真正包容和便捷的学习环境。

## 🤖 应用场景

1.  **生成:** 学生 Alex 正在为他的“市场营销学”期中考试复习。他在“城大智学坊”的课程页面，使用 AI 工具针对“消费者行为”这一章节生成了一套包含10道题的测验。
2.  **分享:** Alex 对题目的质量感到满意，于是将这套测验发布到了“市场营销学”的公共题库中。
3.  **翻译与发现:** 一位母语为韩语的同学 Park 看到了 Alex 分享的测验。平台同时向他展示了英文原版和自动翻译的韩文版。Park 通过韩文版更好地理解了题目的深层含义。
4.  **练习与协作:** Park 完成了测验，认为这套题非常有帮助，于是点赞并留下感谢评论。随后，他也贡献了一份自己生成的关于“数字营销”的测验，这份测验被自动翻译后，同样可供 Alex 及所有修读该课程的同学使用。
5.  **集体智慧涌现:** 短短几周内，“市场营销学”的题库就汇集了上百道来自不同学生、涵盖不同侧重点的练习题，形成了一个高质量、多元化的学习资源池。

## 💡 项目独特性：与城大文化的深度融合

*   **从“闭门造车”到“集思广益”:** 本项目直击现代 AI 辅助学习模式下的“个体化”痛点，将其转化为社区驱动的协作行为，这与香港高效、合作的城市文化精神不谋而合。
*   **为“国际化大学”量身打造:** 核心的多语言功能不仅是一项技术，更是对城大国际化身份的彰显。我们提供的方案，旨在拥抱文化多样性，并将其转化为学术交流的独特优势。
*   **源于学生，服务学生:** 平台旨在解决城大学生日常学习中遇到的真实、具体的困难。它赋能学生成为学习资源的主人，为大学的知识共享生态系统做出贡献。
*   **应用模式的原创性:** 市面上虽有 AI 出题工具，但我们的原创性在于将 **AI 内容生成、社区协作分享、无缝多语言支持**这三者有机结合，并深度嵌入到大学这一具体而独特的应用场景中。

---

## 技术实现与部署

### 技术栈

*   **前端**: React 19、Vite、CSS
    *   组件化架构 (`src/components`)
    *   使用 Hooks 和 Contexts 进行状态管理 (`src/hooks`, `src/contexts`)
    *   通过 services 层进行 API 请求 (`src/services`)
*   **后端**: Node.js + Express.js
    *   REST API 路由 (`backend/routes`)
    *   中间件处理请求 (`backend/middleware`)
    *   配置文件管理 (`backend/config`)
*   **数据库**: MySQL
*   **部署**: Docker + Docker Compose
*   **题目生成器**: 独立的 Node.js 脚本或模块。

### 项目结构

项目代码库按功能模块划分，主要目录结构如下：

```
.
├── backend/             # 后端源码 (Node.js/Express)
│   ├── config/          # 配置文件
│   ├── forum/           # 论坛相关模块
│   ├── logs/            # 应用日志
│   ├── middleware/      # Express 中间件
│   ├── routes/          # API 路由
│   ├── scripts/         # 后端脚本
│   └── uploads/         # 文件上传目录
├── database/            # 数据库结构、迁移和填充脚本
├── public/              # Web 服务器提供的静态资源
├── question_generator/  # 独立的题目生成模块
│   ├── docs/            # 模块文档
│   └── scripts/         # 模块脚本
├── src/                 # 前端源码 (例如 React)
│   ├── assets/          # 图片、字体等静态资源
│   ├── components/      # 可复用 UI 组件
│   ├── contexts/        # 全局 Context
│   ├── hooks/           # 自定义 React Hooks
│   ├── locales/         # 国际化语言包
│   └── services/        # API 服务层
├── test/                # 测试文件
└── README.md            # 本文档
```

### 本地部署与运行

以下是在本地环境中进行开发和测试的步骤。

#### 环境要求

请确保您的系统已安装以下软件：

*   [Node.js](https://nodejs.org/) (已包含 npm)
*   相应的数据库系统 (MySQL 8)

## 快速开始（本地开发）

1) 启动后端
- 配置数据库与环境变量
  ```
  cd backend
  cp .env.example .env
  # 按需填写 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/JWT_SECRET/PORT 等
  ```
- 安装依赖并迁移数据库
  ```
  npm install
  npm run migrate
  ```
- 启动开发服务（默认 http://localhost:3001）
  ```
  npm run dev
  ```

2) 启动前端（Vite）
- 复制前端环境变量并设置 API 地址
  ```
  cp .env.example .env
  # 确保：VITE_API_URL=http://localhost:3001/api
  ```
- 安装依赖并启动
  ```
  npm install
  npm run dev
  ```
- 访问开发地址（默认 http://localhost:5173）

## 一键启动（Docker）

确保 docker 与 docker-compose 可用：
```
docker compose up -d
```
- database: MySQL 8 暴露 3306
- backend: http://localhost:3001（依赖数据库健康检查后启动）
- frontend(生产): http://localhost（Nginx 供静态访问）

环境变量在 docker-compose.yml 中可按需调整（JWT_SECRET、MAX_FILE_SIZE 等）。

## 环境变量（前端）

见 .env.example：
- VITE_API_URL=http://localhost:3001/api
- VITE_APP_NAME、VITE_APP_VERSION
- VITE_MAX_FILE_SIZE、VITE_ALLOWED_FILE_TYPES
- 功能开关：VITE_ENABLE_REGISTRATION / FILE_UPLOAD / PAPER_GENERATION
- VITE_DEBUG_MODE

## API 概览

完整说明请参见 backend/README.md，常用端点摘录：
- 认证：POST /api/auth/register | /login | GET /me
- 课程：GET /api/courses | GET /api/courses/:id | POST /api/courses
- 资料：GET /api/materials/course/:courseId | POST /api/materials/upload | GET /api/materials/:id/download
- 试卷：GET /api/papers?courseId=... | POST /api/papers/generate | GET /api/papers/:id/download?includeAnswers=true
- 用户：GET /api/users/progress | POST /api/users/favorites | POST /api/users/ratings
- 统计：GET /api/stats/overview | GET /api/stats/course/:courseId

要点
- 上传资料支持 PPT/PPTX、PDF、DOC/DOCX、图片等，最大 50MB（可配）
- 下载试卷可选择是否包含答案与解析（includeAnswers=true/false）
- 分享与隐私：is_public 控制公开

## 隐私与分享

- 资料/试卷均支持 is_public 字段控制可见性
- 资源下载/浏览会记录基础日志（IP/User-Agent 等，详见 download_logs）
- 请勿上传含有敏感信息的材料；生产环境务必更换 JWT_SECRET 等密钥

## Roadmap

短期
- 对齐前端课程详情页 API：
  - materials: 使用 GET /api/materials/course/:courseId
  - shared papers: 使用 GET /api/papers?courseId=...
  - comments：新增后端 /api/comments 路由集（课程评论/讨论）
- 统一前端 API 客户端：移除 src/services/api.js 的 mock，接入 VITE_API_URL（或配置 Vite 代理）
- 试卷分享页与搜索 UI：支持按课程/关键词/评分/下载量筛选与排序

中期
- 真正基于 PPT/课程介绍抽取知识点并生成试卷（替换后端 mock）：
  - 支持中英双语并排、题型覆盖与权重配置
  - 自动提炼“本卷重点/考点”，答案与解析独立导出
- 题目管理：题库化、难度标注、错题/收藏题
- 课程交流（生活向）：话题/置顶/审核/通知

长期
- 学习画像与个性化推荐：根据进度、错题、评分生成复习计划
- 多媒体解析（PPT/视频/音频）与多模态出题
- 审核与内容安全策略、举报机制

## 贡献

欢迎提交 Issue 与 PR：
- 提交前请执行 ESLint（前端）与基础测试（后端）
- 遵循模块化、无敏感信息入库的原则

## 许可证

本项目基于 [MIT License](LICENSE) 开源。