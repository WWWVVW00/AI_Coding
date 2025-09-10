import React, { useEffect } from 'react';

// 导入組件
import NotificationToast from './components/common/NotificationToast.jsx'; // .jsx
import { TranslationProvider } from './contexts/TranslationContext.jsx'; // .jsx
import Navigation from './components/layout/Navigation.jsx'; // .jsx
import LoginView from './components/views/LoginView.jsx'; // .jsx
import HomeView from './components/views/HomeView.jsx'; // .jsx
import CoursesView from './components/views/CoursesView.jsx'; // .jsx
import CourseDetailView from './components/views/CourseDetailView.jsx'; // .jsx
import ForumView from './components/views/ForumView.jsx'; // .jsx
import AddCourseModal from './components/modals/AddCourseModal.jsx'; // .jsx
import { Loader2 } from 'lucide-react'; 

import { useAuth } from './hooks/useAuth.js'; // .js
import { useCourses } from './hooks/useCourses.js'; // .js, 应该是 useCourses.js
import { useApp } from './hooks/useApp.js'; // .js

function StudyAssistant() {
  // 使用自定義鉤子管理狀態
  const auth = useAuth();
  const courses = useCourses();
  const app = useApp();

  // 初始化应用
  useEffect(() => {
    auth.initializeAuth();
  }, []);

  // 当用户认证状态改变时重新加载课程数据
  useEffect(() => {
    if (auth.isAuthenticated) {
      courses.loadCourses();
    } else {
      // 用户登出时清空数据
      courses.setCourses([]);
      app.setMaterials([]);
      app.setPapers([]);
    }
  }, [auth.isAuthenticated]);

  // 處理課程添加
  const handleAddCourse = (e) => {
    courses.handleAddCourse(e, auth.setError, auth.setSuccess);
  };
  
  // 處理登出
  const handleLogout = () => {
    auth.handleLogout();
    app.setCurrentView('home'); // 重置视图
  };
  
  // 应用加载中
  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-cityu-orange" />
      </div>
    );
  }

  // 如果未認證，顯示登錄界面
  if (!auth.isAuthenticated) {
    return (
      <>
        <NotificationToast error={auth.error} success={auth.success} />
        <LoginView 
          showLogin={auth.showLogin} setShowLogin={auth.setShowLogin}
          showRegister={auth.showRegister} setShowRegister={auth.setShowRegister}
          handleLogin={auth.handleLogin}
          loginForm={auth.loginForm} setLoginForm={auth.setLoginForm}
          handleRegister={auth.handleRegister}
          registerForm={auth.registerForm} setRegisterForm={auth.setRegisterForm}
          loading={auth.loading}
        />
      </>
    );
  }

  // 主應用界面
  return (
    <div className="min-h-screen bg-gray-100">
      <NotificationToast error={auth.error} success={auth.success} />
      
      <Navigation 
        user={auth.user}
        handleLogout={handleLogout}
        setCurrentView={app.setCurrentView}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {app.currentView === 'home' && (
          <HomeView 
            user={auth.user}
            courses={courses.courses}
            materials={app.materials}
            papers={app.papers}
            setShowAddCourse={courses.setShowAddCourse}
            setCurrentView={app.setCurrentView}
            setSelectedCourse={courses.setSelectedCourse}
          />
        )}
        
        {app.currentView === 'courses' && (
          <CoursesView 
            courses={courses.courses}
            searchQuery={app.searchQuery}
            setSearchQuery={app.setSearchQuery}
            setShowAddCourse={courses.setShowAddCourse}
            setSelectedCourse={courses.setSelectedCourse}
            setCurrentView={app.setCurrentView}
          />
        )}
        
        {app.currentView === 'course-detail' && courses.selectedCourse && (
          <CourseDetailView 
            user={auth.user}
            course={courses.selectedCourse}
            setCurrentView={app.setCurrentView}
          />
        )}

        {app.currentView === 'forum' && (
          <ForumView setCurrentView={app.setCurrentView} />
        )}
      </main>

      {courses.showAddCourse && (
        <AddCourseModal 
          setShowAddCourse={courses.setShowAddCourse}
          handleAddCourse={handleAddCourse}
          newCourse={courses.newCourse}
          setNewCourse={courses.setNewCourse}
          loading={courses.loading}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <TranslationProvider>
      <StudyAssistant />
    </TranslationProvider>
  );
}

export default App;