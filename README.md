# Gemini Image Proxy v2.4

Cloudflare Workers 代理，支持 Gemini 图像生成 API + OpenAI 格式兼容 + Markdown 图像格式解析。

## 特性

- ✅ 标准 Gemini API 格式
- ✅ OpenAI `images.generations` 兼容格式
- ✅ 无超时限制（等待上游完成）
- ✅ Markdown 图像格式支持（`![image](data:...)`）
- ✅ 多种图像格式自动识别
- ✅ 现代化 UI 界面
- ✅ CORS 完整支持
- ✅ 环境变量安全管理

## 快速开始

### 1. 安装依赖
```bash
npm install -g wrangler
2. 设置环境变量
bash
# 设置 API Key（Secret）
wrangler secret put API_KEY
# 输入你的 Appmedo Key

# TARGET_URL 已在 wrangler.toml 中配置
3. 部署
bash
wrangler deploy
4. 测试
bash
curl -X POST https://your-worker.workers.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"可爱的猫咪"}'
API 端点
POST /api/generate
标准 Gemini 格式

POST /api/v1/images/generations
OpenAI 兼容格式

POST /proxy
动态上游代理

支持的图像格式
inline_data 格式（标准）

json
{
  "inline_data": {
    "data": "base64...",
    "mimeType": "image/png"
  }
}
Markdown 格式（自动解析）

json
{
  "text": ""
}
更新日志
v2.4 (2026-02-11)
✅ 添加 Markdown 图像格式支持

✅ 自动识别多种图像格式

✅ 优化图像提取逻辑

✅ 修复按钮事件绑定

✅ 改进错误处理

v2.3
移除超时限制

优化 UI 界面

v2.0
全新玻璃态 UI

OpenAI 格式支持

许可证
MIT License

作者
kinai9661

text

## 部署步骤

```bash
# 1. 创建项目目录
mkdir gemini-appmedo-proxy
cd gemini-appmedo-proxy

# 2. 创建文件结构
mkdir src public

# 3. 复制所有代码到对应文件
# - wrangler.toml
# - src/worker.js
# - public/index.html
# - package.json
# - .gitignore
# - README.md

# 4. 设置 API Key
wrangler secret put API_KEY

# 5. 部署
wrangler deploy

# 6. 测试
# 访问 https://your-worker.workers.dev/
# 点击生成按钮，应该能正确显示图像
