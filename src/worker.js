export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // 靜態 public/ Assets
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Fallthrough to routes
    }

    // POST /proxy：動態 Gemini Proxy
    if (request.method === 'POST' && url.pathname === '/proxy') {
      let body;
      try
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method
