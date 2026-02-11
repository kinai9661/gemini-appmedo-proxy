export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // CORS Preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '2.4.1',
          timestamp: new Date().toISOString(),
          env_check: {
            has_api_key: !!env.API_KEY,
            has_target_url: !!env.TARGET_URL,
            has_assets: !!env.ASSETS
          }
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // GET /api/endpoints
      if (request.method === 'GET' && url.pathname === '/api/endpoints') {
        const baseUrl = url.origin;
        return new Response(JSON.stringify({ 
          version: "2.4.1",
          timeout: "unlimited",
          endpoints: [
            {
              path: "/api/generate",
              method: "POST",
              format: "gemini",
              url: `${baseUrl}/api/generate`
            },
            {
              path: "/api/v1/images/generations",
              method: "POST",
              format: "openai",
              url: `${baseUrl}/api/v1/images/generations`
            },
            {
              path: "/proxy",
              method: "POST",
              format: "custom",
              url: `${baseUrl}/proxy`
            }
          ]
        }, null, 2), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // POST /api/generate
      if (request.method === 'POST' && url.pathname === '/api/generate') {
        return handleGenerate(request, env, 'gemini');
      }

      // POST /api/v1/images/generations
      if (request.method === 'POST' && url.pathname === '/api/v1/images/generations') {
        return handleGenerate(request, env, 'openai');
      }

      // POST /proxy
      if (request.method === 'POST' && url.pathname === '/proxy') {
        return handleProxy(request, env);
      }

      // 根路径返回简单说明
      if (url.pathname === '/') {
        return new Response(getHomePage(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 静态资源（如果配置了 ASSETS）
      if (env.ASSETS) {
        try {
          return await env.ASSETS.fetch(request);
        } catch (assetsError) {
          console.error('Assets fetch error:', assetsError);
          return new Response('Asset not found', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }

      // 默认 404
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};

// 简单的首页 HTML
function getHomePage() {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image Proxy API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
    }
    h1 { color: #6366f1; }
    .endpoint {
      background: #1e293b;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      border-left: 4px solid #6366f1;
    }
    code {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    a { color: #8b5cf6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🎨 Gemini Image Proxy API</h1>
  <p>Version: 2.4.1</p>
  
  <h2>Available Endpoints:</h2>
  
  <div class="endpoint">
    <strong>POST /api/generate</strong><br>
    Standard Gemini format
  </div>
  
  <div class="endpoint">
    <strong>POST /api/v1/images/generations</strong><br>
    OpenAI compatible format
  </div>
  
  <div class="endpoint">
    <strong>POST /proxy</strong><br>
    Custom proxy endpoint
  </div>
  
  <div class="endpoint">
    <strong>GET /health</strong><br>
    Health check
  </div>
  
  <div class="endpoint">
    <strong>GET /api/endpoints</strong><br>
    API documentation
  </div>
  
  <h2>Example Usage:</h2>
  <pre><code>curl -X POST ${getBaseUrl()}/api/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"A cute cat"}'</code></pre>
  
  <p>
    <a href="/health">Health Check</a> | 
    <a href="/api/endpoints">API Endpoints</a>
  </p>
</body>
</html>`;
  
  function getBaseUrl() {
    try {
      return new URL(self.location.href).origin;
    } catch {
      return 'https://your-worker.workers.dev';
    }
  }
}

// 提取图像数据（支持多种格式）
function extractImageData(data) {
  let imgB64 = null;
  let mimeType = 'image/png';
  
  const candidate = data.candidates?.[0];
  if (!candidate) return { imgB64: null, mimeType };
  
  const part = candidate.content?.parts?.[0];
  if (!part) return { imgB64: null, mimeType };
  
  // 方法 1: inline_data 格式（标准格式）
  if (part.inline_data?.data) {
    imgB64 = part.inline_data.data;
    mimeType = part.inline_data.mimeType || 'image/png';
    console.log('✅ Extracted from inline_data');
  }
  // 方法 2: Markdown 格式 ![image](data:image/jpeg;base64,...)
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

// 无超时限制的生成处理
async function handleGenerate(request, env, format) {
  try {
    if (!env.API_KEY || !env.TARGET_URL) {
      return jsonError('Server configuration error', 500, {
        has_api_key: !!env.API_KEY,
        has_target_url: !!env.TARGET_URL
      });
    }

    const body = await request.json().catch(() => ({}));
    
    if (!body.prompt) {
      return jsonError('Missing prompt field', 400);
    }

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);
    const apiOutputUrl = new URL(env.TARGET_URL).href;

    console.log('Requesting upstream API:', { 
      format, 
      prompt_length: body.prompt.length 
    });

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker/2.4.1'
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
      return jsonError(`Upstream API error: ${upstreamResp.status}`, upstreamResp.status, { 
        detail: errorText 
      });
    }

    let data = await upstreamResp.json();

    // OpenAI 格式转换
    if (format === 'openai') {
      const { imgB64, mimeType } = extractImageData(data);
      
      if (!imgB64) {
        console.error('No image data found in response');
        return jsonError('No image data in response', 500, { raw_response: data });
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'x-final-destination,x-api-format',
        'x-final-destination': apiOutputUrl,
        'x-api-format': format
      }
    });

  } catch (error) {
    console.error('handleGenerate error:', error);
    return jsonError(error.message || 'Internal error', 500);
  }
}

// 无超时限制的代理处理
async function handleProxy(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const targetBase = body.target_url || env.TARGET_URL;
    const apiKey = body.key || env.API_KEY;

    if (!targetBase) return jsonError('Missing target_url', 400);
    if (!apiKey) return jsonError('Missing API key', 400);
    if (!body.prompt) return jsonError('Missing prompt', 400);

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
        'User-Agent': 'Cloudflare-Worker-Proxy/2.4.1'
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
      return jsonError(`Upstream error: ${upstreamResp.status}`, upstreamResp.status, { 
        detail: errorText 
      });
    }

    let data = await upstreamResp.json();

    // OpenAI 格式转换（可选）
    if (body.openai) {
      const { imgB64, mimeType } = extractImageData(data);
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
      status: upstreamResp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'x-final-destination,x-openai-mode',
        'x-final-destination': apiOutputUrl,
        'x-openai-mode': body.openai ? 'enabled' : 'native'
      }
    });

  } catch (error) {
    console.error('handleProxy error:', error);
    return jsonError(error.message || 'Internal error', 500);
  }
}

// 统一错误响应
function jsonError(message, status = 500, extra = {}) {
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
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
