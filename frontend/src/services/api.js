import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
api.interceptors.response.use(
  response => {
    const { data } = response
    if (data.success === false) {
      ElMessage.error(data.error || '请求失败')
      return Promise.reject(new Error(data.error))
    }
    return data
  },
  error => {
    console.error('API请求错误:', error)
    const message = error.response?.data?.error || error.message || '网络请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

// 应用相关API
export const applicationApi = {
  // 获取所有应用
  getAll: () => api.get('/applications'),
  
  // 根据ID获取应用详情
  getById: (id) => api.get(`/applications/${id}`),
  
  // 创建应用
  create: (name) => api.post('/applications', { name }),
  
  // 更新应用
  update: (id, name) => api.put(`/applications/${id}`, { name }),
  
  // 删除应用
  delete: (id) => api.delete(`/applications/${id}`)
}

// Callback地址相关API
export const callbackApi = {
  // 获取应用下的callback地址
  getByAppId: (appId) => api.get(`/callbacks/app/${appId}`),
  
  // 根据ID获取callback地址详情
  getById: (id) => api.get(`/callbacks/${id}`),
  
  // 创建callback地址
  create: (appId, name, path) => api.post('/callbacks', {
    app_id: appId,
    name,
    path
  }),
  
  // 更新callback地址
  update: (id, name, path, autoForward, responseConfig = null) => api.put(`/callbacks/${id}`, {
    name,
    path,
    auto_forward: autoForward,
    response_config: responseConfig
  }),
  
  // 更新自动转发状态
  updateAutoForward: (id, autoForward) => api.patch(`/callbacks/${id}/auto-forward`, {
    auto_forward: autoForward
  }),
  
  // 删除callback地址
  delete: (id) => api.delete(`/callbacks/${id}`)
}

// 消息相关API
export const messageApi = {
  // 获取callback地址下的消息
  getByCallbackId: (callbackId, params = {}) => api.get(`/messages/callback/${callbackId}`, { params }),
  
  // 获取应用下的所有消息
  getByAppId: (appId, params = {}) => api.get(`/messages/app/${appId}`, { params }),
  
  // 根据ID获取消息详情
  getById: (id) => api.get(`/messages/${id}`),
  
  // 删除消息
  delete: (id) => api.delete(`/messages/${id}`),
  
  // 清空callback地址下的所有消息
  clearByCallbackId: (callbackId) => api.delete(`/messages/callback/${callbackId}/clear`)
}

// 转发相关API
export const forwardApi = {
  // 获取callback地址下的转发地址
  getByCallbackId: (callbackId) => api.get(`/forwards/callback/${callbackId}`),
  
  // 根据ID获取转发地址详情
  getById: (id) => api.get(`/forwards/${id}`),
  
  // 创建转发地址
  create: (callbackUrlId, name, url) => api.post('/forwards', {
    callback_url_id: callbackUrlId,
    name,
    url
  }),
  
  // 更新转发地址
  update: (id, name, url, enabled) => api.put(`/forwards/${id}`, {
    name,
    url,
    enabled
  }),
  
  // 更新启用状态
  updateEnabled: (id, enabled) => api.patch(`/forwards/${id}/enabled`, {
    enabled
  }),
  
  // 删除转发地址
  delete: (id) => api.delete(`/forwards/${id}`),
  
  // 获取转发信息（用于前端直接转发）
  getForwardInfo: (messageId, forwardUrlId) => api.post('/forwards/send-direct', {
    message_id: messageId,
    forward_url_id: forwardUrlId
  }),
  
  // 后端代理转发（备用）
  sendViaBackend: (messageId, forwardUrlId) => api.post('/forwards/send', {
    message_id: messageId,
    forward_url_id: forwardUrlId
  }),
  
  // 记录前端转发结果
  logResult: (messageId, forwardUrlId, status, responseCode, responseBody, errorMessage) => api.post('/forwards/log-result', {
    message_id: messageId,
    forward_url_id: forwardUrlId,
    status,
    response_code: responseCode,
    response_body: responseBody,
    error_message: errorMessage
  }),
  
  // 获取转发记录
  getLogs: (id, params = {}) => api.get(`/forwards/${id}/logs`, { params })
}

export default api