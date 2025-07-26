const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const CallbackUrl = require('../models/CallbackUrl');

// 获取所有应用
router.get('/', async (req, res) => {
  try {
    const applications = await Application.getAll();
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取应用列表失败:', error);
    res.status(500).json({ success: false, error: '获取应用列表失败' });
  }
});

// 根据ID获取应用详情（包含callback地址）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.getById(id);
    
    if (!application) {
      return res.status(404).json({ success: false, error: '应用不存在' });
    }

    // 获取应用下的callback地址
    const callbackUrls = await CallbackUrl.getByAppId(id);
    
    res.json({ 
      success: true, 
      data: {
        ...application,
        callback_urls: callbackUrls
      }
    });
  } catch (error) {
    console.error('获取应用详情失败:', error);
    res.status(500).json({ success: false, error: '获取应用详情失败' });
  }
});

// 创建新应用
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '应用名称不能为空' });
    }

    const application = await Application.create(name.trim());
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('创建应用失败:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ success: false, error: '应用根路径冲突，请重试' });
    } else {
      res.status(500).json({ success: false, error: '创建应用失败' });
    }
  }
});

// 更新应用
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '应用名称不能为空' });
    }

    const result = await Application.update(id, name.trim());
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '应用不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('更新应用失败:', error);
    res.status(500).json({ success: false, error: '更新应用失败' });
  }
});

// 删除应用
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Application.delete(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '应用不存在' });
    }

    res.json({ success: true, message: '应用删除成功' });
  } catch (error) {
    console.error('删除应用失败:', error);
    res.status(500).json({ success: false, error: '删除应用失败' });
  }
});

module.exports = router;