# Question Generator Service

## 项目简介

这是一个基于 OpenAI API 的题目生成服务，能够根据上传的教材 PDF 文件自动生成考试题目和答案。

## 快速开始

### 安装依赖

确保已安装 Python 3.8+，然后运行以下命令安装依赖：

```bash
pip install -r requirements.txt
```

### 配置环境变量

在 `.env` 文件中配置 OpenAI API 密钥和其他参数：

```plaintext
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

### 启动服务

运行以下命令启动服务：

```bash
python app.py
```

服务默认运行在 `http://127.0.0.1:5001`。

## API 接口

### 生成题目接口

- **URL**: `/generate_questions`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **参数**:
  - `textbook_pdf`: 上传的教材 PDF 文件。

### 响应示例

成功时返回生成的题目列表：

```json
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "answer": "Paris"
    }
  ]
}
```

## 示例

使用 `curl` 调用接口：

```bash
curl -X POST http://127.0.0.1:5001/generate_questions \
  -F "textbook_pdf=@/path/to/your/file.pdf"
```

## 依赖项

- `Flask`
- `python-dotenv`
- `openai`
- `PyPDF2`