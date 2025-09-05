import React from 'react';
import { MessageSquare } from 'lucide-react';

function ForumView() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">课程交流区</h2>
      <div className="text-center py-16 text-gray-500">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">此功能正在建设中...</p>
        <p>敬请期待一个可以自由交流课程心得、分享资料和提问的社区！</p>
      </div>
    </div>
  );
}

export default ForumView;