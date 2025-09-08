import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BookOpen, Calendar, User, Hash, GraduationCap, Upload, FileText, Brain, MessageCircle, Star, Download } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext.jsx'; // .jsx
import { materialsAPI, papersAPI, commentsAPI } from '../../services/apiService.js'; // .js

function CourseDetailView({ course, setCurrentView }) {
  const { t, translateDynamic, currentLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [sharedPapers, setSharedPapers] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [displayCourse, setDisplayCourse] = useState(course);

  // 翻译动态课程内容
  useEffect(() => {
    if (!course) return;

    if (currentLanguage === 'zh-cn') {
      setDisplayCourse(course);
      return;
    }

    const translateCourseData = async () => {
      try {
        const fieldsToTranslate = { name: course.name, description: course.description };
        if (course.instructor) fieldsToTranslate.instructor = course.instructor;
        const translated = await translateDynamic(fieldsToTranslate);
        setDisplayCourse({ ...course, ...translated });
      } catch (error) {
        console.error("Failed to translate course details:", error);
        setDisplayCourse(course);
      }
    };
    translateCourseData();
  }, [course, currentLanguage, translateDynamic]);

  // 加载课程相关数据
  const loadCourseData = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const [materialsRes, papersRes, commentsRes] = await Promise.all([
        materialsAPI.getByCourse(course.id),
        papersAPI.getByCourse(course.id),
        // commentsAPI.getByCourse(course.id) // 假设后端实现了评论API
      ]);

      setMaterials(materialsRes.materials || []);
      setSharedPapers(papersRes.papers || []);
      // setComments(commentsRes.comments || []);
    } catch (error) {
      console.error(t('courseDetail.error.load'), error);
    } finally {
      setLoading(false);
    }
  }, [course, t]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);
  
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courseId', course.id);
      Array.from(files).forEach(file => formData.append('files', file));
      
      await materialsAPI.upload(formData);
      await loadCourseData();
      event.target.value = '';
    } catch (error) {
      console.error(t('courseDetail.error.uploadError'), error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaper = async () => {
    if (materials.length === 0) {
      alert(t('courseDetail.overview.alertNoMaterials'));
      return;
    }

    setLoading(true);
    try {
      await papersAPI.generate({
        courseId: course.id,
        title: `${course.name} - 智能生成试卷`,
        totalQuestions: 10,
        materialIds: materials.map(m => m.id)
      });
      await loadCourseData();
    } catch (error) {
      console.error(t('courseDetail.error.generateError'), error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await commentsAPI.create({ courseId: course.id, content: newComment });
      setNewComment('');
      await loadCourseData();
    } catch (error) {
      console.error(t('courseDetail.error.addComment'), error);
    }
  };

  if (!displayCourse) {
    // ... (no change in return logic)
  }

  // ... (JSX is unchanged, only the handlers above were modified)
  // ... (其余 JSX 代码保持不变)
  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center text-gray-600 hover:text-cityu-orange transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('courseDetail.backToHome')}
        </button>
      </div>

      {/* 课程信息卡片 */}
      <div className="bg-cityu-gradient rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{displayCourse.name}</h1>
            <p className="text-orange-100 mb-4">{displayCourse.description || t('courseDetail.noDescription')}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <Hash className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">{t('courseDetail.courseCode')}</p>
                  <p className="font-medium">{displayCourse.code}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">{t('courseDetail.credits')}</p>
                  <p className="font-medium">{displayCourse.credits}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">{t('courseDetail.semester')}</p>
                  <p className="font-medium">{displayCourse.semester} {displayCourse.year}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-xs text-orange-200">{t('courseDetail.instructor')}</p>
                  <p className="font-medium">{displayCourse.instructor || t('courseDetail.notSpecified')}</p>
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
              {t('courseDetail.tabs.overview')}
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('courseDetail.tabs.materials')} ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'papers'
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('courseDetail.tabs.papers')} ({sharedPapers.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'border-cityu-orange text-cityu-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('courseDetail.tabs.comments')} ({comments.length})
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
                        <h3 className="text-lg font-semibold text-gray-900">{t('courseDetail.overview.uploadTitle')}</h3>
                        <p className="text-gray-600">{t('courseDetail.overview.uploadDescription')}</p>
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
                        <h3 className="text-lg font-semibold text-gray-900">{t('courseDetail.overview.generateTitle')}</h3>
                        <p className="text-gray-600">{t('courseDetail.overview.generateDescription')}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleGeneratePaper}
                    disabled={loading || materials.length === 0}
                    className="w-full px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? t('courseDetail.overview.generating') : t('courseDetail.overview.generateButton')}
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
                              {t('courseDetail.materials.uploader')}: {material.uploaderName} • {new Date(material.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_API_URL}/materials/${material.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('courseDetail.materials.emptyTitle')}</h3>
                  <p className="text-gray-500">{t('courseDetail.materials.emptyDescription')}</p>
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
                              <span>{t('courseDetail.papers.creator')}: {paper.creatorName}</span>
                              <span>{t('courseDetail.papers.totalScore')}: {paper.total_questions}</span>
                              <span>{t('courseDetail.papers.duration')}: {paper.estimated_time || 'N/A'}{t('courseDetail.papers.minutes')}</span>
                            </div>
                            <div className="flex items-center mt-2">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-600">{paper.average_rating || 0}/5</span>
                            </div>
                          </div>
                        </div>
                         <a
                          href={`${import.meta.env.VITE_API_URL}/papers/${paper.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 px-3 py-1 text-sm bg-cityu-gradient text-white rounded hover:shadow-lg transition-all"
                        >
                          {t('courseDetail.papers.viewButton')}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('courseDetail.papers.emptyTitle')}</h3>
                  <p className="text-gray-500">{t('courseDetail.papers.emptyDescription')}</p>
                </div>
              )}
            </div>
          )}
          {/* ... 其他 Tab 内容 ... */}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailView;