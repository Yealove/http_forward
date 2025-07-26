#!/bin/bash

echo "=== Callback网页服务安装脚本 ==="

# 检查Node.js版本
node_version=$(node --version 2>/dev/null || echo "未安装")
echo "Node.js版本: $node_version"

if [ "$node_version" = "未安装" ]; then
    echo "错误: 请先安装Node.js (建议版本18+)"
    exit 1
fi

# 安装后端依赖
echo ""
echo "正在安装后端依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "错误: 后端依赖安装失败"
    exit 1
fi

# 安装前端依赖
echo ""
echo "正在安装前端依赖..."
cd frontend

# 清理可能存在的node_modules
if [ -d "node_modules" ]; then
    echo "清理旧的node_modules..."
    rm -rf node_modules
fi

# 清理可能存在的package-lock.json
if [ -f "package-lock.json" ]; then
    rm package-lock.json
fi

npm install

if [ $? -ne 0 ]; then
    echo "错误: 前端依赖安装失败"
    exit 1
fi

# 构建前端
echo ""
echo "正在构建前端..."
npm run build

if [ $? -ne 0 ]; then
    echo "错误: 前端构建失败"
    exit 1
fi

cd ..

echo ""
echo "=== 安装完成! ==="
echo ""
echo "启动命令:"
echo "  npm run server     # 启动后端服务"
echo "  npm run dev        # 启动前端开发服务(可选)"
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "注意: 确保端口3000未被占用"