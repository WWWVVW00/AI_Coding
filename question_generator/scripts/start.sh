#!/bin/bash

# Question Generator RESTful API Startup Script
# This script provides enhanced startup with better error handling and logging

set -e  # Exit on any error

echo "🚀 Starting Question Generator RESTful API..."
echo "📅 Date: $(date)"
echo "🏠 Working Directory: $(pwd)"
echo "👤 User: $(whoami)"

# Check if .env exists and handle it
if [ -f .env ]; then
    echo "📄 Loading .env file..."
    set -a  # automatically export all variables
    source .env
    set +a
elif [ -f .env.example ]; then
    echo "📄 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your OPENAI_API_KEY"
    exit 1
fi

# Environment validation
echo "🔍 Validating environment..."

# Check required environment variables
REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "OPENAI_BASE_URL"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# Check if API key is still template value
if [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ] || [ "$OPENAI_API_KEY" = "your_api_key_here" ]; then
    echo "⚠️  Please set your real OPENAI_API_KEY in .env file"
    exit 1
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "💡 Please set these variables before starting the service:"
    echo "   export OPENAI_API_KEY='your_api_key'"
    echo "   export OPENAI_BASE_URL='your_api_base_url'"
    echo "   export OPENAI_MODEL='your_model_name'"
    exit 1
fi

# Display configuration
echo "✅ Environment validation passed!"
echo "📋 Configuration:"
echo "   API Base URL: ${OPENAI_BASE_URL}"
echo "   Model: ${OPENAI_MODEL:-gpt-3.5-turbo}"
echo "   Port: ${PORT:-8000}"
echo "   Debug Mode: ${DEBUG:-false}"
echo "   Workers: ${WORKERS:-1}"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs uploads

# Check if port is available
PORT=${PORT:-8000}
if command -v lsof >/dev/null 2>&1 && lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use. Attempting to find available port..."
    for try_port in $(seq 8001 8010); do
        if ! lsof -Pi :$try_port -sTCP:LISTEN -t >/dev/null 2>&1; then
            PORT=$try_port
            echo "✅ Using port $PORT instead"
            break
        fi
    done
fi

# Set uvicorn options
UVICORN_OPTS=(
    "--host" "0.0.0.0"
    "--port" "$PORT"
    "--workers" "${WORKERS:-1}"
    "--access-log"
    "--log-level" "${LOG_LEVEL:-info}"
)

# Add reload option for development
if [ "${DEBUG:-false}" = "true" ]; then
    UVICORN_OPTS+=("--reload")
    echo "🔧 Development mode enabled (auto-reload)"
fi

echo "🎯 Starting uvicorn with options: ${UVICORN_OPTS[*]}"
echo "🌐 API will be available at: http://localhost:$PORT"
echo "📚 API Documentation: http://localhost:$PORT/docs"
echo "💓 Health Check: http://localhost:$PORT/health"
echo "📊 Task Management: http://localhost:$PORT/tasks"
echo ""

# Start the application
exec uvicorn app:app "${UVICORN_OPTS[@]}"