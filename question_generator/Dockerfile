FROM python:3.13-slim

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 复制并安装Python依赖
COPY requirements.docker.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用文件
COPY app.py .
# --- 以下是被注释掉或删除的行 ---
# COPY scripts/start.sh ./start.sh  <-- 如果您没有这个文件，也注释掉
# COPY .env* ./                     <-- 这行最好也注释掉，环境变量应该由docker-compose注入

# --- 注释掉不存在的文件夹复制命令 ---
# COPY tests/ ./tests/
# COPY examples/ ./examples/
# COPY docs/ ./docs/

# --- 如果您有 start.sh 脚本，可以保留这两行 ---
# COPY scripts/start.sh ./start.sh
# RUN chmod +x start.sh

# 创建非 root 用户
RUN adduser --disabled-password --gecos '' --home /home/appuser appuser
RUN chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]