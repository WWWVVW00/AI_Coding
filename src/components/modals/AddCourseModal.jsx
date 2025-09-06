import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';

function AddCourseModal({ setShowAddCourse, handleAddCourse, newCourse, setNewCourse, loading }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">{t('addCourseModal.title')}</h2>
          <button onClick={() => setShowAddCourse(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.name')}</label>
            <input 
              type="text" 
              value={newCourse.name} 
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} 
              placeholder={t('addCourseModal.namePlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.code')}</label>
            <input 
              type="text" 
              value={newCourse.code} 
              onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} 
              placeholder={t('addCourseModal.codePlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.department')}</label>
            <input 
              type="text" 
              value={newCourse.department} 
              onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })} 
              placeholder={t('addCourseModal.departmentPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.description')}</label>
            <textarea 
              value={newCourse.description} 
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} 
              placeholder={t('addCourseModal.descriptionPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              rows="3" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.credits')}</label>
            <input 
              type="number" 
              value={newCourse.credits} 
              onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) || '' })} 
                placeholder={t('addCourseModal.creditsPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
              min="1" 
              max="10" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">年份</label>
              <select 
                value={newCourse.year || new Date().getFullYear()} 
                onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.semester')}</label>
              <select 
                value={newCourse.semester} 
                onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="Sem A">Sem A</option>
                <option value="Sem B">Sem B</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addCourseModal.instructor')}</label>
            <input 
              type="text" 
              value={newCourse.instructor} 
              onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })} 
              placeholder={t('addCourseModal.instructorPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setShowAddCourse(false)} 
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? t('addCourseModal.adding') : t('addCourseModal.addCourseButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCourseModal;