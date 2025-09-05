import React, { useEffect } from 'react';

// 導入組件
import NotificationToast from './components/common/NotificationToast';
import Navigation from './components/layout/Navigation';
import LoginView from './components/views/LoginView';
import HomeView from './components/views/HomeView';
import CoursesView from './components/views/CoursesView';
import AddCourseModal from './components/modals/AddCourseModal';

// 導入自定義鉤子
import { useAuth } from './hooks/useAuth';
import { useCourses } from './hooks/useCourses';
import { useApp } from './hooks/useApp';

function StudyAssistant() {
  // 使用自定義鉤子管理狀態
  const auth = useAuth();
  const courses = useCourses();
  const app = useApp();

  // 初始化應用
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      app.setLoading(true);
      await auth.initializeAuth();
      
      if (auth.isAuthenticated) {
        await Promise.all([
          courses.loadCourses(),
          app.loadMaterials(),
          app.loadPapers()
        ]);
      }
    } catch (error) {
      console.error('初始化失敗:', error);
      auth.setError('應用初始化失敗，請刷新頁面重試');
    } finally {
      app.setLoading(false);
    }
  };

  // 處理課程添加
  const handleAddCourse = (e) => {
    courses.handleAddCourse(e, auth.setError, auth.setSuccess);
  };

  // 處理登出
  const handleLogout = () => {
    auth.handleLogout();
    courses.setCourses([]);
    app.setMaterials([]);
    app.setPapers([]);
    app.setCurrentView('home');
  };

  // 如果未認證，顯示登錄界面
  if (!auth.isAuthenticated) {
    return (
      <>
        <NotificationToast error={auth.error} success={auth.success} />
        <LoginView 
          showLogin={auth.showLogin}
          setShowLogin={auth.setShowLogin}
          showRegister={auth.showRegister}
          setShowRegister={auth.setShowRegister}
          handleLogin={auth.handleLogin}
          loginForm={auth.loginForm}
          setLoginForm={auth.setLoginForm}
          handleRegister={auth.handleRegister}
          registerForm={auth.registerForm}
          setRegisterForm={auth.setRegisterForm}
          loading={auth.loading}
        />
      </>
    );
  }

  // 主應用界面
  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationToast error={auth.error} success={auth.success} />
      
      <Navigation 
        user={auth.user}
        language={app.language}
        setLanguage={app.setLanguage}
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
        
        {/* 其他視圖可以在這裡添加 */}
      </main>

      {/* 模態框 */}
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
  return <StudyAssistant />;
}

export default App;