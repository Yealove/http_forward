# 多阶段构建 - 第一阶段：构建前端
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app/frontend

# 复制前端package文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm install

# 复制前端源码
COPY frontend/ ./

# 构建前端
RUN npm run build

# 第二阶段：运行时环境
FROM node:18-alpine AS runtime

# 设置工作目录
WORKDIR /app

# 安装系统依赖（SQLite需要）
RUN apk add --no-cache sqlite

# 复制后端package文件
COPY package*.json ./

# 安装后端依赖
RUN npm install --only=production

# 复制后端源码
COPY backend/ ./backend/

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建数据库目录
RUN mkdir -p /app/backend/database

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动命令
CMD ["npm", "start"]