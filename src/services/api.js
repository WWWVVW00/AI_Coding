// API服务层 - 处理所有后端API调用

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// API请求工具函数
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // 获取认证令牌
  getToken() {
    return this.token || localStorage.getItem('auth_token');
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 添加认证头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 如果是FormData，删除Content-Type让浏览器自动设置
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // 处理认证失败
      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/login';
        throw new Error('认证失败，请重新登录');
      }

      // 处理其他HTTP错误
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // 处理空响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API请求失败 [${options.method || 'GET'}] ${endpoint}:`, error);
      throw error;
    }
  }

  // GET请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // 文件下载
  async download(endpoint, filename) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 认证相关API
export const authAPI = {
  // 用户注册
  register: (userData) => apiService.post('/auth/register', userData),
  
  // 用户登录
  login: (credentials) => apiService.post('/auth/login', credentials),
  
  // 刷新令牌
  refresh: () => apiService.post('/auth/refresh'),
  
  // 用户登出
  logout: () => apiService.post('/auth/logout'),
  
  // 获取当前用户信息
  getCurrentUser: () => apiService.get('/auth/me'),
};

// 课程相关API
export const coursesAPI = {
  // 获取课程列表
  getCourses: (params = {}) => apiService.get('/courses', params),
  
  // 获取课程详情
  getCourse: (id) => apiService.get(`/courses/${id}`),
  
  // 创建新课程
  createCourse: (courseData) => apiService.post('/courses', courseData),
  
  // 更新课程
  updateCourse: (id, courseData) => apiService.put(`/courses/${id}`, courseData),
  
  // 删除课程
  deleteCourse: (id) => apiService.delete(`/courses/${id}`),
  
  // 搜索课程
  searchCourses: (query) => apiService.get('/courses/search', { q: query }),
};

// 资料相关API
export const materialsAPI = {
  // 获取资料列表
  getMaterials: (params = {}) => apiService.get('/materials', params),
  
  // 获取资料详情
  getMaterial: (id) => apiService.get(`/materials/${id}`),
  
  // 上传资料
  uploadMaterial: (formData) => apiService.post('/materials', formData),
  
  // 更新资料信息
  updateMaterial: (id, materialData) => apiService.put(`/materials/${id}`, materialData),
  
  // 删除资料
  deleteMaterial: (id) => apiService.delete(`/materials/${id}`),
  
  // 下载资料
  downloadMaterial: (id, filename) => apiService.download(`/materials/${id}/download`, filename),
  
  // 获取课程资料
  getCourseMaterials: (courseId, params = {}) => 
    apiService.get('/materials', { courseId, ...params }),
};

// 试卷相关API
export const papersAPI = {
  // 获取试卷列表
  getPapers: (params = {}) => apiService.get('/papers', params),
  
  // 获取试卷详情
  getPaper: (id) => apiService.get(`/papers/${id}`),
  
  // 生成试卷
  generatePaper: (paperData) => apiService.post('/papers/generate', paperData),
  
  // 更新试卷
  updatePaper: (id, paperData) => apiService.put(`/papers/${id}`, paperData),
  
  // 删除试卷
  deletePaper: (id) => apiService.delete(`/papers/${id}`),
  
  // 下载试卷
  downloadPaper: (id, filename) => apiService.download(`/papers/${id}/download`, filename),
  
  // 获取课程试卷
  getCoursePapers: (courseId, params = {}) => 
    apiService.get('/papers', { courseId, ...params }),
};

// 用户相关API
export const usersAPI = {
  // 获取学习进度
  getProgress: () => apiService.get('/users/progress'),
  
  // 更新学习进度
  updateProgress: (courseId, progressData) => 
    apiService.put(`/users/progress/${courseId}`, progressData),
  
  // 获取收藏列表
  getFavorites: (params = {}) => apiService.get('/users/favorites', params),
  
  // 添加/移除收藏
  toggleFavorite: (itemType, itemId) => 
    apiService.post('/users/favorites', { itemType, itemId }),
  
  // 提交评分
  submitRating: (ratingData) => apiService.post('/users/ratings', ratingData),
  
  // 获取评分记录
  getRatings: (params = {}) => apiService.get('/users/ratings', params),
  
  // 获取用户统计
  getStats: () => apiService.get('/users/stats'),
  
  // 获取排行榜
  getLeaderboard: (type = 'study_time', limit = 10) => 
    apiService.get('/users/leaderboard', { type, limit }),
};

// 统计相关API
export const statsAPI = {
  // 获取系统总览
  getOverview: () => apiService.get('/stats/overview'),
  
  // 获取用户活动统计
  getUserActivity: (period = '7d') => apiService.get('/stats/user-activity', { period }),
  
  // 获取课程统计
  getCourseStats: (courseId, period = '30d') => 
    apiService.get(`/stats/course/${courseId}`, { period }),
  
  // 获取下载统计
  getDownloadStats: (params = {}) => apiService.get('/stats/downloads', params),
  
  // 获取评分统计
  getRatingStats: (params = {}) => apiService.get('/stats/ratings', params),
  
  // 获取实时统计
  getRealtimeStats: () => apiService.get('/stats/realtime'),
};

// 工具函数
export const utils = {
  // 设置认证令牌
  setAuthToken: (token) => apiService.setToken(token),
  
  // 获取认证令牌
  getAuthToken: () => apiService.getToken(),
  
  // 清除认证令牌
  clearAuthToken: () => apiService.setToken(null),
  
  // 检查是否已登录
  isAuthenticated: () => !!apiService.getToken(),
  
  // 格式化文件大小
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // 格式化日期
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // 处理API错误
  handleApiError: (error) => {
    console.error('API错误:', error);
    
    if (error.message.includes('网络')) {
      return '网络连接失败，请检查网络设置';
    } else if (error.message.includes('401')) {
      return '认证失败，请重新登录';
    } else if (error.message.includes('403')) {
      return '权限不足，无法执行此操作';
    } else if (error.message.includes('404')) {
      return '请求的资源不存在';
    } else if (error.message.includes('500')) {
      return '服务器内部错误，请稍后重试';
    } else {
      return error.message || '操作失败，请稍后重试';
    }
  }
};

// 默认导出API服务实例
export default apiService;