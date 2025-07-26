<template>
  <div class="app-detail-container" v-loading="loading">
    <!-- 应用信息头部 -->
    <div class="app-header">
      <div class="header-left">
        <el-button @click="$router.push('/')" link>
          <el-icon><ArrowLeft /></el-icon>
          返回应用列表
        </el-button>
        <div class="app-info">
          <h2>{{ application.name }}</h2>
          <p class="app-path">根路径: {{ application.root_path }}</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="app-tabs">
      <!-- Callback地址管理 -->
      <el-tab-pane label="Callback地址" name="callbacks">
        <CallbackManager 
          :app-id="id" 
          :root-path="application.root_path"
          @callback-selected="handleCallbackSelected"
        />
      </el-tab-pane>
      
      <!-- 消息记录 -->
      <el-tab-pane label="消息记录" name="messages">
        <MessageList 
          :app-id="id" 
          :root-path="application.root_path"
          @go-to-callback="handleGoToCallback"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import { applicationApi } from '@/services/api'
import socketService from '@/services/socket'
import CallbackManager from '@/components/CallbackManager.vue'
import MessageList from '@/components/MessageList.vue'

const route = useRoute()
const id = route.params.id

const application = ref({})
const loading = ref(false)
const activeTab = ref('callbacks')

// 加载应用详情
const loadApplication = async () => {
  loading.value = true
  try {
    const response = await applicationApi.getById(id)
    application.value = response.data
  } catch (error) {
    console.error('加载应用详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadApplication()
}

// 处理选中的Callback地址
const handleCallbackSelected = (callback) => {
  activeTab.value = 'messages'
}

// 处理跳转到Callback管理
const handleGoToCallback = (callbackInfo) => {
  // 切换到Callback管理页面
  activeTab.value = 'callbacks'
  // 这里可以进一步优化，比如高亮显示特定的callback
  console.log('跳转到Callback管理，选中:', callbackInfo)
}

onMounted(async () => {
  await loadApplication()
  
  // 连接WebSocket并加入应用房间
  socketService.connect()
  socketService.joinApp(id)
})

onUnmounted(() => {
  // 离开应用房间
  socketService.leaveApp()
})
</script>

<style scoped>
.app-detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-info h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.app-path {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #909399;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.app-tabs {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-tabs__header) {
  margin: 0 0 20px 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}
</style>