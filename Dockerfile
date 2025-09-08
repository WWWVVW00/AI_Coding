# Frontend Dockerfile (Multi-stage build)
# 开发阶段
FROM node:20-alpine AS development

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 暴露开发服务器端口
EXPOSE 5173

# 开发模式启动命令
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# 构建阶段
FROM node:20-alpine AS build

WORKDIR /app

# 声明一个构建参数，可以由 docker-compose 传入
ARG VITE_API_URL 

# 将构建参数设置为环境变量，这样 Vite 就能读取到它
ENV VITE_API_URL=$VITE_API_URL

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
# RUN npm run build 会自动使用上面 ENV 设置的环境变量
RUN npm run build

# 生产阶段
FROM nginx:alpine AS production

# 复制构建结果到 nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]