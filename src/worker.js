export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('Request:', method, path);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok',
          version: '2.5.2',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/endpoints') {
        return new Response(JSON.stringify({ 
          version: "2.5.2",
          endpoints: [
            { path: "/", method: "GET" },
            { path: "/api/generate", method: "POST" },
            { path: "/api/v1/images/generations", method: "POST" },
            { path: "/proxy", method: "POST" }
          ]
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/generate' && method === 'POST') {
        console.log('Matched /api/generate');
        return await handleGenerate(request, env, 'gemini', corsHeaders);
      }

      if (path === '/api/v1/images/generations' && method === 'POST') {
        console.log('Matched /api/v1/images/generations');
        return await handleGenerate(request, env, 'openai', corsHeaders);
      }

      if (path === '/proxy' && method === 'POST') {
        console.log('Matched /proxy');
        return await handleProxy(request, env, corsHeaders);
      }

      if (path === '/' || path === '/index.html') {
        return new Response(getUI(url.origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found', path: path }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

function getUI(origin) {
  const html = '<!DOCTYPE html>' +
  '<html lang="zh-TW">' +
  '<head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<title>Gemini Image Proxy</title>' +
  '<style>' +
  '* { margin: 0; padding: 0; box-sizing: border-box; }' +
  'body { font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; padding: 20px; color: #fff; }' +
  '.container { max-width: 900px; margin: 0 auto; }' +
  '.card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; margin: 20px 0; }' +
  'h1 { font-size: 42px; margin-bottom: 10px; }' +
  'textarea { width: 100%; padding: 15px; border-radius: 10px; border: none; font-size: 16px; min-height: 120px; margin: 20px 0; font-family: inherit; }' +
  'button { width: 100%; padding: 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; margin: 10px 0; }' +
  'button:hover { transform: translateY(-2px); }' +
  'button:disabled { opacity: 0.6; cursor: not-allowed; }' +
  '.status { padding: 15px; border-radius: 10px; margin: 20px 0; display: none; }' +
  '.status.show { display: block; }' +
  '.loading { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; }' +
  '.success { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }' +
  '.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }' +
  '.preview { width: 100%; min-height: 400px; background: rgba(0, 0, 0, 0.2); border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 20px 0; padding: 20px; }' +
  '.preview img { max-width: 100%; border-radius: 10px; }' +
  '.info { background: rgba(99, 102, 241, 0.1); border-radius: 10px; padding: 15px; margin: 15px 0; display: none; font-size: 14px; }' +
  '.info.show { display: block; }' +
  '.toggle { margin: 20px 0; display: flex; align-items: center; gap: 10px; }' +
  '.toggle input { width: 20px; height: 20px; }' +
  '</style>' +
  '</head>' +
  '<body>' +
  '<div class="container">' +
  '<div class="card">' +
  '<h1>🎨 Gemini Image Proxy</h1>' +
  '<p>AI 图像生成工具 v2.5.2</p>' +
  '<textarea id="prompt" placeholder="描述你想生成的图像...">一只可爱的橘猫在香港沙田区的公园里散步，阳光明媚，画风细腻，高清</textarea>' +
  '<div class="toggle"><input type="checkbox" id="openai"><label for="openai">使用 OpenAI 格式</label></div>' +
  '<button id="btn" onclick="generate()">🎨 生成图像</button>' +
  '<div class="status" id="status"></div>' +
  '<div class="info" id="info"></div>' +
  '<div class="preview" id="preview"><span style="color: rgba(255,255,255,0.5)">图像将显示在这里</span></div>' +
  '</div></div>' +
  '<script>' +
  'const API_BASE = "' + origin + '";' +
  'async function generate() {' +
  'const prompt = document.getElementById("prompt").value.trim();' +
  'const openai = document.getElementById("openai").checked;' +
  'const status = document.getElementById("status");' +
  'const preview = document.getElementById("preview");' +
  'const info = document.getElementById("info");' +
  'const btn = document.getElementById("btn");' +
  'if (!prompt) { alert("请输入图像描述"); return; }' +
  'btn.disabled = true;' +
  'btn.textContent = "⏳ 生成中...";' +
  'status.className = "status loading show";' +
  'status.textContent = "正在生成图像...";' +
  'preview.innerHTML = "<span style=\\"color: rgba(255,255,255,0.5)\\">生成中...</span>";' +
  'info.classList.remove("show");' +
  'const startTime = Date.now();' +
  'let seconds = 0;' +
  'const timer = setInterval(() => { seconds++; status.textContent = "正在生成图像... (" + seconds + "s)"; }, 1000);' +
  'try {' +
  'const endpoint = openai ? "/api/v1/images/generations" : "/api/generate";' +
  'const response = await fetch(API_BASE + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt }) });' +
  'clearInterval(timer);' +
  'const duration = ((Date.now() - startTime) / 1000).toFixed(1);' +
  'if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || "API 错误"); }' +
  'const data = await response.json();' +
  'console.log("Response:", data);' +
  'let imageData = null;' +
  'if (openai) { imageData = data.data?.[0]?.b64_json; } else {' +
  'const part = data.candidates?.[0]?.content?.parts?.[0];' +
  'if (part?.inline_data?.data) { imageData = part.inline_data.data; }' +
  'else if (part?.text) { const match = part.text.match(/data:(image\\/\\w+);base64,([^)]+)/); if (match) imageData = match[2]; }' +
  '}' +
  'if (imageData) {' +
  'preview.innerHTML = "<img src=\\"data:image/png;base64," + imageData + "\\" alt=\\"Generated\\">";' +
  'status.className = "status success show";' +
  'status.textContent = "✅ 生成成功！耗时 " + duration + " 秒";' +
  'info.innerHTML = "格式: " + (openai ? "OpenAI" : "Gemini") + " | 耗时: " + duration + "s";' +
  'info.classList.add("show");' +
  '} else { throw new Error("未找到图像数据"); }' +
  '} catch (error) {' +
  'clearInterval(timer);' +
  'status.className = "status error show";' +
  'status.textContent = "❌ " + error.message;' +
  'preview.innerHTML = "<span style=\\"color: #fca5a5\\">生成失败</span>";' +
  'console.error("Error:", error);' +
  '} finally {' +
  'btn.disabled = false;' +
  'btn.textContent = "🎨 生成图像";' +
  '}' +
  '}' +
  'console.log("✅ UI loaded");' +
  '</script>' +
  '</body></html>';
  
  return html;
}

function extractImageData(data) {
  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (!part) return null;
  
  if (part.inline_data?.data) {
    return { data: part.inline_data.data, mimeType: part.inline_data.mimeType || 'image/png' };
  }
  
  if (part.text) {
    const match = part.text.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
    if (match) return { data: match[2], mimeType: match[1] };
  }
  
  return null;
}

async function handleGenerate(request, env, format, corsHeaders) {
  try {
    if (!env.API_KEY || !env.TARGET_URL) {
      return jsonError('Server configuration error', 500, corsHeaders);
    }

    const body = await request.json().catch(() => ({}));
    if (!body.prompt) return jsonError('Missing prompt', 400, corsHeaders);

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);

    const upstreamResp = await fetch(targetUrl.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
        generationConfig: { response_mime_type: 'image/png', temperature: 0.7 }
      })
    });

    if (!upstreamResp.ok) {
      return jsonError('Upstream error: ' + upstreamResp.status, upstreamResp.status, corsHeaders);
    }

    let data = await upstreamResp.json();

    if (format === 'openai') {
      const extracted = extractImageData(data);
      if (!extracted) return jsonError('No image data', 500, corsHeaders);
      
      data = {
        created: Math.floor(Date.now() / 1000),
        data: [{ b64_json: extracted.data, revised_prompt: body.prompt }]
      };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return jsonError(error.message, 500, corsHeaders);
  }
}

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
        generationConfig: { response_mime_type: 'image/png', temperature: 0.7 }
      })
    });

    if (!upstreamResp.ok) {
      return jsonError('Upstream error: ' + upstreamResp.status, upstreamResp.status, corsHeaders);
    }

    let data = await upstreamResp.json();

    if (body.openai) {
      const extracted = extractImageData(data);
      if (extracted) {
        data = {
          created: Math.floor(Date.now() / 1000),
          data: [{ b64_json: extracted.data, revised_prompt: body.prompt }]
        };
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return jsonError(error.message, 500, corsHeaders);
  }
}

function jsonError(message, status = 500, corsHeaders = {}) {
  return new Response(JSON.stringify({ 
    error: { message: message, status: status }
  }), {
    status: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
