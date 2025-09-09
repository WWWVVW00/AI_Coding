// backend/routes/translate.js (新建文件)
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// 缓存翻译结果以减少API调用
const translationCache = new Map();

router.post('/', authenticateToken, async (req, res) => {
  const { text, toLang } = req.body;

  if (!text || !toLang) {
    return res.status(400).json({ error: 'Missing text or toLang' });
  }

  const cacheKey = `${toLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return res.json({ translatedText: translationCache.get(cacheKey) });
  }

  try {
    const fromLang = 'auto'; // 让 Google 自动检测
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const translatedText = response.data[0][0][0];
    translationCache.set(cacheKey, translatedText); // 存入缓存

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation failed on backend:', error.message);
    res.status(500).json({ error: 'Translation service failed' });
  }
});

module.exports = router;