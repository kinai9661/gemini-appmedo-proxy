export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 靜態 UI：/test
    if (url.pathname === '/test') {
      return env.ASSETS.fetch(request);
    }

    // API 代理：/v1beta/models/...:generateContent
    if (url.pathname.includes(':generateContent')) {
      const targetUrl = new URL("https://api-integrations.appmedo.com/app-7r29gu4xs001/api-Xa6JZ58oPMEa/v1beta/models/gemini-3-pro-image-preview:generateContent");
      targetUrl.searchParams.set('key', env.API_KEY || '');

      // 乾淨頭部：修復 Spring MediaType 錯誤
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      if (request.headers.has('authorization')) {
        headers.set('Authorization', request.headers.get('authorization'));
      }
      if (request.headers.has('user-agent')) {
        headers.set('User-Agent', request.headers.get('user-agent'));
      }
      headers.set('Origin', new URL(request.url).origin);  // CORS

      const newReq = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.body
      });

      let resp = await fetch(newReq);
      let data = {};
      try {
        data = await resp.json();
      } catch (e) {
        return new Response('JSON 解析失敗：' + await resp.text(), { status: 500 });
      }

      // OpenAI 相容轉換
      if (data.candidates?.[0]?.content?.parts?.[0]?.inline_data) {
        data = {
          created: Date.now() / 1000,
          data: [{
            b64_json: data.candidates[0].content.parts[0].inline_data.data,
            revised_prompt: 'Gemini 3 Pro Image Preview'
          }]
        };
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    return new Response('使用 /test 生圖或 POST /v1beta/models/gemini-3-pro-image-preview:generateContent', { status: 404 });
  }
};
