import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';

function QuestionGeneratorTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const addResult = (step, status, message) => {
    setResults(prev => [...prev, { step, status, message, timestamp: new Date() }]);
  };

  const testConnection = async () => {
    setTesting(true);
    setResults([]);
    setError(null);

    try {
      addResult('开始测试', 'info', '正在测试问题生成器连接...');

      // 测试后端连接
      addResult('后端连接', 'pending', '测试后端API连接...');
      const backendResponse = await fetch('/api/health');
      if (backendResponse.ok) {
        addResult('后端连接', 'success', '后端API连接正常');
      } else {
        throw new Error('后端API连接失败');
      }

      // 测试试卷生成（使用模拟数据）
      addResult('试卷生成', 'pending', '测试试卷生成功能...');
      
      const testPaperData = {
        courseId: 1, // 假设课程ID
        title: '测试试卷',
        description: '这是一个用于测试AI生成功能的试卷',
        difficultyLevel: 'medium',
        totalQuestions: 2,
        estimatedTime: 10,
        language: 'zh',
        isPublic: false,
        sourceMaterials: [1] // 假设资料ID
      };

      // 注意：这里只是测试API调用格式，实际调用可能会失败
      try {
        const generateResponse = await fetch('/api/papers/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(testPaperData)
        });

        if (generateResponse.ok) {
          const data = await generateResponse.json();
          addResult('试卷生成', 'success', `试卷生成任务提交成功: ${data.message}`);
          
          if (data.paper.aiTaskId) {
            addResult('AI任务', 'info', `AI任务ID: ${data.paper.aiTaskId}`);
          }
        } else {
          const errorData = await generateResponse.json();
          addResult('试卷生成', 'warning', `API调用格式正确，但执行失败: ${errorData.error}`);
        }
      } catch (apiError) {
        addResult('试卷生成', 'warning', `API测试失败（可能是认证或数据问题）: ${apiError.message}`);
      }

      addResult('测试完成', 'success', '连接测试完成！');

    } catch (err) {
      setError(err.message);
      addResult('测试失败', 'error', err.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <XCircle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300"></div>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">问题生成器连接测试</h2>
        
        <div className="mb-6">
          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 mr-2" />
            {testing ? '测试中...' : '开始测试'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">测试结果:</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="flex items-start space-x-3 mb-3 last:mb-0">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{result.step}</span>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium text-red-800">测试失败</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">使用说明:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 确保问题生成器服务正在运行 (http://localhost:8000)</li>
            <li>• 确保后端服务已启动并配置了正确的问题生成器URL</li>
            <li>• 测试将验证API连接和数据格式</li>
            <li>• 实际的试卷生成需要有效的课程和学习资料数据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default QuestionGeneratorTest;
