// AI API 测试工具 JavaScript

// AI 提供商配置
const AI_CONFIGS = {
    openai: {
        name: "OpenAI",
        models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"],
        defaultBaseUrl: "https://api.openai.com/v1",
        requiresBaseUrl: false,
        apiFormat: "openai_compatible"
    },
    claude: {
        name: "Anthropic Claude",
        models: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229", "claude-3-5-sonnet-20241022"],
        defaultBaseUrl: "https://api.anthropic.com/v1",
        requiresBaseUrl: false,
        apiFormat: "claude"
    },
    google: {
        name: "Google Gemini",
        models: ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash"],
        defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        requiresBaseUrl: false,
        apiFormat: "google"
    }
};

// 当前配置
let currentConfig = {
    type: "openai_compatible",
    config: {
        api_key: "",
        model_name: "gpt-3.5-turbo",
        base_url: "",
        temperature: 0.7,
        max_tokens: 1000
    }
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    updateConfigFields();
    updateConfigDisplay();
});

// 更新配置字段
function updateConfigFields() {
    const provider = document.getElementById('aiProvider').value;
    const config = AI_CONFIGS[provider];
    
    // 更新模型选项
    const modelSelect = document.getElementById('modelName');
    modelSelect.innerHTML = '';
    config.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    
    // 更新 Base URL
    const baseUrlInput = document.getElementById('baseUrl');
    baseUrlInput.placeholder = config.defaultBaseUrl;
    
    // 显示/隐藏 Base URL 字段
    const baseUrlGroup = document.getElementById('baseUrlGroup');
    if (config.requiresBaseUrl) {
        baseUrlGroup.style.display = 'block';
        baseUrlInput.required = true;
    } else {
        baseUrlGroup.style.display = 'block'; // 保持显示，但不是必需的
        baseUrlInput.required = false;
    }
    
    // 更新当前配置
    updateCurrentConfig();
}

// 更新当前配置
function updateCurrentConfig() {
    const provider = document.getElementById('aiProvider').value;
    const config = AI_CONFIGS[provider];
    
    currentConfig = {
        type: config.apiFormat,
        config: {
            api_key: document.getElementById('apiKey').value || "<YOUR_API_KEY>",
            model_name: document.getElementById('modelName').value,
            base_url: document.getElementById('baseUrl').value || config.defaultBaseUrl,
            temperature: parseFloat(document.getElementById('temperature').value),
            max_tokens: parseInt(document.getElementById('maxTokens').value)
        }
    };
    
    updateConfigDisplay();
}

// 更新配置显示
function updateConfigDisplay() {
    const configDisplay = document.getElementById('configDisplay');
    const provider = document.getElementById('aiProvider').value;
    const providerName = AI_CONFIGS[provider].name;
    
    configDisplay.textContent = `// ${providerName} 配置
{
    "${providerName.toLowerCase()}": ${JSON.stringify(currentConfig, null, 4)}
}`;
}

// 监听配置变化
document.getElementById('apiKey').addEventListener('input', updateCurrentConfig);
document.getElementById('modelName').addEventListener('change', updateCurrentConfig);
document.getElementById('baseUrl').addEventListener('input', updateCurrentConfig);
document.getElementById('temperature').addEventListener('input', updateCurrentConfig);
document.getElementById('maxTokens').addEventListener('input', updateCurrentConfig);

// 测试 API
async function testAPI() {
    const apiKey = document.getElementById('apiKey').value;
    const prompt = document.getElementById('prompt').value;
    const provider = document.getElementById('aiProvider').value;
    
    if (!apiKey) {
        showError('请输入 API Key');
        return;
    }
    
    if (!prompt.trim()) {
        showError('请输入测试提示词');
        return;
    }
    
    // 显示加载状态
    showLoading(true);
    updateCurrentConfig();
    
    try {
        let response;
        
        switch (provider) {
            case 'openai':
                response = await testOpenAI(prompt);
                break;
            case 'claude':
                response = await testClaude(prompt);
                break;
            case 'google':
                response = await testGoogle(prompt);
                break;
            default:
                throw new Error('不支持的 AI 提供商');
        }
        
        showResponse(response);
        
    } catch (error) {
        showError(`API 调用失败: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// 测试 OpenAI API
async function testOpenAI(prompt) {
    const baseUrl = document.getElementById('baseUrl').value || AI_CONFIGS.openai.defaultBaseUrl;
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('modelName').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('maxTokens').value);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: temperature,
            max_tokens: maxTokens
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
        provider: 'OpenAI',
        model: model,
        content: data.choices[0].message.content,
        usage: data.usage,
        raw: data
    };
}

// 测试 Claude API
async function testClaude(prompt) {
    const baseUrl = document.getElementById('baseUrl').value || AI_CONFIGS.claude.defaultBaseUrl;
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('modelName').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('maxTokens').value);
    
    const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: maxTokens,
            temperature: temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
        provider: 'Claude',
        model: model,
        content: data.content[0].text,
        usage: data.usage,
        raw: data
    };
}

// 测试 Google Gemini API
async function testGoogle(prompt) {
    const baseUrl = document.getElementById('baseUrl').value || AI_CONFIGS.google.defaultBaseUrl;
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('modelName').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('maxTokens').value);
    
    const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokens
            }
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return {
        provider: 'Google Gemini',
        model: model,
        content: data.candidates[0].content.parts[0].text,
        usage: data.usageMetadata,
        raw: data
    };
}

// 显示响应
function showResponse(response) {
    const responseArea = document.getElementById('response');
    
    const formattedResponse = `✅ API 调用成功!

🤖 提供商: ${response.provider}
📋 模型: ${response.model}
⏱️ 时间: ${new Date().toLocaleString()}

📝 响应内容:
${response.content}

📊 使用统计:
${JSON.stringify(response.usage, null, 2)}

🔍 完整响应 (JSON):
${JSON.stringify(response.raw, null, 2)}`;
    
    responseArea.textContent = formattedResponse;
    responseArea.style.color = '#059669';
}

// 显示错误
function showError(message) {
    const responseArea = document.getElementById('response');
    responseArea.textContent = `❌ 错误: ${message}`;
    responseArea.style.color = '#dc2626';
}

// 显示加载状态
function showLoading(show) {
    const loading = document.getElementById('loading');
    const testBtn = document.getElementById('testBtn');
    
    if (show) {
        loading.classList.add('show');
        testBtn.disabled = true;
        testBtn.textContent = '⏳ 调用中...';
    } else {
        loading.classList.remove('show');
        testBtn.disabled = false;
        testBtn.textContent = '🚀 测试 API';
    }
}

// 导出配置
function exportConfig() {
    updateCurrentConfig();
    const configStr = JSON.stringify(currentConfig, null, 2);
    
    // 创建下载链接
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 添加导出按钮事件（如果需要的话）
// document.getElementById('exportBtn').addEventListener('click', exportConfig);