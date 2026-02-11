export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // GET /test 返回 UI
    if (url.pathname === '/test') {
      return new Response(await fetch('https://your-worker.your-subdomain.workers.dev/test.html'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // POST /proxy/generateContent：代理請求
    if (request.method === 'POST' && url.pathname === '/proxy/generateContent') {
      const targetUrl = new URL(env.TARGET_URL);
      targetUrl.searchParams.set('key', env.API_KEY);

      const apiOutputUrl = targetUrl.href.replace(env.API_KEY, 'HIDDEN_KEY'); // 隱藏 Key

      const body = await request.json();
      const reqBody = {
        contents: [{
          role: 'user',
          parts: body.contents?.[0]?.parts || [{ text: body.prompt || '' }]
        }],
        generationConfig: {
          response_mime_type: body.response_mime_type || 'image/png',
          temperature: body.temperature || 0.7
        }
      };

      const headers = new Headers(request.headers);
      headers.set('Content-Type', 'application/json');

      const proxyReq = new Request(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody)
      });

      const resp = await fetch(proxyReq);
      let data = await resp.json();

      // OpenAI 格式轉換（若 ?openai=1）
      const isOpenAI = url.searchParams.get('openai') === '1';
      if (isOpenAI && data.candidates?.[0]?.content?.parts?.[0]?.inline_data) {
        data = {
          created: Date.now(),
          data: [{
            b64_json: data.candidates[0].content.parts[0].inline_data.data,
            revised_prompt: data.promptFeedback?.blockReason || 'Gemini generated'
          }]
        };
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Expose-Headers': 'x-final-destination,x-openai-mode',
          'x-final-destination': apiOutputUrl,  // API 輸出地址
          'x-openai-mode': isOpenAI ? 'enabled' : 'gemini-native'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
