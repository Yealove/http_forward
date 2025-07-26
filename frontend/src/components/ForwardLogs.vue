<template>
  <div class="forward-logs">
    <div v-if="logs.length > 0" class="logs-list">
      <div 
        v-for="log in logs" 
        :key="log.id" 
        class="log-item"
        :class="{ success: log.status === 'success', error: log.status === 'error' }"
      >
        <div class="log-header">
          <div class="log-info">
            <div class="status-badge" :class="log.status">
              <el-icon v-if="log.status === 'success'"><SuccessFilled /></el-icon>
              <el-icon v-else><CircleCloseFilled /></el-icon>
              {{ log.status === 'success' ? '成功' : '失败' }}
            </div>
            <span class="forward-name">{{ log.forward_name }}</span>
            <span class="forward-time">{{ formatTime(log.forwarded_at) }}</span>
          </div>
          <div class="log-actions">
            <el-button 
              @click="toggleLogDetails(log)" 
              text 
              size="small"
            >
              {{ log.showDetails ? '收起' : '详情' }}
            </el-button>
          </div>
        </div>

        <div class="log-summary">
          <div class="summary-item">
            <span class="summary-label">目标地址:</span>
            <span class="summary-value">{{ log.forward_url }}</span>
          </div>
          <div v-if="log.response_code" class="summary-item">
            <span class="summary-label">响应状态:</span>
            <span class="summary-value" :class="getStatusClass(log.response_code)">
              {{ log.response_code }}
            </span>
          </div>
          <div v-if="log.error_message" class="summary-item">
            <span class="summary-label">错误信息:</span>
            <span class="summary-value error">{{ log.error_message }}</span>
          </div>
        </div>

        <!-- 详细信息 -->
        <div v-if="log.showDetails" class="log-details">
          <div v-if="log.response_body" class="detail-section">
            <h5>响应内容</h5>
            <div class="response-toolbar">
              <div class="response-info">
                <span class="response-size">{{ getResponseSize(log.response_body) }}</span>
              </div>
              <div class="response-actions">
                <el-button 
                  @click="formatResponse(log)" 
                  size="small"
                  :disabled="!canFormatResponse(log.response_body)"
                >
                  <el-icon><Document /></el-icon>
                  格式化
                </el-button>
                <el-button 
                  @click="copyResponse(log.response_body)" 
                  size="small"
                >
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
            </div>
            <div class="response-content">
              <pre class="response-text">{{ log.formattedResponse || log.response_body }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-empty 
      v-else 
      description="暂无转发记录"
      :image-size="120"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SuccessFilled, CircleCloseFilled, Document, DocumentCopy } from '@element-plus/icons-vue'
import { messageApi } from '@/services/api'
import forwardService from '@/services/forward'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  messageId: [String, Number]
})

const logs = ref([])

// 加载转发记录
const loadLogs = async () => {
  if (!props.messageId) return

  try {
    const response = await messageApi.getById(props.messageId)
    if (response.data.forward_logs) {
      logs.value = response.data.forward_logs.map(log => ({
        ...log,
        showDetails: false,
        formattedResponse: null
      }))
    }
  } catch (error) {
    console.error('加载转发记录失败:', error)
  }
}

// 切换日志详情
const toggleLogDetails = (log) => {
  log.showDetails = !log.showDetails
}

// 格式化响应内容
const formatResponse = (log) => {
  if (!log.response_body) return
  
  try {
    const formatted = forwardService.formatData(log.response_body)
    log.formattedResponse = formatted
  } catch (error) {
    ElMessage.error('格式化失败')
  }
}

// 复制响应内容
const copyResponse = async (responseBody) => {
  if (!responseBody) return
  
  try {
    await navigator.clipboard.writeText(responseBody)
    ElMessage.success('响应内容已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 获取响应大小
const getResponseSize = (responseBody) => {
  if (!responseBody) return '0 B'
  const size = new Blob([responseBody]).size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 判断是否可以格式化响应
const canFormatResponse = (responseBody) => {
  if (!responseBody) return false
  const type = forwardService.detectDataType(responseBody)
  return type === 'json' || type === 'xml'
}

// 获取状态码样式
const getStatusClass = (statusCode) => {
  if (statusCode >= 200 && statusCode < 300) return 'success'
  if (statusCode >= 400 && statusCode < 500) return 'warning'
  if (statusCode >= 500) return 'error'
  return ''
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

// 监听消息ID变化
watch(() => props.messageId, () => {
  loadLogs()
}, { immediate: true })

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.forward-logs {
  width: 100%;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: white;
  overflow: hidden;
}

.log-item.success {
  border-left: 4px solid #67c23a;
}

.log-item.error {
  border-left: 4px solid #f56c6c;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.log-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.success {
  background: #f0f9ff;
  color: #67c23a;
  border: 1px solid #b3e5b3;
}

.status-badge.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.forward-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.forward-time {
  font-size: 12px;
  color: #909399;
}

.log-summary {
  padding: 12px 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  min-width: 80px;
}

.summary-value {
  font-size: 13px;
  color: #606266;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.summary-value.success {
  color: #67c23a;
}

.summary-value.warning {
  color: #e6a23c;
}

.summary-value.error {
  color: #f56c6c;
}

.log-details {
  padding: 0 16px 16px 16px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}

.detail-section {
  margin-top: 12px;
}

.detail-section h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e4e7ed;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
}

.response-info {
  font-size: 12px;
  color: #909399;
}

.response-actions {
  display: flex;
  gap: 8px;
}

.response-content {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #e4e7ed;
  border-radius: 0 0 4px 4px;
  background: white;
}

.response-text {
  margin: 0;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>