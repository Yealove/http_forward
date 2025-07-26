<template>
  <div id="app">
    <el-container class="layout-container">
      <el-header class="layout-header">
        <div class="header-content">
          <h1 class="app-title">
            <el-icon><Connection /></el-icon>
            Callback网页服务
          </h1>
          <div class="header-actions">
            <ConnectionStatus />
            <el-button @click="$router.push('/')" :type="$route.path === '/' ? 'primary' : ''">
              <el-icon><House /></el-icon>
              应用管理
            </el-button>
          </div>
        </div>
      </el-header>
      
      <el-main class="layout-main">
        <router-view />
      </el-main>
      
      <el-footer class="layout-footer">
        <div class="footer-content">
          <span>© 2024 Callback网页服务</span>
          <span>实时接收和转发Webhook请求</span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { Connection, House } from '@element-plus/icons-vue'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
}

.layout-header {
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.app-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.layout-main {
  min-height: calc(100vh - 120px);
  padding: 20px;
  background: #f5f7fa;
}

.layout-footer {
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-content {
  display: flex;
  gap: 20px;
  color: #909399;
  font-size: 14px;
}

:deep(.el-button) {
  border-radius: 6px;
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100%;
  min-height: 100vh;
}
</style>