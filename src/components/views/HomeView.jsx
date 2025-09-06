import React from 'react';
import { BookOpen, FileText, Brain, Zap, Upload, Users } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function HomeView({ 
  user, 
  courses, 
  materials, 
  papers, 
  setShowAddCourse, 
  setCurrentView, 
  setSelectedCourse 
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">{t('home.welcome', { name: user?.fullName || user?.username })}</h2>
            <p className="text-blue-100 mb-4">{t('home.subtitle')}</p>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>{t('home.courseCount', { count: courses.length })}</span>
              </div>
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <span>{t('home.materialCount', { count: materials.length })}</span>
              </div>
              <div className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                <span>{t('home.paperCount', { count: papers.length })}</span>
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
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">{t('home.addCourse')}</h3>
          </div>
          <p className="text-gray-600">{t('home.addCourseDesc')}</p>
        </button>

        <button 
          onClick={() => setCurrentView('courses')} 
          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">{t('home.uploadMaterial')}</h3>
          </div>
          <p className="text-gray-600">{t('home.uploadMaterialDesc')}</p>
        </button>

        <button 
          onClick={() => setCurrentView('forum')} 
          className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-left"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="ml-4 text-lg font-semibold text-gray-800">{t('home.forum')}</h3>
          </div>
          <p className="text-gray-600">{t('home.forumDesc')}</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('home.recentCourses')}</h3>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => (
              <div 
                key={course.id} 
                onClick={() => { 
                  setSelectedCourse(course); 
                  setCurrentView('course-detail'); 
                }} 
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <h4 className="font-medium text-gray-800 mb-1">{course.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{course.code}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{course.department}</span>
                  <span className="mx-2">•</span>
                  <span>{t('home.credits', { count: course.credits })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{t('home.noCourses')}</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default HomeView;