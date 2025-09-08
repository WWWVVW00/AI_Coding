import { useState, useRef } from 'react';
import { materialsAPI, papersAPI } from '../services/apiService.js'; // .js

export function useApp() {
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 这部分状态似乎与课程详情页更相关，可以考虑移动
  const [generatedPaper, setGeneratedPaper] = useState(null);
  
  const fileInputRef = useRef(null);

  // 简化: 现在materials和papers由课程详情页加载
  const loadMaterials = async (courseId) => {
    try {
      const { materials: data } = await materialsAPI.getByCourse(courseId);
      setMaterials(data);
    } catch (error) {
      console.error('加载资料失败:', error);
    }
  };

  const loadPapers = async (courseId) => {
    try {
      const { papers: data } = await papersAPI.getByCourse(courseId);
      setPapers(data);
    } catch (error) {
      console.error('加载试卷失败:', error);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (files, selectedCourse, setError, setSuccess) => {
    if (!selectedCourse) {
      setError('请先选择一个课程');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourse.id);
      Array.from(files).forEach(file => {
          formData.append('files', file);
      });
      
      const response = await materialsAPI.upload(formData);
      
      setSuccess(response.message || `成功上传 ${response.materials.length} 个文件！`);
      await loadMaterials(selectedCourse.id);
    } catch (error) {
      setError(error.message || '文件上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 试卷生成处理
  const handleGeneratePaper = async (config, selectedCourse, setError, setSuccess) => {
    if (!selectedCourse || !selectedCourse.id) {
        setError('请选择有效的课程');
        return;
    }
    
    setLoading(true);
    try {
      const payload = {
          courseId: selectedCourse.id,
          title: config.title || `${selectedCourse.name} 智能试卷`,
          totalQuestions: config.questionCount || 10,
          difficultyLevel: config.difficulty || 'medium',
          language: config.language || 'zh',
          sourceMaterials: config.materialIds || []
      };
      
      const { paper: newPaper } = await papersAPI.generate(payload);
      
      setGeneratedPaper(newPaper);
      setSuccess('试卷生成成功！');
      await loadPapers(selectedCourse.id);
      // 可以在这里切换视图
      // setCurrentView('paper-detail');
      
    } catch (error) {
      setError(error.message || '试卷生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return {
    currentView, setCurrentView,
    searchQuery, setSearchQuery,
    materials, setMaterials,
    papers, setPapers,
    loading, setLoading,
    generatedPaper, setGeneratedPaper,
    fileInputRef,
    loadMaterials, loadPapers,
    handleFileUpload, handleGeneratePaper
  };
}