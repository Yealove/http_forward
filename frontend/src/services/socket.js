import { io } from 'socket.io-client'
import { ElMessage, ElNotification } from 'element-plus'

class SocketService {
  constructor() {
    this.socket = null
    this.currentAppId = null
    this.messageHandlers = new Map()
    this.forwardResultHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 1000
    this.isReconnecting = false
    this.connectionLost = false
  }

  // 连接到服务器
  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    // 清理旧的连接
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
    }

    console.log('正在连接WebSocket...')

    this.socket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,  // 增加超时时间
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      maxHttpBufferSize: 1e8,
      pingTimeout: 60000,  // 增加ping超时
      pingInterval: 25000,  // 增加ping间隔
      forceNew: true
    })

    this.socket.on('connect', () => {
      console.log('WebSocket连接成功:', this.socket.id)
      this.reconnectAttempts = 0
      this.isReconnecting = false
      
      // 启动心跳检测
      this.startHeartbeat()
      
      // 连接恢复后，隐藏错误提示
      if (this.connectionLost) {
        ElNotification({
          title: 'WebSocket连接已恢复',
          message: '实时功能已恢复正常',
          type: 'success',
          duration: 2000
        })
        this.connectionLost = false
      }
      
      // 如果有当前应用ID，重新加入房间
      if (this.currentAppId) {
        this.joinApp(this.currentAppId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket连接断开:', reason)
      this.connectionLost = true
      
      if (reason === 'io server disconnect') {
        // 服务器主动断开，需要重连
        this.scheduleReconnect()
      } else if (reason === 'transport close' || reason === 'ping timeout') {
        // 网络问题导致的断开，尝试重连
        this.scheduleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket连接错误:', error)
      this.connectionLost = true
      
      // 减少错误提示频率
      if (!this.isReconnecting) {
        ElMessage({
          message: 'WebSocket连接失败，正在尝试重连...',
          type: 'warning',
          duration: 3000,
          showClose: true
        })
      }
      
      this.scheduleReconnect()
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket重连成功，尝试次数: ${attemptNumber}`)
      this.isReconnecting = false
      this.reconnectAttempts = 0
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket重连尝试: ${attemptNumber}`)
      this.isReconnecting = true
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket重连失败:', error)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket重连失败，已达到最大重试次数')
      ElMessage({
        message: 'WebSocket连接失败，请刷新页面重试',
        type: 'error',
        duration: 0,
        showClose: true
      })
    })

    // 监听新消息
    this.socket.on('new-message', (message) => {
      console.log('收到新消息:', message)
      
      // 显示通知
      ElNotification({
        title: '收到新的Callback请求',
        message: `${message.method} ${message.callback_path}`,
        type: 'info',
        duration: 3000
      })

      // 触发消息处理器
      this.messageHandlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error('消息处理器错误:', error)
        }
      })
    })

    // 监听转发结果
    this.socket.on('forward-result', (result) => {
      console.log('收到转发结果:', result)
      
      // 显示通知
      const type = result.status === 'success' ? 'success' : 'error'
      const title = result.status === 'success' ? '转发成功' : '转发失败'
      const message = `${result.forward_name}: ${result.status === 'success' ? '成功' : result.error_message}`
      
      ElNotification({
        title,
        message,
        type,
        duration: 3000
      })

      // 触发转发结果处理器
      this.forwardResultHandlers.forEach(handler => {
        try {
          handler(result)
        } catch (error) {
          console.error('转发结果处理器错误:', error)
        }
      })
    })

    // 监听房间加入确认
    this.socket.on('joined-app', (data) => {
      console.log('成功加入应用房间:', data)
    })

    // 监听房间加入错误
    this.socket.on('join-app-error', (data) => {
      console.error('加入应用房间失败:', data.error)
      ElMessage.error(`加入应用房间失败: ${data.error}`)
    })

    // 监听pong响应
    this.socket.on('pong', () => {
      console.log('收到服务器pong响应')
    })

    return this.socket
  }

  // 计划重连
  scheduleReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    
    console.log(`计划在 ${delay}ms 后重连 (第 ${this.reconnectAttempts} 次尝试)`)
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        console.log('执行重连...')
        this.connect()
      }
    }, delay)
  }

  // 加入应用房间
  joinApp(appId) {
    this.currentAppId = appId
    
    if (!this.socket?.connected) {
      console.log('WebSocket未连接，正在连接...')
      this.connect()
      
      // 等待连接建立后再加入房间
      if (this.socket) {
        this.socket.once('connect', () => {
          this.socket.emit('join-app', appId)
          console.log(`加入应用房间: app-${appId}`)
        })
      }
    } else {
      this.socket.emit('join-app', appId)
      console.log(`加入应用房间: app-${appId}`)
    }
  }

  // 离开当前应用房间
  leaveApp() {
    if (this.socket?.connected && this.currentAppId) {
      this.socket.emit('leave-app', this.currentAppId)
      console.log(`离开应用房间: app-${this.currentAppId}`)
    }
    this.currentAppId = null
  }

  // 注册新消息处理器
  onNewMessage(handler) {
    const id = Symbol('message-handler')
    this.messageHandlers.set(id, handler)
    
    // 返回取消注册函数
    return () => {
      this.messageHandlers.delete(id)
    }
  }

  // 注册转发结果处理器
  onForwardResult(handler) {
    const id = Symbol('forward-result-handler')
    this.forwardResultHandlers.set(id, handler)
    
    // 返回取消注册函数
    return () => {
      this.forwardResultHandlers.delete(id)
    }
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat()
    
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    
    this.currentAppId = null
    this.reconnectAttempts = 0
    this.isReconnecting = false
    this.connectionLost = false
    this.messageHandlers.clear()
    this.forwardResultHandlers.clear()
    
    console.log('WebSocket连接已断开并清理完成')
  }

  // 获取连接状态
  isConnected() {
    return this.socket?.connected || false
  }

  // 手动ping服务器
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping')
      console.log('发送ping到服务器')
    }
  }

  // 开始心跳检测
  startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.ping()
      } else {
        console.warn('WebSocket未连接，尝试重连')
        this.connect()
      }
    }, 30000) // 每30秒检测一次
    
    console.log('WebSocket心跳检测已启动')
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('WebSocket心跳检测已停止')
    }
  }

  // 获取连接状态信息
  getConnectionInfo() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      connectionLost: this.connectionLost,
      currentAppId: this.currentAppId,
      socketId: this.socket?.id
    }
  }
}

// 创建单例实例
const socketService = new SocketService()

export default socketService