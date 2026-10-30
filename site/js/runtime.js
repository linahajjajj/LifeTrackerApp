/* Life Book runtime: stands in for the Claude artifact runtime (window.claude.use).
   Data + photos live in this device's IndexedDB (fast, works offline) and sync to Supabase.
   - Every local change goes into an outbox; sync() pushes it, then pulls what other devices changed.
   - Newest edit wins (the database ignores writes older than what it has). Deletes are soft.
   - Sign-in: email + password (Supabase Auth). AI goes through the private lina-ai worker. */
(function () {
  var SB_URL = 'https://mbqagxtljzgfbhvaetda.supabase.co';
  var SB_KEY = 'sb_publishable_CWxn6HeXrXnn944L9YiYkw_Crg0Ciia';
  var API = 'https://lina-ai.lina-hajjajj.workers.dev';
  var MONTHLY_CAP = 400;

  /* ================= local storage (IndexedDB) ================= */
  // 'lina-life' v1 = docs + blobs (same as before, so the phone keeps its data). 'lina-sync' = outbox + meta.
  function openDB(name, ver, stores) {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(name, ver);
      r.onupgradeneeded = function () { var d = r.result; stores.forEach(function (s) { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }); };
      r.onsuccess = function () { var d = r.result; d.onversionchange = function () { d.close(); }; res(d); };
      r.onerror = function () { rej(r.error); };
      r.onblocked = function () { rej(new Error('db_blocked')); };
    });
  }
  var _life = null, _sync = null;
  function lifeDB() { return _life || (_life = openDB('lina-life', 1, ['docs', 'blobs'])); }
  function syncDB() { return _sync || (_sync = openDB('lina-sync', 1, ['outbox', 'meta'])); }
  function dbFor(store) { return (store === 'outbox' || store === 'meta') ? syncDB() : lifeDB(); }
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function write(store, key, val, remove) {
    return dbFor(store).then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(store, 'readwrite'); var s = t.objectStore(store); remove ? s.delete(key) : s.put(val, key);
      t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error || new Error('aborted')); };
    }); });
  }
  function get(store, key) { return dbFor(store).then(function (d) { return req(d.transaction(store).objectStore(store).get(key)); }); }
  function all(store, prefix) {
    return dbFor(store).then(function (d) { var s = d.transaction(store).objectStore(store); var range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      return Promise.all([req(s.getAllKeys(range)), req(s.getAll(range))]).then(function (kv) { return kv[0].map(function (k, i) { return [k, kv[1][i]]; }); }); });
  }
  function keys(store) { return dbFor(store).then(function (d) { return req(d.transaction(store).objectStore(store).getAllKeys()); }); }
  function clear(store) { return dbFor(store).then(function (d) { return new Promise(function (res, rej) { var t = d.transaction(store, 'readwrite'); t.objectStore(store).clear(); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }); }
  window.__lifeDB = { get: get, all: all, write: write };
  function meta(k, v) { return arguments.length > 1 ? write('meta', k, v) : get('meta', k); }

  /* ================= outbox ================= */
  // key 'd:<collection>/<id>' for records, 'b:<assetId>' for photos. value {op:'put'|'del', ts}
  function enqueue(key, op) { return write('outbox', key, { op: op, ts: Date.now() }).then(kick); }

  /* ================= app-facing db (same API as the Claude runtime) ================= */
  var colL = {}, docL = {}, pending = {};
  function emitCol(c) { return all('docs', c + '/').then(function (rows) { var snap = { docs: rows.map(function (r) { return { id: r[0].slice(c.length + 1), data: function () { return r[1]; } }; }) }; (colL[c] || []).forEach(function (f) { f(snap); }); }); }
  function emitDoc(p) { return get('docs', p).then(function (v) { (docL[p] || []).forEach(function (f) { f({ exists: v !== undefined, data: function () { return v; } }); }); }); }
  function notify(path) { var c = path.split('/')[0]; if (colL[c] && !pending[c]) { pending[c] = 1; setTimeout(function () { pending[c] = 0; emitCol(c); }, 30); } if (docL[path]) emitDoc(path); }
  function docRef(path) {
    return {
      set: function (v) { return write('docs', path, JSON.parse(JSON.stringify(v))).then(function () { notify(path); return enqueue('d:' + path, 'put'); }); },
      delete: function () { return write('docs', path, null, true).then(function () { notify(path); return enqueue('d:' + path, 'del'); }); },
      onSnapshot: function (cb, err) { (docL[path] = docL[path] || []).push(cb); emitDoc(path).catch(function (e) { err && err(e); }); return function () {}; }
    };
  }
  var dbNS = {
    collection: function (c) { return { doc: function (id) { return docRef(c + '/' + id); }, onSnapshot: function (cb, err) { (colL[c] = colL[c] || []).push(cb); emitCol(c).catch(function (e) { err && err(e); }); return function () {}; } }; },
    doc: function (p) { return docRef(p); }
  };
  var assetsNS = {
    upload: function (blob) { var id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); return write('blobs', id, blob).then(function () { enqueue('b:' + id, 'put'); return { id: id, url: '/_blob/' + id }; }); },
    delete: function (id) { return write('blobs', id, null, true).then(function () { return enqueue('b:' + id, 'del'); }); },
    putWithId: function (id, blob) { return write('blobs', id, blob).then(function () { return enqueue('b:' + id, 'put'); }); }
  };

  /* ================= app record <-> table row ================= */
  // [column, app key, type]. Types: t text, n number, i integer, b boolean, d date (YYYY-MM-DD), j json.
  // Not-null columns carry a 4th item: the value to send when the app has none.
  // Any app field that isn't a column (or doesn't fit its type) goes into `extra`, so nothing is lost.
  var MAP = {
    entries:  { t: 'entries', c: [['amount', 'amount', 'n', 0], ['cat', 'cat', 't', 'other'], ['note', 'note', 't'], ['date', 'date', 'd', '1970-01-01'], ['orig_amt', 'origAmt', 'n'], ['debt_id', 'debtId', 't'], ['bill_id', 'billId', 't'], ['person_id', 'personId', 't']] },
    debts:    { t: 'debts', c: [['name', 'name', 't', ''], ['currency', 'currency', 't', 'NIS'], ['total', 'total', 'n'], ['paid_before', 'paidBefore', 'n'], ['sort_order', 'order', 'i']] },
    wishes:   { t: 'wishes', c: [['cat', 'cat', 't'], ['name', 'name', 't', ''], ['type', 'type', 't'], ['color', 'color', 't'], ['price', 'price', 'n'], ['cur', 'cur', 't'], ['where_from', 'where', 't'], ['added', 'added', 'd'], ['status', 'status', 't', 'waiting'], ['decided', 'decided', 'd']] },
    food:     { t: 'food_logs', c: [['date', 'date', 'd', '1970-01-01'], ['meal', 'meal', 't'], ['name', 'name', 't', ''], ['plan', 'plan', 'b'], ['kcal', 'kcal', 'n']] },
    weights:  { t: 'weights', c: [['date', 'date', 'd', '1970-01-01'], ['kg', 'kg', 'n', 0]] },
    days:     { t: 'day_logs', data: true },
    cycle:    { t: 'cycles', c: [['start_date', 'start', 'd', '1970-01-01'], ['end_date', 'end', 'd']] },
    prices:   { t: 'prices', c: [['item', 'item', 't', ''], ['unit', 'unit', 't'], ['ppu', 'ppu', 'n'], ['date', 'date', 'd']] },
    products: { t: 'products', c: [['name', 'name', 't', ''], ['brand', 'brand', 't'], ['size', 'size', 't'], ['notes', 'notes', 't'], ['photo', 'photo', 't'], ['status', 'status', 't']] },
    recipes:  { t: 'recipes', c: [['title', 'title', 't', ''], ['servings', 'servings', 'n'], ['time', 'time', 't'], ['plan', 'plan', 't'], ['for_him', 'forHim', 'b', false], ['ingredients', 'ingredients', 'j', []], ['steps', 'steps', 'j', []], ['tips', 'tips', 'j', []], ['photo', 'photo', 't'], ['made', 'made', 'i', 0], ['last_made', 'lastMade', 'd']] },
    closet:   { t: 'closet_items', c: [['name', 'name', 't', ''], ['type', 'type', 't'], ['color', 'color', 't'], ['fit', 'fit', 't'], ['clean', 'clean', 'b'], ['plan', 'plan', 't'], ['orig', 'orig', 't'], ['photo', 'photo', 't'], ['crop', 'crop', 'j'], ['bright', 'bright', 'b', false], ['status', 'status', 't']] },
    people:   { t: 'people', c: [['name', 'name', 't', ''], ['rel', 'rel', 't'], ['partner', 'partner', 'b', false], ['birthday', 'birthday', 't'], ['notes', 'notes', 't'], ['gift_budget', 'giftBudget', 'n'], ['dates', 'dates', 'j', []], ['favs', 'favs', 'j', []], ['wants', 'wants', 'j', []], ['gifts', 'gifts', 'j', []]] },
    dates:    { t: 'date_nights', c: [['date', 'date', 'd'], ['idea', 'idea', 't'], ['note', 'note', 't']] },
    notes:    { t: 'notes', c: [['text', 'text', 't'], ['tag', 'tag', 't'], ['pinned', 'pinned', 'b', false], ['url', 'url', 't'], ['label', 'label', 't'], ['photo', 'photo', 't']] },
    settings: { t: 'settings', data: true }
  };
  // Push order: parents before the records that point at them.
  var ORDER = ['settings', 'debts', 'people', 'products', 'entries', 'wishes', 'food', 'weights', 'days', 'cycle', 'prices', 'recipes', 'closet', 'dates', 'notes'];
  var BY_TABLE = {}; Object.keys(MAP).forEach(function (c) { BY_TABLE[MAP[c].t] = c; });
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function fits(type, v) {
    if (type === 't') return typeof v === 'string';
    if (type === 'n') return typeof v === 'number' && isFinite(v);
    if (type === 'i') return typeof v === 'number' && Number.isInteger(v) && Math.abs(v) < 2147483647;
    if (type === 'b') return typeof v === 'boolean';
    if (type === 'd') return typeof v === 'string' && DATE_RE.test(v) && !isNaN(Date.parse(v));
    return v !== undefined; // j
  }
  function iso(ms) { return new Date(ms).toISOString(); }
  function toRow(coll, id, doc, ts) {
    var m = MAP[coll], d = doc || {}, row = { id: id, updated_at: iso(ts), deleted_at: null }, extra = {};
    var ca = d.createdAt;
    row.created_at = iso(typeof ca === 'number' && ca > 0 ? ca : ts);
    if (ca !== undefined && !(typeof ca === 'number' && ca > 0)) extra.__createdAt = ca;
    if (m.data) {
      var body = {}; Object.keys(d).forEach(function (k) { if (k !== 'id' && k !== 'createdAt') body[k] = d[k]; });
      row.data = body; row.extra = extra;
      if (coll === 'days') row.date = DATE_RE.test(id) ? id : '1970-01-01';
      return row;
    }
    var used = { id: 1, createdAt: 1 };
    m.c.forEach(function (col) {
      var k = col[1], v = d[k]; used[k] = 1;
      if (v === '' && col[2] !== 't') v = undefined;            // '' in a number/date field = empty
      if (v !== undefined && v !== null && fits(col[2], v)) row[col[0]] = v;
      else {
        row[col[0]] = col.length > 3 ? col[3] : null;
        if (d[k] !== undefined) extra[k] = d[k];                 // keep the exact app value
      }
    });
    if (coll === 'weights' && !fits('d', d.date) && /^w-\d{4}-\d{2}-\d{2}$/.test(id)) row.date = id.slice(2);
    Object.keys(d).forEach(function (k) { if (!used[k] && d[k] !== undefined) extra[k] = d[k]; });
    row.extra = extra;
    return row;
  }
  function toDoc(coll, row) {
    var m = MAP[coll], ex = row.extra || {}, doc = {};
    if (m.data) { doc = Object.assign({}, row.data || {}); }
    else {
      m.c.forEach(function (col) { var v = row[col[0]]; if (v !== null && v !== undefined) doc[col[1]] = (col[2] === 'n' && typeof v === 'string') ? +v : v; });
      Object.keys(ex).forEach(function (k) { if (k !== '__createdAt') doc[k] = ex[k]; });
    }
    if ('__createdAt' in ex) doc.createdAt = ex.__createdAt; else if (row.created_at && !m.data) doc.createdAt = Date.parse(row.created_at);
    return doc;
  }
  window.__lifeMap = { toRow: toRow, toDoc: toDoc, MAP: MAP };

  /* ================= Supabase: auth ================= */
  var SKEY = 'lb.sb';
  function session() { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) { try { if (s) localStorage.setItem(SKEY, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)), user: { id: s.user && s.user.id, email: s.user && s.user.email } })); else localStorage.removeItem(SKEY); } catch (e) {} }
  function fail(code, msg, status) { var e = new Error(msg || code); e.code = code; e.status = status; return e; }
  async function authCall(path, body) {
    var r; try { r = await fetch(SB_URL + '/auth/v1/' + path, { method: 'POST', headers: { apikey: SB_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { throw fail('offline'); }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw fail(j.error_code || j.error || 'auth_error', j.msg || j.error_description || j.message || ('HTTP ' + r.status), r.status);
    return j;
  }
  var refreshing = null;
  async function token() {
    var s = session(); if (!s) throw fail('signed_out');
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    if (!refreshing) refreshing = authCall('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
      .then(function (n) { saveSession(n); return n.access_token; })
      .catch(function (e) { if (e.status === 400 || e.status === 401) { signedOut(); } throw e; })
      .finally(function () { refreshing = null; });
    return refreshing;
  }
  function uid() { var s = session(); return s && s.user && s.user.id; }

  /* ================= Supabase: REST + Storage ================= */
  async function sb(method, path, body, headers) {
    var t = await token(), r;
    var h = Object.assign({ apikey: SB_KEY, authorization: 'Bearer ' + t }, headers || {});
    if (body !== undefined && !(body instanceof Blob)) { h['content-type'] = 'application/json'; body = JSON.stringify(body); }
    try { r = await fetch(SB_URL + path, { method: method, headers: h, body: body }); } catch (e) { throw fail('offline'); }
    if (r.status === 401) {                                   // token expired early: refresh once and retry
      var s = session(); if (s) { s.expires_at = 0; saveSession(s); }
      t = await token(); h.authorization = 'Bearer ' + t;
      try { r = await fetch(SB_URL + path, { method: method, headers: h, body: body }); } catch (e) { throw fail('offline'); }
    }
    if (!r.ok) { var j = {}; try { j = await r.json(); } catch (e) {} throw fail(j.code || j.error || 'http_' + r.status, j.message || j.msg || ('HTTP ' + r.status), r.status); }
    return r;
  }
  function q(v) { return encodeURIComponent(v); }
  function inList(ids) { return 'in.(' + ids.map(function (i) { return '"' + String(i).replace(/["\\]/g, '\\$&') + '"'; }).join(',') + ')'; }
  // Returns the ids the database actually saved. A missing id means another device saved a newer version.
  function upsert(table, rows) { return sb('POST', '/rest/v1/' + table + '?on_conflict=user_id,id&select=id', rows, { prefer: 'resolution=merge-duplicates,return=representation' }).then(function (r) { return r.json(); }).then(function (a) { return a.map(function (x) { return x.id; }); }); }
  // Bring this device up to date for records where the database kept a newer version.
  async function refetch(c, ids) {
    if (!ids.length) return;
    for (var s = 0; s < ids.length; s += 50) {
      var rows = await (await sb('GET', '/rest/v1/' + MAP[c].t + '?select=*&id=' + q(inList(ids.slice(s, s + 50))))).json();
      for (var i = 0; i < rows.length; i++) await applyRow(c, rows[i]);
    }
  }
  function photoPath(id) { return '/storage/v1/object/photos/' + uid() + '/' + q(id); }

  /* ================= sync ================= */
  var st = { busy: false, again: false, last: 0, err: '', pending: 0 };
  var kickT = null;
  function kick() { clearTimeout(kickT); kickT = setTimeout(function () { sync(); }, 1500); }
  async function park(key, why) { var p = (await meta('parked')) || []; p.push({ key: key, why: String(why).slice(0, 200), at: Date.now() }); await meta('parked', p.slice(-50)); await write('outbox', key, null, true); }
  async function doneIfSame(key, ts) { var cur = await get('outbox', key); if (cur && cur.ts === ts) await write('outbox', key, null, true); }

  async function push() {
    var box = await all('outbox', '');
    if (!box.length) return;
    // 1) photos first, so a record never arrives on another device before its photo
    for (var i = 0; i < box.length; i++) {
      var k = box[i][0], v = box[i][1]; if (k.slice(0, 2) !== 'b:') continue;
      var id = k.slice(2);
      try {
        if (v.op === 'put') {
          var blob = await get('blobs', id);
          if (blob) await sb('POST', photoPath(id), blob, { 'x-upsert': 'true', 'content-type': blob.type || 'image/jpeg', 'cache-control': '31536000' });
        } else { await sb('DELETE', photoPath(id)).catch(function (e) { if (e.status !== 404 && e.status !== 400) throw e; }); }
        await doneIfSame(k, v.ts);
      } catch (e) { if (e.code === 'offline' || e.code === 'signed_out' || e.status >= 500 || e.status === 429) throw e; await park(k, e.message); }
    }
    // 2) records, parents first
    var groups = {};
    box.forEach(function (kv) { if (kv[0].slice(0, 2) !== 'd:') return; var p = kv[0].slice(2), c = p.split('/')[0]; if (!MAP[c]) return; (groups[c] = groups[c] || []).push({ key: kv[0], path: p, id: p.slice(c.length + 1), op: kv[1].op, ts: kv[1].ts }); });
    for (var gi = 0; gi < ORDER.length; gi++) {
      var c = ORDER[gi], g = groups[c]; if (!g) continue;
      var table = MAP[c].t, puts = [], dels = [];
      for (var j = 0; j < g.length; j++) {
        if (g[j].op === 'put') { var doc = await get('docs', g[j].path); if (doc === undefined) { await doneIfSame(g[j].key, g[j].ts); continue; } g[j].row = toRow(c, g[j].id, doc, g[j].ts); puts.push(g[j]); }
        else dels.push(g[j]);
      }
      for (var s = 0; s < puts.length; s += 200) {
        var chunk = puts.slice(s, s + 200);
        try {
          var saved = new Set(await upsert(table, chunk.map(function (x) { return x.row; })));
          for (var a = 0; a < chunk.length; a++) await doneIfSame(chunk[a].key, chunk[a].ts);
          await refetch(c, chunk.filter(function (x) { return !saved.has(x.id); }).map(function (x) { return x.id; }));
        }
        catch (e) {
          if (e.code === 'offline' || e.code === 'signed_out' || e.status >= 500 || e.status === 429) throw e;
          for (var b = 0; b < chunk.length; b++) {                // find the one bad record, keep the rest flowing
            try { var ok1 = await upsert(table, [chunk[b].row]); await doneIfSame(chunk[b].key, chunk[b].ts); if (!ok1.length) await refetch(c, [chunk[b].id]); }
            catch (e2) { if (e2.code === 'offline' || e2.status >= 500) throw e2; await park(chunk[b].key, e2.message); }
          }
        }
      }
      // deletes: newest-wins applies here too (the database ignores this if another device edited later)
      var byTs = {}; dels.forEach(function (x) { (byTs[x.ts] = byTs[x.ts] || []).push(x); });
      for (var tsk in byTs) {
        var list = byTs[tsk];
        for (var s2 = 0; s2 < list.length; s2 += 50) {
          var dc = list.slice(s2, s2 + 50);
          var gone = await (await sb('PATCH', '/rest/v1/' + table + '?select=id&id=' + q(inList(dc.map(function (x) { return x.id; }))), { deleted_at: iso(+tsk), updated_at: iso(+tsk) }, { prefer: 'return=representation' })).json();
          var goneS = new Set(gone.map(function (x) { return x.id; }));
          for (var e3 = 0; e3 < dc.length; e3++) await doneIfSame(dc[e3].key, dc[e3].ts);
          await refetch(c, dc.filter(function (x) { return !goneS.has(x.id); }).map(function (x) { return x.id; }));
        }
      }
    }
  }

  var missingPhotos = new Set();
  async function applyRow(c, row) {
    var path = c + '/' + row.id;
    if (row.deleted_at) { if ((await get('docs', path)) !== undefined) { await write('docs', path, null, true); notify(path); return true; } return false; }
    var doc = toDoc(c, row); await write('docs', path, doc); notify(path);
    ['photo', 'orig'].forEach(function (f) { if (typeof doc[f] === 'string' && doc[f] && !/^(data:|https?:|\/)/.test(doc[f])) missingPhotos.add(doc[f]); });
    return true;
  }
  async function pull() {
    for (var gi = 0; gi < ORDER.length; gi++) {
      var c = ORDER[gi], table = MAP[c].t, ck = 'cur:' + table;
      var cur = await meta(ck);
      // small overlap: a save that started just before the last pull may commit just after it
      var filter = cur ? '&synced_at=gt.' + q(iso(Date.parse(cur) - 10000)) : '';
      for (var page = 0; page < 400; page++) {
        var rows = await (await sb('GET', '/rest/v1/' + table + '?select=*&order=synced_at.asc,id.asc&limit=500' + filter)).json();
        for (var i = 0; i < rows.length; i++) {
          if (await get('outbox', 'd:' + c + '/' + rows[i].id)) continue;   // a local change is waiting: push decides who's newest
          await applyRow(c, rows[i]);
        }
        if (!rows.length) break;
        var last = rows[rows.length - 1];
        if (!cur || Date.parse(last.synced_at) > Date.parse(cur)) { cur = last.synced_at; await meta(ck, cur); }
        if (rows.length < 500) break;
        // next page: after (synced_at, id) of the last row, so rows saved in the same instant are never skipped
        filter = '&or=' + q('(synced_at.gt.' + last.synced_at + ',and(synced_at.eq.' + last.synced_at + ',id.gt.' + last.id + '))');
      }
    }
  }
  async function fetchPhotos() {
    var ids = Array.from(missingPhotos); missingPhotos.clear();
    var have = new Set(await keys('blobs')), got = 0;
    for (var i = 0; i < ids.length; i++) {
      if (have.has(ids[i])) continue;
      try { var r = await sb('GET', '/storage/v1/object/authenticated/photos/' + uid() + '/' + q(ids[i])); await write('blobs', ids[i], await r.blob()); got++; }
      catch (e) { if (e.code === 'offline') { missingPhotos.add(ids[i]); break; } }
    }
    if (got) Object.keys(colL).forEach(function (c) { emitCol(c); });  // redraw so the photos appear
  }

  // First sign-in on a device: if the account is empty, upload everything already on this device (the phone's data).
  // If the account already has data, this device takes the account's data (a copy of what was here is kept in 'presync').
  async function firstSync() {
    if (await meta('first:' + uid())) return;
    var probe = await Promise.all(['settings', 'entries', 'day_logs', 'weights'].map(function (t) { return sb('GET', '/rest/v1/' + t + '?select=id&limit=1').then(function (r) { return r.json(); }); }));
    var serverHas = probe.some(function (a) { return a.length; });
    var local = await all('docs', '');
    if (!serverHas) {
      for (var i = 0; i < local.length; i++) await write('outbox', 'd:' + local[i][0], { op: 'put', ts: Date.now() });
      var bl = await keys('blobs'); for (var j = 0; j < bl.length; j++) await write('outbox', 'b:' + bl[j], { op: 'put', ts: Date.now() });
    } else if (local.length) {
      await meta('presync', { at: Date.now(), docs: local });
      await clear('docs'); await clear('outbox');
      try { localStorage.removeItem('moneybook.v1'); } catch (e) {}
      Object.keys(colL).forEach(function (c) { emitCol(c); }); Object.keys(docL).forEach(function (p) { emitDoc(p); });
    }
    await meta('first:' + uid(), Date.now());
  }

  async function sync() {
    if (!session()) return;
    if (st.busy) { st.again = true; return; }
    if (navigator.onLine === false) { st.err = 'offline'; return paint(); }
    st.busy = true; paint();
    try {
      var who = await meta('uid');
      if (who && who !== uid()) { await wipeLocal(); }
      await meta('uid', uid());
      await firstSync();
      await push();
      await pull();
      st.last = Date.now(); st.err = '';
      fetchPhotos();
    } catch (e) { st.err = e.code === 'offline' ? 'offline' : (e.message || 'error'); if (e.code === 'signed_out') st.err = ''; }
    st.busy = false;
    st.pending = (await all('outbox', '')).length;
    paint();
    if (st.again) { st.again = false; kick(); }
  }
  async function wipeLocal() {
    await clear('docs'); await clear('blobs'); await clear('outbox'); await clear('meta');
    try { localStorage.removeItem('moneybook.v1'); localStorage.removeItem('lb.aiuse'); } catch (e) {}
  }

  /* ================= sign-in screen ================= */
  var css = 'position:fixed;inset:0;z-index:10000;background:#170D24;display:grid;place-items:center;padding:16px;font-family:Figtree,system-ui,sans-serif';
  var inp = 'font:inherit;font-size:16px;padding:12px;border-radius:12px;border:1px solid #4A3A5E;background:#241638;color:#FFF8EE;width:100%;box-sizing:border-box';
  function loginScreen() {
    if (document.getElementById('sbLogin')) return;
    var mode = 'in';
    var w = document.createElement('div'); w.id = 'sbLogin'; w.style.cssText = css;
    w.innerHTML = '<form style="background:#2A1B3F;color:#FFF8EE;border-radius:22px;padding:22px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px" novalidate>' +
      '<b id="sbT" style="font-size:20px">Welcome back</b><span id="sbS" style="font-size:14px;opacity:.75">Sign in once on this device. Your data syncs between your phone and laptop.</span>' +
      '<label style="font-size:13px;font-weight:600">Email<input id="sbE" type="email" autocomplete="email" required style="' + inp + ';margin-top:6px"></label>' +
      '<label style="font-size:13px;font-weight:600">Password<input id="sbP" type="password" autocomplete="current-password" minlength="8" required style="' + inp + ';margin-top:6px"></label>' +
      '<div id="sbErr" role="alert" style="font-size:14px;color:#FFD27A;min-height:0"></div>' +
      '<button id="sbGo" type="submit" style="padding:13px;border-radius:999px;border:0;background:#E0A93A;color:#1F1A26;font:inherit;font-weight:700;font-size:16px">Sign in</button>' +
      '<button id="sbSw" type="button" style="padding:8px;border:0;background:transparent;color:#FFF8EE;opacity:.8;font:inherit;font-size:14px;text-decoration:underline">New here? Create your account</button></form>';
    document.body.appendChild(w);
    var $ = function (id) { return w.querySelector('#' + id); };
    function setMode(m) { mode = m; $('sbT').textContent = m === 'in' ? 'Welcome back' : 'Create your account'; $('sbGo').textContent = m === 'in' ? 'Sign in' : 'Create account'; $('sbSw').textContent = m === 'in' ? 'New here? Create your account' : 'I already have an account'; $('sbP').autocomplete = m === 'in' ? 'current-password' : 'new-password'; $('sbErr').textContent = ''; }
    $('sbSw').onclick = function () { setMode(mode === 'in' ? 'up' : 'in'); };
    w.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var em = $('sbE').value.trim(), pw = $('sbP').value;
      if (!/^\S+@\S+\.\S+$/.test(em)) { $('sbErr').textContent = 'Type your email.'; return; }
      if (pw.length < 8) { $('sbErr').textContent = 'The password needs at least 8 characters.'; return; }
      $('sbGo').disabled = true; $('sbErr').textContent = '';
      try {
        if (mode === 'up') {
          var u = await authCall('signup', { email: em, password: pw });
          if (!u.access_token) { setMode('in'); $('sbErr').textContent = 'Almost there: open the email from Supabase, tap the link, then sign in here.'; $('sbGo').disabled = false; return; }
          saveSession(u);
        } else saveSession(await authCall('token?grant_type=password', { email: em, password: pw }));
        w.remove(); banner('Signed in. Syncing your data…'); sync();
      } catch (er) {
        var m = er.code === 'offline' ? 'You\'re offline. Connect to the internet to sign in.'
          : /not.?confirmed/i.test(er.code + er.message) ? 'Confirm your email first: open the email from Supabase and tap the link.'
          : /invalid.?(credentials|grant)/i.test(er.code + er.message) ? 'Email or password is wrong.'
          : /already|exists/i.test(er.code + er.message) ? 'This email already has an account. Sign in instead.'
          : /signup.?disabled|signups not allowed/i.test(er.code + er.message) ? 'New accounts are switched off for this app.'
          : 'Couldn\'t sign in: ' + er.message;
        $('sbErr').textContent = m; $('sbGo').disabled = false;
      }
    };
    setTimeout(function () { $('sbE').focus(); }, 50);
  }
  function signedOut() { saveSession(null); paint(); if (document.body) loginScreen(); }
  async function signOut() {
    var n = (await all('outbox', '')).length;
    if (n && !confirm(n + ' change' + (n > 1 ? 's haven\'t' : ' hasn\'t') + ' synced yet. Signing out deletes ' + (n > 1 ? 'them' : 'it') + ' from this device. Sign out anyway?')) return;
    var s = session(); if (s) { try { await fetch(SB_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB_KEY, authorization: 'Bearer ' + s.access_token } }); } catch (e) {} }
    await wipeLocal(); saveSession(null); location.reload();
  }

  /* ================= status (Settings → Your data) ================= */
  function ago(ms) { var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; }
  function paint() {
    var el = document.getElementById('syncRow'); if (!el) return;
    var s = session();
    if (!s) { el.innerHTML = ''; return; }
    var line = st.busy ? 'Syncing…' : st.err === 'offline' ? 'Offline. Changes will sync when you\'re back online.' : st.err ? 'Last sync failed: ' + st.err : st.last ? 'Synced ' + ago(st.last) : 'Not synced yet';
    if (!st.busy && st.pending && !st.err) line += ' · ' + st.pending + ' waiting';
    el.innerHTML = '<p class="hint" style="margin:0 0 8px">Signed in as <b></b><br><span></span></p><div class="datarow"><button class="btn2" type="button" data-sbsync>Sync now</button><button class="btn2" type="button" data-sbout>Sign out</button></div>';
    el.querySelector('b').textContent = s.user.email || '';
    el.querySelector('span').textContent = line;
    el.querySelector('[data-sbsync]').onclick = function () { sync(); };
    el.querySelector('[data-sbout]').onclick = signOut;
  }
  window.lifeSync = { sync: sync, signOut: signOut, status: function () { return Object.assign({ email: session() && session().user.email }, st); } };

  /* ================= banner ================= */
  function banner(msg) {
    var b = document.getElementById('shimBanner');
    if (!b) { b = document.createElement('div'); b.id = 'shimBanner'; b.setAttribute('role', 'status'); b.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:9999;background:#1F1A26;color:#FFF8EE;border-radius:14px;padding:12px 14px;font:600 14px/1.35 Figtree,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3)'; document.body.appendChild(b); }
    b.textContent = msg; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { b.hidden = true; }, 5000);
  }

  /* ================= images to small JPEG base64 (for AI) ================= */
  function toBlob(x) {
    if (typeof HTMLCanvasElement !== 'undefined' && x instanceof HTMLCanvasElement) return new Promise(function (r) { x.toBlob(r, 'image/jpeg', 0.86); });
    if (typeof x === 'string') return fetch(x).then(function (r) { return r.blob(); });
    if (x && x.data instanceof Blob) return Promise.resolve(x.data);
    return Promise.resolve(x);
  }
  function toB64(x) {
    return toBlob(x).then(function (blob) { return createImageBitmap(blob); }).then(function (bmp) {
      var sc = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)); var c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85).split(',')[1];
    });
  }

  /* ================= AI through the private helper (signed in = allowed) ================= */
  function usage() { var mk = new Date().toISOString().slice(0, 7), u = {}; try { u = JSON.parse(localStorage.getItem('lb.aiuse') || '{}'); } catch (e) {} if (u.m !== mk) u = { m: mk, n: 0 }; return u; }
  async function ask(prompt, opts) {
    opts = opts || {};
    var u = usage(); if (u.n >= MONTHLY_CAP) { banner('You reached this month\'s ' + MONTHLY_CAP + ' AI uses. It resets on the 1st.'); throw fail('rate_limited'); }
    if (navigator.onLine === false) { banner('You\'re offline. Scanning and Say it need internet.'); throw fail('unavailable'); }
    var t; try { t = await token(); } catch (e) { if (e.code === 'offline') { banner('You\'re offline. Scanning and Say it need internet.'); throw fail('unavailable'); } throw fail('not_granted'); }
    var imgs = await Promise.all((opts.images || []).slice(0, 3).map(toB64));
    var tier = (opts.modelTier === 'default' || opts.modelTier === 'complex') ? 'default' : 'quick';
    var r;
    try { r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ prompt: String(prompt), tier: tier, url: opts.peekUrl || undefined, images: imgs.map(function (d) { return { type: 'image/jpeg', data: d }; }), max_tokens: opts.maxTokens || 1500 }) }); }
    catch (e) { banner('Couldn\'t reach your AI helper. Check your internet.'); throw fail('unavailable'); }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 401) { banner('The AI helper didn\'t accept your sign-in. It may need its update (see the setup notes).'); throw fail('not_granted'); }
    if (!r.ok) {
      if (/credit balance/i.test(j.message || '')) banner('Your Claude API credit has run out. Add funds on platform.claude.com.');
      else if (r.status === 429) banner('Too many requests right now. Try again in a minute.');
      throw fail(r.status === 429 ? 'rate_limited' : 'unavailable', j.message);
    }
    u.n++; try { localStorage.setItem('lb.aiuse', JSON.stringify(u)); } catch (e) {}
    return String(j.text || '');
  }
  function parseJSON(t) {
    t = t.replace(/```(?:json)?/gi, '').trim();
    try { return JSON.parse(t); } catch (e) {}
    var a = t.indexOf('{'), b = t.lastIndexOf('}'), a2 = t.indexOf('['), b2 = t.lastIndexOf(']');
    if (a2 >= 0 && (a < 0 || a2 < a) && b2 > a2) { try { return JSON.parse(t.slice(a2, b2 + 1)); } catch (e) {} }
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
    throw fail('invalid_json');
  }
  var sampleNS = {
    limits: function () { return Promise.resolve({ maxInputBytes: 200000, images: { maxCount: 3 } }); },
    json: function (p, o) { return ask(p + '\n\nReply with only the JSON, no other text.', o).then(parseJSON); },
    sample: function (p, o) { return ask(p, o).then(function (t) { return { text: t }; }); }
  };

  /* ================= downloads ================= */
  var dlNS = {
    save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: /\.json$/i.test(o.filename) ? 'application/json' : 'application/octet-stream' });
      var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = o.filename || 'download'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000); return Promise.resolve({ status: 'saved' });
    }
  };

  var NS = { db: dbNS, assets: assetsNS, sample: sampleNS, downloads: dlNS };
  window.claude = { use: function (n) { return Promise.resolve(NS[n] || null); } };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* ================= start ================= */
  function start() {
    if (!session()) loginScreen(); else sync();
    paint();
    window.addEventListener('online', function () { sync(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sync(); });
    setInterval(function () { if (document.visibilityState === 'visible') sync(); }, 60000);
    setInterval(paint, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* ================= offline + photo links (/_blob/...) via service worker ================= */
  if ('serviceWorker' in navigator) {
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/sw.js').catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!had) { had = true; location.reload(); } });
  }
})();
