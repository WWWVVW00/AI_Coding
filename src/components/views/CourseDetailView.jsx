import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Calendar, User, Hash, GraduationCap, Upload, FileText, Brain, MessageCircle, Star, Download } from 'lucide-react';

function CourseDetailView({ course, setCurrentView }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [sharedPapers, setSharedPapers] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // 加载课程相关数据
  useEffect(() => {
    if (course) {
      loadCourseData();
    }
  }, [course]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      // 这里会调用真实的API，不使用模拟数据
      const [materialsRes, papersRes, commentsRes] = await Promise.all([
        fetch(`/api/courses/${course.id}/materials`),
        fetch(`/api/courses/${course.id}/shared-papers`),
        fetch(`/api/courses/${course.id}/comments`)
      ]);

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        setMaterials(materialsData.data || []);
      }

      if (papersRes.ok) {
        const papersData = await papersRes.json();
        setSharedPapers(papersData.data || []);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData.data || []);
      }
    } catch (error) {
      console.error('加载课程数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('courseId', course.id);

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadCourseData(); // 重新加载数据
        event.target.value = ''; // 清空文件选择
      } else {
        console.error('文件上传失败');
      }
    } catch (error) {
      console.error('文件上传错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaper = async () => {
    if (materials.length === 0) {
      alert('请先上传学习资料');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/papers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          courseId: course.id,
          materialIds: materials.map(m => m.id)
        })
      });

      if (response.ok) {
        await loadCourseData(); // 重新加载数据
      } else {
        console.error('试卷生成失败');
      }
    } catch (error) {
      console.error('试卷生成错误:', error);
    } finally {
      setLoading(false);
    }
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
          className="inline-flex items-center px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
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
          className="inline-flex items-center text-gray-600 hover:text-cityu-orange transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回首頁
        </button>
      </div>

      {/* 课程信息卡片 */}
      <div className="bg-cityu-gradient rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
            <p className="text-orange-100 mb-4">{course.description || '暂无课程描述'}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <Hash className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">课程代码</p>
                  <p className="font-medium">{course.code}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">学分</p>
                  <p className="font-medium">{course.credits}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">学期</p>
                  <p className="font-medium">{course.semester} {course.year}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">教师</p>
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
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              课程概览
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              学习资料 ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'papers'
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              共享试卷 ({sharedPapers.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'border-cityu-orange text-cityu-orange'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-orange-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Upload className="h-8 w-8 text-cityu-orange mr-3" />
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
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-cityu-orange hover:file:bg-orange-100"
                    disabled={loading}
                  />
                </div>
                
                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Brain className="h-8 w-8 text-cityu-red mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">生成试卷</h3>
                        <p className="text-gray-600">基于上传资料生成试卷</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleGeneratePaper}
                    disabled={loading || materials.length === 0}
                    className="w-full px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? '生成中...' : '生成试卷'}
                  </button>
                </div>
              </div>
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
                          <Brain className="h-5 w-5 text-cityu-red mr-3 mt-1" />
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
                          className="ml-2 px-3 py-1 text-sm bg-cityu-gradient text-white rounded hover:shadow-lg transition-all"
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
                    className="px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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