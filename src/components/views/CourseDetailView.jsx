import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Calendar, User, Hash, GraduationCap, Upload, FileText, Brain, MessageCircle, Star, Download } from 'lucide-react';
import PaperGenerationStatus from '../common/PaperGenerationStatus';

function CourseDetailView({ course, setCurrentView }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [sharedPapers, setSharedPapers] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // 试卷生成相关状态
  const [generatingPaper, setGeneratingPaper] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [paperForm, setPaperForm] = useState({
    title: '',
    description: '',
    totalQuestions: 5,
    difficultyLevel: 'medium',
    estimatedTime: 30,
    language: 'zh',
    isPublic: true
  });
  const [generationStatus, setGenerationStatus] = useState(null);
  const [currentGeneratingPaper, setCurrentGeneratingPaper] = useState(null);

  // 认证相关辅助函数
  const createTestToken = () => {
    // 创建一个简单的测试token
    const testUser = {
      id: 1,
      username: 'testuser',
      fullName: 'Test User' // 使用英文避免btoa编码问题
    };
    
    try {
      // 在浏览器中，btoa不能直接处理中文，所以我们使用英文
      const token = 'test-token-' + btoa(JSON.stringify(testUser));
      localStorage.setItem('token', token);
      console.log('✅ 创建测试token成功');
      return token;
    } catch (error) {
      console.error('❌ 创建token失败:', error);
      // 如果btoa失败，使用简单的备用token
      const backupToken = 'test-token-backup-' + Date.now();
      localStorage.setItem('token', backupToken);
      return backupToken;
    }
  };

  // 确保有token的函数
  const ensureAuthenticated = () => {
    let token = localStorage.getItem('token');
    
    // 检查是否是旧的无效token，如果是则清除
    if (token && (token.startsWith('fake-token-') || !token.startsWith('test-token-'))) {
      console.log('🔄 检测到旧token，清除并创建新的测试token');
      localStorage.removeItem('token');
      token = null;
    }
    
    if (!token) {
      console.log('🔐 没有找到有效token，创建测试token');
      token = createTestToken();
    }
    
    console.log('🎯 使用token:', token.substring(0, 30) + '...');
    return token;
  };

  // 加载课程相关数据
  useEffect(() => {
    if (course) {
      loadCourseData();
    }
  }, [course]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      // 调用正确的API端点
      const [materialsRes, papersRes, commentsRes] = await Promise.all([
        fetch(`/api/materials/course/${course.id}`),
        fetch(`/api/papers?courseId=${course.id}`),
        fetch(`/api/courses/${course.id}/comments`) // 这个端点需要后端实现
      ]);

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        console.log('Materials data:', materialsData);
        setMaterials(materialsData.materials || []);
      } else {
        console.warn('获取学习资料失败:', materialsRes.status);
        setMaterials([]);
      }

      if (papersRes.ok) {
        const papersData = await papersRes.json();
        console.log('Papers data:', papersData);
        setSharedPapers(papersData.papers || []);
      } else {
        console.warn('获取试卷失败:', papersRes.status);
        setSharedPapers([]);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        console.log('Comments data:', commentsData);
        setComments(commentsData.data || []);
      } else {
        console.warn('获取评论失败:', commentsRes.status);
        setComments([]);
      }
    } catch (error) {
      console.error('加载课程数据失败:', error);
      // 即使API调用失败，也要设置空数组，避免undefined
      setMaterials([]);
      setSharedPapers([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log('📋 文件上传检查:');
    console.log('- course对象:', course);
    console.log('- course.id:', course?.id);

    if (!course || !course.id) {
      alert('错误：课程信息不完整，请刷新页面重试');
      return;
    }

    setLoading(true);
    try {
      // 确保有认证token
      const token = ensureAuthenticated();
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('courseId', course.id);

      console.log('🔐 上传文件使用token:', token.substring(0, 20) + '...');
      console.log('📤 formData courseId:', course.id);

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 文件上传成功:', result);
        await loadCourseData(); // 重新加载数据
        event.target.value = ''; // 清空文件选择
      } else {
        const errorData = await response.json();
        console.error('❌ 文件上传失败:', response.status, errorData);
        alert(`文件上传失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('文件上传错误:', error);
      alert('文件上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaper = async () => {
    console.log('🎯 按钮被点击！');
    console.log('选中的资料:', selectedMaterials);
    console.log('试卷表单:', paperForm);
    console.log('当前generatingPaper状态:', generatingPaper);
    
    if (selectedMaterials.length === 0) {
      console.log('❌ 没有选中资料');
      alert('请选择至少一个学习资料');
      return;
    }

    if (!paperForm.title.trim()) {
      console.log('❌ 标题为空');
      alert('请输入试卷标题');
      return;
    }

    // 确保用户已认证
    const token = ensureAuthenticated();

    console.log('🔄 设置generatingPaper = true');
    setGeneratingPaper(true);
    console.log('🔄 设置生成状态');
    setGenerationStatus({ status: 'starting', message: '正在提交生成任务...' });
    
    try {
      console.log('🌐 开始发送API请求...');
      const response = await fetch('/api/papers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: course.id,
          title: paperForm.title,
          description: paperForm.description,
          difficultyLevel: paperForm.difficultyLevel,
          totalQuestions: parseInt(paperForm.totalQuestions),
          estimatedTime: parseInt(paperForm.estimatedTime),
          language: paperForm.language,
          isPublic: paperForm.isPublic,
          sourceMaterials: selectedMaterials
        })
      });

      console.log('📡 API响应状态:', response.status);
      const data = await response.json();
      console.log('📦 API响应数据:', data);

      if (response.ok) {
        console.log('✅ API请求成功');
        console.log('📋 试卷数据:', data.paper);
        console.log('🔑 AI任务ID:', data.paper.aiTaskId);
        
        setCurrentGeneratingPaper(data.paper);
        setGenerationStatus({ 
          status: 'processing', 
          message: data.message,
          paperId: data.paper.id 
        });
        
        // 如果有AI任务ID，开始轮询状态
        if (data.paper.aiTaskId) {
          console.log('🔄 开始轮询AI生成状态...');
          pollGenerationStatus(data.paper.id);
        } else {
          console.log('⚠️ 没有AI任务ID，使用模拟模式');
          // 模拟生成完成
          setGenerationStatus({ 
            status: 'completed', 
            message: '试卷生成完成（模拟模式）' 
          });
          setGeneratingPaper(false);
          await loadCourseData(); // 重新加载数据
        }

        // 重置表单
        setPaperForm({
          title: '',
          description: '',
          totalQuestions: 5,
          difficultyLevel: 'medium',
          estimatedTime: 30,
          language: 'zh',
          isPublic: true
        });
        setSelectedMaterials([]);
        
      } else {
        throw new Error(data.error || '生成试卷失败');
      }
    } catch (error) {
      console.error('❌ 试卷生成错误:', error);
      console.log('错误类型:', error.name);
      console.log('错误消息:', error.message);
      
      setGenerationStatus({ 
        status: 'error', 
        message: `生成失败: ${error.message}` 
      });
      
      // 延迟3秒后才重置状态，让用户能看到错误信息
      setTimeout(() => {
        setGeneratingPaper(false);
        setGenerationStatus(null);
      }, 3000);
    }
  };

  // 轮询生成状态
  const pollGenerationStatus = async (paperId) => {
    let attempts = 0;
    const maxAttempts = 60; // 最多轮询5分钟

    const poll = async () => {
      try {
        const response = await fetch(`/api/papers/${paperId}/generation-status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const statusData = await response.json();
          
          setGenerationStatus({
            status: statusData.generationStatus.status,
            message: statusData.generationStatus.progress,
            paperId: paperId,
            progress: `${statusData.generatedQuestions}/${statusData.totalQuestions} 题目已生成`
          });

          if (statusData.generationStatus.status === 'completed') {
            setGenerationStatus({
              status: 'completed',
              message: '试卷生成完成！',
              paperId: paperId
            });
            setGeneratingPaper(false);
            await loadCourseData(); // 重新加载数据
            return;
          } else if (statusData.generationStatus.status === 'failed') {
            throw new Error(statusData.generationStatus.error || '生成失败');
          }
        }

        attempts++;
        if (attempts < maxAttempts && generatingPaper) {
          setTimeout(poll, 5000); // 5秒后再次查询
        } else {
          throw new Error('生成超时');
        }
      } catch (error) {
        console.error('查询生成状态失败:', error);
        setGenerationStatus({
          status: 'error',
          message: `查询状态失败: ${error.message}`
        });
        setGeneratingPaper(false);
      }
    };

    setTimeout(poll, 2000); // 2秒后开始第一次查询
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          courseId: course.id,
          content: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
        await loadCourseData(); // 重新加载评论
      }
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">未找到課程</h3>
        <p className="text-gray-500 mb-4">請返回課程列表重新選擇</p>
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首页
        </button>
      </div>

      {/* 课程信息卡片 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
            <p className="text-blue-100 mb-4">{course.description || '暂无课程描述'}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <Hash className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-blue-200">课程代码</p>
                  <p className="font-medium">{course.code}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-blue-200">学分</p>
                  <p className="font-medium">{course.credits}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-blue-200">学期</p>
                  <p className="font-medium">{course.semester} {course.year}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-blue-200">教师</p>
                  <p className="font-medium">{course.instructor || '未指定'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              课程概览
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              学习资料 ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'papers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              共享试卷 ({sharedPapers.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              课程评论 ({comments.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 课程概览 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 文件上传和试卷生成 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 上传资料 */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Upload className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">上传资料</h3>
                        <p className="text-gray-600">上传课程学习资料</p>
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={loading}
                  />
                </div>
                
                {/* AI 试卷生成 */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Brain className="h-8 w-8 text-purple-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">AI智能试卷生成</h3>
                        <p className="text-gray-600">基于学习资料智能生成考试题目</p>
                      </div>
                    </div>
                  </div>
                  
                  {console.log('🔍 渲染状态检查 - generatingPaper:', generatingPaper)}
                  {!generatingPaper ? (
                    <div className="space-y-4">
                      {/* 试卷配置表单 */}
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="试卷标题"
                          value={paperForm.title}
                          onChange={(e) => setPaperForm({...paperForm, title: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={paperForm.difficultyLevel}
                          onChange={(e) => setPaperForm({...paperForm, difficultyLevel: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="easy">简单</option>
                          <option value="medium">中等</option>
                          <option value="hard">困难</option>
                        </select>
                        <input
                          type="number"
                          placeholder="题目数量"
                          min="1"
                          max="20"
                          value={paperForm.totalQuestions}
                          onChange={(e) => setPaperForm({...paperForm, totalQuestions: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="时长(分钟)"
                          min="5"
                          max="180"
                          value={paperForm.estimatedTime}
                          onChange={(e) => setPaperForm({...paperForm, estimatedTime: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <textarea
                        placeholder="试卷描述(可选)"
                        value={paperForm.description}
                        onChange={(e) => setPaperForm({...paperForm, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        rows="2"
                      />
                      
                      {/* 选择资料 */}
                      {materials.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            选择学习资料 ({selectedMaterials.length}/{materials.length})
                          </label>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {materials.map((material) => (
                              <label key={material.id} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedMaterials.includes(material.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMaterials([...selectedMaterials, material.id]);
                                    } else {
                                      setSelectedMaterials(selectedMaterials.filter(id => id !== material.id));
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="truncate">{material.title || material.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={handleGeneratePaper}
                        disabled={loading || materials.length === 0 || !paperForm.title.trim()}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {loading ? '生成中...' : `生成 ${paperForm.totalQuestions} 道题目`}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 生成状态显示 */}
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                          <span className="text-sm text-gray-700">AI正在生成试卷...</span>
                        </div>
                      </div>
                      
                      {generationStatus && (
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">状态: {generationStatus.status}</div>
                            <div className="text-gray-600">{generationStatus.message}</div>
                            {generationStatus.progress && (
                              <div className="text-gray-500 text-xs mt-1">{generationStatus.progress}</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          setGeneratingPaper(false);
                          setGenerationStatus(null);
                        }}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 最近生成状态 */}
              {currentGeneratingPaper && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">生成状态</h4>
                  <PaperGenerationStatus
                    paperId={currentGeneratingPaper.id}
                    onComplete={() => {
                      setGeneratingPaper(false);
                      setCurrentGeneratingPaper(null);
                      loadCourseData();
                    }}
                    onError={(error) => {
                      setGeneratingPaper(false);
                      setGenerationStatus({ status: 'error', message: error });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 学习资料 */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {materials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <div key={material.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <FileText className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{material.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              上传者: {material.uploaderName} • {new Date(material.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`/api/materials/${material.id}/download`, '_blank')}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无学习资料</h3>
                  <p className="text-gray-500">上传一些学习资料来开始智能学习</p>
                </div>
              )}
            </div>
          )}

          {/* 共享试卷 */}
          {activeTab === 'papers' && (
            <div className="space-y-4">
              {sharedPapers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sharedPapers.map((paper) => (
                    <div key={paper.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <Brain className="h-5 w-5 text-purple-600 mr-3 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{paper.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{paper.description}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                              <span>创建者: {paper.creatorName}</span>
                              <span>总分: {paper.totalScore}</span>
                              <span>时长: {paper.duration}分钟</span>
                            </div>
                            <div className="flex items-center mt-2">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-600">{paper.rating || 0}/5</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(`/api/papers/${paper.id}/view`, '_blank')}
                          className="ml-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          查看
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无共享试卷</h3>
                  <p className="text-gray-500">还没有用户分享试卷</p>
                </div>
              )}
            </div>
          )}

          {/* 课程评论 */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* 添加评论 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">添加评论</h4>
                <div className="flex space-x-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="分享你对这门课程的看法..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none"
                    rows="3"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    发布
                  </button>
                </div>
              </div>

              {/* 评论列表 */}
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{comment.userName}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无评论</h3>
                    <p className="text-gray-500">成为第一个评论这门课程的人</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailView;