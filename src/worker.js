export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('=== Request ===');
    console.log('Method:', method);
    console.log('Path:', path);
    console.log('Origin:', url.origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    // CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '2.5.1',
          timestamp: new Date().toISOString(),
          method: method,
          path: path
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API endpoints info
      if (path === '/api/endpoints') {
        return new Response(JSON.stringify({ 
          version: "2.5.1",
          endpoints: [
            { path: "/", method: "GET" },
            { path: "/health", method: "GET" },
            { path: "/api/endpoints", method: "GET" },
            { path: "/api/generate", method: "POST" },
            { path: "/api/v1/images/generations", method: "POST" },
            { path: "/proxy", method: "POST" }
          ]
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/generate
      if (path === '/api/generate' && method === 'POST') {
        console.log('✅ Matched /api/generate');
        return await handleGenerate(request, env, 'gemini', corsHeaders);
      }

      // POST /api/v1/images/generations
      if (path === '/api/v1/images/generations' && method === 'POST') {
        console.log('✅ Matched /api/v1/images/generations');
        return await handleGenerate(request, env, 'openai', corsHeaders);
      }

      // POST /proxy
      if (path === '/proxy' && method === 'POST') {
        console.log('✅ Matched /proxy');
        return await handleProxy(request, env, corsHeaders);
      }

      // Root path
      if (path === '/' || path === '/index.html') {
        return new Response(getFullUI(url.origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 404
      console.log('❌ No route matched');
      return new Response(JSON.stringify({ 
        error: 'Not Found',
        path: path,
        method: method,
        message: 'Route not found. Make sure to use POST for API endpoints.',
        available_endpoints: [
          'GET /',
          'GET /health',
          'GET /api/endpoints',
          'POST /api/generate',
          'POST /api/v1/images/generations',
          'POST /proxy'
        ]
      }, null, 2), {
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

// 完整 UI（保持之前的代码）
function getFullUI(origin) {
  return \`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image Proxy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea, #764ba2);
      min-height: 100vh;
      padding: 20px;
      color: #fff;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      margin: 20px 0;
    }
    h1 { font-size: 42px; margin-bottom: 10px; }
    .btn-test {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin: 10px 10px 10px 0;
    }
    .btn-test:hover { transform: translateY(-2px); }
    pre {
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 10px;
      overflow-x: auto;
      margin: 15px 0;
      font-size: 13px;
    }
    .status {
      padding: 12px;
      border-radius: 8px;
      margin: 10px 0;
    }
    .success { background: rgba(16,185,129,0.2); color: #6ee7b7; }
    .error { background: rgba(239,68,68,0.2); color: #fca5a5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🎨 Gemini Image Proxy</h1>
      <p>v2.5.1 - API Gateway Test Page</p>
      
      <h2 style="margin-top: 30px;">快速测试</h2>
      <button class="btn-test" onclick="testHealth()">测试 Health</button>
      <button class="btn-test" onclick="testGenerate()">测试生成 (Gemini)</button>
      <button class="btn-test" onclick="testOpenAI()">测试生成 (OpenAI)</button>
      
      <div id="result"></div>
      
      <h2 style="margin-top: 30px;">API 端点</h2>
      <pre>POST \${origin}/api/generate
POST \${origin}/api/v1/images/generations
POST \${origin}/proxy
GET  \${origin}/health</pre>
      
      <h2 style="margin-top: 30px;">curl 测试</h2>
      <pre>curl -X POST \${origin}/api/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"cute cat"}' \\
  -v</pre>
    </div>
  </div>

  <script>
    const API_BASE = '\${origin}';
    
    async function testHealth() {
      showResult('testing', '正在测试 /health...');
      try {
        const response = await fetch(API_BASE + '/health');
        const data = await response.json();
        showResult('success', 'Health Check 成功:\\n' + JSON.stringify(data, null, 2));
      } catch (error) {
        showResult('error', '错误: ' + error.message);
      }
    }
    
    async function testGenerate() {
      showResult('testing', '正在测试 /api/generate (Gemini 格式)...');
      try {
        const response = await fetch(API_BASE + '/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test image' })
        });
        
        const text = await response.text();
        
        if (response.ok) {
          showResult('success', 'API 响应成功 (' + response.status + '):\\n' + text.substring(0, 500));
        } else {
          showResult('error', 'API 错误 (' + response.status + '):\\n' + text);
        }
      } catch (error) {
        showResult('error', '请求失败: ' + error.message);
      }
    }
    
    async function testOpenAI() {
      showResult('testing', '正在测试 /api/v1/images/generations (OpenAI 格式)...');
      try {
        const response = await fetch(API_BASE + '/api/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test image' })
        });
        
        const text = await response.text();
        
        if (response.ok) {
          showResult('success', 'API 响应成功 (' + response.status + '):\\n' + text.substring(0, 500));
        } else {
          showResult('error', 'API 错误 (' + response.status + '):\\n' + text);
        }
      } catch (error) {
        showResult('error', '请求失败: ' + error.message);
      }
    }
    
    function showResult(type, message) {
      const result = document.getElementById('result');
      const className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
      result.innerHTML = '<div class="status ' + className + '"><pre>' + message + '</pre></div>';
    }
    
    console.log('✅ Test page loaded');
    console.log('API Base:', API_BASE);
  </script>
</body>
</html>\`;
}

// 提取图像数据
function extractImageData(data) {
  const candidate = data.candidates?.[0];
  if (!candidate) return { imgB64: null, mimeType: 'image/png' };
  
  const part = candidate.content?.parts?.[0];
  if (!part) return { imgB64: null, mimeType: 'image/png' };
  
  if (part.inline_data?.data) {
    return {
      imgB64: part.inline_data.data,
      mimeType: part.inline_data.mimeType || 'image/png'
    };
  }
  
  if (part.text) {
    const match = part.text.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
    if (match) {
      return {
        imgB64: match[2],
        mimeType: match[1]
      };
    }
  }
  
  return { imgB64: null, mimeType: 'image/png' };
}

// 处理生成请求
async function handleGenerate(request, env, format, corsHeaders) {
  try {
    console.log('handleGenerate called with format:', format);
    
    if (!env.API_KEY || !env.TARGET_URL) {
      console.error('Missing env vars:', { has_key: !!env.API_KEY, has_url: !!env.TARGET_URL });
      return jsonError('Server configuration error', 500, corsHeaders);
    }

    const body = await request.json().catch(() => ({}));
    console.log('Request body:', body);
    
    if (!body.prompt) {
      return jsonError('Missing prompt field', 400, corsHeaders);
    }

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);

    console.log('Calling upstream API...');

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker/2.5.1'
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

    console.log('Upstream status:', upstreamResp.status);

    if (!upstreamResp.ok) {
      const errorText = await upstreamResp.text();
      console.error('Upstream error:', errorText);
      return jsonError(\`Upstream error: \${upstreamResp.status}\`, upstreamResp.status, corsHeaders);
    }

    let data = await upstreamResp.json();
    console.log('Got data, format:', format);

    if (format === 'openai') {
      const { imgB64 } = extractImageData(data);
      
      if (!imgB64) {
        console.error('No image data found');
        return jsonError('No image data in response', 500, corsHeaders);
      }
      
      data = {
        created: Math.floor(Date.now() / 1000),
        data: [{ 
          b64_json: imgB64,
          revised_prompt: body.prompt
        }]
      };
    }

    console.log('Returning success response');
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
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

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker-Proxy/2.5.1'
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

    if (!upstreamResp.ok) {
      const errorText = await upstreamResp.text();
      return jsonError(\`Upstream error: \${upstreamResp.status}\`, upstreamResp.status, corsHeaders);
    }

    let data = await upstreamResp.json();

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
        'x-openai-mode': body.openai ? 'enabled' : 'native'
      }
    });

  } catch (error) {
    console.error('handleProxy error:', error);
    return jsonError(error.message, 500, corsHeaders);
  }
}

// 错误响应
function jsonError(message, status = 500, corsHeaders = {}) {
  return new Response(JSON.stringify({ 
    error: {
      message: message,
      status: status,
      timestamp: new Date().toISOString()
    }
  }), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
