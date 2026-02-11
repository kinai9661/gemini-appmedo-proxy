export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('Request:', method, path);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '2.5.0',
          timestamp: new Date().toISOString(),
          env_check: {
            has_api_key: !!env.API_KEY,
            has_target_url: !!env.TARGET_URL
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API endpoints info
      if (path === '/api/endpoints' && method === 'GET') {
        return new Response(JSON.stringify({ 
          version: "2.5.0",
          timeout: "unlimited",
          features: ["Gemini format", "OpenAI format", "Markdown image support"],
          endpoints: [
            { path: "/", method: "GET", description: "Web UI Interface" },
            { path: "/api/generate", method: "POST", description: "Gemini format API" },
            { path: "/api/v1/images/generations", method: "POST", description: "OpenAI format API" },
            { path: "/proxy", method: "POST", description: "Custom proxy endpoint" },
            { path: "/health", method: "GET", description: "Health check" }
          ]
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/generate (Gemini format)
      if (path === '/api/generate' && method === 'POST') {
        console.log('Handling /api/generate');
        return await handleGenerate(request, env, 'gemini', corsHeaders);
      }

      // POST /api/v1/images/generations (OpenAI format)
      if (path === '/api/v1/images/generations' && method === 'POST') {
        console.log('Handling /api/v1/images/generations');
        return await handleGenerate(request, env, 'openai', corsHeaders);
      }

      // POST /proxy (Custom proxy)
      if (path === '/proxy' && method === 'POST') {
        console.log('Handling /proxy');
        return await handleProxy(request, env, corsHeaders);
      }

      // Root path - Full UI
      if (path === '/' || path === '/index.html') {
        return new Response(getFullUI(url.origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 404
      console.log('404 Not Found:', path);
      return new Response(JSON.stringify({ 
        error: 'Not Found',
        path: path,
        available_endpoints: ['/', '/health', '/api/endpoints', '/api/generate', '/api/v1/images/generations', '/proxy']
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// 完整 UI 界面（包含所有功能）
function getFullUI(origin) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image Proxy - API Gateway</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --primary: #6366f1;
      --secondary: #8b5cf6;
      --success: #10b981;
      --error: #ef4444;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: var(--text-primary);
    }
    
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(138, 92, 246, 0.3), transparent 50%);
      z-index: -1;
    }
    
    .container {
      max-width: 1100px;
      margin: 0 auto;
      animation: fadeIn 0.6s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    
    .header p {
      font-size: 18px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .glass-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(148, 163, 184, 0.1);
      padding: 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      margin-bottom: 24px;
    }
    
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
      background: rgba(15, 23, 42, 0.5);
      padding: 6px;
      border-radius: 16px;
    }
    
    .tab {
      flex: 1;
      padding: 14px 20px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 15px;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .tab:hover {
      color: var(--text-primary);
      background: rgba(99, 102, 241, 0.1);
    }
    
    .tab.active {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    
    .tab-content {
      display: none;
      animation: slideIn 0.4s ease-out;
    }
    
    .tab-content.active {
      display: block;
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 2px;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 10px;
    }
    
    .form-input {
      width: 100%;
      padding: 14px 18px;
      background: rgba(15, 23, 42, 0.6);
      border: 2px solid transparent;
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 15px;
      transition: all 0.3s ease;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      background: rgba(15, 23, 42, 0.8);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
    
    .form-input::placeholder {
      color: var(--text-secondary);
    }
    
    textarea.form-input {
      resize: vertical;
      min-height: 100px;
      font-family: inherit;
    }
    
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .checkbox-wrapper:hover {
      background: rgba(99, 102, 241, 0.1);
    }
    
    .checkbox-wrapper input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: var(--primary);
    }
    
    .checkbox-wrapper label {
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .btn-primary {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    .btn-primary::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: left 0.5s;
    }
    
    .btn-primary:hover::before {
      left: 100%;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(99, 102, 241, 0.5);
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
    
    .btn-primary:disabled {
      background: linear-gradient(135deg, #64748b, #475569);
      cursor: not-allowed;
      transform: none;
      opacity: 0.6;
    }
    
    .status-alert {
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: none;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      animation: slideDown 0.3s ease-out;
      word-break: break-word;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .status-alert.show {
      display: flex;
    }
    
    .status-success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .status-loading {
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    
    .status-error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .image-preview {
      width: 100%;
      min-height: 400px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 24px 0;
      overflow: hidden;
      border: 2px dashed #334155;
    }
    
    .image-preview img {
      max-width: 100%;
      max-height: 600px;
      border-radius: 12px;
    }
    
    .image-preview.empty {
      color: var(--text-secondary);
      font-size: 16px;
    }
    
    .info-card {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 20px;
      margin: 20px 0;
      display: none;
    }
    
    .info-card.show {
      display: block;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 600;
      color: var(--text-secondary);
    }
    
    .info-value {
      color: var(--text-primary);
      font-family: monospace;
      font-size: 13px;
      word-break: break-all;
      max-width: 60%;
      text-align: right;
    }
    
    .endpoint-card {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      border: 1px solid #334155;
    }
    
    .endpoint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .endpoint-title {
      font-weight: 700;
      font-size: 16px;
      color: var(--text-primary);
    }
    
    .endpoint-badge {
      padding: 4px 12px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .endpoint-url {
      background: rgba(15, 23, 42, 0.8);
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      color: var(--success);
      word-break: break-all;
      margin: 12px 0;
    }
    
    .btn-copy {
      padding: 8px 16px;
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      border: 1px solid var(--primary);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-copy:hover {
      background: var(--primary);
      color: white;
    }
    
    .code-block {
      background: rgba(15, 23, 42, 0.9);
      padding: 20px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 16px 0;
      border: 1px solid #334155;
    }
    
    .code-block pre {
      color: #e2e8f0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .accordion {
      background: rgba(15, 23, 42, 0.4);
      border-radius: 12px;
      margin: 12px 0;
      border: 1px solid #334155;
      overflow: hidden;
    }
    
    .accordion-header {
      padding: 16px 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      transition: background 0.2s;
    }
    
    .accordion-header:hover {
      background: rgba(99, 102, 241, 0.1);
    }
    
    .accordion-icon {
      transition: transform 0.3s;
    }
    
    .accordion.active .accordion-icon {
      transform: rotate(180deg);
    }
    
    .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }
    
    .accordion.active .accordion-content {
      max-height: 2000px;
    }
    
    .accordion-body {
      padding: 20px;
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 36px;
      }
      
      .glass-card {
        padding: 20px;
      }
      
      .tabs {
        flex-direction: column;
      }
      
      .tab {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Gemini Image Proxy</h1>
      <p>强大的 AI 图像生成 API 网关 v2.5.0</p>
    </div>

    <div class="glass-card">
      <div class="tabs">
        <button class="tab active" data-tab="0">🖼️ 图像生成</button>
        <button class="tab" data-tab="1">📡 API 集成</button>
        <button class="tab" data-tab="2">📖 文档</button>
      </div>

      <!-- Tab 1: 图像生成 -->
      <div class="tab-content active" id="tab-generate">
        <div class="section-title">配置</div>
        
        <div class="form-group">
          <label class="form-label">上游 API 端点</label>
          <input type="url" class="form-input" id="targetUrl" placeholder="https://api-integrations.appmedo.com/..." value="https://api-integrations.appmedo.com/app-7r29gu4xs001/api-Xa6JZ58oPMEa/v1beta/models/gemini-3-pro-image-preview:generateContent">
        </div>

        <div class="form-group">
          <label class="form-label">API Key（可选）</label>
          <input type="password" class="form-input" id="apiKey" placeholder="留空使用环境变量">
        </div>

        <div class="form-group">
          <label class="form-label">图像描述 Prompt</label>
          <textarea class="form-input" id="prompt" placeholder="描述你想生成的图像...">一只可爱的橘猫在香港沙田区的公园里散步，阳光明媚，画风细腻，高清</textarea>
        </div>

        <div class="checkbox-wrapper">
          <input type="checkbox" id="openaiFormat">
          <label for="openaiFormat">启用 OpenAI 格式输出</label>
        </div>

        <button class="btn-primary" id="generateBtn">
          🎨 开始生成
        </button>

        <div class="status-alert" id="status"></div>

        <div class="info-card" id="apiInfo">
          <div class="info-row">
            <span class="info-label">最终端点</span>
            <span class="info-value" id="finalEndpoint"></span>
          </div>
          <div class="info-row">
            <span class="info-label">格式模式</span>
            <span class="info-value" id="formatMode"></span>
          </div>
          <div class="info-row">
            <span class="info-label">生成时间</span>
            <span class="info-value" id="genTime"></span>
          </div>
        </div>

        <div class="image-preview empty" id="imagePreview">
          <span>生成的图像将显示在这里</span>
        </div>

        <div class="accordion" id="logAccordion">
          <div class="accordion-header">
            <span>🔧 Raw API Response</span>
            <span class="accordion-icon">▼</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <div class="code-block">
                <pre id="log">等待 API 响应...</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: API 集成 -->
      <div class="tab-content" id="tab-api">
        <div class="section-title">下游 API 端点</div>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">将此 Proxy 集成到你的应用中</p>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <div class="endpoint-title">标准 Gemini 格式</div>
            <div class="endpoint-badge">POST</div>
          </div>
          <div class="endpoint-url" id="endpoint1"></div>
          <button class="btn-copy" data-target="endpoint1">📋 复制端点</button>
        </div>

        <div class="endpoint-card">
          <div class="endpoint-header">
            <div class="endpoint-title">OpenAI 兼容格式</div>
            <div class="endpoint-badge">POST</div>
          </div>
          <div class="endpoint-url" id="endpoint2"></div>
          <button class="btn-copy" data-target="endpoint2">📋 复制端点</button>
        </div>

        <div class="accordion" id="curlAccordion">
          <div class="accordion-header">
            <span>📋 curl 示例</span>
            <span class="accordion-icon">▼</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <div class="code-block">
                <pre id="curlExamples"></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 文档 -->
      <div class="tab-content" id="tab-docs">
        <div class="section-title">API 文档</div>
        
        <div class="accordion active" id="docsAccordion1">
          <div class="accordion-header">
            <span>📘 快速开始</span>
            <span class="accordion-icon">▼</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <p style="margin-bottom: 16px;">此 Proxy 提供两种 API 格式：</p>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;">✅ 标准 Gemini 格式 - 返回完整 Gemini API 响应</li>
                <li style="padding: 8px 0;">✅ OpenAI 兼容格式 - 兼容 OpenAI images.generations 接口</li>
                <li style="padding: 8px 0;">⏳ 无超时限制 - 等待上游 API 完成</li>
                <li style="padding: 8px 0;">🎯 Markdown 图像支持 - 自动解析多种格式</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="accordion" id="docsAccordion2">
          <div class="accordion-header">
            <span>📗 请求格式</span>
            <span class="accordion-icon">▼</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <div class="code-block">
                <pre>{
  "prompt": "可爱的猫咪",
  "response_mime_type": "image/png",
  "temperature": 0.7
}</pre>
              </div>
            </div>
          </div>
        </div>

        <div class="accordion" id="docsAccordion3">
          <div class="accordion-header">
            <span>📙 响应格式</span>
            <span class="accordion-icon">▼</span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <div class="code-block">
                <pre>// Gemini 格式（inline_data）
{
  "candidates": [{
    "content": {
      "parts": [{
        "inline_data": {
          "data": "base64_image_string",
          "mimeType": "image/png"
        }
      }]
    }
  }]
}

// Gemini 格式（Markdown）
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "![image](data:image/jpeg;base64,...)"
      }]
    }
  }]
}

// OpenAI 格式
{
  "created": 1739264400,
  "data": [{
    "b64_json": "base64_image_string",
    "revised_prompt": "prompt text"
  }]
}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';
      
      const BASE_URL = '${origin}';
      let currentTab = 0;

      document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ 页面加载完成 v2.5.0');
        console.log('API Base:', BASE_URL);
        
        initEndpoints();
        initTabs();
        initGenerateButton();
        initCopyButtons();
        initAccordions();
        initKeyboardShortcuts();
        
        console.log('✅ 初始化完成');
      });

      function initEndpoints() {
        const endpoint1 = document.getElementById('endpoint1');
        const endpoint2 = document.getElementById('endpoint2');
        const curlExamples = document.getElementById('curlExamples');
        
        if (endpoint1) endpoint1.textContent = BASE_URL + '/api/generate';
        if (endpoint2) endpoint2.textContent = BASE_URL + '/api/v1/images/generations';
        if (curlExamples) {
          curlExamples.textContent = \`# 标准 Gemini 格式
curl -X POST \${BASE_URL}/api/generate \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"prompt":"可爱的猫咪在香港沙田区散步"}'

# OpenAI 兼容格式
curl -X POST \${BASE_URL}/api/v1/images/generations \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"prompt":"A cute cat walking in Sha Tin, Hong Kong"}'\`;
        }
      }

      function initTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(function(tab) {
          tab.addEventListener('click', function() {
            const tabIndex = parseInt(tab.getAttribute('data-tab'));
            switchTab(tabIndex);
          });
        });
      }

      function switchTab(index) {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(function(tab, i) {
          if (i === index) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
        
        contents.forEach(function(content, i) {
          if (i === index) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
        
        currentTab = index;
      }

      function initGenerateButton() {
        const btn = document.getElementById('generateBtn');
        if (btn) {
          btn.addEventListener('click', function() {
            console.log('✅ 生成按钮被点击');
            generateImage();
          });
          console.log('✅ 生成按钮已绑定');
        }
      }

      function initCopyButtons() {
        const copyButtons = document.querySelectorAll('.btn-copy');
        copyButtons.forEach(function(btn) {
          btn.addEventListener('click', function() {
            const targetId = btn.getAttribute('data-target');
            copyEndpoint(targetId, btn);
          });
        });
      }

      function initAccordions() {
        const accordions = document.querySelectorAll('.accordion');
        accordions.forEach(function(accordion) {
          const header = accordion.querySelector('.accordion-header');
          if (header) {
            header.addEventListener('click', function() {
              accordion.classList.toggle('active');
            });
          }
        });
      }

      function initKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey && e.key === 'Enter' && currentTab === 0) {
            generateImage();
          }
        });
      }

      function extractImageData(data) {
        const candidate = data.candidates && data.candidates[0];
        if (!candidate) return null;
        
        const part = candidate.content && candidate.content.parts && candidate.content.parts[0];
        if (!part) return null;
        
        // 方法 1: inline_data
        if (part.inline_data && part.inline_data.data) {
          console.log('✅ 从 inline_data 提取图像');
          return {
            data: part.inline_data.data,
            mimeType: part.inline_data.mimeType || 'image/png'
          };
        }
        
        // 方法 2: Markdown
        if (part.text) {
          const match = part.text.match(/!\\[.*?\\]\\(data:(image\\/[^;]+);base64,([^)]+)\\)/);
          if (match) {
            console.log('✅ 从 Markdown 提取图像');
            return {
              data: match[2],
              mimeType: match[1]
            };
          }
        }
        
        return null;
      }

      async function generateImage() {
        const btn = document.getElementById('generateBtn');
        const status = document.getElementById('status');
        const apiInfo = document.getElementById('apiInfo');
        const preview = document.getElementById('imagePreview');
        const log = document.getElementById('log');

        btn.disabled = true;
        btn.textContent = '⏳ 生成中...';
        status.className = 'status-alert status-loading show';
        status.textContent = '⏳ 正在请求 API...';
        preview.innerHTML = '<span>生成中...</span>';
        preview.classList.add('empty');
        apiInfo.classList.remove('show');
        log.textContent = '等待响应...';

        const startTime = Date.now();
        let progressCount = 0;
        const progressInterval = setInterval(function() {
          progressCount++;
          const dots = '.'.repeat((progressCount % 3) + 1);
          status.textContent = \`⏳ 正在生成图像\${dots} (\${progressCount}s)\`;
        }, 1000);

        try {
          const targetUrl = document.getElementById('targetUrl').value.trim();
          const apiKey = document.getElementById('apiKey').value.trim();
          const prompt = document.getElementById('prompt').value.trim();
          const openai = document.getElementById('openaiFormat').checked;

          if (!prompt) throw new Error('请输入图像描述');
          if (!targetUrl) throw new Error('请输入上游 API 端点');

          console.log('发送请求:', { prompt: prompt.substring(0, 50), openai: openai });

          const response = await fetch(BASE_URL + '/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_url: targetUrl,
              key: apiKey || undefined,
              prompt: prompt,
              openai: openai,
              response_mime_type: 'image/png'
            })
          });

          clearInterval(progressInterval);
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          const responseText = await response.text();
          log.textContent = responseText;

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            throw new Error('JSON 解析失败: ' + responseText.substring(0, 300));
          }

          if (data.error) {
            const errMsg = typeof data.error === 'string' ? data.error : 
                           data.error.message || JSON.stringify(data.error);
            throw new Error(errMsg);
          }

          if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + (data.message || '请求失败'));
          }

          const finalUrl = targetUrl;
          const mode = openai ? 'openai' : 'gemini';
          document.getElementById('finalEndpoint').textContent = finalUrl;
          document.getElementById('formatMode').textContent = 
            mode === 'openai' ? '✅ OpenAI' : '🔵 Gemini';
          document.getElementById('genTime').textContent = duration + 's';
          apiInfo.classList.add('show');

          let imgB64 = '';
          let mimeType = 'image/png';
          
          if (openai) {
            imgB64 = data.data && data.data[0] ? data.data[0].b64_json : '';
          } else {
            const extracted = extractImageData(data);
            if (extracted) {
              imgB64 = extracted.data;
              mimeType = extracted.mimeType;
            }
          }

          if (imgB64) {
            preview.innerHTML = '<img src="data:' + mimeType + ';base64,' + imgB64 + '" alt="Generated Image">';
            preview.classList.remove('empty');
            status.className = 'status-alert status-success show';
            status.textContent = '✅ 生成成功！(耗时 ' + duration + 's)';
          } else {
            throw new Error('无图像数据\\n\\n响应预览:\\n' + JSON.stringify(data, null, 2).substring(0, 500));
          }

        } catch (error) {
          clearInterval(progressInterval);
          
          status.className = 'status-alert status-error show';
          let errorMsg = error instanceof Error ? error.message : 
                         typeof error === 'string' ? error : 
                         JSON.stringify(error, null, 2);
          
          status.textContent = '❌ ' + errorMsg;
          if (log.textContent === '等待响应...') {
            log.textContent = '错误详情:\\n' + errorMsg + '\\n\\n' + (error.stack || '');
          }
          console.error('生成错误:', error);
        } finally {
          clearInterval(progressInterval);
          btn.disabled = false;
          btn.textContent = '🎨 开始生成';
        }
      }

      function copyEndpoint(id, btnElement) {
        const element = document.getElementById(id);
        if (!element) return;
        
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(function() {
          const btn = btnElement;
          const original = btn.textContent;
          btn.textContent = '✅ 已复制';
          btn.style.background = 'rgba(16, 185, 129, 0.2)';
          btn.style.color = 'var(--success)';
          btn.style.borderColor = 'var(--success)';
          setTimeout(function() {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 2000);
        }).catch(function(err) {
          alert('复制失败: ' + err.message);
        });
      }

    })();
  </script>
</body>
</html>`;
}

// 提取图像数据（支持多种格式）
function extractImageData(data) {
  let imgB64 = null;
  let mimeType = 'image/png';
  
  const candidate = data.candidates?.[0];
  if (!candidate) return { imgB64: null, mimeType };
  
  const part = candidate.content?.parts?.[0];
  if (!part) return { imgB64: null, mimeType };
  
  // 方法 1: inline_data 格式
  if (part.inline_data?.data) {
    imgB64 = part.inline_data.data;
    mimeType = part.inline_data.mimeType || 'image/png';
    console.log('✅ Extracted from inline_data');
  }
  // 方法 2: Markdown 格式
  else if (part.text) {
    const match = part.text.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
    if (match) {
      mimeType = match[1];
      imgB64 = match[2];
      console.log('✅ Extracted from Markdown format:', { mimeType, dataLength: imgB64.length });
    }
  }
  
  return { imgB64, mimeType };
}

// 处理生成请求
async function handleGenerate(request, env, format, corsHeaders) {
  try {
    if (!env.API_KEY || !env.TARGET_URL) {
      return jsonError('Server configuration error', 500, corsHeaders, {
        has_api_key: !!env.API_KEY,
        has_target_url: !!env.TARGET_URL
      });
    }

    const body = await request.json().catch(() => ({}));
    
    if (!body.prompt) {
      return jsonError('Missing prompt field', 400, corsHeaders);
    }

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);
    const apiOutputUrl = new URL(env.TARGET_URL).href;

    console.log('Upstream request:', { format, prompt: body.prompt.substring(0, 50) });

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker/2.5.0'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: body.prompt }]
        }],
        generationConfig: {
          response_mime_type: body.response_mime_type || 'image/png',
          temperature: body.temperature || 0.7
        }
      })
    });

    console.log('Upstream response:', upstreamResp.status);

    if (!upstreamResp.ok) {
      const errorText = await upstreamResp.text();
      console.error('Upstream error:', errorText);
      return jsonError(`Upstream error: ${upstreamResp.status}`, upstreamResp.status, corsHeaders, {
        detail: errorText
      });
    }

    let data = await upstreamResp.json();

    // OpenAI 格式转换
    if (format === 'openai') {
      const { imgB64 } = extractImageData(data);
      
      if (!imgB64) {
        console.error('No image data');
        return jsonError('No image data in response', 500, corsHeaders, {
          raw_response: data
        });
      }
      
      data = {
        created: Math.floor(Date.now() / 1000),
        data: [{ 
          b64_json: imgB64,
          revised_prompt: body.prompt
        }]
      };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'x-final-destination': apiOutputUrl,
        'x-api-format': format
      }
    });

  } catch (error) {
    console.error('handleGenerate error:', error);
    return jsonError(error.message, 500, corsHeaders);
  }
}

// 处理代理请求
async function handleProxy(request, env, corsHeaders) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const targetBase = body.target_url || env.TARGET_URL;
    const apiKey = body.key || env.API_KEY;

    if (!targetBase) return jsonError('Missing target_url', 400, corsHeaders);
    if (!apiKey) return jsonError('Missing API key', 400, corsHeaders);
    if (!body.prompt) return jsonError('Missing prompt', 400, corsHeaders);

    const targetUrl = new URL(targetBase);
    targetUrl.searchParams.set('key', apiKey);
    const apiOutputUrl = new URL(targetBase).href;

    console.log('Proxy request:', { 
      target: apiOutputUrl, 
      prompt_length: body.prompt.length,
      openai_mode: !!body.openai
    });

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker-Proxy/2.5.0'
      },
      body: JSON.stringify({
        contents: [{ 
          role: 'user', 
          parts: [{ text: body.prompt }] 
        }],
        generationConfig: { 
          response_mime_type: body.response_mime_type || 'image/png',
          temperature: body.temperature || 0.7
        }
      })
    });

    console.log('Proxy upstream response:', upstreamResp.status);

    if (!upstreamResp.ok) {
      const errorText = await upstreamResp.text();
      console.error('Proxy error:', errorText);
      return jsonError(`Upstream error: ${upstreamResp.status}`, upstreamResp.status, corsHeaders, {
        detail: errorText
      });
    }

    let data = await upstreamResp.json();

    // OpenAI 格式转换
    if (body.openai) {
      const { imgB64 } = extractImageData(data);
      if (imgB64) {
        data = {
          created: Math.floor(Date.now() / 1000),
          data: [{
            b64_json: imgB64,
            revised_prompt: body.prompt
          }]
        };
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'x-final-destination': apiOutputUrl,
        'x-openai-mode': body.openai ? 'enabled' : 'native'
      }
    });

  } catch (error) {
    console.error('handleProxy error:', error);
    return jsonError(error.message, 500, corsHeaders);
  }
}

// 统一错误响应
function jsonError(message, status = 500, corsHeaders = {}, extra = {}) {
  return new Response(JSON.stringify({ 
    error: {
      message: message,
      status: status,
      timestamp: new Date().toISOString(),
      ...extra
    }
  }), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
