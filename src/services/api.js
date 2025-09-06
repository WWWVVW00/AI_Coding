// Mock API 服務 - 使用localStorage模拟数据库
const mockApiCall = (data, success = true, delay = 500) => 
  new Promise(resolve => setTimeout(() => resolve({ success, ...data }), delay));

// 用户数据管理
const getUserData = () => {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  return users;
};

const saveUserData = (users) => {
  localStorage.setItem('users', JSON.stringify(users));
};

const getCurrentUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  const users = getUserData();
  const userId = localStorage.getItem('currentUserId');
  return users.find(user => user.id.toString() === userId);
};

// 课程数据管理
const getUserCourses = (userId) => {
  const courses = JSON.parse(localStorage.getItem('courses') || '[]');
  return courses.filter(course => course.userId === userId);
};

const saveCourse = (course) => {
  const courses = JSON.parse(localStorage.getItem('courses') || '[]');
  courses.push(course);
  localStorage.setItem('courses', JSON.stringify(courses));
};

export const authAPI = {
  getCurrentUser: () => {
    const user = getCurrentUserFromToken();
    if (user) {
      return mockApiCall({ data: user });
    } else {
      return Promise.reject(new Error('用户未登录'));
    }
  },
  
  login: (username, password) => {
    const users = getUserData();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      localStorage.setItem('token', 'fake-token-' + user.id);
      localStorage.setItem('currentUserId', user.id.toString());
      return mockApiCall({ 
        token: 'fake-token-' + user.id, 
        user: { id: user.id, username: user.username, fullName: user.fullName } 
      });
    } else {
      return mockApiCall({ message: '用户名或密码错误' }, false);
    }
  },
  
  register: (username, email, password, fullName) => {
    const users = getUserData();
    
    // 检查用户名是否已存在
    if (users.find(u => u.username === username)) {
      return mockApiCall({ message: '用户名已存在' }, false);
    }
    
    // 检查邮箱是否已存在
    if (users.find(u => u.email === email)) {
      return mockApiCall({ message: '邮箱已被注册' }, false);
    }
    
    // 创建新用户
    const newUser = {
      id: Date.now(),
      username,
      email,
      password,
      fullName,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUserData(users);
    
    return mockApiCall({ message: '註冊成功' });
  },
};

export const coursesAPI = {
  getAll: () => {
    const currentUser = getCurrentUserFromToken();
    if (!currentUser) {
      return mockApiCall({ data: [] });
    }
    
    const userCourses = getUserCourses(currentUser.id);
    return mockApiCall({ data: userCourses });
  },
  
  create: (course) => {
    const currentUser = getCurrentUserFromToken();
    if (!currentUser) {
      return mockApiCall({ message: '用户未登录' }, false);
    }
    
    const newCourse = {
      ...course,
      id: Date.now(),
      userId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    
    saveCourse(newCourse);
    return mockApiCall({ data: newCourse });
  },
};

export const materialsAPI = {
  getAll: () => mockApiCall({ data: [] }),
  upload: (formData) => mockApiCall({ 
    data: { 
      id: Date.now(), 
      name: formData.get('title'), 
      title: formData.get('title'), 
      description: '已上傳文件' 
    } 
  }),
};

export const papersAPI = {
  getAll: () => mockApiCall({ data: [] }),
  generate: (config) => mockApiCall({
    data: {
      id: Date.now(),
      title: '智能生成試卷',
      description: '基於上傳資料生成',
      totalScore: 100,
      duration: 90,
      questions: [
        { 
          question: '第一題是什麼？', 
          type: 'multiple_choice', 
          options: ['A', 'B', 'C', 'D'], 
          answer: 'A', 
          explanation: '因為...', 
          score: 10, 
          difficulty: 'medium' 
        },
        { 
          question: '請簡述...', 
          type: 'short_answer', 
          answer: '簡述內容...', 
          explanation: '因為...', 
          score: 15, 
          difficulty: 'medium' 
        },
      ],
      createdAt: new Date().toISOString(),
    }
  }),
};

