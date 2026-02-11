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
        version: "1.8",
        endpoints: [
          {
            path: "/api/generate",
            method: "POST",
            format: "gemini",
            description: "标准 Gemini 格式生成"
          },
          {
            path: "/api/v1/images/generations",
            method: "POST",
            format: "openai",
            description: "OpenAI 兼容格式"
          },
          {
            path: "/proxy",
            method: "POST",
            format: "custom",
            description: "自定义上游端点代理"
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
      try {
        const body = await request.json();
        const targetUrl = new URL(env.TARGET_URL);
        targetUrl.searchParams.set('key', env.API_KEY);
        
        // 输出地址：不含 key 参数
        const apiOutputUrl = new URL(env.TARGET_URL).href;

        const reqBody = {
          contents: [{
            role: 'user',
            parts: [{ text: body.prompt || '' }]
          }],
          generationConfig: {
            response_mime_type: body.response_mime_type || 'image/png',
            temperature: body.temperature || 0.7
          }
        };

        const proxyReq = new Request(targetUrl.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });

        const resp = await fetch(proxyReq);
        const data = await resp.json();

        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-final-destination,x-api-format',
            'x-final-destination': apiOutputUrl,
            'x-api-format': 'gemini'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // POST /api/v1/images/generations
    if (request.method === 'POST' && url.pathname === '/api/v1/images/generations') {
      try {
        const body = await request.json();
        const targetUrl = new URL(env.TARGET_URL);
        targetUrl.searchParams.set('key', env.API_KEY);
        
        // 输出地址：不含 key 参数
        const apiOutputUrl = new URL(env.TARGET_URL).href;

        const reqBody = {
          contents: [{
            role: 'user',
            parts: [{ text: body.prompt || '' }]
          }],
          generationConfig: {
            response_mime_type: 'image/png'
          }
        };

        const proxyReq = new Request(targetUrl.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });

        const resp = await fetch(proxyReq);
        const data = await resp.json();

        // OpenAI 格式转换
        const openaiData = {
          created: Math.floor(Date.now() / 1000),
          data: []
        };

        if (data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data) {
          openaiData.data.push({
            b64_json: data.candidates[0].content.parts[0].inline_data.data,
            revised_prompt: body.prompt
          });
        }

        return new Response(JSON.stringify(openaiData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-final-destination,x-api-format',
            'x-final-destination': apiOutputUrl,
            'x-api-format': 'openai'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: { 
            message: error.message,
            type: 'api_error'
          } 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // POST /proxy
    if (request.method === 'POST' && url.pathname === '/proxy') {
      try {
        const body = await request.json();
        const targetBase = body.target_url || env.TARGET_URL;
        const apiKey = body.key || env.API_KEY;
        
        if (!targetBase || !apiKey) {
          return new Response(JSON.stringify({ error: 'Missing target_url or key' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const targetUrl = new URL(targetBase);
        targetUrl.searchParams.set('key', apiKey);
        
        // 输出地址：不含 key 参数
        const apiOutputUrl = new URL(targetBase).href;

        const reqBody = {
          contents: [{
            role: 'user',
            parts: [{ text: body.prompt || '' }]
          }],
          generationConfig: {
            response_mime_type: body.response_mime_type || 'image/png',
            temperature: body.temperature || 0.7
          }
        };

        const proxyReq = new Request(targetUrl.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });

        const resp = await fetch(proxyReq);
        let data = await resp.json();

        const isOpenaiFormat = !!body.openai;
        if (isOpenaiFormat && data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data) {
          data = {
            created: Math.floor(Date.now() / 1000),
            data: [{
              b64_json: data.candidates[0].content.parts[0].inline_data.data,
              revised_prompt: data.promptFeedback?.blockReason || 'Generated by Gemini'
            }]
          };
        }

        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-final-destination,x-openai-mode',
            'x-final-destination': apiOutputUrl,
            'x-openai-mode': isOpenaiFormat ? 'enabled' : 'native'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 静态资源
    return await env.ASSETS.fetch(request);
  }
};
