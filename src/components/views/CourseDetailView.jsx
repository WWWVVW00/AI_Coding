import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BookOpen, Calendar, User, Hash, GraduationCap, Upload, FileText, Brain, MessageCircle, Star, Download, Lock, Trash2, KeyRound } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext.jsx';
import { materialsAPI, papersAPI, commentsAPI } from '../../services/apiService.js';

function CourseDetailView({ user, course, setCurrentView }) {
  const { t, translateDynamic, currentLanguage } = useTranslation();
  
  // Tabs and Data
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [sharedPapers, setSharedPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayCourse, setDisplayCourse] = useState(course);

  // Form/Interaction State
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [isPublicUpload, setIsPublicUpload] = useState(true);
  const [isPublicPaper, setIsPublicPaper] = useState(false); // Default to private
  const [newComment, setNewComment] = useState('');

  // Translate dynamic course content
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

  // Load all data related to the course
  const loadCourseData = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const [materialsRes, papersRes] = await Promise.all([
        materialsAPI.getByCourse(course.id),
        papersAPI.getByCourse(course.id)
      ]);
      setMaterials(materialsRes.materials || []);
      setSharedPapers(papersRes.papers || []);
    } catch (error) {
      console.error(t('courseDetail.error.load'), error);
    } finally {
      setLoading(false);
    }
  }, [course, t]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);
  
  // Handlers
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courseId', course.id);
      formData.append('isPublic', isPublicUpload);
      formData.append('materialType', 'other');
      formData.append('year', new Date().getFullYear().toString());
      
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      await materialsAPI.upload(formData);
      await loadCourseData();
      event.target.value = '';
      setIsPublicUpload(true);
    } catch (error) {
      console.error(t('courseDetail.error.uploadError'), error);
      alert(`${t('courseDetail.error.uploadError')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSelection = (materialId, isSelected) => {
    setSelectedMaterials(prev => isSelected ? [...prev, materialId] : prev.filter(id => id !== materialId));
  };

  const handleSelectAllMaterials = (selectAll) => {
    setSelectedMaterials(selectAll ? materials.map(m => m.id) : []);
  };

  const handleGeneratePaper = async () => {
    if (materials.length === 0) {
      alert(t('courseDetail.overview.alertNoMaterials'));
      return;
    }
    if (selectedMaterials.length === 0) {
      alert('请至少选择一个学习资料用于生成试卷');
      return;
    }

    setLoading(true);
    try {
      await papersAPI.generate({
        courseId: course.id,
        title: `${course.name} - 智能生成试卷`,
        description: `基于 ${selectedMaterials.length} 个学习资料生成的试卷`,
        difficultyLevel: 'medium',
        totalQuestions: 10,
        isPublic: isPublicPaper,
        sourceMaterials: selectedMaterials
      });
      await loadCourseData();
      setSelectedMaterials([]);
      setIsPublicPaper(false);
    } catch (error) {
      console.error(t('courseDetail.error.generateError'), error);
      alert(`${t('courseDetail.error.generateError')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 评论相关逻辑已移除

  const handleDownloadPaper = async (paperId, includeAnswers) => {
    try {
      await papersAPI.download(paperId, includeAnswers);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center text-gray-600 hover:text-cityu-orange transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('courseDetail.backToHome')}
        </button>
      </div>

      {/* Course Info Card */}
      <div className="bg-cityu-gradient rounded-2xl p-8 text-white">
         <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{displayCourse.name}</h1>
            <p className="text-orange-100 mb-4">{displayCourse.description || t('courseDetail.noDescription')}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center"><Hash className="h-5 w-5 mr-2" /><div><p className="text-xs text-orange-200">{t('courseDetail.courseCode')}</p><p className="font-medium">{displayCourse.code}</p></div></div>
              <div className="flex items-center"><GraduationCap className="h-5 w-5 mr-2" /><div><p className="text-xs text-orange-200">{t('courseDetail.credits')}</p><p className="font-medium">{displayCourse.credits}</p></div></div>
              <div className="flex items-center"><Calendar className="h-5 w-5 mr-2" /><div><p className="text-xs text-orange-200">{t('courseDetail.semester')}</p><p className="font-medium">{displayCourse.semester} {displayCourse.year}</p></div></div>
              <div className="flex items-center"><User className="h-5 w-5 mr-2" /><div><p className="text-xs text-orange-200">{t('courseDetail.instructor')}</p><p className="font-medium">{displayCourse.instructor || t('courseDetail.notSpecified')}</p></div></div>
            </div>
          </div>
          <div className="hidden md:block"><div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center"><BookOpen className="h-12 w-12 text-white" /></div></div>
        </div>
      </div>

      {/* Tabs */}
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
            {/* 评论 Tab 已移除 */}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-orange-50 p-6 rounded-lg">
                <div className="flex items-center mb-4"><Upload className="h-8 w-8 text-cityu-orange mr-3" /><div><h3 className="text-lg font-semibold text-gray-900">{t('courseDetail.overview.uploadTitle')}</h3><p className="text-gray-600">{t('courseDetail.overview.uploadDescription')}</p></div></div>
                <input type="file" multiple accept=".txt,.pdf,text/plain,application/pdf" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-cityu-orange hover:file:bg-orange-100" disabled={loading} />
                <div className="mt-3 flex items-center">
                  <input id="is-public-checkbox" type="checkbox" checked={isPublicUpload} onChange={(e) => setIsPublicUpload(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cityu-orange focus:ring-cityu-orange" />
                  <label htmlFor="is-public-checkbox" className="ml-2 block text-sm text-gray-900">公开此资料<span className="text-gray-500 text-xs ml-1">(其他用户将可以看到并使用)</span></label>
                </div>
              </div>
              
              <div className="bg-red-50 p-6 rounded-lg">
                <div className="flex items-center mb-4"><Brain className="h-8 w-8 text-cityu-red mr-3" /><div><h3 className="text-lg font-semibold text-gray-900">{t('courseDetail.overview.generateTitle')}</h3><p className="text-gray-600">{t('courseDetail.overview.generateDescription')}</p></div></div>
                {materials.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-medium text-gray-700">选择用于生成试卷的材料:</h4><div className="flex space-x-2"><button onClick={() => handleSelectAllMaterials(true)} className="text-xs text-cityu-red hover:underline">全选</button><button onClick={() => handleSelectAllMaterials(false)} className="text-xs text-gray-500 hover:underline">取消全选</button></div></div>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">{materials.map((material) => (<label key={material.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded"><input type="checkbox" checked={selectedMaterials.includes(material.id)} onChange={(e) => handleMaterialSelection(material.id, e.target.checked)} className="rounded border-gray-300 text-cityu-red focus:ring-cityu-red" /><span className="text-sm text-gray-700 flex-1">{material.title || material.file_name}<span className="text-xs text-gray-500 ml-1">(.{material.file_type})</span></span></label>))}</div>
                    <p className="text-xs text-gray-500 mt-1">已选择 {selectedMaterials.length} / {materials.length} 个材料</p>
                  </div>
                )}
                <div className="mt-4 mb-2 flex items-center">
                  <input id="is-public-paper-checkbox" type="checkbox" checked={isPublicPaper} onChange={(e) => setIsPublicPaper(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cityu-red focus:ring-cityu-red" />
                  <label htmlFor="is-public-paper-checkbox" className="ml-2 block text-sm text-gray-900">公开分享此试卷<span className="text-gray-500 text-xs ml-1">(其他用户将可以看到并使用)</span></label>
                </div>
                <button onClick={handleGeneratePaper} disabled={loading || materials.length === 0 || selectedMaterials.length === 0} className="w-full px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">{loading ? t('courseDetail.overview.generating') : t('courseDetail.overview.generateButton')}</button>
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {materials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((material) => (
                    <div key={material.id} className="bg-gray-50 p-4 rounded-lg flex items-start justify-between">
                      <div className="flex items-start flex-1 mr-2">
                        <FileText className="h-5 w-5 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{material.title}</h4>
                            {!material.is_public && (<span className="ml-2 flex items-center px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"><Lock className="h-3 w-3 mr-1" />私有</span>)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{material.description || '无描述'}</p>
                          <p className="text-xs text-gray-500 mt-2">{t('courseDetail.materials.uploader')}: {material.uploader_full_name || material.uploader_name} • {new Date(material.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        {/* ***** 核心修改：将 <a> 换成 <button> ***** */}
                        <button onClick={() => handleDownloadMaterial(material.id)} className="p-1 text-gray-400 hover:text-gray-600" title="下载"><Download className="h-4 w-4" /></button>
                        {user && user.id === material.uploaded_by && (
                          <button onClick={() => handleDeleteMaterial(material.id)} className="p-1 text-red-400 hover:text-red-600" title="删除资料"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">{t('courseDetail.materials.emptyTitle')}</h3><p className="text-gray-500">{t('courseDetail.materials.emptyDescription')}</p></div>
              )}
            </div>
          )}

          {/* Papers Tab */}
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
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-900">{paper.title}</h4>
                              {!paper.is_public && (<span className="ml-2 flex items-center px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"><Lock className="h-3 w-3 mr-1" />私有</span>)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{paper.description}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4"><span>{t('courseDetail.papers.creator')}: {paper.creator_name}</span><span>题目数: {paper.total_questions}</span></div>
                            <div className="flex items-center mt-2"><Star className="h-4 w-4 text-yellow-400 mr-1" /><span className="text-sm text-gray-600">{paper.average_rating || 0}/5</span></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {/* ***** 核心修改：将 <a> 换成 <button> ***** */}
                          <button onClick={() => handleDownloadPaper(paper.id, false)} title="仅下载题目" className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"><FileText className="h-4 w-4 mr-1.5" />题目</button>
                          <button onClick={() => handleDownloadPaper(paper.id, true)} title="下载题目、答案和解析" className="flex items-center px-3 py-1 text-sm bg-cityu-gradient text-white rounded hover:shadow-lg transition-all"><KeyRound className="h-4 w-4 mr-1.5" />答案</button>
                          {user && user.id === paper.created_by && (
                            <button onClick={() => handleDeletePaper(paper.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded" title="删除试卷"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><Brain className="h-16 w-16 mx-auto text-gray-300 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">{t('courseDetail.papers.emptyTitle')}</h3><p className="text-gray-500">{t('courseDetail.papers.emptyDescription')}</p></div>
              )}
            </div>
          )}
          {/* ... 其他 Tab 内容 ... */}
          {/* 评论区已移除 */}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailView;