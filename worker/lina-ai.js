// Lina's app — private Claude helper (Cloudflare Worker "lina-ai"). Keeps the API key off the phone.
// Secrets: ANTHROPIC_API_KEY, APP_PASS. Variable: ALLOWED_ORIGIN (comma-separated).
// Deploy: Cloudflare → Workers → lina-ai → Edit code → paste → Deploy. Never commit the API key.
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = !allowed.length || allowed.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? (origin || '*') : 'null', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, x-app-pass', 'Vary': 'Origin' };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Lina AI helper is running.', { headers: cors });
    if (!okOrigin || !env.APP_PASS || req.headers.get('x-app-pass') !== env.APP_PASS) return out({ error: 'not_allowed' }, 401);
    let body; try { body = await req.json(); } catch (e) { return out({ error: 'bad_request' }, 400); }
    const MODELS = { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5' };
    const model = MODELS[body.tier] || MODELS.quick;
    const content = [];
    for (const im of (body.images || []).slice(0, 3)) content.push({ type: 'image', source: { type: 'base64', media_type: im.type || 'image/jpeg', data: im.data } });
    let extra = '';
    if (body.url && /^https?:\/\//i.test(body.url)) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const pr = await fetch(body.url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; LinaLifeBook/1.0)', 'accept-language': 'en,ar;q=0.8' } });
        clearTimeout(tm);
        const html = (await pr.text()).slice(0, 300000);
        const pick = re => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : ''; };
        const bits = [pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i), pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i), pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i), pick(/<title[^>]*>([^<]+)<\/title>/i)].filter(Boolean);
        if (bits.length) extra = '\n\nWhat the page says about itself:\n' + [...new Set(bits)].join('\n').slice(0, 1500);
      } catch (e) {}
    }
    content.push({ type: 'text', text: (String(body.prompt || '') + extra).slice(0, 20000) });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: Math.min(+body.max_tokens || 1500, 3000), messages: [{ role: 'user', content }] })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return out({ error: (j.error && j.error.type) || 'api_error', message: j.error && j.error.message }, r.status);
    return out({ text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''), usage: j.usage });
  }
};
