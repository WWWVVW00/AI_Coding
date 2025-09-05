// Mock API 服務
const mockApiCall = (data, success = true, delay = 500) => 
  new Promise(resolve => setTimeout(() => resolve({ success, ...data }), delay));

export const authAPI = {
  getCurrentUser: () => mockApiCall({ data: { id: 1, username: 'testuser', fullName: '測試用戶' } }),
  login: (username, password) => mockApiCall({ token: 'fake-token', user: { id: 1, username, fullName: '測試用戶' } }),
  register: (username, email, password, fullName) => mockApiCall({ message: '註冊成功' }),
};

export const coursesAPI = {
  getAll: () => mockApiCall({ 
    data: [{ 
      id: 1, 
      name: '線性代數', 
      code: 'MATH101', 
      department: '數學系', 
      description: '基礎線性代數課程', 
      credits: 3, 
      semester: 'Fall', 
      year: 2023, 
      instructor: '陳教授' 
    }] 
  }),
  create: (course) => mockApiCall({ data: { ...course, id: Date.now() } }),
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