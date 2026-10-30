// Minimal in-memory Supabase (auth + PostgREST subset + storage) with the same rules as the real schema.
const COLS = {
 settings:['data'], debts:['name','currency','total','paid_before','sort_order'], people:['name','rel','partner','birthday','notes','gift_budget','dates','favs','wants','gifts'],
 products:['name','brand','size','notes','photo','status'], entries:['amount','cat','note','date','orig_amt','debt_id','bill_id','person_id'],
 wishes:['cat','name','type','color','price','cur','where_from','added','status','decided'], food_logs:['date','meal','name','plan','kcal'], weights:['date','kg'],
 day_logs:['date','data'], cycles:['start_date','end_date'], prices:['item','unit','ppu','date'],
 recipes:['title','servings','time','plan','for_him','ingredients','steps','tips','photo','made','last_made'],
 closet_items:['name','type','color','fit','clean','plan','orig','photo','crop','bright','status'], date_nights:['date','idea','note'], notes:['text','tag','pinned','url','label','photo']};
const NUM2 = new Set(['amount','total','paid_before','orig_amt','price','gift_budget','kg','servings']);
let tick = 0;
function now() { tick++; const d = new Date(Date.UTC(2026,9,30,10,0,0) + tick); return d.toISOString().replace('Z', '000+00:00'); }
const db = {}; Object.keys(COLS).forEach(t => db[t] = new Map());
const files = new Map(); const users = new Map([['lina@test.local', { id: 'u-lina', pw: 'password123' }]]);
const tokens = new Map(); let stats = { upserts: 0, ignored: 0, patches: 0 };
function sess(email) { const u = users.get(email); const t = 'tok' + Math.random().toString(36).slice(2); tokens.set(t, u.id); return { access_token: t, refresh_token: 'r' + t, expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: u.id, email } }; }
function validate(t, row) {
  for (const k of Object.keys(row)) if (!['id','user_id','extra','created_at','updated_at','deleted_at','synced_at'].includes(k) && !COLS[t].includes(k)) throw { code: 'PGRST204', message: 'unknown column ' + k };
  for (const k of ['date','added','decided','start_date','end_date','last_made']) if (row[k] != null && !/^\d{4}-\d{2}-\d{2}$/.test(row[k])) throw { code: '22007', message: 'bad date ' + k };
  for (const k of ['amount','total','paid_before','orig_amt','price','gift_budget','kg','servings','kcal','ppu','sort_order','made']) if (row[k] != null && typeof row[k] !== 'number') throw { code: '22P02', message: 'bad number ' + k };
  for (const k of ['plan','for_him','clean','bright','partner','pinned']) if (row[k] != null && t !== 'recipes' && t !== 'closet_items' && k === 'plan' && typeof row[k] !== 'boolean' && t==='food_logs') throw { code: '22P02', message: 'bad bool' };
  if (t === 'settings' && row.id !== 'main') throw { code: '23514', message: 'settings_one' };
}
function round(row) { for (const k of NUM2) if (typeof row[k] === 'number') row[k] = Math.round(row[k]*100)/100; if (typeof row.kcal==='number') row.kcal=Math.round(row.kcal*10)/10; if (typeof row.ppu==='number') row.ppu=Math.round(row.ppu*1e4)/1e4; }
function parseIn(v) { const m = v.match(/^in\.\((.*)\)$/); return m[1].split(',').map(s => s.replace(/^"|"$/g, '')); }
function filterRows(t, uid, sp) {
  let rows = [...db[t].values()].filter(r => r.user_id === uid);
  const g = sp.get('synced_at'); if (g) { const v = g.slice(3); rows = rows.filter(r => r.synced_at > v); }
  const id = sp.get('id'); if (id) { const set = new Set(parseIn(id)); rows = rows.filter(r => set.has(r.id)); }
  const or = sp.get('or'); if (or) { const m = or.match(/^\(synced_at\.gt\.(.+),and\(synced_at\.eq\.(.+),id\.gt\.(.+)\)\)$/); rows = rows.filter(r => r.synced_at > m[1] || (r.synced_at === m[2] && r.id > m[3])); }
  rows.sort((a, b) => a.synced_at < b.synced_at ? -1 : a.synced_at > b.synced_at ? 1 : a.id < b.id ? -1 : 1);
  const lim = sp.get('limit'); if (lim) rows = rows.slice(0, +lim);
  return rows;
}
async function handle(route) {
  const req = route.request(), url = new URL(req.url()), p = url.pathname, sp = url.searchParams, m = req.method();
  const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
  const json = (o, s = 200) => route.fulfill({ status: s, headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: H });
  if (p === '/auth/v1/token') { const b = JSON.parse(req.postData()); if (sp.get('grant_type') === 'password') { const u = users.get(b.email); if (!u || u.pw !== b.password) return json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400); return json(sess(b.email)); } const uid = tokens.get(b.refresh_token.slice(1)); const email = [...users].find(([e, u]) => u.id === uid)[0]; return json(sess(email)); }
  if (p === '/auth/v1/logout') return json({});
  const uid = tokens.get((req.headers()['authorization'] || '').slice(7)); if (!uid) return json({ message: 'JWT expired' }, 401);
  if (p.startsWith('/storage/v1/object/')) {
    const key = p.replace('/storage/v1/object/authenticated/', '').replace('/storage/v1/object/', '');
    if (!key.startsWith('photos/' + uid + '/')) return json({ error: 'forbidden' }, 403);
    if (m === 'POST') { files.set(key, { body: req.postDataBuffer(), type: req.headers()['content-type'] }); return json({ Key: key }); }
    if (m === 'DELETE') { files.delete(key); return json({}); }
    const f = files.get(key); if (!f) return json({ error: 'not_found' }, 404);
    return route.fulfill({ status: 200, headers: { ...H, 'content-type': f.type }, body: f.body });
  }
  const t = p.replace('/rest/v1/', ''); if (!db[t]) return json({ message: 'no table' }, 404);
  try {
    if (m === 'GET') return json(filterRows(t, uid, sp));
    if (m === 'POST') {
      const rows = JSON.parse(req.postData()); const keysets = new Set(rows.map(r => Object.keys(r).sort().join(','))); if (keysets.size > 1) throw { message: 'All object keys must match' };
      rows.forEach(r => validate(t, r)); const saved = [];
      for (const r0 of rows) { const r = { ...r0, user_id: uid }; round(r); const k = uid + '|' + r.id, old = db[t].get(k); stats.upserts++;
        if (old && r.updated_at < old.updated_at) { stats.ignored++; continue; }
        if (old) r.created_at = old.created_at; r.synced_at = now(); db[t].set(k, { ...(old || {}), ...r }); saved.push({ id: r.id }); }
      return json(saved, 201);
    }
    if (m === 'PATCH') { const body = JSON.parse(req.postData()); const out = []; stats.patches++;
      for (const id of parseIn(sp.get('id'))) { const k = uid + '|' + id, old = db[t].get(k); if (!old) continue; if (body.updated_at < old.updated_at) { stats.ignored++; continue; } db[t].set(k, { ...old, ...body, synced_at: now() }); out.push({ id }); }
      return json(out); }
  } catch (e) { return json({ code: e.code || 'PGRST', message: e.message }, 400); }
  return json({ message: 'unsupported' }, 400);
}
module.exports = { handle, db, files, stats };
