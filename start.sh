#!/bin/bash

echo "=== 启动Http转发服务 ==="

# 检查数据库和构建文件
if [ ! -f "frontend/dist/index.html" ]; then
    echo "错误: 前端未构建，请先运行 ./install.sh"
    exit 1
fi

# 检查端口是否被占用
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "警告: 端口 $PORT 已被占用"
    echo "正在尝试关闭占用端口的进程..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "正在启动服务..."
echo "访问地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止服务"
echo ""

# 设置信号处理
trap 'echo "正在停止服务..."; exit 0' INT TERM

# 启动后端服务
node backend/app.js

# 确保进程完全退出
echo "服务已停止"