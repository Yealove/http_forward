<template>
  <div class="home-container">
    <div class="page-header">
      <div class="header-left">
        <h2>应用管理</h2>
        <p class="header-desc">管理您的Http转发应用，每个应用可包含多个转发地址</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建应用
        </el-button>
      </div>
    </div>

    <div class="applications-grid">
      <div 
        v-for="app in applications" 
        :key="app.id" 
        class="app-card"
        @click="$router.push(`/app/${app.id}`)"
      >
        <div class="card-header">
          <div class="app-info">
            <h3 class="app-name">{{ app.name }}</h3>
            <p class="app-path">根路径: {{ app.root_path }}</p>
          </div>
          <div class="card-actions" @click.stop>
            <el-dropdown trigger="click">
              <el-button text>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="editApplication(app)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item @click="deleteApplication(app)" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <div class="card-content">
          <div class="app-stats">
            <div class="stat-item">
              <span class="stat-label">创建时间</span>
              <span class="stat-value">{{ formatDate(app.created_at) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">更新时间</span>
              <span class="stat-value">{{ formatDate(app.updated_at) }}</span>
            </div>
          </div>
          
          <div class="card-footer">
            <el-button type="primary" plain size="small">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-if="!loading && applications.length === 0" 
      description="暂无应用，点击上方按钮创建第一个应用"
      :image-size="160"
    >
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建应用
      </el-button>
    </el-empty>

    <!-- 创建应用对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      title="创建新应用" 
      width="400px"
      :before-close="handleCreateDialogClose"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef">
        <el-form-item label="应用名称" prop="name">
          <el-input 
            v-model="createForm.name" 
            placeholder="请输入应用名称"
            clearable
          />
          <div class="form-help">
            应用名称将用于标识和管理不同的Callback应用
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCreateDialogClose">取消</el-button>
        <el-button type="primary" @click="createApplication" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑应用对话框 -->
    <el-dialog 
      v-model="showEditDialog" 
      title="编辑应用" 
      width="400px"
      :before-close="handleEditDialogClose"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef">
        <el-form-item label="应用名称" prop="name">
          <el-input 
            v-model="editForm.name" 
            placeholder="请输入应用名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="根路径">
          <el-input :value="editForm.root_path" disabled />
          <div class="form-help">
            根路径不可修改，用于生成唯一的Callback地址
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleEditDialogClose">取消</el-button>
        <el-button type="primary" @click="updateApplication" :loading="editing">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled, Edit, Delete, View } from '@element-plus/icons-vue'
import { applicationApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const applications = ref([])
const loading = ref(false)

// 创建应用相关
const showCreateDialog = ref(false)
const createForm = ref({ name: '' })
const createRules = {
  name: [
    { required: true, message: '请输入应用名称', trigger: 'blur' },
    { min: 1, max: 50, message: '应用名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}
const createFormRef = ref()
const creating = ref(false)

// 编辑应用相关
const showEditDialog = ref(false)
const editForm = ref({ id: null, name: '', root_path: '' })
const editRules = {
  name: [
    { required: true, message: '请输入应用名称', trigger: 'blur' },
    { min: 1, max: 50, message: '应用名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}
const editFormRef = ref()
const editing = ref(false)

// 加载应用列表
const loadApplications = async () => {
  loading.value = true
  try {
    const response = await applicationApi.getAll()
    applications.value = response.data
  } catch (error) {
    console.error('加载应用列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 创建应用
const createApplication = async () => {
  if (!createFormRef.value) return
  
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  creating.value = true
  try {
    await applicationApi.create(createForm.value.name)
    ElMessage.success('应用创建成功')
    showCreateDialog.value = false
    createForm.value.name = ''
    loadApplications()
  } catch (error) {
    console.error('创建应用失败:', error)
  } finally {
    creating.value = false
  }
}

// 编辑应用
const editApplication = (app) => {
  editForm.value = {
    id: app.id,
    name: app.name,
    root_path: app.root_path
  }
  showEditDialog.value = true
}

// 更新应用
const updateApplication = async () => {
  if (!editFormRef.value) return
  
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return

  editing.value = true
  try {
    await applicationApi.update(editForm.value.id, editForm.value.name)
    ElMessage.success('应用更新成功')
    showEditDialog.value = false
    loadApplications()
  } catch (error) {
    console.error('更新应用失败:', error)
  } finally {
    editing.value = false
  }
}

// 删除应用
const deleteApplication = async (app) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用 "${app.name}" 吗？此操作将同时删除该应用下的所有Callback地址和消息记录。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await applicationApi.delete(app.id)
    ElMessage.success('应用删除成功')
    loadApplications()
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除应用失败:', error)
  }
}

// 对话框关闭处理
const handleCreateDialogClose = () => {
  showCreateDialog.value = false
  createForm.value.name = ''
  if (createFormRef.value) {
    createFormRef.value.resetFields()
  }
}

const handleEditDialogClose = () => {
  showEditDialog.value = false
  editForm.value = { id: null, name: '', root_path: '' }
  if (editFormRef.value) {
    editFormRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: zhCN 
    })
  } catch (error) {
    return dateString
  }
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.applications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.app-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.app-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0 20px;
}

.app-info {
  flex: 1;
}

.app-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.app-path {
  margin: 0;
  font-size: 13px;
  color: #909399;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.card-actions {
  flex-shrink: 0;
}

.card-content {
  padding: 16px 20px 20px 20px;
}

.app-stats {
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 13px;
  color: #606266;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>