# 复习小助手 (Study Assistant)

一站式课程复习与共享平台：进入后选择课程，系统从历史已上传资料中聚合历年复习材料、历年试卷；用户可在复习完成后上传当年 PPT 或使用历年 PPT，一键生成带重点标注的新试卷；试卷与答案分离，可选择是否公开分享，构建以课程为中心的学习分享社区。

本仓库包含前端（Vite + React）与后端（Express + MySQL）以及 Docker 开发/部署配置。

- 在线能力愿景（你的初稿总结）
  - 生成试卷（输入 PPT 与课程介绍，支持中英文对照）
  - 分享生成内容（公开/私密可选）
  - 对答案进行解题解析（重点标注与讲解）
  - 课程交流（生活向的讨论区）
  - UI 可搜索他人或自己生成的试卷

当前实现状态（概览）：
- 后端 API：已提供课程、资料上传/下载、试卷生成（当前为模拟题生成）、评分收藏、统计等核心接口；试卷下载支持是否包含答案。
- 前端 UI：已提供登录/注册/课程列表/课程详情/上传资料/生成试卷等页面骨架；Forum 交流页为占位；部分 API 调用仍为占位或 mock。
- 数据与权限：资源具备 is_public 字段以支持分享/私密；支持点赞/收藏/评分等。

## 核心功能

已实现（后端）
- 课程管理：创建、更新、删除、热门/详情/统计
- 资料管理：多文件上传、类型与大小限制、下载计数、哈希去重、热门/搜索、按课程查询
- 试卷管理：生成新试卷（目前为模拟题）、查询/下载（可选择是否包含答案）、点赞、热门
- 用户与权限：注册/登录/JWT、个人资料、学习进度、收藏、评分
- 系统统计：全局概览、课程统计、用户活动、下载/评分分析

进行中/前端占位
- 课程交流区（ForumView.jsx）：UI 占位，后端评论/讨论路由尚未对接
- 课程详情页数据：部分路由命名与后端不一致（见“对接注意”）

规划中
- 真正基于 PPT/资料的智能出题与重点抽取（替换模拟题逻辑）
- 中英双语并排出题与答案解析增强
- 评论/讨论系统、消息通知、搜索与筛选的完整 UI
- 统一的前端 API 服务（移除临时 mock，接入 VITE_API_URL，或配置 Vite 代理）

## 技术栈

- 前端：React 19、Vite、Tailwind CSS、Lucide React
- 后端：Node.js、Express、MySQL、JWT、Multer、Helmet、Rate Limit、Joi
- 工具与部署：Docker / docker-compose、Nginx（生产前端）、ESLint

## 目录结构

```
.
├── backend/                      # 后端服务
│   ├── routes/                   # 认证/课程/资料/试卷/统计/用户等路由
│   ├── config/                   # 数据库等配置
│   ├── middleware/               # 认证/校验/权限
│   ├── scripts/migrate.js        # 初始化/迁移脚本
│   └── server.js                 # 入口
├── src/                          # 前端
│   ├── components/               # UI 组件（layout/views/modals/common）
│   ├── hooks/                    # useAuth/useCourses/useApp
│   ├── services/api.js           # 临时 mock（localStorage）
│   └── App.jsx                   # 应用入口
├── database/schema.sql           # 初始数据库结构
├── docker-compose.yml            # 一键起 MySQL/后端/前端(生产)
├── nginx.conf                    # 前端生产 Nginx 配置
├── .env.example                  # 前端环境变量样例
└── README.md                     # 此文档
```

## 快速开始（本地开发）

前提
- Node.js ≥ 18（前端）、MySQL 8（后端）
- npm 或 pnpm

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

对接注意（重要）
- 课程详情页 CourseDetailView.jsx 目前请求：
  - /api/courses/{id}/materials、/api/courses/{id}/shared-papers、/api/courses/{id}/comments（占位）
- 后端现有路由（建议替换为以下）：
  - 资料列表（按课程）：GET /api/materials/course/:courseId
  - 试卷列表（按课程）：GET /api/papers?courseId=:courseId
  - 评论/讨论：尚未提供，需要新增后端路由（或在 README 的 Roadmap 中）
- 生成试卷：
  - 后端期望字段为 sourceMaterials（数组），而前端示例使用 materialIds，需对齐。
  - 语言 language 支持 'zh'/'en'；下载时可通过 includeAnswers=true 分离答案。
- 临时 mock：src/services/api.js 使用 localStorage 模拟登录/课程数据；上线前请改为统一 API 客户端并使用 VITE_API_URL。

可选（Vite 代理示例）
如不在代码中拼接 VITE_API_URL，也可添加 Vite 代理：
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

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
- 分享与隐私：is_public 控制公开；支持点赞、收藏、评分

## 隐私与分享

- 资料/试卷均支持 is_public 字段控制可见性
- 资源下载/浏览会记录基础日志（IP/User-Agent 等，详见 download_logs）
- 请勿上传含有敏感信息的材料；生产环境务必更换 JWT_SECRET 等密钥

## Roadmap（结合你的初稿）

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

MIT License