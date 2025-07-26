#!/bin/bash

echo "=== 停止Callback网页服务 ==="

PORT=3000

# 查找占用端口的进程
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "没有发现运行在端口 $PORT 的服务"
    exit 0
fi

echo "发现运行在端口 $PORT 的进程: $PIDS"

# 尝试优雅关闭
echo "正在尝试优雅关闭..."
for pid in $PIDS; do
    if kill -TERM "$pid" 2>/dev/null; then
        echo "发送SIGTERM信号到进程 $pid"
    fi
done

# 等待5秒
sleep 5

# 检查进程是否还在运行
REMAINING_PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$REMAINING_PIDS" ]; then
    echo "进程仍在运行，强制终止..."
    for pid in $REMAINING_PIDS; do
        if kill -KILL "$pid" 2>/dev/null; then
            echo "强制终止进程 $pid"
        fi
    done
    sleep 2
fi

# 最终检查
FINAL_PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$FINAL_PIDS" ]; then
    echo "服务已成功停止"
else
    echo "警告: 仍有进程占用端口 $PORT: $FINAL_PIDS"
    exit 1
fi