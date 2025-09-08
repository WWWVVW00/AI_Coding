import { useState } from 'react';
import { coursesAPI } from '../services/apiService.js'; // .js

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const loadCourses = async () => {
    try {
<<<<<<< HEAD
      setLoading(true);
      const { courses: coursesData } = await coursesAPI.getAll();
      setCourses(coursesData);
    } catch (error) {
      console.error('加载课程失败:', error);
=======
      console.log('🔍 加载课程列表...');
      
      // 调用真实的后端API而不是Mock API
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📚 获取到课程数据:', data);
      
      setCourses(data.courses || []);
    } catch (error) {
      console.error('❌ 加载课程失败:', error);
      setCourses([]); // 设置为空数组避免undefined
>>>>>>> feat/questionGen
      throw error;
    } finally {
        setLoading(false);
    }
  };

  const handleAddCourse = async (e, setError, setSuccess) => {
    e.preventDefault();
    setLoading(true);
    try {
<<<<<<< HEAD
      const { course: newCourseData } = await coursesAPI.create(newCourse);
      setSuccess('课程添加成功！');
      setShowAddCourse(false);
      setNewCourse({
        name: '', code: '', department: '', description: '',
        credits: 3, semester: 'Fall', year: new Date().getFullYear(), instructor: ''
      });
      setCourses(prev => [...prev, newCourseData]); // 立即更新UI
    } catch (error) {
      setError(error.message || '添加课程失败');
=======
      console.log('➕ 创建新课程:', newCourse);
      
      // 确保有认证token
      let token = localStorage.getItem('token');
      if (!token || !token.startsWith('test-token-')) {
        // 创建测试token
        const testUser = { id: 1, username: 'testuser', fullName: 'Test User' };
        token = 'test-token-' + btoa(JSON.stringify(testUser));
        localStorage.setItem('token', token);
      }
      
      // 调用真实的后端API
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCourse)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 课程创建成功:', result);
        
        setSuccess('課程添加成功！');
        setShowAddCourse(false);
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
        await loadCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '添加課程失敗');
      }
    } catch (error) {
      console.error('❌ 添加課程錯誤:', error);
      setError('添加課程失敗，請稍後重試');
>>>>>>> feat/questionGen
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    setCourses,
    selectedCourse,
    setSelectedCourse,
    loading,
    showAddCourse,
    setShowAddCourse,
    newCourse,
    setNewCourse,
    loadCourses,
    handleAddCourse
  };
}