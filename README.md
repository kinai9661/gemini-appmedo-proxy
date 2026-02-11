# 🔧 API 逆向工程輸出站

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-Compatible-orange.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-yellow.svg)

**完整的 AI 圖片生成 API，兼容 OpenAI SDK，支持 API Key 驗證**

[快速開始](#-快速開始) • [文檔](#-文檔) • [API 使用](#-api-使用) • [部署](#-部署)

</div>

---

## 📋 目錄

- [功能特性](#-功能特性)
- [快速開始](#-快速開始)
- [安裝](#-安裝)
- [API 使用](#-api-使用)
- [部署](#-部署)
- [配置](#-配置)
- [文檔](#-文檔)
- [測試](#-測試)
- [貢獻](#-貢獻)
- [License](#-license)

---

## ✨ 功能特性

### 🎯 核心功能

- ✅ **OpenAI SDK 兼容** - 完全兼容 OpenAI 圖片生成 API
- ✅ **API Key 驗證** - 可選的 API Key 保護（開發/生產模式切換）
- ✅ **Web UI 界面** - 美觀的 Web 界面，支持實時預覽
- ✅ **多種圖片尺寸** - 支持 1K (1024px)、2K (2048px)、4K (4096px)
- ✅ **完整 API 分析** - 實時查看請求/響應內容
- ✅ **CORS 支持** - 跨域資源共享，方便前端集成

### 🔐 安全特性

- 🔑 支持 3 種 API Key 傳遞方式（Authorization、X-API-Key、Query Parameter）
- 🔒 使用 Cloudflare Secrets 安全存儲敏感信息
- 🌐 HTTPS 加密（Cloudflare 自動提供）
- ⚡ 邊緣計算，低延遲全球分發

### 🚀 開發特性

- 📝 完整的 TypeScript 類型定義
- 🧪 測試腳本（Python、Node.js、Bash）
- 📚 詳細的 API 文檔和使用示例
- 🔧 多環境配置（dev、staging、production）
- 📊 實時日誌和監控

---

## 🚀 快速開始

### 前置要求

- [Node.js](https://nodejs.org/) >= 16
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare 帳號

### 30 秒部署

```bash
# 1. 克隆倉庫
git clone https://github.com/kinai9661/api-reverse-engineering.git
cd api-reverse-engineering

# 2. 登入 Cloudflare
wrangler login

# 3. 部署
wrangler deploy worker.js

# 4. 訪問你的 API
# https://api-reverse-engineering.你的帳號.workers.dev
```

就是這麼簡單！🎉

---

## 📦 安裝

### 方式 1: 使用 Wrangler CLI（推薦）

```bash
# 安裝 Wrangler
npm install -g wrangler

# 克隆項目
git clone https://github.com/kinai9661/api-reverse-engineering.git
cd api-reverse-engineering

# 登入 Cloudflare
wrangler login

# 部署
wrangler deploy worker.js
```

### 方式 2: 使用 Cloudflare Dashboard

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 **Workers & Pages** → **Create Application**
3. 選擇 **Create Worker**
4. 複製 `worker.js` 的內容並粘貼
5. 點擊 **Save and Deploy**

### 方式 3: 使用 GitHub Actions

項目包含 GitHub Actions 配置，推送代碼即可自動部署。

1. Fork 本倉庫
2. 在 GitHub Secrets 中添加 `CLOUDFLARE_API_TOKEN`
3. 推送代碼，自動部署

---

## 💻 API 使用

### Web UI

訪問 Worker URL，使用圖形界面生成圖片：

```
https://your-worker.workers.dev
```

**功能**：
- 輸入 Prompt 生成圖片
- 選擇圖片尺寸（1K/2K/4K）
- 調整創造性參數（Temperature）
- 實時預覽生成結果
- 查看完整的 API 請求/響應

---

### Python (OpenAI SDK)

```python
from openai import OpenAI

# 配置客戶端
client = OpenAI(
    api_key="sk-your-api-key",  # 如果啟用了驗證
    base_url="https://your-worker.workers.dev/v1"
)

# 生成圖片
response = client.images.generate(
    model="gemini-3-pro-image-preview",
    prompt="A serene mountain landscape at sunset with vibrant colors",
    n=1,
    size="1024x1024",
    response_format="b64_json"
)

# 保存圖片
import base64
image_data = base64.b64decode(response.data[0].b64_json)

with open("generated_image.jpg", "wb") as f:
    f.write(image_data)

print("✅ 圖片已保存")
```

---

### JavaScript / Node.js

```javascript
import OpenAI from 'openai';
import fs from 'fs';

// 配置客戶端
const client = new OpenAI({
  apiKey: 'sk-your-api-key',  // 如果啟用了驗證
  baseURL: 'https://your-worker.workers.dev/v1',
});

// 生成圖片
const response = await client.images.generate({
  model: 'gemini-3-pro-image-preview',
  prompt: 'A serene mountain landscape at sunset',
  n: 1,
  size: '1024x1024',
  response_format: 'b64_json',
});

// 保存圖片
const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
fs.writeFileSync('generated_image.jpg', imageBuffer);

console.log('✅ 圖片已保存');
```

---

### cURL

```bash
# 設置 API Key（如果需要）
export API_KEY="sk-your-api-key"

# 生成圖片
curl https://your-worker.workers.dev/v1/images/generations \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "size": "1024x1024",
    "response_format": "b64_json"
  }' | jq -r '.data[0].b64_json' | base64 -d > image.jpg

echo "✅ 圖片已保存為 image.jpg"
```

---

## 🎯 API 端點

| 端點 | 方法 | 驗證 | 說明 |
|------|------|------|------|
| `/` | GET | ❌ | Web UI 界面 |
| `/v1/models` | GET | ✅* | 列出可用模型 |
| `/v1/images/generations` | POST | ✅* | OpenAI 兼容圖片生成 |
| `/api/generate` | POST | ✅* | 原始 API（含完整分析） |
| `/api/verify-key` | POST | ✅* | 驗證 API Key |

*驗證：僅在設置 `API_KEY` 環境變量時需要

---

## 🔧 部署

### 開發模式（無驗證）

適合本地開發、演示、內部使用。

```bash
# 直接部署
wrangler deploy worker.js

# 測試
curl https://your-worker.workers.dev/v1/models
```

---

### 生產模式（啟用驗證）

適合生產環境、付費服務、公開 API。

```bash
# 1. 生成 API Key
openssl rand -base64 32
# 輸出: a1b2c3d4e5f6g7h8...

# 2. 設置 Secret
wrangler secret put API_KEY
# 輸入你的 API Key

# 3. 部署
wrangler deploy worker.js

# 4. 測試（需要 API Key）
curl https://your-worker.workers.dev/v1/models \
  -H "Authorization: Bearer sk-your-api-key"
```

---

### 多環境部署

```bash
# 開發環境
wrangler deploy worker.js --env dev

# 預發布環境
wrangler deploy worker.js --env staging

# 生產環境
wrangler secret put API_KEY --env production
wrangler deploy worker.js --env production
```

**URL 格式**：
- 開發: `https://api-reverse-engineering-dev.你的帳號.workers.dev`
- 預發布: `https://api-reverse-engineering-staging.你的帳號.workers.dev`
- 生產: `https://api-reverse-engineering-prod.你的帳號.workers.dev`

---

## ⚙️ 配置

### API Key 配置

#### 方式 1: Cloudflare Secrets（推薦）

```bash
# 設置 API Key（不會暴露在代碼中）
wrangler secret put API_KEY

# 查看已設置的 Secrets
wrangler secret list

# 刪除 Secret
wrangler secret delete API_KEY
```

#### 方式 2: 環境變量（不推薦）

```toml
# wrangler.toml
[vars]
API_KEY = "sk-your-api-key"  # ⚠️ 會暴露在代碼中
```

---

### API Key 傳遞方式

客戶端可以通過以下 3 種方式傳遞 API Key：

#### 1. Authorization Header（推薦）

```bash
curl -H "Authorization: Bearer sk-your-api-key" ...
```

```python
client = OpenAI(api_key="sk-your-api-key", ...)
```

#### 2. X-API-Key Header

```bash
curl -H "X-API-Key: sk-your-api-key" ...
```

```javascript
fetch(url, {
  headers: { 'X-API-Key': 'sk-your-api-key' }
});
```

#### 3. Query Parameter

```bash
curl "https://your-worker.workers.dev/v1/models?api_key=sk-your-api-key"
```

⚠️ **不推薦用於生產環境**（URL 可能被日誌記錄）

---

### 自定義配置

編輯 `wrangler.toml` 進行自定義：

```toml
name = "api-reverse-engineering"
main = "worker.js"
compatibility_date = "2024-01-01"

# 自定義域名
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]

# KV 存儲（可選）
kv_namespaces = [
  { binding = "API_KEYS", id = "your-kv-id" }
]

# 多環境
[env.production]
name = "api-reverse-engineering-prod"
```

---

## 📚 文檔

| 文檔 | 說明 |
|------|------|
| [WRANGLER_CONFIG_GUIDE.md](WRANGLER_CONFIG_GUIDE.md) | Wrangler 完整配置指南 |
| [API_KEY_GUIDE.md](API_KEY_GUIDE.md) | API Key 配置和使用指南 |
| [API_KEY_EXAMPLES.md](API_KEY_EXAMPLES.md) | 各種語言的使用示例 |
| [OPENAI_API_DOCS.md](OPENAI_API_DOCS.md) | OpenAI API 格式文檔 |
| [DEPLOYMENT_SUMMARY_API_KEY.md](DEPLOYMENT_SUMMARY_API_KEY.md) | 部署總結和檢查清單 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速參考卡 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 故障排除指南 |

---

## 🧪 測試

### 本地測試

```bash
# 啟動本地開發服務器
wrangler dev worker.js

# 在另一個終端測試
curl http://localhost:8787/v1/models
```

---

### 快速測試腳本

```bash
# Bash 測試
./quick_test.sh https://your-worker.workers.dev

# Python 測試
python test_api.py

# Node.js 測試
node test_api.js
```

---

### 測試 API Key

```bash
# 測試有效的 API Key
curl https://your-worker.workers.dev/api/verify-key \
  -X POST \
  -H "Authorization: Bearer sk-your-api-key"

# 預期響應
{
  "valid": true,
  "message": "API key is valid"
}
```

---

## 🛠️ 開發

### 項目結構

```
api-reverse-engineering/
├── worker.js                          # 主代碼
├── wrangler.toml                      # Cloudflare 配置
├── package.json                       # NPM 配置
├── README.md                          # 本文件
├── .gitignore                         # Git 忽略文件
├── docs/                              # 文檔目錄
│   ├── WRANGLER_CONFIG_GUIDE.md
│   ├── API_KEY_GUIDE.md
│   ├── API_KEY_EXAMPLES.md
│   ├── OPENAI_API_DOCS.md
│   └── ...
└── tests/                             # 測試文件
    ├── test_api.py
    ├── test_api.js
    └── quick_test.sh
```

---

### 本地開發

```bash
# 克隆倉庫
git clone https://github.com/kinai9661/api-reverse-engineering.git
cd api-reverse-engineering

# 安裝依賴
npm install

# 本地開發
wrangler dev worker.js

# 訪問 http://localhost:8787
```

---

### 代碼修改

修改 `worker.js` 後：

```bash
# 1. 本地測試
wrangler dev worker.js

# 2. 驗證功能
curl http://localhost:8787/v1/models

# 3. 部署
wrangler deploy worker.js
```

---

## 📊 功能對比

| 功能 | 本項目 | OpenAI DALL-E |
|------|--------|---------------|
| OpenAI SDK 兼容 | ✅ | ✅ |
| API Key 驗證 | ✅ 可選 | ✅ 必需 |
| Web UI | ✅ | ❌ |
| 完整 API 分析 | ✅ | ❌ |
| 免費使用 | ✅ | ❌ |
| 自托管 | ✅ | ❌ |
| 邊緣計算 | ✅ | ❌ |
| 多環境支持 | ✅ | ❌ |

---

## 🤝 貢獻

歡迎貢獻！請遵循以下步驟：

1. Fork 本倉庫
2. 創建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 貢獻指南

- 代碼應該清晰、簡潔
- 添加適當的註釋
- 更新相關文檔
- 確保測試通過
- 遵循現有代碼風格

---

## 📞 支持

### 獲取幫助

- 📖 查看 [文檔](#-文檔)
- 🐛 提交 [Issue](https://github.com/kinai9661/api-reverse-engineering/issues)
- 💬 參與 [Discussions](https://github.com/kinai9661/api-reverse-engineering/discussions)

### 常見問題

#### Q: 如何啟用 API Key 驗證？
A: 運行 `wrangler secret put API_KEY` 並設置你的密鑰。

#### Q: 支持哪些圖片尺寸？
A: 支持 1K (1024px)、2K (2048px)、4K (4096px)。

#### Q: 如何自定義域名？
A: 在 `wrangler.toml` 中配置 `routes`，詳見 [WRANGLER_CONFIG_GUIDE.md](WRANGLER_CONFIG_GUIDE.md)。

#### Q: 是否支持批量生成？
A: 目前支持參數 `n`，但實際只返回一張圖片（可擴展）。

---

## 📄 License

本項目採用 MIT License - 詳見 [LICENSE](LICENSE) 文件。

---

## 🙏 致謝

- [Cloudflare Workers](https://workers.cloudflare.com/) - 邊緣計算平台
- [OpenAI](https://openai.com/) - API 格式參考
- [Gemini API](https://ai.google.dev/) - 底層圖片生成服務

---

## 📈 統計

![GitHub stars](https://img.shields.io/github/stars/kinai9661/api-reverse-engineering?style=social)
![GitHub forks](https://img.shields.io/github/forks/kinai9661/api-reverse-engineering?style=social)
![GitHub issues](https://img.shields.io/github/issues/kinai9661/api-reverse-engineering)
![GitHub pull requests](https://img.shields.io/github/issues-pr/kinai9661/api-reverse-engineering)

---

<div align="center">

**⭐ 如果這個項目對你有幫助，請給一個 Star！⭐**

Made with ❤️ by [kinai9661](https://github.com/kinai9661)

[⬆ 返回頂部](#-api-逆向工程輸出站)

</div>
