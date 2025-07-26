import axios from 'axios'
import { forwardApi } from './api'
import { ElMessage } from 'element-plus'

class ForwardService {
  // 前端直接转发消息
  async forwardMessage(messageId, forwardUrlId) {
    try {
      // 获取转发信息
      const response = await forwardApi.getForwardInfo(messageId, forwardUrlId)
      const { target_url, method, headers, body, query_params } = response.data

      let status = 'error'
      let responseCode = null
      let responseBody = ''
      let errorMessage = ''

      try {
        // 准备请求头
        const requestHeaders = { ...headers }
        
        // 移除可能导致CORS问题的头部
        delete requestHeaders['host']
        delete requestHeaders['origin']
        delete requestHeaders['referer']
        delete requestHeaders['content-length']
        delete requestHeaders['connection']
        delete requestHeaders['upgrade-insecure-requests']
        delete requestHeaders['sec-fetch-dest']
        delete requestHeaders['sec-fetch-mode']
        delete requestHeaders['sec-fetch-site']
        delete requestHeaders['sec-fetch-user']

        // 准备请求体
        let requestData = body
        if (typeof requestData === 'string' && requestData) {
          try {
            requestData = JSON.parse(requestData)
          } catch (e) {
            // 如果不是JSON，保持原样
          }
        }

        console.log('开始转发请求:', {
          url: target_url,
          method: method.toLowerCase(),
          headers: requestHeaders,
          data: requestData,
          params: query_params
        })

        // 发起转发请求
        const forwardResponse = await axios({
          url: target_url,
          method: method.toLowerCase(),
          headers: requestHeaders,
          data: requestData,
          params: query_params,
          timeout: 30000,
          validateStatus: () => true // 接受所有状态码
        })

        status = 'success'
        responseCode = forwardResponse.status
        responseBody = JSON.stringify(forwardResponse.data)

        console.log('转发成功:', {
          status: responseCode,
          data: forwardResponse.data
        })

        ElMessage.success(`转发成功 (${responseCode})`)

      } catch (error) {
        console.error('转发请求失败:', error)

        if (error.response) {
          responseCode = error.response.status
          responseBody = JSON.stringify(error.response.data)
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`
        } else if (error.request) {
          errorMessage = `网络错误: ${error.message}`
        } else {
          errorMessage = `请求错误: ${error.message}`
        }

        ElMessage.error(`转发失败: ${errorMessage}`)
      }

      // 记录转发结果
      await forwardApi.logResult(
        messageId,
        forwardUrlId,
        status,
        responseCode,
        responseBody,
        errorMessage
      )

      return {
        status,
        responseCode,
        responseBody,
        errorMessage
      }

    } catch (error) {
      console.error('转发服务错误:', error)
      ElMessage.error('转发服务异常')
      throw error
    }
  }

  // 后端代理转发（备用方案）
  async forwardViaBackend(messageId, forwardUrlId) {
    try {
      const response = await forwardApi.sendViaBackend(messageId, forwardUrlId)
      
      if (response.data.status === 'success') {
        ElMessage.success('转发成功')
      } else {
        ElMessage.error(`转发失败: ${response.data.error_message}`)
      }

      return response.data
    } catch (error) {
      console.error('后端转发失败:', error)
      ElMessage.error('后端转发失败')
      throw error
    }
  }

  // 批量转发到多个地址
  async forwardToMultiple(messageId, forwardUrls) {
    const results = []
    
    for (const forwardUrl of forwardUrls) {
      if (forwardUrl.enabled) {
        try {
          const result = await this.forwardMessage(messageId, forwardUrl.id)
          results.push({
            forwardUrl,
            result
          })
        } catch (error) {
          results.push({
            forwardUrl,
            result: {
              status: 'error',
              errorMessage: error.message
            }
          })
        }
      }
    }

    return results
  }

  // 测试转发地址连通性
  async testForwardUrl(url) {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        timeout: 10000,
        validateStatus: (status) => status < 500
      })

      return {
        success: true,
        statusCode: response.status,
        message: '连接成功'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '连接失败'
      }
    }
  }

  // 格式化数据用于显示
  formatData(data) {
    if (!data) return ''
    
    if (typeof data === 'string') {
      try {
        // 尝试解析JSON并格式化
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      } catch (e) {
        // 如果不是JSON，直接返回
        return data
      }
    }
    
    return JSON.stringify(data, null, 2)
  }

  // 检测数据类型
  detectDataType(data) {
    if (!data) return 'text'
    
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
        return 'json'
      } catch (e) {
        // 检测是否为XML
        if (data.trim().startsWith('<') && data.trim().endsWith('>')) {
          return 'xml'
        }
        return 'text'
      }
    }
    
    return 'json'
  }
}

// 创建单例实例
const forwardService = new ForwardService()

export default forwardService