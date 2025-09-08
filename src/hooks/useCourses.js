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
      setLoading(true);
      const { courses: coursesData } = await coursesAPI.getAll();
      setCourses(coursesData);
    } catch (error) {
      console.error('加载课程失败:', error);
      throw error;
    } finally {
        setLoading(false);
    }
  };

  const handleAddCourse = async (e, setError, setSuccess) => {
    e.preventDefault();
    setLoading(true);
    try {
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