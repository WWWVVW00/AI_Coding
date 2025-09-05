import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

function NotificationToast({ error, success }) {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}
    </>
  );
}

export default NotificationToast;