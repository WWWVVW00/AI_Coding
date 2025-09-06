import React, { useState, useEffect } from 'react';
import { Clock, User } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function TranslatableCourseCard({ course, onClick, className = '' }) {
  const { t, currentLanguage, translateDynamic, setIsTranslating } = useTranslation();
  const [displayCourse, setDisplayCourse] = useState(course);

  useEffect(() => {
    // 当语言改变时，自动翻译课程内容
    const translate = async () => {
      // 假设 'zh-cn' 是原始语言，如果切换到原始语言，则直接显示原始课程
      if (currentLanguage === 'zh-cn') {
        setDisplayCourse(course);
        return;
      }
      
      setIsTranslating(true);
      try {
        const translated = await translateDynamic(course);
        setDisplayCourse(translated);
      } catch (error) {
        console.error('课程翻译失败:', error);
        setDisplayCourse(course); // 失败时回退到原始课程
      } finally {
        setIsTranslating(false);
      }
    };

    translate();
  }, [currentLanguage, course, translateDynamic, setIsTranslating]);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="p-6">
        {/* 课程标题 */}
        <div className="flex items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
            {displayCourse.name}
          </h3>
          {course.code && (
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {course.code}
            </span>
          )}
        </div>

        {/* 课程描述 */}
        {displayCourse.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {displayCourse.description}
          </p>
        )}

        {/* 课程元信息 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4 flex-wrap">
            {displayCourse.department && (
              <span>{displayCourse.department}</span>
            )}
            {course.credits && (
              <>
                <span className="mx-2">•</span>
                <span>{t('home.credits', { count: course.credits })}</span>
              </>
            )}
            {course.semester && course.year && (
              <>
                <span className="mx-2">•</span>
                <span>{course.semester} {course.year}</span>
              </>
            )}
            {displayCourse.instructor && (
              <>
                <span className="mx-2">•</span>
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{displayCourse.instructor}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslatableCourseCard;