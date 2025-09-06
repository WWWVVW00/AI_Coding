import React from 'react';
import { BookOpen, FileText, Brain, Zap, Upload, Users } from 'lucide-react';

function HomeView({ 
  user, 
  courses, 
  materials, 
  papers, 
  setShowAddCourse, 
  setCurrentView, 
  setSelectedCourse 
}) {
  return (
    <div className="space-y-8">
      <div className="bg-cityu-gradient rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">歡迎回來，{user?.fullName || user?.username}！</h2>
            <p className="text-orange-100 mb-4">開始您的智能學習之旅</p>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>{courses.length} 門課程</span>
              </div>
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <span>{materials.length} 個資料</span>
              </div>
              <div className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                <span>{papers.length} 份試卷</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Zap className="h-16 w-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setShowAddCourse(true)} 
          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-cityu-orange" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">添加課程</h3>
          </div>
          <p className="text-gray-600">創建新的課程來組織您的學習資料</p>
        </button>

        <button 
          onClick={() => setCurrentView('courses')} 
          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Upload className="h-6 w-6 text-cityu-red" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">上傳資料</h3>
          </div>
          <p className="text-gray-600">上傳學習資料，為智能試卷生成做準備</p>
        </button>

        <button 
          onClick={() => setCurrentView('forum')} 
          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-cityu-orange" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">课程交流区</h3>
          </div>
          <p className="text-gray-600">与其他同学交流课程心得和问题</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">最近課程</h3>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => (
              <div 
                key={course.id} 
                onClick={() => { 
                  setSelectedCourse(course); 
                  setCurrentView('course-detail'); 
                }} 
                className="p-4 border border-gray-200 rounded-lg hover:border-cityu-orange hover:shadow-sm transition-all cursor-pointer"
              >
                <h4 className="font-medium text-gray-800 mb-1">{course.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{course.code}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{course.department}</span>
                  <span className="mx-2">•</span>
                  <span>{course.credits} 學分</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>還沒有課程，點擊上方"添加課程"開始吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeView;