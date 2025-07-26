const express = require('express');
const router = express.Router();
const CallbackUrl = require('../models/CallbackUrl');
const ForwardUrl = require('../models/ForwardUrl');

// 获取应用下的所有callback地址
router.get('/app/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const callbackUrls = await CallbackUrl.getByAppId(appId);
    
    // 为每个callback地址获取转发地址
    const callbacksWithForwards = await Promise.all(
      callbackUrls.map(async (callback) => {
        const forwardUrls = await ForwardUrl.getByCallbackUrlId(callback.id);
        return {
          ...callback,
          forward_urls: forwardUrls
        };
      })
    );
    
    res.json({ success: true, data: callbacksWithForwards });
  } catch (error) {
    console.error('获取Callback地址列表失败:', error);
    res.status(500).json({ success: false, error: '获取Callback地址列表失败' });
  }
});

// 根据ID获取callback地址详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const callbackUrl = await CallbackUrl.getById(id);
    
    if (!callbackUrl) {
      return res.status(404).json({ success: false, error: 'Callback地址不存在' });
    }

    // 获取转发地址
    const forwardUrls = await ForwardUrl.getByCallbackUrlId(id);
    
    res.json({ 
      success: true, 
      data: {
        ...callbackUrl,
        forward_urls: forwardUrls
      }
    });
  } catch (error) {
    console.error('获取Callback地址详情失败:', error);
    res.status(500).json({ success: false, error: '获取Callback地址详情失败' });
  }
});

// 创建新callback地址
router.post('/', async (req, res) => {
  try {
    const { app_id, name, path } = req.body;
    
    if (!app_id || !name || !path) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!name.trim() || !path.trim()) {
      return res.status(400).json({ success: false, error: '名称和路径不能为空' });
    }

    // 验证路径格式（不能包含特殊字符）
    const pathRegex = /^[a-zA-Z0-9\-_\/]+$/;
    if (!pathRegex.test(path.trim())) {
      return res.status(400).json({ success: false, error: '路径只能包含字母、数字、连字符、下划线和斜杠' });
    }

    const callbackUrl = await CallbackUrl.create(app_id, name.trim(), path.trim());
    res.status(201).json({ success: true, data: callbackUrl });
  } catch (error) {
    console.error('创建Callback地址失败:', error);
    res.status(500).json({ success: false, error: '创建Callback地址失败' });
  }
});

// 更新callback地址
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path, auto_forward, response_config } = req.body;
    
    if (!name || !path) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!name.trim() || !path.trim()) {
      return res.status(400).json({ success: false, error: '名称和路径不能为空' });
    }

    // 验证路径格式
    const pathRegex = /^[a-zA-Z0-9\-_\/]+$/;
    if (!pathRegex.test(path.trim())) {
      return res.status(400).json({ success: false, error: '路径只能包含字母、数字、连字符、下划线和斜杠' });
    }

    // 验证响应配置格式
    if (response_config) {
      if (response_config.status && (response_config.status < 100 || response_config.status > 599)) {
        return res.status(400).json({ success: false, error: '响应状态码必须在100-599之间' });
      }
      
      if (response_config.headers && typeof response_config.headers !== 'object') {
        return res.status(400).json({ success: false, error: '响应头必须是对象格式' });
      }
      
      if (response_config.body && typeof response_config.body !== 'string') {
        return res.status(400).json({ success: false, error: '响应体必须是字符串格式' });
      }
    }

    console.log('更新callback参数:', { id, name: name.trim(), path: path.trim(), auto_forward, response_config });
    const result = await CallbackUrl.update(id, name.trim(), path.trim(), auto_forward, response_config);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Callback地址不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('更新Callback地址失败:', error);
    res.status(500).json({ success: false, error: '更新Callback地址失败' });
  }
});

// 更新自动转发状态
router.patch('/:id/auto-forward', async (req, res) => {
  try {
    const { id } = req.params;
    const { auto_forward } = req.body;
    
    if (typeof auto_forward !== 'boolean') {
      return res.status(400).json({ success: false, error: 'auto_forward必须是布尔值' });
    }

    const result = await CallbackUrl.updateAutoForward(id, auto_forward);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Callback地址不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('更新自动转发状态失败:', error);
    res.status(500).json({ success: false, error: '更新自动转发状态失败' });
  }
});

// 删除callback地址
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CallbackUrl.delete(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Callback地址不存在' });
    }

    res.json({ success: true, message: 'Callback地址删除成功' });
  } catch (error) {
    console.error('删除Callback地址失败:', error);
    res.status(500).json({ success: false, error: '删除Callback地址失败' });
  }
});

module.exports = router;