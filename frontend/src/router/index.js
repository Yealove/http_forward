import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import AppDetail from '@/views/AppDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '应用管理' }
  },
  {
    path: '/app/:id',
    name: 'AppDetail',
    component: AppDetail,
    meta: { title: '应用详情' },
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - Callback网页服务` : 'Callback网页服务'
  next()
})

export default router