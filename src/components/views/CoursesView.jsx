import React from 'react';
import { Search, BookOpen } from 'lucide-react';
import TranslatableCourseCard from '../common/TranslatableCourseCard';
import { useTranslation } from '../../contexts/TranslationContext';

function CoursesView({ 
  courses, 
  searchQuery, 
  setSearchQuery, 
  setShowAddCourse, 
  setSelectedCourse, 
  setCurrentView 
}) {
  const { t } = useTranslation();

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('courses.title')}</h2>
          <p className="text-gray-500 mt-1">{t('courses.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowAddCourse(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center mt-4 sm:mt-0"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {t('courses.addCourse')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input 
          type="text" 
          placeholder={t('courses.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="space-y-4">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <TranslatableCourseCard
              key={course.id}
              course={course}
              onClick={() => { 
                setSelectedCourse(course); 
                setCurrentView('course-detail'); 
              }}
            />
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchQuery ? t('courses.noResults') : t('courses.noCourses')}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? t('courses.noResultsDesc') : t('courses.noCoursesDesc')}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setShowAddCourse(true)} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('courses.addCourse')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesView;