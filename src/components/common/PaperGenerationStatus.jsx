import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

function PaperGenerationStatus({ paperId, onComplete, onError }) {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!paperId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/papers/${paperId}/generation-status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.generationStatus.status);
          setProgress(data.generationStatus.progress || '');

          if (data.generationStatus.status === 'completed') {
            onComplete && onComplete(data);
          } else if (data.generationStatus.status === 'failed') {
            const errorMsg = data.generationStatus.error || '生成失败';
            setError(errorMsg);
            onError && onError(errorMsg);
          }
        }
      } catch (err) {
        const errorMsg = `查询状态失败: ${err.message}`;
        setError(errorMsg);
        onError && onError(errorMsg);
      }
    };

    // 立即查询一次
    pollStatus();

    // 如果状态不是最终状态，开始轮询
    const interval = setInterval(() => {
      if (status === 'completed' || status === 'failed') {
        clearInterval(interval);
      } else {
        pollStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paperId, status, onComplete, onError]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'processing':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return '等待处理';
      case 'processing':
        return 'AI正在生成';
      case 'completed':
        return '生成完成';
      case 'failed':
        return '生成失败';
      default:
        return '准备中';
    }
  };

  if (!paperId) return null;

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{getStatusText()}</h4>
            {status === 'processing' && (
              <span className="text-xs text-purple-600 font-medium">处理中...</span>
            )}
          </div>
          
          {progress && (
            <p className="text-sm text-gray-600 mt-1">{progress}</p>
          )}
          
          {error && (
            <div className="flex items-center mt-2">
              <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {status === 'completed' && (
            <p className="text-sm text-green-600 mt-1">
              试卷已成功生成，可在"共享试卷"标签页查看
            </p>
          )}
        </div>
      </div>
      
      {/* 进度条 */}
      {status === 'processing' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaperGenerationStatus;
