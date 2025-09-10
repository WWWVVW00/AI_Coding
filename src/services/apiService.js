// Vite在构建时会把 import.meta.env.VITE_API_URL 替换成一个静态字符串, e.g., '/api'
// 确保这个常量在整个模块中都可用
const API_BASE_URL = import.meta.env.VITE_API_URL;

// 检查环境变量是否被正确加载。如果 VITE_API_URL 未定义，构建应该会失败，
// 但这是一个额外的运行时检查，以防万一。
if (API_BASE_URL === undefined) {
    // 这个错误应该在开发时立即被发现
    throw new Error("VITE_API_URL environment variable is not set. Please check your .env file and Docker configuration.");
}

// 统一的请求函数
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
  }

  // 使用在模块顶部定义的常量
  const apiUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(apiUrl, {
      ...options,
      headers,
    });

    // 如果响应不 OK，立即处理错误
    if (!response.ok) {
      // 尝试解析JSON错误体，这是后端返回错误信息的标准方式
      const errorData = await response.json().catch(() => ({ 
          message: `请求失败，状态码: ${response.status} ${response.statusText}` 
      }));
      
      // 从后端返回的JSON中提取错误信息
      const errorMessage = errorData.message || errorData.error || '发生未知错误';
      throw new Error(errorMessage);
    }

    // 处理 204 No Content 响应
    if (response.status === 204) {
      return null;
    }

    // 解析成功的JSON响应
    return response.json();

  } catch (error) {
    // 重新抛出错误，以便调用者（例如 useAuth hook）可以捕获它
    // 这里的 error.message 将是上面 throw new Error(errorMessage) 中的内容
    console.error(`API call to ${apiUrl} failed:`, error.message);
    throw error;
  }
}

// ==========================================================
// **新增**：专门用于文件下载的函数
// ==========================================================
async function downloadFile(endpoint, filename) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `下载失败，状态码: ${response.status}`,
      }));
      throw new Error(errorData.message || errorData.error || '下载失败');
    }

    // 将响应体转换为 Blob 对象
    const blob = await response.blob();
    
    // 从响应头中尝试获取文件名
    const disposition = response.headers.get('content-disposition');
    let finalFilename = filename;
    if (disposition && disposition.indexOf('attachment') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
            finalFilename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
    }
    
    // 创建一个临时的 URL 指向 Blob 对象
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename; // 设置下载的文件名
    document.body.appendChild(a); // 将a标签添加到页面中
    a.click(); // 模拟点击
    a.remove(); // 下载后移除a标签
    window.URL.revokeObjectURL(url); // 释放内存

  } catch (error) {
    console.error(`File download from ${apiUrl} failed:`, error.message);
    // 向用户显示错误
    alert(`下载失败: ${error.message}`);
    throw error;
  }
}

// ==========================================================
// API 端点定义 (这部分不需要修改)
// ==========================================================

// 认证 API
export const authAPI = {
  login: (credentials) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (userData) => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getCurrentUser: () => apiFetch('/auth/me'),
  verifyToken: () => apiFetch('/auth/verify'),
};

// 课程 API
export const coursesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/courses?${query}`);
  },
  getById: (id) => apiFetch(`/courses/${id}`),
  create: (courseData) => apiFetch('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  }),
  update: (id, courseData) => apiFetch(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  }),
  delete: (id) => apiFetch(`/courses/${id}`, { method: 'DELETE' }),
};

// 学习资料 API
export const materialsAPI = {
  getByCourse: (courseId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiFetch(`/materials/course/${courseId}?${query}`);
  },
  upload: (formData) => apiFetch('/materials/upload', {
    method: 'POST',
    body: formData,
    headers: {} 
  }),
  delete: (id) => apiFetch(`/materials/${id}`, { method: 'DELETE' }),
  download: (id) => downloadFile(`/materials/${id}/download`, `material_${id}.pdf`),
};

// 试卷 API
export const papersAPI = {
  getByCourse: (courseId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiFetch(`/papers?courseId=${courseId}&${query}`);
  },
  generate: (config) => apiFetch('/papers/generate', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  delete: (id) => apiFetch(`/papers/${id}`, { method: 'DELETE' }),
  download: (id, includeAnswers = false) => {
    const endpoint = `/papers/${id}/download?includeAnswers=${includeAnswers}`;
    const filename = `paper_${id}${includeAnswers ? '_answers' : ''}.txt`;
    return downloadFile(endpoint, filename);
  },
};

// 评论 API (示例, 后端需要实现)
export const commentsAPI = {
    getByCourse: (courseId) => apiFetch(`/comments/course/${courseId}`),
    create: (commentData) => apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify(commentData)
    })
}