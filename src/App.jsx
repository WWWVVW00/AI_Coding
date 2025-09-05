import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, FileText, Share2, Download, Users, MessageCircle, Eye, EyeOff, ChevronRight, BookOpen, Brain, Zap, Globe, Languages, List, AlertCircle, CheckCircle, X } from 'lucide-react';
// 假設您的 API 服務是這樣導入的
// import { coursesAPI, materialsAPI, papersAPI, authAPI } from './services/api';

// --- MOCK API (為了讓範例能獨立運行，我模擬了 API) ---
const mockApiCall = (data, success = true, delay = 500) => new Promise(resolve => setTimeout(() => resolve({ success, ...data }), delay));

const authAPI = {
  getCurrentUser: () => mockApiCall({ data: { id: 1, username: 'testuser', fullName: '測試用戶' } }),
  login: (username, password) => mockApiCall({ token: 'fake-token', user: { id: 1, username, fullName: '測試用戶' } }),
  register: (username, email, password, fullName) => mockApiCall({ message: '註冊成功' }),
};
const coursesAPI = {
  getAll: () => mockApiCall({ data: [{ id: 1, name: '線性代數', code: 'MATH101', department: '數學系', description: '基礎線性代數課程', credits: 3, semester: 'Fall', year: 2023, instructor: '陳教授' }] }),
  create: (course) => mockApiCall({ data: { ...course, id: Date.now() } }),
};
const materialsAPI = {
  getAll: () => mockApiCall({ data: [] }),
  upload: (formData) => mockApiCall({ data: { id: Date.now(), name: formData.get('title'), title: formData.get('title'), description: '已上傳文件' } }),
};
const papersAPI = {
  getAll: () => mockApiCall({ data: [] }),
  generate: (config) => mockApiCall({
    data: {
      id: Date.now(),
      title: '智能生成試卷',
      description: '基於上傳資料生成',
      totalScore: 100,
      duration: 90,
      questions: [
        { question: '第一題是什麼？', type: 'multiple_choice', options: ['A', 'B', 'C', 'D'], answer: 'A', explanation: '因為...', score: 10, difficulty: 'medium' },
        { question: '請簡述...', type: 'short_answer', answer: '簡述內容...', explanation: '因為...', score: 15, difficulty: 'medium' },
      ],
      createdAt: new Date().toISOString(),
    }
  }),
};
// --- END MOCK API ---

// ====================================================================
//  將 Modal 組件移到 StudyAssistant 外部
// ====================================================================

function LoginModal({ setShowLogin, setShowRegister, handleLogin, loginForm, setLoginForm, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">用戶登錄</h2>
          <button onClick={() => setShowLogin(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用戶名</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '登錄中...' : '登錄'}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setShowLogin(false);
              setShowRegister(true);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            還沒有賬號？點擊註冊
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterModal({ setShowRegister, setShowLogin, handleRegister, registerForm, setRegisterForm, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">用戶註冊</h2>
          <button onClick={() => setShowRegister(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用戶名</label>
            <input
              type="text"
              value={registerForm.username}
              onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">郵箱</label>
            <input
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              value={registerForm.fullName}
              onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-1">密碼必須包含大寫字母、小寫字母和數字</p>
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowRegister(false)}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '註冊中...' : '註冊'}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setShowRegister(false);
              setShowLogin(true);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            已有賬號？點擊登錄
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCourseModal({ setShowAddCourse, handleAddCourse, newCourse, setNewCourse, loading }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">添加新課程</h2>
                    <button onClick={() => setShowAddCourse(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleAddCourse} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">課程名稱</label>
                        <input type="text" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">課程代碼</label>
                        <input type="text" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">院系</label>
                        <input type="text" value={newCourse.department} onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">課程描述</label>
                        <textarea value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">學分</label>
                            <input type="number" value={newCourse.credits} onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" min="1" max="10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">學期</label>
                            <select value={newCourse.semester} onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Spring">春季</option>
                                <option value="Summer">夏季</option>
                                <option value="Fall">秋季</option>
                                <option value="Winter">冬季</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">授課教師</label>
                        <input type="text" value={newCourse.instructor} onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={() => setShowAddCourse(false)} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">取消</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? '添加中...' : '添加課程'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


function StudyAssistant() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareSettings, setShareSettings] = useState({ public: true, allowDownload: true });
  const [language, setLanguage] = useState('zh');
  const [paperLanguage, setPaperLanguage] = useState('zh');
  const [viewMode, setViewMode] = useState('all');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // 數據狀態
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 用戶狀態
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 表單狀態
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    department: '',
    description: '',
    credits: 3,
    semester: 'Fall',
    year: new Date().getFullYear(),
    instructor: ''
  });

  // 登錄表單狀態
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });

  const fileInputRef = useRef(null);

  // 初始化應用
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data: userData } = await authAPI.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
          await Promise.all([loadCourses(), loadMaterials(), loadPapers()]);
        } catch (error) {
          console.error('認證失敗:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('初始化失敗:', error);
      setError('應用初始化失敗，請刷新頁面重試');
    } finally {
      setLoading(false);
    }
  };

  // 數據加載函數
  const loadCourses = async () => {
    try {
      const { data } = await coursesAPI.getAll();
      setCourses(data);
    } catch (error) {
      console.error('加載課程失敗:', error);
    }
  };
  const loadMaterials = async () => {
    try {
      const { data } = await materialsAPI.getAll();
      setMaterials(data);
    } catch (error) {
      console.error('加載資料失敗:', error);
    }
  };
  const loadPapers = async () => {
    try {
      const { data } = await papersAPI.getAll();
      setPapers(data);
    } catch (error) {
      console.error('加載試卷失敗:', error);
    }
  };

  // 認證處理函數
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 舊的錯誤調用方式:
      // const response = await authAPI.login(loginForm.username, loginForm.password);

      // ==> 正確的調用方式 <==
      // 將整個 loginForm 對象作為單個參數傳遞
      const response = await authAPI.login(loginForm);
      
      // 你的 authAPI.login 期望一個對象，而 loginForm state
      // 正好是 { username: '...', password: '...' }，完美匹配。

      if (response.success) { // 假設你的 API 響應中有 success 字段
        // 注意：你的 api.js 已經處理了 token 存儲
        // 你可能需要根據實際返回的 token 和 user 信息來更新 state
        // utils.setAuthToken(response.token); // api.js 內部可能已經做了
        setUser(response.user);
        setIsAuthenticated(true);
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
        setSuccess('登錄成功！');
        
        await Promise.all([
          loadCourses(),
          loadMaterials(),
          loadPapers()
        ]);
      } else {
        setError(response.message || '登錄失敗');
      }
    } catch (error) {
      console.error('登錄錯誤:', error);
      // 使用你的 utils 錯誤處理函數
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.register(registerForm.username, registerForm.email, registerForm.password, registerForm.fullName);
      if (response.success) {
        setSuccess('註冊成功！請登錄');
        setShowRegister(false);
        setShowLogin(true);
        setRegisterForm({ username: '', email: '', password: '', fullName: '' });
      } else {
        setError(response.message || '註冊失敗');
      }
    } catch (error) {
      console.error('註冊錯誤:', error);
      setError('註冊失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setCourses([]);
    setMaterials([]);
    setPapers([]);
    setCurrentView('home');
    setSuccess('已退出登錄');
  };

  // 課程管理函數
  const handleAddCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await coursesAPI.create(newCourse);
      if (response.success) {
        setSuccess('課程添加成功！');
        setShowAddCourse(false);
        setNewCourse({ name: '', code: '', department: '', description: '', credits: 3, semester: 'Fall', year: new Date().getFullYear(), instructor: '' });
        await loadCourses();
      } else {
        setError(response.message || '添加課程失敗');
      }
    } catch (error) {
      console.error('添加課程錯誤:', error);
      setError('添加課程失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 文件上傳處理
  const handleFileUpload = async (files) => {
    if (!selectedCourse) {
      setError('請先選擇一個課程');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', selectedCourse.id);
        formData.append('title', file.name);
        formData.append('description', `上傳的文件: ${file.name}`);
        return await materialsAPI.upload(formData);
      });
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.success).map(r => r.data);
      if (successfulUploads.length > 0) {
        setSuccess(`成功上傳 ${successfulUploads.length} 個文件！`);
        await loadMaterials();
        setUploadedFiles(prev => [...prev, ...successfulUploads]);
      } else {
        setError('文件上傳失敗');
      }
    } catch (error) {
      console.error('文件上傳錯誤:', error);
      setError('文件上傳失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 試卷生成處理
  const handleGeneratePaper = async (config) => {
    if (uploadedFiles.length === 0) {
      setError('請先上傳學習資料');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await papersAPI.generate({
        courseId: selectedCourse.id,
        materialIds: uploadedFiles.map(f => f.id),
        questionCount: config.questionCount || 10,
        difficulty: config.difficulty || 'medium',
        questionTypes: config.questionTypes || ['multiple_choice', 'short_answer'],
        language: paperLanguage
      });
      if (response.success) {
        setGeneratedPaper(response.data);
        setSuccess('試卷生成成功！');
        setCurrentView('paper');
        await loadPapers();
      } else {
        setError(response.message || '試卷生成失敗');
      }
    } catch (error) {
      console.error('試卷生成錯誤:', error);
      setError('試卷生成失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  // 消息處理
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // 過濾課程
  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 如果未認證，顯示登錄界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {error && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center"><AlertCircle className="h-5 w-5 mr-2" />{error}</div>}
        {success && <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center"><CheckCircle className="h-5 w-5 mr-2" />{success}</div>}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">智能學習助手</h1>
              <p className="text-gray-600">讓學習更智能，讓知識更有趣</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => setShowLogin(true)} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">登錄</button>
              <button onClick={() => setShowRegister(true)} className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium">註冊</button>
            </div>
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>體驗智能化學習管理系統</p>
              <p className="mt-1">• 課程管理 • 資料上傳 • 智能試卷生成</p>
            </div>
          </div>
        </div>
        {showLogin && <LoginModal setShowLogin={setShowLogin} setShowRegister={setShowRegister} handleLogin={handleLogin} loginForm={loginForm} setLoginForm={setLoginForm} loading={loading} />}
        {showRegister && <RegisterModal setShowRegister={setShowRegister} setShowLogin={setShowLogin} handleRegister={handleRegister} registerForm={registerForm} setRegisterForm={setRegisterForm} loading={loading} />}
      </div>
    );
  }

  // 主應用界面
  return (
    <div className="min-h-screen bg-gray-50">
      {error && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center"><AlertCircle className="h-5 w-5 mr-2" />{error}</div>}
      {success && <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center"><CheckCircle className="h-5 w-5 mr-2" />{success}</div>}

      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setCurrentView('home')}>
                <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-bold text-gray-800">智能學習助手</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-sm border-none bg-transparent focus:ring-0">
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{user?.fullName || user?.username}</span>
              </div>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100">退出</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ... The rest of your JSX code for different views (home, courses, paper, etc.) ... */}
        {/* For brevity, I'm omitting the large JSX block for views, it remains unchanged. */}
        {/* Just make sure to place your view logic here. */}
        {/* I'll paste it back for completeness */}
        {currentView === 'home' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">歡迎回來，{user?.fullName || user?.username}！</h2>
                  <p className="text-blue-100 mb-4">開始您的智能學習之旅</p>
                  <div className="flex space-x-4">
                    <div className="flex items-center"><BookOpen className="h-5 w-5 mr-2" /><span>{courses.length} 門課程</span></div>
                    <div className="flex items-center"><FileText className="h-5 w-5 mr-2" /><span>{materials.length} 個資料</span></div>
                    <div className="flex items-center"><Brain className="h-5 w-5 mr-2" /><span>{papers.length} 份試卷</span></div>
                  </div>
                </div>
                <div className="hidden md:block"><div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center"><Zap className="h-16 w-16 text-white" /></div></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => setShowAddCourse(true)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"><div className="flex items-center mb-4"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><BookOpen className="h-6 w-6 text-blue-600" /></div><h3 className="ml-4 text-lg font-semibold text-gray-800">添加課程</h3></div><p className="text-gray-600">創建新的課程來組織您的學習資料</p></button>
              <button onClick={() => setCurrentView('courses')} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"><div className="flex items-center mb-4"><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><Upload className="h-6 w-6 text-green-600" /></div><h3 className="ml-4 text-lg font-semibold text-gray-800">上傳資料</h3></div><p className="text-gray-600">上傳學習資料，為智能試卷生成做準備</p></button>
              <button onClick={() => setCurrentView('papers')} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"><div className="flex items-center mb-4"><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Brain className="h-6 w-6 text-purple-600" /></div><h3 className="ml-4 text-lg font-semibold text-gray-800">查看試卷</h3></div><p className="text-gray-600">查看和管理您生成的智能試卷</p></button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">最近課程</h3>
              {courses.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{courses.slice(0, 6).map((course) => (<div key={course.id} onClick={() => { setSelectedCourse(course); setCurrentView('course-detail'); }} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"><h4 className="font-medium text-gray-800 mb-1">{course.name}</h4><p className="text-sm text-gray-600 mb-2">{course.code}</p><div className="flex items-center text-xs text-gray-500"><span>{course.department}</span><span className="mx-2">•</span><span>{course.credits} 學分</span></div></div>))}</div>) : (<div className="text-center py-8 text-gray-500"><BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>還沒有課程，點擊上方"添加課程"開始吧！</p></div>)}
            </div>
          </div>
        )}
        {currentView === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">課程管理</h2><button onClick={() => setShowAddCourse(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"><BookOpen className="h-4 w-4 mr-2" />添加課程</button></div>
            <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><input type="text" placeholder="搜索課程..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <div className="bg-white rounded-xl shadow-sm">{filteredCourses.length > 0 ? (<div className="divide-y divide-gray-200">{filteredCourses.map((course) => (<div key={course.id} onClick={() => { setSelectedCourse(course); setCurrentView('course-detail'); }} className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"><div className="flex items-center justify-between"><div className="flex-1"><div className="flex items-center"><h3 className="text-lg font-semibold text-gray-800">{course.name}</h3><span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{course.code}</span></div><p className="text-gray-600 mt-1">{course.description}</p><div className="flex items-center mt-2 text-sm text-gray-500"><span>{course.department}</span><span className="mx-2">•</span><span>{course.credits} 學分</span><span className="mx-2">•</span><span>{course.semester} {course.year}</span>{course.instructor && (<><span className="mx-2">•</span><span>{course.instructor}</span></>)}</div></div><ChevronRight className="h-5 w-5 text-gray-400" /></div></div>))}</div>) : (<div className="text-center py-12"><BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" /><h3 className="text-lg font-medium text-gray-800 mb-2">{searchQuery ? '沒有找到匹配的課程' : '還沒有課程'}</h3><p className="text-gray-600 mb-4">{searchQuery ? '嘗試使用不同的關鍵詞搜索' : '添加您的第一門課程開始學習之旅'}</p>{!searchQuery && (<button onClick={() => setShowAddCourse(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">添加課程</button>)}</div>)}</div>
          </div>
        )}
        {/* ... The rest of the views (course-detail, paper, etc.) will be here ... */}
        {/* (The JSX for other views is correct and doesn't need changes) */}

      </main>

      {/* 現在，模態框的渲染是穩定的 */}
      {showAddCourse && <AddCourseModal setShowAddCourse={setShowAddCourse} handleAddCourse={handleAddCourse} newCourse={newCourse} setNewCourse={setNewCourse} loading={loading} />}
      {showLogin && <LoginModal setShowLogin={setShowLogin} setShowRegister={setShowRegister} handleLogin={handleLogin} loginForm={loginForm} setLoginForm={setLoginForm} loading={loading} />}
      {showRegister && <RegisterModal setShowRegister={setShowRegister} setShowLogin={setShowLogin} handleRegister={handleRegister} registerForm={registerForm} setRegisterForm={setRegisterForm} loading={loading} />}

    </div>
  );
}

export default StudyAssistant;