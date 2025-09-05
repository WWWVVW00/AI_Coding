import { useState, useRef } from 'react';
import { materialsAPI, papersAPI } from '../services/api';

export function useApp() {
  const [currentView, setCurrentView] = useState('home');
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
  const [materials, setMaterials] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  // 數據加載函數
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

  // 文件上傳處理
  const handleFileUpload = async (files, selectedCourse, setError, setSuccess) => {
    if (!selectedCourse) {
      setError('請先選擇一個課程');
      return;
    }
    
    setLoading(true);
    
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
  const handleGeneratePaper = async (config, selectedCourse, setError, setSuccess) => {
    if (uploadedFiles.length === 0) {
      setError('請先上傳學習資料');
      return;
    }
    
    setLoading(true);
    
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

  return {
    currentView,
    setCurrentView,
    uploadedFiles,
    setUploadedFiles,
    generatedPaper,
    setGeneratedPaper,
    showAnswers,
    setShowAnswers,
    searchQuery,
    setSearchQuery,
    shareSettings,
    setShareSettings,
    language,
    setLanguage,
    paperLanguage,
    setPaperLanguage,
    viewMode,
    setViewMode,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    materials,
    setMaterials,
    papers,
    setPapers,
    loading,
    setLoading,
    fileInputRef,
    loadMaterials,
    loadPapers,
    handleFileUpload,
    handleGeneratePaper
  };
}