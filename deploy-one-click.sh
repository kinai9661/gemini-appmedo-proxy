#!/bin/bash
# 一键部署到 Cloudflare Workers

echo "🚀 一键部署到 Cloudflare Workers"
echo "================================"
echo ""

# 检查 worker.js
if [ ! -f "worker.js" ]; then
    echo "❌ 错误: 找不到 worker.js"
    echo "   请确保在项目根目录运行此脚本"
    exit 1
fi

# 部署
echo "📤 正在部署..."
wrangler deploy worker.js

echo ""
echo "✅ 部署完成！"
echo ""
echo "🎯 访问你的 Worker:"
echo "   https://api-reverse-engineering.你的账号.workers.dev"
