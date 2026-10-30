const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const mock = require('./mock-supabase.js');
const ROOT = path.join(__dirname, '..', 'site');
const srv = http.createServer((q, s) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } const ext = path.extname(f); s.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' }[ext] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(8099);
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SEED = {
  'settings/main': { rate: 3.7, incomes: [{ id: 'kydzzo', name: 'Kydzzo', usd: 1850, feePct: 0, flat: 0, count: true }], incomeLog: [{ id: 'in1', src: 'kydzzo', name: 'Kydzzo', cur: 'USD', amt: 1850, rate: 3.7, nis: 6845, date: '2026-10-27', cycle: true }], budgets: { food: 1200 }, bills: [{ id: 'b1', name: 'Rent', amount: 2000, cat: 'rent', day: 1 }], noteTags: [{ id: 'work', name: 'Work', c: 0 }], goalKg: 70 },
  'debts/d1': { name: 'Car', currency: 'USD', total: 5000, paidBefore: 1000, order: 0, createdAt: 1761800000000 },
  'debts/d2': { name: 'Mama', currency: 'NIS', total: '', paidBefore: '', order: 1, createdAt: 0 },
  'people/pp1': { name: 'Yousef', rel: 'Husband', partner: true, birthday: '', dates: [{ label: 'Anniversary', date: '2020-06-01' }], notes: '', favs: ['coffee'], wants: [], giftBudget: '', gifts: [{ name: 'Watch', price: 300, date: '2026-01-01' }], createdAt: 1761800000001 },
  'products/p1': { name: 'Oats', brand: 'X', size: '500g', notes: '', photo: 'aimg1', status: 'have', createdAt: 1761800000002 },
  'entries/e1': { amount: 45.5, cat: 'food', note: 'groceries', date: '2026-10-29', createdAt: 1761800000003 },
  'entries/e2': { amount: 500, cat: 'debt', note: '', date: '2026-10-28', debtId: 'd1', origAmt: 135.14, createdAt: 1761800000004 },
  'entries/e3': { amount: 100, cat: 'savings', note: 'gift fund', date: '2026-10-28', personId: 'pp1', createdAt: 1761800000005 },
  'entries/e4': { amount: 2000, cat: 'rent', note: '', date: '2026-10-01', billId: 'b1', createdAt: 1761800000006 },
  'wishes/w1': { cat: 'clothes', name: 'Abaya', type: 'want', color: '#E0A93A', price: '', cur: 'NIS', where: 'shop', added: '2026-10-20', status: 'waiting', decided: '', createdAt: 1761800000007 },
  'food/f1': { date: '2026-10-29', meal: 'lunch', name: 'Salad', plan: true, kcal: 320.25, createdAt: 1761800000008 },
  'weights/w-2026-10-29': { date: '2026-10-29', kg: 82.4, createdAt: 1761800000009 },
  'days/2026-10-29': { water: 6, vitD: true, pr: { fajr: 'on', dhuhr: 'late' }, tb: { n: 33 }, mood: 'happy', habit_read: true, sym: ['cramps'] },
  'cycle/cy1': { start: '2026-10-10', end: null },
  'prices/x1': { item: 'Milk', unit: 'l', ppu: 7.333333333, date: '2026-10-25', createdAt: 1761800000010 },
  'recipes/r1': { title: 'Soup', servings: '', time: '30 min', plan: 'protein', forHim: true, ingredients: [{ qty: 1, unit: 'cup', name: 'Oats', product_id: 'p1' }], steps: ['Boil'], tips: [], photo: 'aimg2', made: 2, lastMade: '2026-10-20', createdAt: 1761800000011 },
  'closet/c1': { name: 'Blue shirt', type: 'top', color: 'blue', fit: 'fits', clean: true, plan: 'keep', orig: 'aimg3', photo: 'aimg4', crop: { cx: 0.5, cy: 0.5, z: 1 }, bright: false, status: 'ready', createdAt: 1761800000012 },
  'dates/dn1': { date: '2026-10-15', idea: 'Picnic', note: 'nice', createdAt: 1761800000013 },
  'notes/n1': { text: 'Hello', tag: 'work', pinned: true, url: 'https://example.com', label: 'Example', createdAt: 1761800000014 },
};
const BLOBS = ['aimg1', 'aimg2', 'aimg3', 'aimg4'];
function dump(page) { return page.evaluate(async () => { const docs = await window.__lifeDB.all('docs', ''); const o = {}; docs.forEach(([k, v]) => o[k] = v); return o; }); }
async function signIn(page) { await page.waitForSelector('#sbLogin'); await page.fill('#sbE', 'lina@test.local'); await page.fill('#sbP', 'password123'); await page.click('#sbGo'); await page.waitForSelector('#sbLogin', { state: 'detached' }); }
async function settle(page) { for (let r = 0; r < 2; r++) { for (let i = 0; i < 100; i++) { const s = await page.evaluate(() => window.lifeSync.status()); if (!s.busy) break; await page.waitForTimeout(200); } await page.evaluate(() => window.lifeSync.sync()); } for (let i = 0; i < 100; i++) { const s = await page.evaluate(() => window.lifeSync.status()); if (!s.busy) return s; await page.waitForTimeout(200); } }
async function device(browser, name) { const ctx = await browser.newContext({ serviceWorkers: 'block' }); await ctx.route('https://mbqagxtljzgfbhvaetda.supabase.co/**', mock.handle); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' })); await ctx.route('https://lina-ai.lina-hajjajj.workers.dev/**', r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, contentType: 'application/json', body: JSON.stringify({ text: '{"ok":true}', auth: r.request().headers()['authorization'] ? 'bearer' : 'none' }) })); const page = await ctx.newPage(); page.errs = []; page.on('pageerror', e => page.errs.push(name + ' pageerror: ' + e.stack)); page.on('console', m => { if (m.type() === 'error') page.errs.push(name + ' console: ' + m.text()); }); await page.goto('http://localhost:8099/'); return page; }
const ok = (c, msg) => console.log((c ? 'PASS ' : 'FAIL ') + msg);
(async () => {
  const browser = await chromium.launch();
  // ---- Phone: has old data in IndexedDB, then signs in -> uploads everything
  const A = await device(browser, 'A');
  await A.evaluate(async ({ SEED, BLOBS, PNG }) => { for (const k in SEED) await window.__lifeDB.write('docs', k, SEED[k]); const b = await (await fetch('data:image/png;base64,' + PNG)).blob(); for (const id of BLOBS) await window.__lifeDB.write('blobs', id, b); }, { SEED, BLOBS, PNG });
  await signIn(A); let s = await settle(A);
  const counts = Object.fromEntries(Object.entries(mock.db).map(([t, m]) => [t, m.size]));
  ok(Object.values(counts).reduce((a, b) => a + b) === Object.keys(SEED).length, 'phone seed uploaded all ' + Object.keys(SEED).length + ' records ' + JSON.stringify(counts));
  ok(mock.files.size === 4, 'photos uploaded: ' + mock.files.size);
  ok(mock.db.entries.get('u-lina|e2').debt_id === 'd1' && mock.db.entries.get('u-lina|e3').person_id === 'pp1', 'links stored in columns');
  // ---- Laptop: empty, signs in -> gets everything
  const B = await device(browser, 'B'); await signIn(B); await settle(B); await B.waitForTimeout(800);
  const a = await dump(A), b = await dump(B);
  const diffs = []; for (const k in a) { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (!b[k]) diffs.push(k + ' MISSING'); else { const ka = Object.keys(a[k]), kb = Object.keys(b[k]); for (const f of new Set([...ka, ...kb])) if (JSON.stringify(a[k][f]) !== JSON.stringify(b[k][f])) diffs.push(k + '.' + f + ': ' + JSON.stringify(a[k][f]) + ' -> ' + JSON.stringify(b[k][f])); } }
  console.log('prices B', JSON.stringify(b['prices/x1']), 'cur', await B.evaluate(()=>window.__lifeDB.get('meta','cur:entries'))); console.log('Field differences phone -> laptop:\n  ' + (diffs.join('\n  ') || 'none'));
  const blobsB = await B.evaluate(async () => (await window.__lifeDB.all('blobs', '')).length);
  ok(blobsB === 4, 'laptop downloaded photos: ' + blobsB);
  // ---- edit on laptop through the app API, delete on phone
  await B.evaluate(async () => { const db = await window.claude.use('db'); await db.collection('entries').doc('e9').set({ amount: 12, cat: 'transport', note: 'bus', date: '2026-10-30', createdAt: Date.now() }); });
  await settle(B); await A.evaluate(() => window.lifeSync.sync()); await settle(A);
  ok(!!(await dump(A))['entries/e9'], 'new entry from laptop reaches phone');
  await A.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('entries/e1').delete(); });
  await settle(A); await B.evaluate(() => window.lifeSync.sync()); await settle(B);
  ok(!(await dump(B))['entries/e1'], 'delete on phone removes it on laptop');
  ok(!!mock.db.entries.get('u-lina|e1').deleted_at, 'server keeps soft-deleted row');
  // undo (re-create) on phone
  await A.evaluate(async () => { const db = await window.claude.use('db'); await db.collection('entries').doc('e1').set({ amount: 45.5, cat: 'food', note: 'groceries', date: '2026-10-29', createdAt: 1761800000003 }); });
  await settle(A); await B.evaluate(() => window.lifeSync.sync()); await settle(B);
  ok(!!(await dump(B))['entries/e1'], 'undo brings it back on laptop');
  // ---- conflict: phone clock behind, edits same record; laptop's newer edit must win on both
  await A.evaluate(async () => { const real = Date.now; Date.now = () => real() - 600000; const db = await window.claude.use('db'); await db.collection('entries').doc('e9').set({ amount: 99, cat: 'transport', note: 'OLD phone edit', date: '2026-10-30' }); Date.now = real; });
  await B.evaluate(async () => { const db = await window.claude.use('db'); await db.collection('entries').doc('e9').set({ amount: 15, cat: 'transport', note: 'NEW laptop edit', date: '2026-10-30' }); });
  await settle(B); await A.evaluate(() => window.lifeSync.sync()); await settle(A);
  ok((await dump(A))['entries/e9'].note === 'NEW laptop edit', 'newest edit wins on phone after its older save was refused: ' + (await dump(A))['entries/e9'].note);
  ok(mock.db.entries.get('u-lina|e9').note === 'NEW laptop edit', 'server kept newest');
  // ---- paging: 1200 rows saved at once
  await B.evaluate(async () => { const db = await window.claude.use('db'); for (let i = 0; i < 1200; i++) await db.collection('food').doc('bulk' + String(i).padStart(4, '0')).set({ date: '2026-10-01', meal: 'snack', name: 'n' + i, plan: false }); });
  await settle(B); await A.evaluate(() => window.lifeSync.sync()); await settle(A);
  const nf = Object.keys(await dump(A)).filter(k => k.startsWith('food/bulk')).length;
  ok(nf === 1200, 'phone pulled all 1200 bulk rows: ' + nf);
  // ---- AI goes with sign-in token
  const ai = await A.evaluate(async () => { const s = await window.claude.use('sample'); return s.json('hi'); });
  ok(ai && ai.ok, 'AI call works with sign-in');
  // ---- app screens render without errors
  for (const tab of ['today', 'money', 'health', 'kitchen', 'closet', 'people', 'notes']) { await A.goto('http://localhost:8099/#' + tab); await A.waitForTimeout(700); }
  ok(await A.evaluate(() => !!document.querySelector('#syncRow button')), 'settings shows account + sync buttons');
  console.log('sync row:', await A.evaluate(() => document.getElementById('syncRow').innerText.replace(/\n/g, ' | ')));
  console.log('stats', JSON.stringify(mock.stats));
  const errs = [...A.errs, ...B.errs]; console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
