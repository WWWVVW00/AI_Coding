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
      // 使用 URLSearchParams 来构建所有查询参数
      const searchParams = new URLSearchParams(params);
      // 将 courseId 添加到参数中
      // searchParams.set('courseId', courseId); // 错误！materials 的路由是 /materials/course/:courseId
      const query = searchParams.toString();
      // materials 的路由结构是 /materials/course/:courseId，所以 courseId 在路径中
      // 如果 query 为空，则只返回路径；否则，附加查询字符串
      const endpoint = `/materials/course/${courseId}${query ? `?${query}` : ''}`;
      return apiFetch(endpoint);
  },
  upload: (formData) => apiFetch('/materials/upload', {
    method: 'POST',
    body: formData,
    headers: {} 
  }),
};


// 试卷 API
export const papersAPI = {
  getByCourse: (courseId, params = {}) => {
      // 使用 URLSearchParams 来构建所有查询参数
      const searchParams = new URLSearchParams(params);
      // 将 courseId 添加到参数中
      searchParams.set('courseId', courseId);
      const query = searchParams.toString();
      // papers 的路由结构是 /papers?courseId=...
      const endpoint = `/papers?${query}`;
      return apiFetch(endpoint);
  },
  generate: (config) => apiFetch('/papers/generate', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
};

// 评论 API (示例, 后端需要实现)
export const commentsAPI = {
    getByCourse: (courseId) => apiFetch(`/comments/course/${courseId}`),
    create: (commentData) => apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify(commentData)
    })
}