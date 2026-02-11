export default {
  async fetch(request, env, ctx) {
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

    // GET /api/endpoints
    if (request.method === 'GET' && url.pathname === '/api/endpoints') {
      const baseUrl = url.origin;
      const endpoints = {
        version: "2.0",
        status: "ok",
        endpoints: [
          {
            path: "/api/generate",
            method: "POST",
            format: "gemini"
          },
          {
            path: "/api/v1/images/generations",
            method: "POST",
            format: "openai"
          }
        ]
      };
      
      return new Response(JSON.stringify(endpoints, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
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

    // 静态资源
    return await env.ASSETS.fetch(request);
  }
};

// 统一生成处理
async function handleGenerate(request, env, format) {
  try {
    // 检查环境变量
    if (!env.API_KEY) {
      return jsonError('API_KEY not configured', 500);
    }
    if (!env.TARGET_URL) {
      return jsonError('TARGET_URL not configured', 500);
    }

    const body = await request.json().catch(() => ({}));
    
    if (!body.prompt) {
      return jsonError('Missing required field: prompt', 400);
    }

    const targetUrl = new URL(env.TARGET_URL);
    targetUrl.searchParams.set('key', env.API_KEY);
    const apiOutputUrl = new URL(env.TARGET_URL).href;

    const reqBody = {
      contents: [{
        role: 'user',
        parts: [{ text: body.prompt }]
      }],
      generationConfig: {
        response_mime_type: body.response_mime_type || 'image/png',
        temperature: body.temperature || 0.7
      }
    };

    console.log('Request to upstream:', {
      url: apiOutputUrl,
      prompt: body.prompt
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const resp = await fetch(targetUrl.href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker/2.0'
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Upstream response status:', resp.status);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Upstream error:', errorText);
        return jsonError(`Upstream API error: ${resp.status}`, resp.status, { detail: errorText });
      }

      let data = await resp.json();
      
      // 详细日志
      console.log('Upstream response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        firstCandidate: data.candidates?.[0] ? 'exists' : 'missing',
        hasContent: !!data.candidates?.[0]?.content,
        hasParts: !!data.candidates?.[0]?.content?.parts,
        partsLength: data.candidates?.[0]?.content?.parts?.length,
        hasInlineData: !!data.candidates?.[0]?.content?.parts?.[0]?.inline_data,
        hasDataField: !!data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data,
        status: data.status,
        msg: data.msg
      });

      // 检查图像数据
      const imgData = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
      
      if (!imgData) {
        // 返回完整原始响应用于调试
        console.error('No image data found. Full response:', JSON.stringify(data));
        return jsonError('No image data in upstream response', 500, { 
          upstream_response: data,
          hint: 'Check if upstream API returned error or unexpected format'
        });
      }

      // OpenAI 格式转换
      if (format === 'openai') {
        data = {
          created: Math.floor(Date.now() / 1000),
          data: [{
            b64_json: imgData,
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

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return jsonError('Request timeout (25s)', 504);
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('handleGenerate error:', error.message, error.stack);
    return jsonError(error.message || 'Internal server error', 500);
  }
}

// 代理处理
async function handleProxy(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const targetBase = body.target_url || env.TARGET_URL;
    const apiKey = body.key || env.API_KEY;
    
    if (!targetBase) {
      return jsonError('Missing target_url', 400);
    }
    if (!apiKey) {
      return jsonError('Missing API key', 400);
    }
    if (!body.prompt) {
      return jsonError('Missing prompt', 400);
    }

    const targetUrl = new URL(targetBase);
    targetUrl.searchParams.set('key', apiKey);
    const apiOutputUrl = new URL(targetBase).href;

    const reqBody = {
      contents: [{
        role: 'user',
        parts: [{ text: body.prompt }]
      }],
      generationConfig: {
        response_mime_type: body.response_mime_type || 'image/png',
        temperature: body.temperature || 0.7
      }
    };

    console.log('Proxy request to:', apiOutputUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const resp = await fetch(targetUrl.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Proxy upstream error:', errorText);
        return jsonError(`Upstream error: ${resp.status}`, resp.status, { detail: errorText });
      }

      let data = await resp.json();

      console.log('Proxy response structure:', {
        hasCandidates: !!data.candidates,
        hasImageData: !!data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data
      });

      const isOpenaiFormat = !!body.openai;
      if (isOpenaiFormat) {
        const imgData = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
        if (imgData) {
          data = {
            created: Math.floor(Date.now() / 1000),
            data: [{
              b64_json: imgData,
              revised_prompt: body.prompt
            }]
          };
        }
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'x-final-destination,x-openai-mode',
          'x-final-destination': apiOutputUrl,
          'x-openai-mode': isOpenaiFormat ? 'enabled' : 'native'
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return jsonError('Request timeout', 504);
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('handleProxy error:', error.message, error.stack);
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
