export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('Request:', method, path);

    // 添加 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };

    // OPTIONS 请求
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '2.4.2',
          timestamp: new Date().toISOString(),
          path: path,
          method: method
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API endpoints info
      if (path === '/api/endpoints' && method === 'GET') {
        return new Response(JSON.stringify({ 
          version: "2.4.2",
          endpoints: [
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
        console.log('Handling /api/generate');
        return await handleGenerate(request, env, 'gemini', corsHeaders);
      }

      // POST /api/v1/images/generations
      if (path === '/api/v1/images/generations' && method === 'POST') {
        console.log('Handling /api/v1/images/generations');
        return await handleGenerate(request, env, 'openai', corsHeaders);
      }

      // POST /proxy
      if (path === '/proxy' && method === 'POST') {
        console.log('Handling /proxy');
        return await handleProxy(request, env, corsHeaders);
      }

      // Root path
      if (path === '/') {
        return new Response(getHomePage(url.origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 404
      console.log('404 Not Found:', path);
      return new Response(JSON.stringify({ 
        error: 'Not Found',
        path: path,
        method: method,
        message: 'Endpoint not found. Try /health or /api/endpoints'
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

// 首页
function getHomePage(origin) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image Proxy API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 900px;
      margin: 50px auto;
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 16px;
      margin: 20px 0;
    }
    h1 { margin: 0 0 10px 0; font-size: 48px; }
    .version { opacity: 0.8; margin-bottom: 30px; }
    .endpoint {
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: 12px;
      margin: 15px 0;
      border-left: 4px solid #6366f1;
    }
    .endpoint strong { display: block; font-size: 18px; margin-bottom: 8px; color: #a5b4fc; }
    code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    pre {
      background: rgba(0, 0, 0, 0.4);
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 14px;
    }
    a { 
      color: #c4b5fd; 
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: inline-block;
      margin: 5px;
    }
    a:hover { background: rgba(255, 255, 255, 0.2); }
    .status { display: inline-block; padding: 4px 12px; background: #10b981; border-radius: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎨 Gemini Image Proxy</h1>
    <div class="version">Version 2.4.2 <span class="status">ONLINE</span></div>
    
    <h2>📡 API Endpoints</h2>
    
    <div class="endpoint">
      <strong>POST /api/v1/images/generations</strong>
      <p>OpenAI compatible format</p>
      <code>${origin}/api/v1/images/generations</code>
    </div>
    
    <div class="endpoint">
      <strong>POST /api/generate</strong>
      <p>Standard Gemini format</p>
      <code>${origin}/api/generate</code>
    </div>
    
    <div class="endpoint">
      <strong>POST /proxy</strong>
      <p>Custom proxy with dynamic target URL</p>
      <code>${origin}/proxy</code>
    </div>
    
    <div class="endpoint">
      <strong>GET /health</strong>
      <p>Health check endpoint</p>
      <code>${origin}/health</code>
    </div>
    
    <h2>💡 Example Usage</h2>
    <pre><code>curl -X POST ${origin}/api/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"A cute cat in Hong Kong"}'</code></pre>
    
    <div style="margin-top: 30px;">
      <a href="/health">🔍 Health Check</a>
      <a href="/api/endpoints">📋 API Info</a>
    </div>
  </div>
</body>
</html>`;
}

// 提取图像数据
function extractImageData(data) {
  let imgB64 = null;
  let mimeType = 'image/png';
  
  const candidate = data.candidates?.[0];
  if (!candidate) return { imgB64: null, mimeType };
  
  const part = candidate.content?.parts?.[0];
  if (!part) return { imgB64: null, mimeType };
  
  // 方法 1: inline_data
  if (part.inline_data?.data) {
    imgB64 = part.inline_data.data;
    mimeType = part.inline_data.mimeType || 'image/png';
    console.log('✅ From inline_data');
  }
  // 方法 2: Markdown
  else if (part.text) {
    const match = part.text.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
    if (match) {
      mimeType = match[1];
      imgB64 = match[2];
      console.log('✅ From Markdown');
    }
  }
  
  return { imgB64, mimeType };
}

// 处理生成请求
async function handleGenerate(request, env, format, corsHeaders) {
  try {
    if (!env.API_KEY || !env.TARGET_URL) {
      return jsonError('Server configuration error', 500, corsHeaders);
    }

    const body = await request.json().catch(() => ({}));
    
    if (!body.prompt) {
      return jsonError('Missing prompt field', 400, corsHeaders);
    }

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);

    console.log('Upstream request:', { format, prompt: body.prompt.substring(0, 50) });

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker/2.4.2'
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
      return jsonError(`Upstream error: ${upstreamResp.status}`, upstreamResp.status, corsHeaders);
    }

    let data = await upstreamResp.json();

    // OpenAI 格式转换
    if (format === 'openai') {
      const { imgB64 } = extractImageData(data);
      
      if (!imgB64) {
        console.error('No image data');
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
        'User-Agent': 'Cloudflare-Worker-Proxy/2.4.2'
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
      return jsonError(`Upstream error: ${upstreamResp.status}`, upstreamResp.status, corsHeaders);
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
