export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 靜態 UI：/test
    if (url.pathname === '/test') {
      return env.ASSETS.fetch(request);
    }

    // API 代理：/v1beta/models/...:generateContent
    if (url.pathname.includes(':generateContent')) {
      const targetUrl = new URL(env.TARGET_URL);
      targetUrl.searchParams.set('key', env.API_KEY || '');

      const newReq = new Request(targetUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Content-Type': 'application/json'
        },
        body: request.body
      });

      let resp = await fetch(newReq);
      let data = await resp.json().catch(() => ({}));

      // OpenAI 相容：圖像轉 data[0].b64_json
      if (data.candidates?.[0]?.content?.parts?.[0]?.inline_data) {
        data = {
          created: Date.now(),
          data: [{
            b64_json: data.candidates[0].content.parts[0].inline_data.data,
            revised_prompt: 'Gemini 生成'
          }]
        };
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response('無效路徑', { status: 404 });
  }
};
