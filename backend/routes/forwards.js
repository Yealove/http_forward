const express = require('express');
const router = express.Router();
const ForwardUrl = require('../models/ForwardUrl');
const ForwardLog = require('../models/ForwardLog');
const Message = require('../models/Message');

// 获取Callback地址下的转发地址列表
router.get('/callback/:callbackId', async (req, res) => {
  try {
    const { callbackId } = req.params;
    const forwardUrls = await ForwardUrl.getByCallbackUrlId(callbackId);
    
    // 为每个转发地址获取统计信息
    const forwardUrlsWithStats = await Promise.all(
      forwardUrls.map(async (forward) => {
        const stats = await ForwardLog.getStatsByForwardUrlId(forward.id);
        return {
          ...forward,
          stats: {
            total_forwards: stats.total_forwards || 0,
            success_count: stats.success_count || 0,
            error_count: stats.error_count || 0,
            success_rate: stats.total_forwards ? 
              ((stats.success_count || 0) / stats.total_forwards * 100).toFixed(1) : '0',
            last_forward_at: stats.last_forward_at
          }
        };
      })
    );
    
    res.json({ success: true, data: forwardUrlsWithStats });
  } catch (error) {
    console.error('获取转发地址列表失败:', error);
    res.status(500).json({ success: false, error: '获取转发地址列表失败' });
  }
});

// 根据ID获取转发地址详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const forwardUrl = await ForwardUrl.getById(id);
    
    if (!forwardUrl) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    // 获取统计信息
    const stats = await ForwardLog.getStatsByForwardUrlId(id);
    
    res.json({ 
      success: true, 
      data: {
        ...forwardUrl,
        stats: {
          total_forwards: stats.total_forwards || 0,
          success_count: stats.success_count || 0,
          error_count: stats.error_count || 0,
          success_rate: stats.total_forwards ? 
            ((stats.success_count || 0) / stats.total_forwards * 100).toFixed(1) : '0',
          last_forward_at: stats.last_forward_at
        }
      }
    });
  } catch (error) {
    console.error('获取转发地址详情失败:', error);
    res.status(500).json({ success: false, error: '获取转发地址详情失败' });
  }
});

// 创建新转发地址
router.post('/', async (req, res) => {
  try {
    const { callback_url_id, name, url } = req.body;
    
    if (!callback_url_id || !name || !url) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!name.trim() || !url.trim()) {
      return res.status(400).json({ success: false, error: '名称和URL不能为空' });
    }

    // 验证URL格式
    try {
      new URL(url.trim());
    } catch (e) {
      return res.status(400).json({ success: false, error: 'URL格式不正确' });
    }

    const forwardUrl = await ForwardUrl.create(callback_url_id, name.trim(), url.trim());
    res.status(201).json({ success: true, data: forwardUrl });
  } catch (error) {
    console.error('创建转发地址失败:', error);
    res.status(500).json({ success: false, error: '创建转发地址失败' });
  }
});

// 更新转发地址
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, enabled } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!name.trim() || !url.trim()) {
      return res.status(400).json({ success: false, error: '名称和URL不能为空' });
    }

    // 验证URL格式
    try {
      new URL(url.trim());
    } catch (e) {
      return res.status(400).json({ success: false, error: 'URL格式不正确' });
    }

    const result = await ForwardUrl.update(id, name.trim(), url.trim(), enabled);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('更新转发地址失败:', error);
    res.status(500).json({ success: false, error: '更新转发地址失败' });
  }
});

// 更新启用状态
router.patch('/:id/enabled', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled必须是布尔值' });
    }

    const result = await ForwardUrl.updateEnabled(id, enabled);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('更新启用状态失败:', error);
    res.status(500).json({ success: false, error: '更新启用状态失败' });
  }
});

// 删除转发地址
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ForwardUrl.delete(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    res.json({ success: true, message: '转发地址删除成功' });
  } catch (error) {
    console.error('删除转发地址失败:', error);
    res.status(500).json({ success: false, error: '删除转发地址失败' });
  }
});

// 前端直接转发消息（推荐方式）
router.post('/send-direct', async (req, res) => {
  try {
    const { message_id, forward_url_id } = req.body;
    
    if (!message_id || !forward_url_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取消息和转发地址信息，返回给前端用于发起请求
    const message = await Message.getById(message_id);
    const forwardUrl = await ForwardUrl.getById(forward_url_id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: '消息不存在' });
    }
    
    if (!forwardUrl) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    // 返回转发所需的信息给前端
    res.json({ 
      success: true, 
      data: {
        target_url: forwardUrl.url,
        method: message.method,
        headers: message.headers,
        body: message.body,
        query_params: message.query_params,
        forward_url_id: forwardUrl.id,
        message_id: message.id
      }
    });
  } catch (error) {
    console.error('获取转发信息失败:', error);
    res.status(500).json({ success: false, error: '获取转发信息失败' });
  }
});

// 后端代理转发消息（备用方式）
router.post('/send', async (req, res) => {
  try {
    const { message_id, forward_url_id } = req.body;
    
    if (!message_id || !forward_url_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取消息和转发地址
    const message = await Message.getById(message_id);
    const forwardUrl = await ForwardUrl.getById(forward_url_id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: '消息不存在' });
    }
    
    if (!forwardUrl) {
      return res.status(404).json({ success: false, error: '转发地址不存在' });
    }

    // 执行转发
    const forwardService = require('../services/forwardService');
    const io = req.app.get('io');
    const result = await forwardService.forwardMessage(message, forwardUrl, io);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('转发消息失败:', error);
    res.status(500).json({ success: false, error: '转发消息失败' });
  }
});

// 记录前端转发结果
router.post('/log-result', async (req, res) => {
  try {
    const { message_id, forward_url_id, status, response_code, response_body, error_message } = req.body;
    
    if (!message_id || !forward_url_id || !status) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 创建转发记录
    const forwardLog = await ForwardLog.create(
      message_id,
      forward_url_id,
      status,
      response_code || null,
      response_body || '',
      error_message || ''
    );

    // 通过WebSocket推送转发结果
    const io = req.app.get('io');
    if (io) {
      const message = await Message.getById(message_id);
      const forwardUrl = await ForwardUrl.getById(forward_url_id);
      const CallbackUrl = require('../models/CallbackUrl');
      const callbackUrl = await CallbackUrl.getById(message.callback_url_id);
      
      if (callbackUrl) {
        io.to(`app-${callbackUrl.app_id}`).emit('forward-result', {
          ...forwardLog,
          forward_name: forwardUrl.name,
          forward_url: forwardUrl.url,
          message_id: message.id
        });
      }
    }

    res.json({ success: true, data: forwardLog });
  } catch (error) {
    console.error('记录转发结果失败:', error);
    res.status(500).json({ success: false, error: '记录转发结果失败' });
  }
});

// 获取转发记录
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const logs = await ForwardLog.getByForwardUrlId(
      id, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('获取转发记录失败:', error);
    res.status(500).json({ success: false, error: '获取转发记录失败' });
  }
});

module.exports = router;