<template>
  <el-dialog 
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isEdit ? '编辑转发地址' : '添加转发地址'" 
    width="500px"
    :before-close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef">
      <el-form-item label="地址名称" prop="name">
        <el-input 
          v-model="form.name" 
          placeholder="请输入地址名称，例如：本地测试服务器"
        />
      </el-form-item>
      
      <el-form-item label="转发URL" prop="url">
        <el-input 
          v-model="form.url" 
          placeholder="请输入完整的URL，例如：http://localhost:8080/webhook"
        />
        <div class="form-help">
          支持HTTP和HTTPS协议，可以是内网地址或本地地址
        </div>
      </el-form-item>
      
      <el-form-item label="启用状态">
        <el-switch 
          v-model="form.enabled" 
          active-text="启用" 
          inactive-text="禁用"
        />
        <div class="form-help">
          只有启用状态的地址才会接收转发请求
        </div>
      </el-form-item>
      
      <el-form-item label="连通性测试">
        <el-button 
          @click="testConnection" 
          :loading="testing"
          :disabled="!form.url"
        >
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          <el-icon v-if="testResult.success"><SuccessFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          {{ testResult.message }}
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="submit" :loading="submitting">
        {{ isEdit ? '保存' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, SuccessFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { forwardApi } from '@/services/api'
import forwardService from '@/services/forward'

const props = defineProps({
  modelValue: Boolean,
  callbackId: [String, Number],
  forwardUrl: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const form = ref({
  name: '',
  url: '',
  enabled: true
})

const rules = {
  name: [
    { required: true, message: '请输入地址名称', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入转发URL', trigger: 'blur' },
    { 
      pattern: /^https?:\/\/.+/, 
      message: 'URL格式不正确，请以http://或https://开头', 
      trigger: 'blur' 
    }
  ]
}

const formRef = ref()
const submitting = ref(false)
const testing = ref(false)
const testResult = ref(null)

const isEdit = computed(() => !!props.forwardUrl)

// 监听对话框显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    resetForm()
    testResult.value = null
  }
})

// 监听转发地址变化
watch(() => props.forwardUrl, (forwardUrl) => {
  if (forwardUrl) {
    form.value = {
      name: forwardUrl.name,
      url: forwardUrl.url,
      enabled: forwardUrl.enabled
    }
  }
}, { immediate: true })

// 重置表单
const resetForm = () => {
  if (props.forwardUrl) {
    form.value = {
      name: props.forwardUrl.name,
      url: props.forwardUrl.url,
      enabled: props.forwardUrl.enabled
    }
  } else {
    form.value = {
      name: '',
      url: '',
      enabled: true
    }
  }
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 测试连接
const testConnection = async () => {
  if (!form.value.url) {
    ElMessage.warning('请先输入转发URL')
    return
  }

  testing.value = true
  testResult.value = null
  
  try {
    const result = await forwardService.testForwardUrl(form.value.url)
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      message: '测试失败'
    }
  } finally {
    testing.value = false
  }
}

// 提交表单
const submit = async () => {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  
  try {
    if (isEdit.value) {
      // 更新转发地址
      await forwardApi.update(
        props.forwardUrl.id,
        form.value.name,
        form.value.url,
        form.value.enabled
      )
      ElMessage.success('转发地址更新成功')
    } else {
      // 创建转发地址
      await forwardApi.create(
        props.callbackId,
        form.value.name,
        form.value.url
      )
      ElMessage.success('转发地址添加成功')
    }
    
    emit('update:modelValue', false)
    emit('success')
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  emit('update:modelValue', false)
  testResult.value = null
}
</script>

<style scoped>
.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
}

.test-result.success {
  color: #67c23a;
  background: #f0f9ff;
  border: 1px solid #b3e5b3;
}

.test-result.error {
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
}
</style>