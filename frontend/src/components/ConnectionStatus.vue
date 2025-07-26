<template>
  <div class="connection-status">
    <el-badge 
      :value="status.reconnectAttempts > 0 ? status.reconnectAttempts : ''" 
      :hidden="!status.isReconnecting"
      :type="getBadgeType()"
    >
      <el-button 
        :type="getButtonType()" 
        :loading="status.isReconnecting"
        @click="handleClick"
        size="small"
        circle
      >
        <el-icon v-if="!status.isReconnecting">
          <Connection v-if="status.connected" />
          <Close v-else />
        </el-icon>
      </el-button>
    </el-badge>
    
    <el-tooltip :content="getTooltipContent()" placement="bottom">
      <span class="status-text" :class="getStatusClass()">
        {{ getStatusText() }}
      </span>
    </el-tooltip>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Connection, Close } from '@element-plus/icons-vue'
import socketService from '@/services/socket'

const status = ref({
  connected: false,
  reconnectAttempts: 0,
  isReconnecting: false,
  connectionLost: false,
  currentAppId: null,
  socketId: null
})

let statusCheckInterval = null

// 更新状态
const updateStatus = () => {
  status.value = socketService.getConnectionInfo()
}

// 获取按钮类型
const getButtonType = () => {
  if (status.value.connected) return 'success'
  if (status.value.isReconnecting) return 'warning'
  return 'danger'
}

// 获取徽章类型
const getBadgeType = () => {
  if (status.value.reconnectAttempts > 5) return 'danger'
  if (status.value.reconnectAttempts > 2) return 'warning'
  return 'primary'
}

// 获取状态文本
const getStatusText = () => {
  if (status.value.connected) return '已连接'
  if (status.value.isReconnecting) return '重连中'
  return '已断开'
}

// 获取状态样式
const getStatusClass = () => {
  if (status.value.connected) return 'connected'
  if (status.value.isReconnecting) return 'reconnecting'
  return 'disconnected'
}

// 获取提示内容
const getTooltipContent = () => {
  const info = []
  
  if (status.value.connected) {
    info.push('WebSocket连接正常')
    if (status.value.socketId) {
      info.push(`连接ID: ${status.value.socketId}`)
    }
    if (status.value.currentAppId) {
      info.push(`当前应用: ${status.value.currentAppId}`)
    }
  } else {
    info.push('WebSocket连接断开')
    if (status.value.isReconnecting) {
      info.push(`重连尝试: ${status.value.reconnectAttempts}次`)
    }
  }
  
  return info.join('\n')
}

// 点击处理
const handleClick = () => {
  if (!status.value.connected && !status.value.isReconnecting) {
    // 手动重连
    socketService.connect()
  } else if (status.value.connected) {
    // 手动ping
    socketService.ping()
  }
}

onMounted(() => {
  // 立即更新状态
  updateStatus()
  
  // 定期更新状态
  statusCheckInterval = setInterval(updateStatus, 1000)
})

onUnmounted(() => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
})
</script>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.status-text.connected {
  color: #67c23a;
}

.status-text.reconnecting {
  color: #e6a23c;
}

.status-text.disconnected {
  color: #f56c6c;
}

:deep(.el-badge__content) {
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  min-width: 16px;
}
</style>