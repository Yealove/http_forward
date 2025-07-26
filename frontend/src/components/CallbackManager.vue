<template>
  <div class="callback-manager">
    <div class="manager-header">
      <div class="header-left">
        <h3>Http转发地址管理</h3>
        <p class="header-desc">管理应用下的转发地址，每个地址可配置多个转发目标</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建地址
      </el-button>
    </div>

    <!-- Callback地址列表 -->
    <div class="callbacks-list">
      <div 
        v-for="callback in callbacks" 
        :key="callback.id" 
        class="callback-card"
      >
        <div class="card-header">
          <div class="callback-info">
            <div class="callback-header">
              <h4 class="callback-name">{{ callback.name }}</h4>
              <span class="callback-path">{{ getFullCallbackUrl(callback.path) }}</span>
              <el-button 
                @click="copyCallbackUrl(callback.path)" 
                text 
                type="primary" 
                size="small"
                class="copy-btn"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
            </div>
          </div>
          <div class="card-actions">
            <el-switch
              v-model="callback.auto_forward"
              @change="updateAutoForward(callback)"
              active-text="自动转发"
              size="small"
              style="margin-right: 12px;"
            />
            <el-dropdown trigger="click">
              <el-button text>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="viewMessages(callback)">
                    <el-icon><View /></el-icon>
                    查看消息
                  </el-dropdown-item>
                  <el-dropdown-item @click="editCallback(callback)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item @click="deleteCallback(callback)" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- 转发地址列表 -->
        <div class="forward-urls">
          <div class="section-header">
            <span class="section-title">转发地址 ({{ callback.forward_urls?.length || 0 }})</span>
            <el-button 
              @click="addForwardUrl(callback)" 
              text 
              type="primary" 
              size="small"
            >
              <el-icon><Plus /></el-icon>
              添加
            </el-button>
          </div>
          
          <div v-if="callback.forward_urls && callback.forward_urls.length > 0" class="forward-list">
            <div 
              v-for="forward in callback.forward_urls" 
              :key="forward.id"
              class="forward-item"
            >
              <div class="forward-info">
                <span class="forward-name">{{ forward.name }}</span>
                <span class="forward-url">{{ forward.url }}</span>
                <span class="forward-status" :class="{ disabled: !forward.enabled }">
                  {{ forward.enabled ? '启用' : '禁用' }}
                </span>
              </div>
              <div class="forward-actions">
                <el-switch
                  v-model="forward.enabled"
                  @change="updateForwardEnabled(forward)"
                  size="small"
                />
                <el-button 
                  @click="editForwardUrl(forward)" 
                  text 
                  size="small"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button 
                  @click="deleteForwardUrl(forward)" 
                  text 
                  type="danger" 
                  size="small"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
          
          <el-empty 
            v-else 
            description="暂无转发地址" 
            :image-size="80"
          >
            <el-button @click="addForwardUrl(callback)" size="small">
              <el-icon><Plus /></el-icon>
              添加转发地址
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-if="callbacks.length === 0" 
      description="暂无转发地址"
      :image-size="160"
    >
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建第一个地址
      </el-button>
    </el-empty>

    <!-- 创建转发地址对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      title="创建转发地址" 
      width="500px"
      :before-close="handleCreateDialogClose"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef">
        <el-form-item label="地址名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入地址名称" />
        </el-form-item>
        <el-form-item label="转发路径" prop="path">
          <el-input v-model="createForm.path" placeholder="例如: webhook/order">
            <template #prepend>{{ rootPath }}/</template>
          </el-input>
          <div class="form-help">
            完整地址: {{ getPreviewUrl(createForm.path) }}
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCreateDialogClose">取消</el-button>
        <el-button type="primary" @click="createCallback" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑转发地址对话框 -->
    <el-dialog 
      v-model="showEditDialog" 
      title="编辑转发地址" 
      width="500px"
      :before-close="handleEditDialogClose"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef">
        <el-form-item label="地址名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入地址名称" />
        </el-form-item>
        <el-form-item label="转发路径" prop="path">
          <el-input v-model="editForm.path" placeholder="例如: webhook/order">
            <template #prepend>{{ rootPath }}/</template>
          </el-input>
          <div class="form-help">
            完整地址: {{ getPreviewUrl(editForm.path) }}
          </div>
        </el-form-item>
        <el-form-item label="自动转发">
          <el-switch v-model="editForm.auto_forward" />
          <div class="form-help">
            开启后，收到请求时会自动转发到所有启用的转发地址
          </div>
        </el-form-item>
        
        <el-divider content-position="left">响应配置</el-divider>
        
        <el-form-item label="自定义响应">
          <el-switch v-model="editForm.custom_response" />
          <div class="form-help">
            开启后可自定义响应状态码、响应头和响应体，关闭则使用默认响应
          </div>
        </el-form-item>
        
        <template v-if="editForm.custom_response">
          <el-form-item label="响应状态码" prop="response_status">
            <el-input-number 
              v-model="editForm.response_status" 
              :min="100" 
              :max="599" 
              placeholder="200"
            />
          </el-form-item>
          
          <el-form-item label="响应头" prop="response_headers">
            <el-input 
              v-model="editForm.response_headers" 
              type="textarea" 
              :rows="3"
              placeholder='{"Content-Type": "application/json"}'
            />
            <div class="form-help">
              请输入有效的JSON格式，例如: {"Content-Type": "application/json", "X-Custom": "value"}
            </div>
          </el-form-item>
          
          <el-form-item label="响应体" prop="response_body">
            <el-input 
              v-model="editForm.response_body" 
              type="textarea" 
              :rows="4"
              placeholder='{"success": true, "message": "自定义响应消息"}'
            />
            <div class="form-help">
              请输入有效的JSON格式响应体内容
            </div>
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="handleEditDialogClose">取消</el-button>
        <el-button type="primary" @click="updateCallback" :loading="editing">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 转发地址对话框 -->
    <ForwardUrlDialog
      v-model="showForwardDialog"
      :callback-id="currentCallbackId"
      :forward-url="currentForwardUrl"
      @success="loadCallbacks"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled, Edit, Delete, View, DocumentCopy } from '@element-plus/icons-vue'
import { callbackApi, forwardApi } from '@/services/api'
import ForwardUrlDialog from './ForwardUrlDialog.vue'

const props = defineProps({
  appId: [String, Number],
  rootPath: String
})

const emit = defineEmits(['callback-selected'])

const callbacks = ref([])
const isInitialLoading = ref(true)

// 创建相关
const showCreateDialog = ref(false)
const createForm = ref({ name: '', path: '' })
const createRules = {
  name: [
    { required: true, message: '请输入地址名称', trigger: 'blur' }
  ],
  path: [
    { required: true, message: '请输入回调路径', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9\-_\/]+$/, message: '路径只能包含字母、数字、连字符、下划线和斜杠', trigger: 'blur' }
  ]
}
const createFormRef = ref()
const creating = ref(false)

// 编辑相关
const showEditDialog = ref(false)
const editForm = ref({ 
  id: null, 
  name: '', 
  path: '', 
  auto_forward: false,
  custom_response: false,
  response_status: 200,
  response_headers: '{"Content-Type": "application/json"}',
  response_body: '{"success": true, "message": "Callback接收成功"}'
})
const editRules = {
  ...createRules,
  response_headers: [
    { 
      validator: (rule, value, callback) => {
        if (!editForm.value.custom_response) {
          callback()
          return
        }
        if (!value) {
          callback(new Error('请输入响应头'))
          return
        }
        try {
          JSON.parse(value)
          callback()
        } catch (error) {
          callback(new Error('响应头必须是有效的JSON格式'))
        }
      }, 
      trigger: 'blur' 
    }
  ],
  response_body: [
    { 
      validator: (rule, value, callback) => {
        if (!editForm.value.custom_response) {
          callback()
          return
        }
        if (!value) {
          callback(new Error('请输入响应体'))
          return
        }
        try {
          JSON.parse(value)
          callback()
        } catch (error) {
          callback(new Error('响应体必须是有效的JSON格式'))
        }
      }, 
      trigger: 'blur' 
    }
  ]
}
const editFormRef = ref()
const editing = ref(false)

// 转发地址对话框
const showForwardDialog = ref(false)
const currentCallbackId = ref(null)
const currentForwardUrl = ref(null)

// 计算完整的Callback URL
const getFullCallbackUrl = (path) => {
  return `${window.location.origin}/callback/${props.rootPath}/${path}`
}

// 预览URL
const getPreviewUrl = (path) => {
  if (!path) return `${window.location.origin}/callback/${props.rootPath}/`
  return `${window.location.origin}/callback/${props.rootPath}/${path}`
}

// 加载Callback地址列表
const loadCallbacks = async () => {
  try {
    const response = await callbackApi.getByAppId(props.appId)
    callbacks.value = response.data
    // 首次加载完成后设置标志
    if (isInitialLoading.value) {
      setTimeout(() => {
        isInitialLoading.value = false
      }, 500)
    }
  } catch (error) {
    console.error('加载转发地址失败:', error)
  }
}

// 创建Callback地址
const createCallback = async () => {
  if (!createFormRef.value) return
  
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    await callbackApi.create(props.appId, createForm.value.name, createForm.value.path)
    ElMessage.success('转发地址创建成功')
    showCreateDialog.value = false
    resetCreateForm()
    loadCallbacks()
  } catch (error) {
    console.error('创建转发地址失败:', error)
  } finally {
    creating.value = false
  }
}

// 编辑Callback地址
const editCallback = (callback) => {
  const hasCustomResponse = callback.response_status || callback.response_headers || callback.response_body
  editForm.value = {
    id: callback.id,
    name: callback.name,
    path: callback.path,
    auto_forward: callback.auto_forward,
    custom_response: !!hasCustomResponse,
    response_status: callback.response_status || 200,
    response_headers: callback.response_headers || '{"Content-Type": "application/json"}',
    response_body: callback.response_body || '{"success": true, "message": "Callback接收成功"}'
  }
  showEditDialog.value = true
}

// 更新Callback地址
const updateCallback = async () => {
  if (!editFormRef.value) return
  
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return

  editing.value = true
  try {
    // 准备响应配置
    let responseConfig = null
    if (editForm.value.custom_response) {
      responseConfig = {
        status: editForm.value.response_status,
        headers: JSON.parse(editForm.value.response_headers),
        body: editForm.value.response_body
      }
    }

    await callbackApi.update(
      editForm.value.id,
      editForm.value.name,
      editForm.value.path,
      editForm.value.auto_forward,
      responseConfig
    )
    ElMessage.success('转发地址更新成功')
    showEditDialog.value = false
    resetEditForm()
    loadCallbacks()
  } catch (error) {
    console.error('更新转发地址失败:', error)
  } finally {
    editing.value = false
  }
}

// 删除Callback地址
const deleteCallback = async (callback) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除转发地址 "${callback.name}" 吗？此操作将同时删除相关的消息记录。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await callbackApi.delete(callback.id)
    ElMessage.success('转发地址删除成功')
    loadCallbacks()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除转发地址失败:', error)
  }
}

// 更新自动转发状态
const updateAutoForward = async (callback) => {
  if (isInitialLoading.value) return
  try {
    await callbackApi.updateAutoForward(callback.id, callback.auto_forward)
    ElMessage.success(`已${callback.auto_forward ? '开启' : '关闭'}自动转发`)
  } catch (error) {
    console.error('更新自动转发状态失败:', error)
    // 恢复原状态
    callback.auto_forward = !callback.auto_forward
  }
}

// 查看消息
const viewMessages = (callback) => {
  emit('callback-selected', callback)
}

// 复制Callback URL
const copyCallbackUrl = async (path) => {
  const url = getFullCallbackUrl(path)
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('URL已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 添加转发地址
const addForwardUrl = (callback) => {
  currentCallbackId.value = callback.id
  currentForwardUrl.value = null
  showForwardDialog.value = true
}

// 编辑转发地址
const editForwardUrl = (forward) => {
  currentCallbackId.value = forward.callback_url_id
  currentForwardUrl.value = forward
  showForwardDialog.value = true
}

// 删除转发地址
const deleteForwardUrl = async (forward) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除转发地址 "${forward.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await forwardApi.delete(forward.id)
    ElMessage.success('转发地址删除成功')
    loadCallbacks()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除转发地址失败:', error)
  }
}

// 更新转发地址启用状态
const updateForwardEnabled = async (forward) => {
  if (isInitialLoading.value) return
  try {
    await forwardApi.updateEnabled(forward.id, forward.enabled)
    ElMessage.success(`转发地址已${forward.enabled ? '启用' : '禁用'}`)
  } catch (error) {
    console.error('更新转发地址状态失败:', error)
    // 恢复原状态
    forward.enabled = !forward.enabled
  }
}

// 重置表单
const resetCreateForm = () => {
  createForm.value = { name: '', path: '' }
  if (createFormRef.value) {
    createFormRef.value.resetFields()
  }
}

const resetEditForm = () => {
  editForm.value = { 
    id: null, 
    name: '', 
    path: '', 
    auto_forward: false,
    custom_response: false,
    response_status: 200,
    response_headers: '{"Content-Type": "application/json"}',
    response_body: '{"success": true, "message": "Callback接收成功"}'
  }
  if (editFormRef.value) {
    editFormRef.value.resetFields()
  }
}

// 对话框关闭处理
const handleCreateDialogClose = () => {
  showCreateDialog.value = false
  resetCreateForm()
}

const handleEditDialogClose = () => {
  showEditDialog.value = false
  resetEditForm()
}

defineExpose({
  loadCallbacks
})

onMounted(() => {
  loadCallbacks()
})
</script>

<style scoped>
.callback-manager {
  width: 100%;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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

.callbacks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.callback-card {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.callback-info {
  flex: 1;
}

.callback-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.copy-btn {
  margin-left: 8px;
  flex-shrink: 0;
}

.callback-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}

.callback-path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #606266;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  font-weight: normal;
  word-break: break-all;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.callback-url {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.url-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #606266;
  flex: 1;
  word-break: break-all;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.forward-urls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.forward-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.forward-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.forward-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.forward-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  flex-shrink: 0;
  min-width: 80px;
}

.forward-url {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
  flex: 1;
}

.forward-status {
  font-size: 12px;
  color: #67c23a;
  flex-shrink: 0;
}

.forward-status.disabled {
  color: #f56c6c;
}

.forward-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.form-help {
  word-break: break-all;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>