# Callback网页服务

一个用于接收callback调用的服务，支持实时推送和转发功能。

## 技术架构

### 后端
- **Node.js + Express**: Web服务框架
- **Socket.io**: WebSocket实时通信
- **SQLite**: 轻量级数据库存储
- **Axios**: HTTP请求转发

### 前端
- **Vue 3**: 前端框架
- **Element Plus**: UI组件库
- **Socket.io-client**: WebSocket客户端
- **Axios**: HTTP请求

## 项目结构

```
local_callback/
├── backend/                 # 后端服务
│   ├── app.js              # 主入口文件
│   ├── routes/             # 路由
│   ├── models/             # 数据模型
│   ├── middleware/         # 中间件
│   └── database/           # 数据库相关
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── views/          # 页面
│   │   ├── utils/          # 工具函数
│   │   └── main.js         # 入口文件
│   └── public/
└── package.json            # 项目配置
```

## 功能特性

1. **应用管理**: 创建应用，生成随机根路径
2. **Callback地址管理**: 管理多个callback地址
3. **实时报文推送**: WebSocket实时显示收到的报文
4. **转发功能**: 支持手动和自动转发到本地/内网地址
5. **数据格式化**: 自动检测和格式化JSON/XML数据

## 快速开始

### 一键安装和启动

```bash
# 克隆或下载项目后，进入项目目录
cd local_callback

# 一键安装依赖和构建
./install.sh

# 启动服务
./start.sh
```

### 手动安装和启动

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 构建前端
npm run build && cd ..

# 启动后端服务
npm run server
```

### 开发模式

```bash
# 启动后端服务（自动重启）
npm run dev:server

# 新开终端启动前端开发服务
npm run dev
```

### 停止服务

```bash
# 优雅停止服务
npm run stop

# 或使用停止脚本
./stop.sh

# 或在运行时按 Ctrl+C
```

## 使用说明

1. **创建应用**: 在首页点击"新建应用"，输入应用名称，系统会自动生成随机根路径
2. **管理Callback地址**: 在应用详情页面添加callback地址，格式如 `webhook/order`
3. **复制完整URL**: 点击复制按钮获取完整的callback地址，如 `http://localhost:3000/callback/abc123/webhook/order`
4. **配置转发地址**: 为每个callback地址添加转发目标，支持本地和内网地址
5. **实时接收**: 所有请求会实时显示在消息列表中，支持数据格式化展示
6. **手动转发**: 点击转发按钮将请求转发到指定地址
7. **自动转发**: 开启自动转发开关，收到请求时自动转发到所有启用的地址

## API接口

### Callback接收
- `POST|GET|PUT|DELETE /callback/{rootPath}/{callbackPath}` - 接收callback请求

### 应用管理
- `GET /api/applications` - 获取应用列表
- `POST /api/applications` - 创建应用
- `PUT /api/applications/:id` - 更新应用
- `DELETE /api/applications/:id` - 删除应用

### Callback地址管理
- `GET /api/callbacks/app/:appId` - 获取应用下的callback地址
- `POST /api/callbacks` - 创建callback地址
- `PUT /api/callbacks/:id` - 更新callback地址
- `DELETE /api/callbacks/:id` - 删除callback地址

### 消息管理
- `GET /api/messages/app/:appId` - 获取应用下的消息
- `GET /api/messages/callback/:callbackId` - 获取callback地址下的消息
- `DELETE /api/messages/:id` - 删除消息

### 转发管理
- `GET /api/forwards/callback/:callbackId` - 获取转发地址列表
- `POST /api/forwards` - 创建转发地址
- `POST /api/forwards/send-direct` - 获取转发信息(前端转发)
- `POST /api/forwards/log-result` - 记录转发结果

## 技术特性

- **实时通信**: 使用WebSocket实现消息实时推送
- **前端转发**: 转发请求由前端发起，避免CORS问题  
- **数据格式化**: 自动检测和格式化JSON/XML数据
- **转发记录**: 完整记录转发状态和响应内容
- **响应式设计**: 适配桌面和移动端设备