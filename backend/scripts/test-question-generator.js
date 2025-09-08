#!/usr/bin/env node

/**
 * 测试问题生成器连接和功能
 */

const axios = require('axios');

const QUESTION_GENERATOR_URL = process.env.QUESTION_GENERATOR_URL || 'http://localhost:8000';

async function testQuestionGenerator() {
  console.log('🧪 测试问题生成器连接...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${QUESTION_GENERATOR_URL}/health`, {
      timeout: 10000
    });
    console.log('✅ 健康检查通过:', healthResponse.data);

    // 2. 测试服务信息
    console.log('\n2. 测试服务信息...');
    const infoResponse = await axios.get(`${QUESTION_GENERATOR_URL}/`, {
      timeout: 10000
    });
    console.log('✅ 服务信息:', infoResponse.data);

    // 3. 测试问题生成任务提交
    console.log('\n3. 测试问题生成任务提交...');
    const taskResponse = await axios.post(`${QUESTION_GENERATOR_URL}/tasks/generate`, {
      materials: `
        人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，
        它试图理解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
        该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。
        
        机器学习是人工智能的一个子领域，专注于让计算机系统从数据中自动学习和改进。
        深度学习又是机器学习的一个分支，使用多层神经网络来模拟人脑的学习过程。
      `,
      num_questions: 3
    }, {
      timeout: 10000
    });
    
    console.log('✅ 任务提交成功:', taskResponse.data);
    const taskId = taskResponse.data.task_id;

    // 4. 轮询任务状态
    console.log('\n4. 轮询任务状态...');
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 20; // 最多等待60秒

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
      attempts++;

      try {
        const statusResponse = await axios.get(`${QUESTION_GENERATOR_URL}/tasks/${taskId}/status`);
        status = statusResponse.data.status;
        console.log(`⏳ 状态检查 ${attempts}/${maxAttempts}: ${status} - ${statusResponse.data.progress || ''}`);
      } catch (error) {
        console.log(`❌ 状态查询失败 (尝试 ${attempts}):`, error.message);
      }
    }

    if (status === 'completed') {
      // 5. 获取生成结果
      console.log('\n5. 获取生成结果...');
      const resultResponse = await axios.get(`${QUESTION_GENERATOR_URL}/tasks/${taskId}/result`);
      console.log('✅ 生成完成!');
      console.log('📝 生成的问题:');
      
      resultResponse.data.result.questions.forEach((q, index) => {
        console.log(`\n问题 ${index + 1}:`);
        console.log(`难度: ${q.difficulty}`);
        console.log(`主题: ${q.topic}`);
        console.log(`问题: ${q.question}`);
        console.log(`答案: ${q.answer.substring(0, 100)}...`);
      });

      console.log(`\n⏱️  生成时间: ${resultResponse.data.result.generation_time}秒`);
    } else {
      console.log(`❌ 任务未完成，最终状态: ${status}`);
    }

    console.log('\n🎉 测试完成！');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ 无法连接到问题生成器服务');
      console.error('请确保问题生成器正在运行在:', QUESTION_GENERATOR_URL);
      console.error('启动命令: cd question_generator && python app.py');
    } else if (error.response) {
      console.error('❌ API错误:', error.response.status, error.response.data);
    } else {
      console.error('❌ 测试失败:', error.message);
    }
    
    process.exit(1);
  }
}

// 运行测试
testQuestionGenerator();
