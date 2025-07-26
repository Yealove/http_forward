const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ForwardLog = require('../models/ForwardLog');

// 获取Callback地址下的消息列表
router.get('/callback/:callbackId', async (req, res) => {
  try {
    const { callbackId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const messages = await Message.getByCallbackUrlId(
      callbackId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('获取消息列表失败:', error);
    res.status(500).json({ success: false, error: '获取消息列表失败' });
  }
});

// 获取应用下的所有消息列表
router.get('/app/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const messages = await Message.getByAppId(
      appId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('获取应用消息列表失败:', error);
    res.status(500).json({ success: false, error: '获取应用消息列表失败' });
  }
});

// 根据ID获取消息详情（包含转发记录）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.getById(id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: '消息不存在' });
    }

    // 获取转发记录
    const forwardLogs = await ForwardLog.getByMessageId(id);
    
    res.json({ 
      success: true, 
      data: {
        ...message,
        forward_logs: forwardLogs
      }
    });
  } catch (error) {
    console.error('获取消息详情失败:', error);
    res.status(500).json({ success: false, error: '获取消息详情失败' });
  }
});

// 删除消息
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Message.delete(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '消息不存在' });
    }

    res.json({ success: true, message: '消息删除成功' });
  } catch (error) {
    console.error('删除消息失败:', error);
    res.status(500).json({ success: false, error: '删除消息失败' });
  }
});

// 清空Callback地址下的所有消息
router.delete('/callback/:callbackId/clear', async (req, res) => {
  try {
    const { callbackId } = req.params;
    const result = await Message.clearByCallbackUrlId(callbackId);
    
    res.json({ 
      success: true, 
      message: `已清空 ${result.changes} 条消息`,
      deleted_count: result.changes
    });
  } catch (error) {
    console.error('清空消息失败:', error);
    res.status(500).json({ success: false, error: '清空消息失败' });
  }
});

module.exports = router;