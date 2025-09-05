import React from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';

function CoursesView({ 
  courses, 
  searchQuery, 
  setSearchQuery, 
  setShowAddCourse, 
  setSelectedCourse, 
  setCurrentView 
}) {
  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">課程管理</h2>
        <button 
          onClick={() => setShowAddCourse(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          添加課程
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input 
          type="text" 
          placeholder="搜索課程..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        {filteredCourses.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredCourses.map((course) => (
              <div 
                key={course.id} 
                onClick={() => { 
                  setSelectedCourse(course); 
                  setCurrentView('course-detail'); 
                }} 
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-800">{course.name}</h3>
                      <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {course.code}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{course.description}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>{course.department}</span>
                      <span className="mx-2">•</span>
                      <span>{course.credits} 學分</span>
                      <span className="mx-2">•</span>
                      <span>{course.semester} {course.year}</span>
                      {course.instructor && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{course.instructor}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {searchQuery ? '沒有找到匹配的課程' : '還沒有課程'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? '嘗試使用不同的關鍵詞搜索' : '添加您的第一門課程開始學習之旅'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowAddCourse(true)} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加課程
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesView;