import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, FileText, Share2, Download, Users, MessageCircle, Eye, EyeOff, ChevronRight, BookOpen, Brain, Zap, Globe, Languages, FileDown, List, AlertCircle, CheckCircle, X } from 'lucide-react';
import schoolLogo from './assets/school-logo.svg';
import { coursesAPI, materialsAPI, papersAPI, usersAPI, authAPI, utils } from './services/api';

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
  
  // 数据状态
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 用户状态
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 表单状态
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
  
  // 登录表单状态
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

  // 初始化应用
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 检查是否已登录
      const token = utils.getAuthToken();
      if (token) {
        const userData = await authAPI.getCurrentUser();
        setUser(userData.user);
        setIsAuthenticated(true);
        await loadCourses();
      } else {
        // 未登录时加载公开课程
        await loadPublicCourses();
      }
    } catch (error) {
      console.error('初始化失败:', error);
      // 如果token无效，清除并显示登录
      utils.clearAuthToken();
      setIsAuthenticated(false);
      await loadPublicCourses();
    }
  };

  // 加载课程数据
  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesAPI.getCourses();
      setCourses(response.courses || []);
    } catch (error) {
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // 加载公开课程
  const loadPublicCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesAPI.getCourses({ isOfficial: true });
      setCourses(response.courses || []);
    } catch (error) {
      console.error('加载公开课程失败:', error);
      // 使用默认课程数据作为后备
      setCourses([
        { id: 1, name: '高等数学', code: 'MATH101', papers: 15, materials: 28, isOfficial: true, department: '数学系' },
        { id: 2, name: '线性代数', code: 'MATH102', papers: 12, materials: 22, isOfficial: true, department: '数学系' },
        { id: 3, name: '数据结构', code: 'CS201', papers: 18, materials: 35, isOfficial: true, department: '计算机科学系' },
        { id: 4, name: '操作系统', code: 'CS301', papers: 10, materials: 19, isOfficial: true, department: '计算机科学系' },
        { id: 5, name: '计算机网络', code: 'CS302', papers: 14, materials: 26, isOfficial: true, department: '计算机科学系' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 加载课程资料
  const loadCourseMaterials = async (courseId) => {
    try {
      setLoading(true);
      const response = await materialsAPI.getCourseMaterials(courseId);
      setMaterials(response.materials || []);
    } catch (error) {
      setError(utils.handleApiError(error));
      // 使用模拟数据作为后备
      setMaterials([
        { id: 1, title: '2023年期末试卷', materialType: 'exam', createdAt: '2023-12-01', downloadCount: 245 },
        { id: 2, title: '2022年期末试卷', materialType: 'exam', createdAt: '2022-12-01', downloadCount: 189 },
        { id: 3, title: '第一章重点整理', materialType: 'notes', createdAt: '2023-09-15', downloadCount: 156 },
        { id: 4, title: '课程PPT合集', materialType: 'lecture', createdAt: '2023-09-01', downloadCount: 312 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 用户登录
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await authAPI.login(loginForm);
      
      utils.setAuthToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      setShowLogin(false);
      setSuccess('登录成功！');
      
      // 重新加载数据
      await loadCourses();
      
      // 清除表单
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // 用户注册
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authAPI.register(registerForm);
      
      setSuccess('注册成功！请登录您的账户。');
      setShowRegister(false);
      setShowLogin(true);
      
      // 清除表单
      setRegisterForm({ username: '', email: '', password: '', fullName: '' });
    } catch (error) {
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // 用户登出
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      utils.clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
      setCurrentView('home');
      await loadPublicCourses();
    }
  };

  // 文件上传处理
  const handleFileUpload = async (event) => {
    if (!isAuthenticated) {
      setError('请先登录后再上传文件');
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setLoading(true);
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', selectedCourse.id);
        formData.append('title', file.name.split('.')[0]);
        formData.append('materialType', 'lecture'); // 默认类型
        
        return await materialsAPI.uploadMaterial(formData);
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results.map(r => r.material)]);
      setSuccess(`成功上传 ${files.length} 个文件！`);
      
      // 重新加载课程资料
      if (selectedCourse) {
        await loadCourseMaterials(selectedCourse.id);
      }
    } catch (error) {
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // 添加新课程
  const handleAddCourse = async () => {
    if (!isAuthenticated) {
      setError('请先登录后再添加课程');
      return;
    }

    if (!newCourse.name.trim() || !newCourse.code.trim()) {
      setError('请填写课程名称和课程代码');
      return;
    }

    try {
      setLoading(true);
      const response = await coursesAPI.createCourse({
        ...newCourse,
        name: newCourse.name.trim(),
        code: newCourse.code.trim().toUpperCase(),
        department: newCourse.department.trim(),
        description: newCourse.description.trim()
      });

      setCourses(prev => [...prev, response.course]);
      setNewCourse({ 
        name: '', 
        code: '', 
        department: '', 
        description: '',
        credits: 3,
        semester: 'Fall',
        year: new Date().getFullYear(),
        instructor: ''
      });
      setShowAddCourse(false);
      setSuccess(`课程 "${response.course.name}" 添加成功！`);
    } catch (error) {
      setError(utils.handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // 生成试卷
  const generatePaper = async () => {
    if (!isAuthenticated) {
      setError('请先登录后再生成试卷');
      return;
    }

    if (!selectedCourse) {
      setError('请先选择课程');
      return;
    }

    try {
      setLoading(true);
      const response = await papersAPI.generatePaper({
        courseId: selectedCourse.id,
        title: `${selectedCourse.name} - 综合练习`,
        questionCount: 20,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'short_answer', 'calculation']
      });

      setGeneratedPaper(response.paper);
      setCurrentView('generated');
      setViewMode('all');
      setCurrentQuestionIndex(0);
      setSuccess('试卷生成成功！');
    } catch (error) {
      setError(utils.handleApiError(error));
      // 使用模拟数据作为后备
      const mockPaper = {
        title: `${selectedCourse.name} - 综合练习`,
        questions: [
          {
            id: 1,
            type: '选择题',
            question: '以下哪个选项正确描述了该概念？',
            options: ['A. 选项A', 'B. 选项B', 'C. 选项C', 'D. 选项D'],
            answer: 'C',
            explanation: '这是因为...'
          },
          {
            id: 2,
            type: '计算题',
            question: '计算下列积分：∫(x²+2x+1)dx',
            answer: '(x³/3) + x² + x + C',
            explanation: '使用基本积分公式，逐项积分...'
          },
          {
            id: 3,
            type: '简答题',
            question: '请简述该概念的基本原理和应用场景',
            answer: '基本原理包括...',
            explanation: '这个概念的核心在于...'
          }
        ],
        keyPoints: ['重点1：基础概念理解', '重点2：公式应用', '重点3：综合分析能力']
      };
      setGeneratedPaper(mockPaper);
      setCurrentView('generated');
    } finally {
      setLoading(false);
    }
  };

  // 下载试卷
  const downloadPaper = () => {
    if (!generatedPaper) return;
    
    let content = `${generatedPaper.title}\n\n`;
    
    // 添加重点知识
    if (generatedPaper.keyPoints) {
      content += `重点知识提示:\n`;
      generatedPaper.keyPoints.forEach((point, index) => {
        content += `${index + 1}. ${point}\n`;
      });
      content += '\n';
    }
    
    // 添加题目
    generatedPaper.questions.forEach((question, index) => {
      content += `第${index + 1}题 (${question.type})\n`;
      content += `${question.question}\n`;
      
      if (question.options) {
        question.options.forEach(option => {
          content += `${option}\n`;
        });
      }
      content += '\n';
      
      if (showAnswers) {
        content += `答案: ${question.answer}\n`;
        content += `解析: ${question.explanation}\n`;
      }
      content += '\n---\n\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedPaper.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 清除消息
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // 翻译函数
  const translateText = (text) => {
    if (language === 'en') {
      const translations = {
        '复习小助手': 'Study Assistant',
        '智能学习，高效复习，助你学业有成': 'Smart Learning, Efficient Review, Help You Succeed',
        '海量资料库': 'Massive Resource Library',
        '历年试卷、课程PPT、学习笔记一应俱全': 'Past papers, course PPTs, study notes all available',
        'AI智能生成': 'AI Smart Generation',
        '基于课程内容智能生成个性化练习题': 'Generate personalized exercises based on course content',
        '学习社区': 'Learning Community',
        '分享交流，共同进步的学习平台': 'Share and communicate, a learning platform for common progress',
        '选择课程开始学习': 'Select Course to Start Learning',
        '浏览学习社区': 'Browse Learning Community',
        '登录': 'Login',
        '注册': 'Register',
        '登出': 'Logout'
      };
      return translations[text] || text;
    }
    return text;
  };

  // 课程卡片组件
  const CourseCard = ({ course, onClick }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${
        course.isOfficial ? 'border-blue-500' : 'border-green-500'
      }`}
      onClick={() => onClick(course)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{course.name}</h3>
        {!course.isOfficial && (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
            自定义
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm mb-2">课程代码: {course.code}</p>
      {course.department && (
        <p className="text-gray-500 text-xs mb-3">所属学系: {course.department}</p>
      )}
      {course.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
      )}
      <div className="flex justify-between text-sm text-gray-500">
        <span>历年试卷: {course.paperCount || 0}份</span>
        <span>学习资料: {course.materialCount || 0}份</span>
      </div>
      {!course.isOfficial && course.createdAt && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            创建时间: {utils.formatDate(course.createdAt)}
          </p>
        </div>
      )}
    </div>
  );

  // 资料卡片组件
  const MaterialCard = ({ material }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <div>
            <h4 className="font-medium text-gray-800">{material.title}</h4>
            <p className="text-sm text-gray-500">
              {utils.formatDate(material.createdAt)} • 下载 {material.downloadCount || 0} 次
            </p>
          </div>
        </div>
        <button 
          onClick={() => materialsAPI.downloadMaterial(material.id, material.title)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // 消息提示组件
  const MessageAlert = ({ type, message, onClose }) => (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 ${
      type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 
      'bg-green-100 text-green-800 border border-green-200'
    }`}>
      {type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
      <span>{message}</span>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  // 登录模态框
  const LoginModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">用户登录</h2>
          <button onClick={() => setShowLogin(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
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
              {loading ? '登录中...' : '登录'}
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
            还没有账号？点击注册
          </button>
        </div>
      </div>
    </div>
  );

  // 注册模态框
  const RegisterModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">用户注册</h2>
          <button onClick={() => setShowRegister(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={registerForm.username}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              value={registerForm.fullName}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
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
              {loading ? '注册中...' : '注册'}
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
            已有账号？点击登录
          </button>
        </div>
      </div>
    </div>
  );

  // 主页视图
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* 消息提示 */}
          {error && <MessageAlert type="error" message={error} onClose={clearMessages} />}
          {success && <MessageAlert type="success" message={success} onClose={clearMessages} />}

          {/* 顶部导航 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm"
              >
                <Globe className="h-4 w-4" />
                {language === 'zh' ? 'EN' : '中文'}
              </button>
            </div>
            
            <div className="flex space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">欢迎, {user?.fullName || user?.username}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    {translateText('登出')}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {translateText('登录')}
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    {translateText('注册')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <img src={schoolLogo} alt="School Logo" className="h-12 w-12" />
              {translateText('复习小助手')}
            </h1>
            <p className="text-xl text-gray-600 mb-8">{translateText('智能学习，高效复习，助你学业有成')}</p>
            
            {/* 功能特色 */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <BookOpen className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{translateText('海量资料库')}</h3>
                <p className="text-gray-600">{translateText('历年试卷、课程PPT、学习笔记一应俱全')}</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Zap className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{translateText('AI智能生成')}</h3>
                <p className="text-gray-600">{translateText('基于课程内容智能生成个性化练习题')}</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <Users className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{translateText('学习社区')}</h3>
                <p className="text-gray-600">{translateText('分享交流，共同进步的学习平台')}</p>
              </div>
            </div>
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-center space-x-4 mb-8">
            <button 
              onClick={() => setCurrentView('courses')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              {translateText('选择课程开始学习')} <ChevronRight className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentView('community')}
              className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              {translateText('浏览学习社区')}
            </button>
          </div>
        </div>

        {/* 模态框 */}
        {showLogin && <LoginModal />}
        {showRegister && <RegisterModal />}
      </div>
    );
  }

  // 课程列表视图
  if (currentView === 'courses') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* 消息提示 */}
          {error && <MessageAlert type="error" message={error} onClose={clearMessages} />}
          {success && <MessageAlert type="success" message={success} onClose={clearMessages} />}

          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">选择课程</h1>
              <p className="text-gray-600 mt-2">选择你要复习的课程，开始高效学习</p>
            </div>
            <div className="flex space-x-2">
              {isAuthenticated && (
                <span className="text-gray-700 px-4 py-2">欢迎, {user?.fullName || user?.username}</span>
              )}
              <button 
                onClick={() => setCurrentView('home')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                返回首页
              </button>
            </div>
          </div>

          {/* 搜索 */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="搜索课程..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 添加课程按钮 */}
          {isAuthenticated && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddCourse(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                添加新课程
              </button>
              <p className="text-sm text-gray-600 mt-2">
                找不到您的课程？点击添加新课程，创建属于您的学习资料库
              </p>
            </div>
          )}

          {/* 课程网格 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">加载中...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(course => 
                course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.code.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  onClick={(course) => {
                    setSelectedCourse(course);
                    setCurrentView('materials');
                    loadCourseMaterials(course.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* 搜索结果为空 */}
          {courses.filter(course => 
            course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.code.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && searchQuery && !loading && (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
              <p className="text-lg text-gray-500 mb-2">未找到匹配的课程</p>
              <p className="text-sm text-gray-400 mb-4">试试搜索其他关键词，或者添加新课程</p>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    setShowAddCourse(true);
                    setNewCourse(prev => ({ ...prev, name: searchQuery }));
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  添加 "{searchQuery}" 课程
                </button>
              )}
            </div>
          )}

          {/* 添加课程模态框 */}
          {showAddCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">添加新课程</h2>
                  <button
                    onClick={() => setShowAddCourse(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddCourse(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      课程名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：机器学习导论"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      课程代码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：CS401"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属学系</label>
                    <input
                      type="text"
                      value={newCourse.department}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如：计算机科学系"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">课程描述</label>
                    <textarea
                      value={newCourse.description}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="简单描述这门课程的内容和特点..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddCourse(false)}
                      className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? '添加中...' : '添加课程'}
                    </button>
                  </div>
                </form>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>提示：</strong>添加课程后，您可以为这门课程上传学习资料，生成个性化试卷，并与其他同学分享。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 资料页面视图
  if (currentView === 'materials') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* 消息提示 */}
          {error && <MessageAlert type="error" message={error} onClose={clearMessages} />}
          {success && <MessageAlert type="success" message={success} onClose={clearMessages} />}

          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{selectedCourse?.name} - 学习资料</h1>
              <p className="text-gray-600 mt-2">浏览历年资料或上传新内容生成试卷</p>
              {selectedCourse && !selectedCourse.isOfficial && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">这是您创建的自定义课程！</span> 
                    您可以上传PPT、PDF等学习资料，系统将为您生成个性化的练习题。
                  </p>
                </div>
              )}
            </div>
            <div className="space-x-3">
              <button 
                onClick={() => setCurrentView('courses')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                返回课程
              </button>
              <button 
                onClick={() => setCurrentView('generate')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                生成试卷
              </button>
            </div>
          </div>

          {/* 历年资料 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">历年学习资料</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">加载中...</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">暂无学习资料</h3>
                <p className="text-gray-600 mb-4">
                  {selectedCourse?.isOfficial ? 
                    '该课程暂时没有上传的学习资料。' : 
                    '这是新创建的课程，还没有学习资料。您可以上传PPT、PDF等资料来生成试卷。'
                  }
                </p>
                {isAuthenticated && (
                  <button 
                    onClick={() => setCurrentView('generate')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    立即上传资料
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {materials.map(material => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            )}
          </div>

          {/* 快速操作 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">快速操作</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => setCurrentView('generate')}
                className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6" />
                  <div>
                    <h4 className="font-medium">生成新试卷</h4>
                    <p className="text-sm text-blue-100">上传PPT或使用历年资料</p>
                  </div>
                </div>
              </button>
              <button 
                onClick={() => setCurrentView('community')}
                className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6" />
                  <div>
                    <h4 className="font-medium">浏览社区分享</h4>
                    <p className="text-sm text-green-100">查看其他同学的试卷</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 生成试卷视图
  if (currentView === 'generate') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* 消息提示 */}
            {error && <MessageAlert type="error" message={error} onClose={clearMessages} />}
            {success && <MessageAlert type="success" message={success} onClose={clearMessages} />}

            {/* 头部 */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">生成试卷</h1>
                <p className="text-gray-600 mt-2">上传课程资料，AI将为你生成个性化试卷</p>
              </div>
              <button 
                onClick={() => setCurrentView('materials')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                返回资料
              </button>
            </div>

            {/* 上传区域 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">上传学习资料</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">拖拽文件到此处或点击选择文件</p>
                <p className="text-sm text-gray-500 mb-4">支持 PPT, PDF, DOC 等格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".ppt,.pptx,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  disabled={!isAuthenticated}
                >
                  {isAuthenticated ? '选择文件' : '请先登录'}
                </button>
              </div>

              {/* 已上传文件 */}
              {uploadedFiles.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-800 mb-3">已上传文件：</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span className="text-gray-800">{file.title || file.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {file.fileSize ? utils.formatFileSize(file.fileSize) : '已上传'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 生成设置 */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">试卷难度</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">题目数量</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                    <option value="10">10题</option>
                    <option value="15">15题</option>
                    <option value="20">20题</option>
                  </select>
                </div>
              </div>

              {/* 生成按钮 */}
              <button 
                onClick={generatePaper}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                disabled={!isAuthenticated || loading}
              >
                {loading ? '生成中...' : 
                 !isAuthenticated ? '请先登录' :
                 uploadedFiles.length === 0 ? '请先上传文件或使用历年资料' : '生成试卷'}
              </button>
            </div>

            {/* 使用历年资料 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">或使用历年资料生成</h2>
              {materials.length === 0 ? (
                <p className="text-gray-600 text-center py-8">暂无历年资料可用</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {materials.filter(m => m.materialType === 'lecture').map(material => (
                    <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-800">{material.title}</h4>
                          <p className="text-sm text-gray-500">{utils.formatDate(material.createdAt)}</p>
                        </div>
                        <button 
                          onClick={generatePaper}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                          disabled={!isAuthenticated}
                        >
                          {isAuthenticated ? '使用生成' : '请先登录'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 生成的试卷视图
  if (currentView === 'generated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* 消息提示 */}
            {error && <MessageAlert type="error" message={error} onClose={clearMessages} />}
            {success && <MessageAlert type="success" message={success} onClose={clearMessages} />}

            {/* 头部 */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {generatedPaper?.title || '生成的试卷'}
                </h1>
                <p className="text-gray-600 mt-2">AI生成的个性化试卷</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showAnswers ? '隐藏答案' : '显示答案'}
                </button>
                <button 
                  onClick={() => setViewMode(viewMode === 'all' ? 'single' : 'all')}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  {viewMode === 'all' ? <List className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {viewMode === 'all' ? '逐题查看' : '完整试卷'}
                </button>
                <button 
                  onClick={downloadPaper}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  下载试卷
                </button>
              </div>
            </div>

            {/* 重点知识提示 */}
            {generatedPaper?.keyPoints && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
                <h2 className="text-lg font-bold text-yellow-800 mb-3">重点知识提示</h2>
                <ul className="space-y-2">
                  {generatedPaper.keyPoints.map((point, index) => (
                    <li key={index} className="text-yellow-700 flex items-start space-x-2">
                      <span className="font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 题目显示 */}
            {generatedPaper?.questions && (
              viewMode === 'all' ? (
                <div className="space-y-8">
                  {generatedPaper.questions.map((question, index) => (
                    <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">
                          第{index + 1}题 ({question.type})
                        </h3>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          {question.type}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-gray-800 text-lg mb-4">{question.question}</p>
                        
                        {question.options && (
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="text-gray-700">
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {showAnswers && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-800 mb-2">答案：</h4>
                            <p className="text-green-700 mb-3">{question.answer}</p>
                            <h4 className="font-bold text-green-800 mb-2">解析：</h4>
                            <p className="text-green-700">{question.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // 单题显示模式
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800">
                      第{currentQuestionIndex + 1}题 / {generatedPaper.questions.length} 
                      ({generatedPaper.questions[currentQuestionIndex]?.type})
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="bg-gray-500 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        上一题
                      </button>
                      <button
                        onClick={() => setCurrentQuestionIndex(Math.min(generatedPaper.questions.length - 1, currentQuestionIndex + 1))}
                        disabled={currentQuestionIndex === generatedPaper.questions.length - 1}
                        className="bg-gray-500 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        下一题
                      </button>
                    </div>
                  </div>
                  
                  {generatedPaper.questions[currentQuestionIndex] && (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-800 text-lg mb-4">
                          {generatedPaper.questions[currentQuestionIndex].question}
                        </p>
                        
                        {generatedPaper.questions[currentQuestionIndex].options && (
                          <div className="space-y-2">
                            {generatedPaper.questions[currentQuestionIndex].options.map((option, optIndex) => (
                              <div key={optIndex} className="text-gray-700">
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {showAnswers && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-800 mb-2">答案：</h4>
                            <p className="text-green-700 mb-3">
                              {generatedPaper.questions[currentQuestionIndex].answer}
                            </p>
                            <h4 className="font-bold text-green-800 mb-2">解析：</h4>
                            <p className="text-green-700">
                              {generatedPaper.questions[currentQuestionIndex].explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )}

            {/* 操作按钮 */}
            <div className="mt-8 flex justify-center space-x-4">
              <button 
                onClick={() => setCurrentView('generate')}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                重新生成
              </button>
              <button 
                onClick={downloadPaper}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                下载试卷
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 社区视图
  if (currentView === 'community') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">学习社区</h1>
              <p className="text-gray-600 mt-2">发现其他同学分享的优质试卷和学习资料</p>
            </div>
            <button 
              onClick={() => setCurrentView('home')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              返回首页
            </button>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex space-x-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="搜索试卷、课程或作者..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">
              <option>所有课程</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          {/* 共享试卷 */}
          <div className="grid gap-6">
            {/* 模拟共享试卷数据 */}
            {[
              { id: 1, title: '高等数学综合练习', author: '张同学', course: '高等数学', date: '2024-03-15', likes: 45 },
              { id: 2, title: '数据结构算法专练', author: '李同学', course: '数据结构', date: '2024-03-14', likes: 32 },
              { id: 3, title: '线代矩阵运算题集', author: '王同学', course: '线性代数', date: '2024-03-13', likes: 28 }
            ].map(paper => (
              <div key={paper.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{paper.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span>作者: {paper.author}</span>
                      <span>课程: {paper.course}</span>
                      <span>发布: {paper.date}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        预览
                      </button>
                      <button className="text-green-600 hover:text-green-800 flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        下载
                      </button>
                      <button className="text-purple-600 hover:text-purple-800 flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        讨论
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{paper.likes}</div>
                    <div className="text-sm text-gray-600">赞</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default StudyAssistant;