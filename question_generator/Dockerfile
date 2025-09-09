FROM python:3.13-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies including build tools for numpy
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install dependencies
COPY requirements.docker.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY scripts/start.sh ./start.sh
COPY .env* ./

# Copy docs directory
COPY docs/ ./docs/

# Make start script executable
RUN chmod +x start.sh

# Create non-root user with home directory
RUN adduser --disabled-password --gecos '' --home /home/appuser appuser

# Create temp directory for task storage (in production, use Redis/DB)
RUN mkdir -p /tmp/question_generator && chown -R appuser:appuser /tmp/question_generator

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check for RESTful API
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application with better production settings
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--access-log"]
