import React from 'react';
import { X } from 'lucide-react';

function AddCourseModal({ setShowAddCourse, handleAddCourse, newCourse, setNewCourse, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">添加新課程</h2>
          <button onClick={() => setShowAddCourse(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">課程名稱</label>
            <input 
              type="text" 
              value={newCourse.name} 
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">課程代碼</label>
            <input 
              type="text" 
              value={newCourse.code} 
              onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">院系</label>
            <input 
              type="text" 
              value={newCourse.department} 
              onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">課程描述</label>
            <textarea 
              value={newCourse.description} 
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              rows="3" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">學分</label>
              <input 
                type="number" 
                value={newCourse.credits} 
                onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) })} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                min="1" 
                max="10" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">學期</label>
              <select 
                value={newCourse.semester} 
                onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Spring">春季</option>
                <option value="Summer">夏季</option>
                <option value="Fall">秋季</option>
                <option value="Winter">冬季</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">授課教師</label>
            <input 
              type="text" 
              value={newCourse.instructor} 
              onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setShowAddCourse(false)} 
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '添加中...' : '添加課程'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCourseModal;