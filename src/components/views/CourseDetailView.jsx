import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, BookOpen, Calendar, User, Hash, GraduationCap, Upload, FileText, Brain, MessageCircle, Star, Download, Lock, Trash2, KeyRound, Languages } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext.jsx';
import { materialsAPI, papersAPI } from '../../services/apiService.js';

function CourseDetailView({ user, course, setCurrentView }) {
  const { t, translateDynamic, currentLanguage, supportedLanguages } = useTranslation();
  const [downloadLang, setDownloadLang] = useState(currentLanguage); // 新增狀態來管理下載語言選項
  const [paperTitle, setPaperTitle] = useState(`${course.name} - 练习题`); // 默认标题
  const [paperQuestionsCount, setPaperQuestionsCount] = useState(10); // 默认10道题
  const [paperDifficulty, setPaperDifficulty] = useState('medium'); // 默认中等难度
  
  // Tabs and Data
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState([]);
  const [sharedPapers, setSharedPapers] = useState([]);
  const [displayPapers, setDisplayPapers] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [displayCourse, setDisplayCourse] = useState(course);

  // Form/Interaction State
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [isPublicUpload, setIsPublicUpload] = useState(true);
  const [isPublicPaper, setIsPublicPaper] = useState(false); // Default to private

  useEffect(() => {
    setPaperTitle(`${course.name} - 练习题`);
  }, [course]);


  useEffect(() => {
    // 如果没有试卷数据，则无需操作
    if (!sharedPapers || sharedPapers.length === 0) {
      setDisplayPapers([]); // 确保显示列表也为空
      return;
    }

    // 如果当前语言是中文 (原始语言)，直接显示原始数据，无需翻译
    if (currentLanguage === 'zh-cn' || currentLanguage === 'zh-tw') {
      setDisplayPapers(sharedPapers);
      return;
    }

    // 执行异步翻译
    const translatePapers = async () => {
      // 创建一个并发翻译所有试卷的 Promises 数组
      const translationPromises = sharedPapers.map(paper => 
        // translateDynamic 内部我们已经优化为可以处理对象
        translateDynamic({ title: paper.title, description: paper.description })
      );
      
      try {
        // 等待所有翻译完成
        const translatedContents = await Promise.all(translationPromises);
        
        // 将翻译结果与原始试卷数据合并，生成新的显示列表
        const newDisplayPapers = sharedPapers.map((paper, index) => ({
          ...paper, // 保留原始数据的所有其他字段
          title: translatedContents[index].title, // 使用翻译后的标题
          description: translatedContents[index].description, // 使用翻译后的描述
        }));

        setDisplayPapers(newDisplayPapers);
      } catch (error) {
        console.error("Failed to translate shared papers:", error);
        setDisplayPapers(sharedPapers); // 如果翻译失败，回退到显示原始数据
      }
    };

    translatePapers();

  }, [sharedPapers, currentLanguage, translateDynamic]); // 依赖项：原始数据和当前语言

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
    if (!paperTitle.trim()) {
      alert('请输入试卷标题');
      return;
    }

    setLoading(true);
    try {
      // ***** 核心修改：使用新的 state *****
      await papersAPI.generate({
        courseId: course.id,
        title: paperTitle, // 使用用户输入的标题
        description: `基于 ${selectedMaterials.length} 个学习资料生成的试卷`,
        difficultyLevel: paperDifficulty, // 使用用户选择的难度
        totalQuestions: paperQuestionsCount, // 使用用户选择的数量
        isPublic: isPublicPaper,
        sourceMaterials: selectedMaterials
      });
      await loadCourseData();
      
      // 重置状态
      setSelectedMaterials([]);
      setIsPublicPaper(false);
      setPaperTitle(`${course.name} - 练习题`); // 恢复默认标题
      
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
      if (downloadLang === 'en') {
        await papersAPI.download(paperId, includeAnswers);
      } else {
        await papersAPI.translateAndDownload(paperId, downloadLang, includeAnswers);
      }
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
            <div className="bg-red-50 p-6 rounded-lg space-y-4">
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-cityu-red mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('courseDetail.overview.generateTitle')}</h3>
                  <p className="text-gray-600 text-sm">{t('courseDetail.overview.generateDescription')}</p>
                </div>
              </div>

              {/* 材料选择 */}
              {materials.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">1. 选择材料:</h4>
                    <div className="flex space-x-2">
                      <button onClick={() => handleSelectAllMaterials(true)} className="text-xs text-cityu-red hover:underline">全选</button>
                      <button onClick={() => handleSelectAllMaterials(false)} className="text-xs text-gray-500 hover:underline">取消全选</button>
                    </div>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                    {materials.map((material) => (
                      <label key={material.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                        <input type="checkbox" checked={selectedMaterials.includes(material.id)} onChange={(e) => handleMaterialSelection(material.id, e.target.checked)} className="rounded border-gray-300 text-cityu-red focus:ring-cityu-red" />
                        <span className="text-sm text-gray-700 flex-1">{material.title || material.file_name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">已选择 {selectedMaterials.length} / {materials.length} 个材料</p>
                </div>
              ) : (
                <div className="text-center py-4 bg-white rounded-md border">
                    <p className="text-sm text-gray-500">请先在左侧上传学习资料</p>
                </div>
              )}

              {/* 试卷配置 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">2. 配置试卷:</h4>
                <div className="space-y-3">
                    {/* 标题输入 */}
                    <div>
                        <label htmlFor="paper-title" className="block text-xs text-gray-600 mb-1">试卷标题</label>
                        <input
                            id="paper-title"
                            type="text"
                            value={paperTitle}
                            onChange={(e) => setPaperTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-cityu-red focus:border-cityu-red"
                            placeholder="例如：第一章 单元测试"
                        />
                    </div>
                    {/* 数量和难度选择 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="paper-questions-count" className="block text-xs text-gray-600 mb-1">题目数量</label>
                            <select
                                id="paper-questions-count"
                                value={paperQuestionsCount}
                                onChange={(e) => setPaperQuestionsCount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-cityu-red focus:border-cityu-red"
                            >
                                <option value={5}>5 题</option>
                                <option value={10}>10 题</option>
                                <option value={15}>15 题</option>
                                <option value={20}>20 题</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="paper-difficulty" className="block text-xs text-gray-600 mb-1">难度</label>
                            <select
                                id="paper-difficulty"
                                value={paperDifficulty}
                                onChange={(e) => setPaperDifficulty(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-cityu-red focus:border-cityu-red"
                            >
                                <option value="easy">简单</option>
                                <option value="medium">中等</option>
                                <option value="hard">困难</option>
                            </select>
                        </div>
                    </div>
                </div>
              </div>

              {/* 公开选项和生成按钮 */}
              <div>
                <div className="mb-3 flex items-center">
                  <input id="is-public-paper-checkbox" type="checkbox" checked={isPublicPaper} onChange={(e) => setIsPublicPaper(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-cityu-red focus:ring-cityu-red" />
                  <label htmlFor="is-public-paper-checkbox" className="ml-2 block text-sm text-gray-900">公开分享此试卷
                    <span className="text-gray-500 text-xs ml-1">(其他用户将可查看和下载)</span>
                  </label>
                </div>
                <button 
                    onClick={handleGeneratePaper} 
                    disabled={loading || materials.length === 0 || selectedMaterials.length === 0} 
                    className="w-full px-4 py-2 bg-cityu-gradient text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? t('courseDetail.overview.generating') : t('courseDetail.overview.generateButton')}
                </button>
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
              {/* ***** 核心修改：将 sharedPapers.length 改为 displayPapers.length ***** */}
              {displayPapers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ***** 核心修改：将 sharedPapers.map 改为 displayPapers.map ***** */}
                  {displayPapers.map((paper) => (
                    <div key={paper.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <Brain className="h-5 w-5 text-cityu-red mr-3 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center">
                              {/* 现在这里会显示翻译后的标题 */}
                              <h4 className="font-medium text-gray-900">{paper.title}</h4>
                              {!paper.is_public && (
                                <span className="ml-2 flex items-center px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                                  <Lock className="h-3 w-3 mr-1" />私有
                                </span>
                              )}
                            </div>
                            {/* 现在这里会显示翻译后的描述 */}
                            <p className="text-sm text-gray-600 mt-1">{paper.description}</p>
                            
                            {/* 其他部分不需要修改 */}
                            <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                              <span>{t('courseDetail.papers.creator')}: {paper.creator_name}</span>
                              <span>题目数: {paper.total_questions}</span>
                            </div>
                            <div className="flex items-center mt-2">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-600">{paper.average_rating || 0}/5</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 下载按钮区域保持不变 */}
                        <div className="flex items-center space-x-2 ml-2">
                          {/* 语言选择下拉菜單 */}
                          <div className="relative">
                              <select
                                  value={downloadLang}
                                  onChange={(e) => setDownloadLang(e.target.value)}
                                  className="pl-8 pr-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 appearance-none focus:outline-none focus:ring-1 focus:ring-cityu-orange"
                              >
                                  {supportedLanguages.map(lang => (
                                      <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
                                  ))}
                              </select>
                              <Languages className="h-4 w-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* 下载题目按钮 */}
                          <button 
                              onClick={() => handleDownloadPaper(paper.id, false)} 
                              title={`下载 ${supportedLanguages.find(l => l.code === downloadLang)?.nativeName || ''} 题目`} 
                              className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                          >
                              <FileText className="h-4 w-4 mr-1.5" />
                              题目
                          </button>
                          
                          {/* 下载答案按钮 */}
                          <button 
                              onClick={() => handleDownloadPaper(paper.id, true)} 
                              title={`下载 ${supportedLanguages.find(l => l.code === downloadLang)?.nativeName || ''} 题目与答案`} 
                              className="flex items-center px-3 py-1 text-sm bg-cityu-gradient text-white rounded hover:shadow-lg transition-all"
                          >
                              <KeyRound className="h-4 w-4 mr-1.5" />
                              答案
                          </button>
                          
                          {/* 删除按钮 (仅限创建者) */}
                          {user && user.id === paper.created_by && (
                              <button 
                                  onClick={() => handleDeletePaper(paper.id)} 
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded" 
                                  title="删除试卷"
                              >
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          )}
                      </div>

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
          {/* 评论区已移除 */}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailView;