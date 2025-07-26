# Docker 部署指南

## 快速启动

### 使用脚本启动（推荐）
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### 手动启动
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

## 文件说明

### Dockerfile
标准的多阶段构建Dockerfile，适用于开发和测试环境。

### Dockerfile.prod
生产环境优化的Dockerfile，包含以下优化：
- 使用非root用户运行
- 使用dumb-init处理信号
- 更严格的安全设置
- 更小的镜像体积

### docker-compose.yml
包含完整的服务配置：
- 端口映射：3000:3000
- 数据持久化
- 健康检查
- 自动重启策略

## 构建选项

### 开发环境
```bash
docker build -t local-callback:dev .
```

### 生产环境
```bash
docker build -f Dockerfile.prod -t local-callback:prod .
```

## 运行选项

### 单容器运行
```bash
# 开发版本
docker run -d -p 3000:3000 --name callback-service local-callback:dev

# 生产版本
docker run -d -p 3000:3000 --name callback-service local-callback:prod
```

### 使用Docker Compose（推荐）
```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f
```

## 数据持久化

数据库文件默认挂载到Docker卷 `callback_data`，确保数据不会因容器重启而丢失。

### 备份数据
```bash
# 查看卷位置
docker volume inspect callback_data

# 备份数据库
docker run --rm -v callback_data:/data -v $(pwd):/backup alpine cp /data/callback.db /backup/
```

### 恢复数据
```bash
# 恢复数据库
docker run --rm -v callback_data:/data -v $(pwd):/backup alpine cp /backup/callback.db /data/
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | production | 运行环境 |
| PORT | 3000 | 服务端口 |

### 自定义环境变量
```bash
# 在docker-compose.yml中添加
environment:
  - NODE_ENV=production
  - PORT=3000
  - CUSTOM_VAR=value
```

## 网络配置

默认创建名为 `callback-network` 的桥接网络。

### 连接其他服务
```yaml
services:
  callback-service:
    # ... 其他配置
    networks:
      - callback-network
      - external-network

networks:
  callback-network:
    driver: bridge
  external-network:
    external: true
```

## 健康检查

服务包含内置健康检查：
- 检查间隔：30秒
- 超时时间：10秒
- 重试次数：3次
- 启动等待：60秒

### 查看健康状态
```bash
docker-compose ps
docker inspect --format='{{.State.Health.Status}}' local-callback-service
```

## 日志管理

### 查看日志
```bash
# 实时日志
docker-compose logs -f

# 最近日志
docker-compose logs --tail=50

# 特定服务日志
docker-compose logs callback-service
```

### 日志轮转（生产环境推荐）
```yaml
services:
  callback-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 性能优化

### 资源限制
```yaml
services:
  callback-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 多副本部署
```yaml
services:
  callback-service:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :3000
   
   # 修改端口映射
   # 在docker-compose.yml中修改 "3001:3000"
   ```

2. **权限问题**
   ```bash
   # 检查文件权限
   ls -la backend/database/
   
   # 修复权限
   sudo chown -R $USER:$USER backend/database/
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库文件
   docker-compose exec callback-service ls -la backend/database/
   
   # 重新初始化
   docker-compose down -v
   docker-compose up -d
   ```

### 调试模式
```bash
# 进入容器
docker-compose exec callback-service sh

# 查看进程
docker-compose exec callback-service ps aux

# 检查网络
docker network ls
docker network inspect local_callback_callback-network
```

## 更新和维护

### 更新镜像
```bash
# 重新构建
docker-compose build --no-cache

# 重启服务
docker-compose up -d
```

### 清理资源
```bash
# 清理未使用的镜像
docker image prune

# 清理未使用的卷
docker volume prune

# 完全清理
docker system prune -a
```