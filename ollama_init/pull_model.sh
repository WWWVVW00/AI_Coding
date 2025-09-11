curl -fsSL https://ollama.com/install.sh | sh
ollama serve & 
sleep 5
ollama pull qwen3:32b