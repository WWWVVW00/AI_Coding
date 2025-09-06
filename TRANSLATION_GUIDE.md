# 翻译功能使用指南

## 功能概述

智能学习助手集成了简洁实用的翻译功能，支持用户动态上传的课程内容翻译，让用户可以选择以不同语言查看课程信息。

## 主要特性

### 🌍 多语言支持
- 支持简体中文、繁体中文、英文
- 自动语言检测
- 一键语言切换

### ⚡ 实时翻译
- 即时翻译课程内容
- 智能缓存机制
- 简洁的用户界面

### 🔄 备用方案
- Google翻译API（主要）
- 翻译失败时显示原文

## 使用方法

### 1. 语言切换
在导航栏右侧找到语言选择器：
- 点击语言选择器切换目标语言
- 支持简体中文、繁体中文、英文
- 当前选择的语言会高亮显示

### 2. 课程内容翻译
在课程列表中：
- 每个课程卡片右上角有翻译按钮（语言图标）
- 点击翻译按钮即可翻译课程名称、描述和教师信息
- 再次点击可以切换回原文
- 翻译状态会有视觉提示

## 技术实现

### 前端架构
```
src/
├── contexts/
│   └── TranslationContext.jsx     # 翻译上下文管理
├── services/
│   └── translationService.js      # 翻译服务核心
├── components/
│   ├── common/
│   │   ├── TranslationControls.jsx    # 语言选择器
│   │   └── TranslatableCourseCard.jsx # 可翻译课程卡片
│   └── layout/
│       └── Navigation.jsx             # 导航栏（集成翻译控制）
```

### 翻译服务
- 使用Google翻译免费API
- 智能语言检测
- 翻译结果缓存

## 使用示例

### 在组件中使用翻译
```javascript
import { useTranslation } from './contexts/TranslationContext';

function CourseComponent() {
  const { translateText, currentLanguage } = useTranslation();
  
  const handleTranslate = async () => {
    const result = await translateText('人工智能基础');
    console.log(result); // 根据当前语言返回翻译结果
  };
}
```

### 翻译课程对象
```javascript
const { translateCourse } = useTranslation();

const translatedCourse = await translateCourse({
  name: '人工智能基础',
  description: '本课程介绍AI基础知识',
  instructor: '张教授'
});
```

## 特点

### ✨ 简洁易用
- 一键切换语言
- 直观的翻译按钮
- 翻译状态清晰显示

### 🚀 性能优化
- 智能缓存翻译结果
- 避免重复翻译
- 翻译失败时显示原文

### 🎯 专注核心功能
- 专为课程内容翻译设计
- 支持用户动态添加的课程
- 无需预设翻译内容

## 注意事项

1. **网络要求**：翻译功能需要网络连接访问Google翻译服务
2. **语言支持**：目前支持简体中文、繁体中文、英文三种语言
3. **翻译质量**：使用Google翻译API，翻译质量较高但可能存在细微差异

---

*翻译功能让用户可以用自己熟悉的语言查看课程内容，提升学习体验*