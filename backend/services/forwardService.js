const axios = require('axios');
const ForwardLog = require('../models/ForwardLog');
const CallbackUrl = require('../models/CallbackUrl');

class ForwardService {
  // 转发消息到指定地址
  static async forwardMessage(message, forwardUrl, io) {
    let status = 'error';
    let responseCode = null;
    let responseBody = '';
    let errorMessage = '';

    try {
      console.log(`开始转发消息 ${message.id} 到 ${forwardUrl.url}`);

      // 准备转发请求
      const headers = { ...message.headers };
      
      // 移除可能影响转发的头部
      delete headers['host'];
      delete headers['content-length'];
      delete headers['connection'];
      
      // 准备请求体
      let data = message.body;
      if (typeof data === 'string') {
        try {
          // 尝试解析JSON
          data = JSON.parse(data);
        } catch (e) {
          // 如果不是JSON，保持原样
        }
      }

      // 执行转发请求
      const response = await axios({
        method: message.method.toLowerCase(),
        url: forwardUrl.url,
        headers: headers,
        data: data,
        params: message.query_params,
        timeout: 30000, // 30秒超时
        validateStatus: function (status) {
          // 不验证状态码，让我们处理所有响应
          return true;
        }
      });

      status = 'success';
      responseCode = response.status;
      responseBody = JSON.stringify(response.data);
      
      console.log(`转发成功: ${message.id} -> ${forwardUrl.url}, 状态码: ${responseCode}`);

    } catch (error) {
      console.error(`转发失败: ${message.id} -> ${forwardUrl.url}`, error);
      
      if (error.response) {
        // 服务器响应了错误状态码
        responseCode = error.response.status;
        responseBody = JSON.stringify(error.response.data);
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        // 请求发出但没有收到响应
        errorMessage = `网络错误: ${error.message}`;
      } else {
        // 其他错误
        errorMessage = `请求错误: ${error.message}`;
      }
    }

    // 创建转发记录
    const forwardLog = await ForwardLog.create(
      message.id,
      forwardUrl.id,
      status,
      responseCode,
      responseBody,
      errorMessage
    );

    // 通过WebSocket推送转发结果
    if (io) {
      // 获取callback信息以确定推送到哪个房间
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

    return forwardLog;
  }

  // 批量转发消息到多个地址
  static async forwardToMultiple(message, forwardUrls, io) {
    const results = [];
    
    for (const forwardUrl of forwardUrls) {
      if (forwardUrl.enabled) {
        try {
          const result = await this.forwardMessage(message, forwardUrl, io);
          results.push(result);
        } catch (error) {
          console.error(`批量转发失败: ${forwardUrl.id}`, error);
          results.push({
            forward_url_id: forwardUrl.id,
            status: 'error',
            error_message: error.message
          });
        }
      }
    }
    
    return results;
  }

  // 测试转发地址连通性
  static async testForwardUrl(url) {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        timeout: 10000, // 10秒超时
        validateStatus: function (status) {
          return status < 500; // 只要不是服务器错误就算成功
        }
      });

      return {
        success: true,
        status_code: response.status,
        response_time: response.config.metadata?.endTime - response.config.metadata?.startTime || 0,
        message: '连接成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '连接失败'
      };
    }
  }
}

module.exports = ForwardService;