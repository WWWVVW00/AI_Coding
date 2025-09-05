import { useState } from 'react';
import { coursesAPI } from '../services/api';

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

  // 加載課程列表
  const loadCourses = async () => {
    try {
      const { data } = await coursesAPI.getAll();
      setCourses(data);
    } catch (error) {
      console.error('加載課程失敗:', error);
      throw error;
    }
  };

  // 添加新課程
  const handleAddCourse = async (e, setError, setSuccess) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await coursesAPI.create(newCourse);
      if (response.success) {
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
        setError(response.message || '添加課程失敗');
      }
    } catch (error) {
      console.error('添加課程錯誤:', error);
      setError('添加課程失敗，請稍後重試');
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