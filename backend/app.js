const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// 导入数据库
const db = require('./database/db');

// 导入路由
const applicationRoutes = require('./routes/applications');
const callbackRoutes = require('./routes/callbacks');
const messageRoutes = require('./routes/messages');
const forwardRoutes = require('./routes/forwards');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,  // 增加ping超时时间
  pingInterval: 25000, // 增加ping间隔
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// 中间件
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Socket.IO 连接处理
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);
  
  // Socket.IO没有setTimeout方法，移除这行
  // 连接超时由Socket.IO内部配置处理
  
  // 加入应用房间
  socket.on('join-app', (appId) => {
    try {
      const roomName = `app-${appId}`;
      
      // 先离开之前的房间
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo && clientInfo.roomName) {
        socket.leave(clientInfo.roomName);
        console.log(`客户端 ${socket.id} 离开房间: ${clientInfo.roomName}`);
      }
      
      // 加入新房间
      socket.join(roomName);
      connectedClients.set(socket.id, { appId, roomName });
      console.log(`客户端 ${socket.id} 加入应用房间: ${roomName}`);
      
      // 发送确认消息
      socket.emit('joined-app', { appId, roomName });
    } catch (error) {
      console.error('加入房间失败:', error);
      socket.emit('join-app-error', { error: error.message });
    }
  });
  
  // 离开应用房间
  socket.on('leave-app', (appId) => {
    try {
      const roomName = `app-${appId}`;
      socket.leave(roomName);
      console.log(`客户端 ${socket.id} 离开应用房间: ${roomName}`);
      
      // 更新客户端信息
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        connectedClients.set(socket.id, { ...clientInfo, appId: null, roomName: null });
      }
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  });
  
  // 处理连接错误
  socket.on('error', (error) => {
    console.error(`Socket错误 ${socket.id}:`, error);
  });
  
  // 处理ping事件
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`客户端断开连接: ${socket.id}, 原因: ${reason}`);
    connectedClients.delete(socket.id);
  });
});

// 将 io 实例添加到 app 中，供其他模块使用
app.set('io', io);

// API 路由
app.use('/api/applications', applicationRoutes);
app.use('/api/callbacks', callbackRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/forwards', forwardRoutes);

// Callback 接收路由 - 处理所有 HTTP 方法
app.all('/callback/:rootPath/:callbackPath(*)', async (req, res) => {
  try {
    const { rootPath, callbackPath } = req.params;
    const method = req.method;
    const headers = req.headers;
    const body = req.body;
    const queryParams = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(`收到Callback请求: ${method} /callback/${rootPath}/${callbackPath}`);

    // 导入模型
    const CallbackUrl = require('./models/CallbackUrl');
    const Message = require('./models/Message');
    const ForwardUrl = require('./models/ForwardUrl');

    // 查找对应的callback地址
    const callbackUrl = await CallbackUrl.getByPath(rootPath, callbackPath);
    
    if (!callbackUrl) {
      return res.status(404).json({ error: 'Callback地址未找到' });
    }

    // 保存消息记录
    const message = await Message.create(
      callbackUrl.id,
      method,
      headers,
      typeof body === 'string' ? body : JSON.stringify(body),
      queryParams,
      ipAddress,
      userAgent
    );

    // 实时推送消息到前端
    io.to(`app-${callbackUrl.app_id}`).emit('new-message', {
      ...message,
      callback_name: callbackUrl.name,
      callback_path: callbackUrl.path
    });

    // 自动转发功能保留（可选功能）
    if (callbackUrl.auto_forward) {
      const forwardUrls = await ForwardUrl.getEnabledByCallbackUrlId(callbackUrl.id);
      
      if (forwardUrls.length > 0) {
        // 异步执行转发，不阻塞响应
        setImmediate(async () => {
          const forwardService = require('./services/forwardService');
          for (const forwardUrl of forwardUrls) {
            await forwardService.forwardMessage(message, forwardUrl, io);
          }
        });
      }
    }

    // 使用自定义响应配置或默认响应
    const responseStatus = callbackUrl.response_status || 200;
    const responseHeaders = callbackUrl.response_headers ? 
      JSON.parse(callbackUrl.response_headers) : 
      { "Content-Type": "application/json" };
    const responseBody = callbackUrl.response_body ? 
      JSON.parse(callbackUrl.response_body) : 
      { success: true, message: 'Callback接收成功', messageId: message.id };

    // 如果是默认响应体，添加messageId
    if (!callbackUrl.response_body) {
      responseBody.messageId = message.id;
    }

    // 设置响应头
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.set(key, value);
    });

    // 发送响应
    res.status(responseStatus).json(responseBody);

  } catch (error) {
    console.error('处理Callback请求失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 前端路由 - 所有其他请求都返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 初始化数据库
    await db.init();
    
    // 启动服务器
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器启动成功，端口: ${PORT}`);
      console.log(`访问地址: http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('强制退出...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log(`\n收到${signal}信号，正在关闭服务器...`);
  
  // 设置关闭超时，防止无限等待
  const shutdownTimeout = setTimeout(() => {
    console.log('关闭超时，强制退出...');
    process.exit(1);
  }, 10000); // 10秒超时
  
  // 关闭Socket.IO服务器
  io.close(() => {
    console.log('Socket.IO服务器已关闭');
    
    // 关闭HTTP服务器
    server.close(() => {
      console.log('HTTP服务器已关闭');
      
      // 关闭数据库连接
      db.close();
      
      // 清除超时定时器
      clearTimeout(shutdownTimeout);
      
      console.log('服务器完全关闭');
      process.exit(0);
    });
  });
  
  // 如果有活跃的Socket连接，强制关闭它们
  setTimeout(() => {
    console.log('强制关闭所有Socket连接...');
    for (const [socketId, clientInfo] of connectedClients) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
    connectedClients.clear();
  }, 2000); // 2秒后强制关闭连接
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

startServer();