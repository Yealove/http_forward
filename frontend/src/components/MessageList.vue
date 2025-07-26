<template>
  <div class="message-list">
    <div class="list-header">
      <div class="header-left">
        <!-- Callback地址过滤器 -->
    <div v-if="callbackTabs && callbackTabs.length > 0" class="callback-filter">
      <div class="filter-header">
        <span class="filter-label">过滤Callback地址:</span>
      </div>
      <div class="filter-list">
        <el-checkbox-group v-model="selectedCallbackIds" @change="handleCallbackFilterChange">
          <el-checkbox 
            :label="'all'"
            class="callback-checkbox all-checkbox"
            :indeterminate="isIndeterminate"
          >
            <div class="callback-item">
              <span class="callback-name">全部</span>
            </div>
          </el-checkbox>
          <el-checkbox 
            v-for="callback in callbackTabs" 
            :key="callback.id"
            :label="callback.id"
            class="callback-checkbox"
          >
            <div class="callback-item">
              <span class="callback-name">{{ callback.name }}</span>
              <!-- <span class="callback-path">{{ callback.path }}</span> -->
            </div>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
        <!-- <h3>{{ selectedCallback ? `${selectedCallback.name} - 消息记录` : '所有消息记录' }}</h3>
        <p class="header-desc">实时显示收到的Callback请求，支持数据格式化和转发操作</p> -->
      </div>
      <div class="header-actions">
        <el-button @click="refreshMessages">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button
          @click="clearMessages" 
          type="danger" 
          plain
        >
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container">
      <div 
        v-for="message in filteredMessages" 
        :key="message.id" 
        class="message-card"
        @click="toggleMessageDetails(message)"
      >
        <div class="message-header">
          <div class="message-info">
            <div class="method-badge" :class="`method-${message.method.toLowerCase()}`">
              {{ message.method }}
            </div>
            <span class="callback-name" v-if="message.callback_name">
              {{ message.callback_name }}
            </span>
            <span class="message-path" v-if="message.callback_path">
              {{ message.callback_path }}
            </span>
            <span class="message-time">{{ formatTime(message.received_at) }}</span>
          </div>
          <div class="message-actions">
            <el-button 
              @click.stop="toggleMessageDetails(message)" 
              text 
              size="small"
            >
              <el-icon><View /></el-icon>
              {{ message.showDetails ? '收起' : '详情' }}
            </el-button>
            <template v-if="getMessageForwardUrls(message).length > 0">
              <el-dropdown trigger="click" @command="handleForwardCommand" @click.stop>
                <el-button type="primary" size="small" @click.stop>
                  <el-icon><Position /></el-icon>
                  转发
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-for="forward in getMessageForwardUrls(message)" 
                      :key="forward.id"
                      :command="{ action: 'single', messageId: message.id, forwardId: forward.id, forward }"
                    >
                      <el-icon><Position /></el-icon>
                      {{ forward.name }}
                    </el-dropdown-item>
                    <el-dropdown-item 
                      v-if="getMessageForwardUrls(message).length > 1"
                      :command="{ action: 'all', messageId: message.id, forwards: getMessageForwardUrls(message) }"
                      divided
                    >
                      <el-icon><Promotion /></el-icon>
                      转发到所有地址
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-dropdown trigger="click" @click.stop>
                <el-button type="info" size="small" @click.stop>
                  <el-icon><Position /></el-icon>
                  转发
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="goToCallbackManagement(message)" v-if="!props.selectedCallback">
                      <el-icon><Setting /></el-icon>
                      管理此Callback的转发地址
                    </el-dropdown-item>
                    <el-dropdown-item disabled divided>
                      <el-icon><Warning /></el-icon>
                      点击上方按钮配置转发地址
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </div>
        </div>

        <!-- 消息详情 -->
        <div v-if="message.showDetails" class="message-details" @click.stop>
          <el-tabs v-model="message.activeTab" type="card">
            <el-tab-pane label="请求信息" name="request">
              <div class="detail-section">
                <h4>基本信息</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">请求方法:</span>
                    <span class="info-value">{{ message.method }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">IP地址:</span>
                    <span class="info-value">{{ message.ip_address || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">User-Agent:</span>
                    <span class="info-value">{{ message.user_agent || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">接收时间:</span>
                    <span class="info-value">{{ formatFullTime(message.received_at) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="Object.keys(message.headers).length > 0" class="detail-section">
                <h4>请求头</h4>
                <div class="headers-list">
                  <div 
                    v-for="(value, key) in message.headers" 
                    :key="key"
                    class="header-item"
                  >
                    <span class="header-key">{{ key }}:</span>
                    <span class="header-value">{{ value }}</span>
                  </div>
                </div>
              </div>

              <div v-if="Object.keys(message.query_params).length > 0" class="detail-section">
                <h4>查询参数</h4>
                <div class="params-list">
                  <div 
                    v-for="(value, key) in message.query_params" 
                    :key="key"
                    class="param-item"
                  >
                    <span class="param-key">{{ key }}:</span>
                    <span class="param-value">{{ value }}</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="请求体" name="body">
              <div class="body-section">
                <div class="body-toolbar">
                  <div class="body-info">
                    <span class="data-type">{{ getDataType(message.body) }}</span>
                    <span class="data-size">{{ getDataSize(message.body) }}</span>
                  </div>
                  <div class="body-actions">
                    <el-button 
                      @click="formatData(message)" 
                      size="small"
                      :disabled="!canFormat(message.body)"
                    >
                      <el-icon><Document /></el-icon>
                      格式化
                    </el-button>
                    <el-button 
                      @click="copyData(message.body)" 
                      size="small"
                    >
                      <el-icon><DocumentCopy /></el-icon>
                      复制
                    </el-button>
                  </div>
                </div>
                <div class="body-content">
                  <pre v-if="message.body" class="body-text">{{ message.formattedBody || message.body }}</pre>
                  <div v-else class="empty-body">无请求体内容</div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="转发记录" name="forwards">
              <ForwardLogs :message-id="message.id" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-if="messages.length === 0" 
      description="暂无消息记录"
      :image-size="160"
    />

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button @click="loadMore" :loading="loadingMore">
        加载更多
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, Delete, View, Position, ArrowDown, Promotion, 
  Document, DocumentCopy, Warning, Setting 
} from '@element-plus/icons-vue'
import { messageApi, forwardApi, callbackApi } from '@/services/api'
import socketService from '@/services/socket'
import forwardService from '@/services/forward'
import ForwardLogs from './ForwardLogs.vue'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  appId: [String, Number],
  selectedCallback: Object,
  rootPath: String
})

const emit = defineEmits(['go-to-callback'])

const messages = ref([])
const forwardUrls = ref([])
const callbackForwardUrls = ref(new Map()) // 存储每个callback的转发地址
const callbackTabs = ref([]) // 存储callback标签页数据
const selectedCallbackIds = ref(['all']) // 选中的callback ID列表，默认选中全部
const hasMore = ref(true)
const loadingMore = ref(false)
const limit = 50

// 启用的转发地址
const enabledForwardUrls = computed(() => {
  return forwardUrls.value.filter(forward => forward.enabled)
})

// 全选状态计算
const isIndeterminate = computed(() => {
  const nonAllSelected = selectedCallbackIds.value.filter(id => id !== 'all')
  const hasAll = selectedCallbackIds.value.includes('all')
  return !hasAll && nonAllSelected.length > 0 && nonAllSelected.length < callbackTabs.value.length
})

// 过滤后的消息列表
const filteredMessages = computed(() => {
  if (selectedCallbackIds.value.includes('all') || selectedCallbackIds.value.length === 0) {
    // 如果选中了"全部"或没有选中任何callback，显示所有消息
    return messages.value
  }
  
  // 显示选中callback的消息
  return messages.value.filter(message => 
    selectedCallbackIds.value.includes(message.callback_url_id)
  )
})

// 加载消息列表
const loadMessages = async (reset = true) => {
  try {
    const params = {
      limit,
      offset: reset ? 0 : messages.value.length
    }

    let response
    if (props.selectedCallback) {
      response = await messageApi.getByCallbackId(props.selectedCallback.id, params)
    } else {
      response = await messageApi.getByAppId(props.appId, params)
      // 加载callback标签页数据
      if (reset) {
        await loadCallbackTabs()
      }
    }

    const newMessages = response.data.map((msg, index) => ({
      ...msg,
      showDetails: reset && index === 0, // 第一条消息默认展开
      activeTab: 'request',
      formattedBody: null
    }))

    if (reset) {
      messages.value = newMessages
    } else {
      messages.value.push(...newMessages)
    }

    hasMore.value = newMessages.length === limit
  } catch (error) {
    console.error('加载消息列表失败:', error)
  }
}

// 加载callback标签页数据
const loadCallbackTabs = async () => {
  try {
    const response = await callbackApi.getByAppId(props.appId)
    callbackTabs.value = response.data
    // 默认选中"全部"
    selectedCallbackIds.value = ['all']
    
    // 预加载所有callback的转发地址
    for (const callback of callbackTabs.value) {
      loadForwardUrlsForCallback(callback.id)
    }
  } catch (error) {
    console.error('加载callback标签页失败:', error)
  }
}

// 加载转发地址（现在通过异步方式按需加载）
const loadForwardUrls = async () => {
  // 简化：不再预加载，由 getMessageForwardUrls 按需加载
  forwardUrls.value = []
}

// 刷新消息
const refreshMessages = () => {
  loadMessages(true)
}

// 清空消息
const clearMessages = async () => {
  if (!props.selectedCallback) return

  try {
    await ElMessageBox.confirm(
      `确定要清空 "${props.selectedCallback.name}" 下的所有消息记录吗？`,
      '清空确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await messageApi.clearByCallbackId(props.selectedCallback.id)
    ElMessage.success('消息记录已清空')
    loadMessages(true)
  } catch (error) {
    if (error === 'cancel') return
    console.error('清空消息失败:', error)
  }
}

// 加载更多
const loadMore = () => {
  loadingMore.value = true
  loadMessages(false).finally(() => {
    loadingMore.value = false
  })
}

// 切换消息详情（现在通过点击消息行触发）
const toggleMessageDetails = (message) => {
  message.showDetails = !message.showDetails
}

// 处理callback过滤变化
const handleCallbackFilterChange = (selectedIds) => {
  const hasAll = selectedIds.includes('all')
  const specificIds = selectedIds.filter(id => id !== 'all')
  
  if (hasAll && specificIds.length > 0) {
    // 如果选中了"全部"和具体项，判断哪个是新选中的
    const previousHasAll = selectedCallbackIds.value.includes('all')
    const previousSpecificIds = selectedCallbackIds.value.filter(id => id !== 'all')
    
    if (!previousHasAll && hasAll) {
      // 新选中了"全部"，清除具体项
      selectedCallbackIds.value = ['all']
    } else if (specificIds.length > previousSpecificIds.length) {
      // 新选中了具体项，移除"全部"
      selectedCallbackIds.value = specificIds
    } else {
      // 保持当前状态
      selectedCallbackIds.value = selectedIds
    }
  } else {
    // 正常更新
    selectedCallbackIds.value = selectedIds
  }
}

// 获取消息对应的转发地址
const getMessageForwardUrls = (message) => {
  // 从缓存中获取该callback的转发地址
  if (message.callback_url_id) {
    const cached = callbackForwardUrls.value.get(message.callback_url_id)
    if (cached) {
      return cached.filter(forward => forward.enabled)
    }
    
    // 如果没有缓存，异步加载
    loadForwardUrlsForCallback(message.callback_url_id)
  }
  
  return []
}

// 为特定callback加载转发地址
const loadForwardUrlsForCallback = async (callbackUrlId) => {
  try {
    const response = await forwardApi.getByCallbackId(callbackUrlId)
    callbackForwardUrls.value.set(callbackUrlId, response.data)
  } catch (error) {
    console.error('加载转发地址失败:', error)
    callbackForwardUrls.value.set(callbackUrlId, [])
  }
}

// 处理转发命令
const handleForwardCommand = async (command) => {
  if (command.action === 'single') {
    try {
      await forwardService.forwardMessage(command.messageId, command.forwardId)
    } catch (error) {
      console.error('转发失败:', error)
    }
  } else if (command.action === 'all') {
    try {
      const results = await forwardService.forwardToMultiple(command.messageId, command.forwards)
      const successCount = results.filter(r => r.result.status === 'success').length
      const failCount = results.length - successCount
      
      if (failCount === 0) {
        ElMessage.success(`成功转发到 ${successCount} 个地址`)
      } else {
        ElMessage.warning(`成功转发到 ${successCount} 个地址，${failCount} 个地址转发失败`)
      }
    } catch (error) {
      console.error('批量转发失败:', error)
    }
  }
}

// 转发消息 (保留兼容性)
const forwardMessage = async (messageId, forwardUrl) => {
  try {
    await forwardService.forwardMessage(messageId, forwardUrl.id)
  } catch (error) {
    console.error('转发失败:', error)
  }
}

// 转发到所有地址 (保留兼容性)
const forwardToAll = async (messageId) => {
  try {
    const results = await forwardService.forwardToMultiple(messageId, enabledForwardUrls.value)
    const successCount = results.filter(r => r.result.status === 'success').length
    const failCount = results.length - successCount
    
    if (failCount === 0) {
      ElMessage.success(`成功转发到 ${successCount} 个地址`)
    } else {
      ElMessage.warning(`成功转发到 ${successCount} 个地址，${failCount} 个地址转发失败`)
    }
  } catch (error) {
    console.error('批量转发失败:', error)
  }
}

// 格式化数据
const formatData = (message) => {
  if (!message.body) return
  
  try {
    const formatted = forwardService.formatData(message.body)
    message.formattedBody = formatted
  } catch (error) {
    ElMessage.error('格式化失败')
  }
}

// 复制数据
const copyData = async (data) => {
  if (!data) return
  
  try {
    await navigator.clipboard.writeText(data)
    ElMessage.success('内容已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 获取数据类型
const getDataType = (data) => {
  return forwardService.detectDataType(data).toUpperCase()
}

// 获取数据大小
const getDataSize = (data) => {
  if (!data) return '0 B'
  const size = new Blob([data]).size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 判断是否可以格式化
const canFormat = (data) => {
  if (!data) return false
  const type = forwardService.detectDataType(data)
  return type === 'json' || type === 'xml'
}

// 格式化时间
const formatTime = (timeString) => {
  if (!timeString) return '-'
  try {
    return formatDistanceToNow(new Date(timeString), { 
      addSuffix: true, 
      locale: zhCN 
    })
  } catch (error) {
    return timeString
  }
}

// 格式化完整时间
const formatFullTime = (timeString) => {
  if (!timeString) return '-'
  try {
    return format(new Date(timeString), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
  } catch (error) {
    return timeString
  }
}

// 跳转到Callback管理页面
const goToCallbackManagement = (message) => {
  // 发送事件让父组件切换到Callback管理页面，并选中对应的callback
  emit('go-to-callback', {
    callback_url_id: message.callback_url_id,
    callback_name: message.callback_name,
    callback_path: message.callback_path
  })
}



// WebSocket消息处理
let unsubscribeNewMessage
let unsubscribeForwardResult

onMounted(() => {
  // 初始化加载数据
  loadMessages(true)
  loadForwardUrls()
  
  // 监听新消息
  unsubscribeNewMessage = socketService.onNewMessage((message) => {
    const newMessage = {
      ...message,
      showDetails: true, // 新消息默认展开
      activeTab: 'request',
      formattedBody: null
    }
    
    // 如果已有消息，将之前的第一条消息收起
    if (messages.value.length > 0) {
      messages.value[0].showDetails = false
    }
    
    messages.value.unshift(newMessage)
    
    // 限制消息数量
    if (messages.value.length > 200) {
      messages.value = messages.value.slice(0, 200)
    }
  })

  // 监听转发结果
  unsubscribeForwardResult = socketService.onForwardResult((result) => {
    console.log('转发结果更新:', result)
  })
})

onUnmounted(() => {
  if (unsubscribeNewMessage) unsubscribeNewMessage()
  if (unsubscribeForwardResult) unsubscribeForwardResult()
})
</script>

<style scoped>
.message-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.message-card {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.message-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.method-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.method-get { background: #67c23a; }
.method-post { background: #409eff; }
.method-put { background: #e6a23c; }
.method-delete { background: #f56c6c; }
.method-patch { background: #909399; }

.message-path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #606266;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.callback-name {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #b3d8ff;
  font-weight: 500;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-actions {
  display: flex;
  gap: 8px;
}

.message-details {
  padding: 16px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}

.info-value {
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}

.headers-list, .params-list {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.header-item, .param-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.header-item:last-child, .param-item:last-child {
  margin-bottom: 0;
}

.header-key, .param-key {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
  white-space: nowrap;
  min-width: 120px;
}

.header-value, .param-value {
  font-size: 12px;
  color: #606266;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.body-section {
  background: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.body-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.body-info {
  display: flex;
  gap: 12px;
}

.data-type {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
}

.data-size {
  font-size: 12px;
  color: #909399;
}

.body-actions {
  display: flex;
  gap: 8px;
}

.body-content {
  max-height: 400px;
  overflow: auto;
}

.body-text {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-body {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

:deep(.el-tabs__header) {
  margin: 0 0 12px 0;
}

.callback-filter {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  width: 100%;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.filter-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
}

.callback-checkbox {
  margin: 0;
  margin-right: 8px;
}

.all-checkbox {
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.all-checkbox .callback-name {
  font-weight: 600;
  color: #409eff;
}

.callback-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.callback-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  flex-shrink: 0;
}

.callback-path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e4e7ed;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>