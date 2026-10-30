/* Life Book runtime: stands in for the Claude artifact runtime (window.claude.use).
   Step 1 (current): data + photos live in this device's IndexedDB; AI goes through the private lina-ai worker.
   Step 3 will swap the db/assets parts for Supabase (with IndexedDB kept as the offline cache). */
(function () {
  var API = 'https://lina-ai.lina-hajjajj.workers.dev';
  var MONTHLY_CAP = 400;
  var DBN = 'lina-life', VER = 1, _db = null;
  function idb() {
    return _db || (_db = new Promise(function (res, rej) {
      var r = indexedDB.open(DBN, VER);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs'); if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function write(store, key, val, remove) {
    return idb().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(store, 'readwrite'); var s = t.objectStore(store); remove ? s.delete(key) : s.put(val, key);
      t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error || new Error('aborted')); };
    }); });
  }
  function get(store, key) { return idb().then(function (d) { return req(d.transaction(store).objectStore(store).get(key)); }); }
  function all(store, prefix) {
    return idb().then(function (d) { var s = d.transaction(store).objectStore(store); var range = IDBKeyRange.bound(prefix, prefix + '￿');
      return Promise.all([req(s.getAllKeys(range)), req(s.getAll(range))]).then(function (kv) { return kv[0].map(function (k, i) { return [k, kv[1][i]]; }); }); });
  }
  window.__lifeDB = { get: get, all: all, write: write };

  /* ---- db: same calls the app makes on the Claude version ---- */
  var colL = {}, docL = {}, pending = {};
  function emitCol(c) { return all('docs', c + '/').then(function (rows) { var snap = { docs: rows.map(function (r) { return { id: r[0].slice(c.length + 1), data: function () { return r[1]; } }; }) }; (colL[c] || []).forEach(function (f) { f(snap); }); }); }
  function emitDoc(p) { return get('docs', p).then(function (v) { (docL[p] || []).forEach(function (f) { f({ exists: v !== undefined, data: function () { return v; } }); }); }); }
  function notify(path) { var c = path.split('/')[0]; if (colL[c] && !pending[c]) { pending[c] = 1; setTimeout(function () { pending[c] = 0; emitCol(c); }, 30); } if (docL[path]) emitDoc(path); }
  function docRef(path) {
    return {
      set: function (v) { return write('docs', path, JSON.parse(JSON.stringify(v))).then(function () { notify(path); }); },
      delete: function () { return write('docs', path, null, true).then(function () { notify(path); }); },
      onSnapshot: function (cb, err) { (docL[path] = docL[path] || []).push(cb); emitDoc(path).catch(function (e) { err && err(e); }); return function () {}; }
    };
  }
  var dbNS = {
    collection: function (c) { return { doc: function (id) { return docRef(c + '/' + id); }, onSnapshot: function (cb, err) { (colL[c] = colL[c] || []).push(cb); emitCol(c).catch(function (e) { err && err(e); }); return function () {}; } }; },
    doc: function (p) { return docRef(p); }
  };

  /* ---- photos ---- */
  var assetsNS = {
    upload: function (blob) { var id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); return write('blobs', id, blob).then(function () { return { id: id, url: '/_blob/' + id }; }); },
    delete: function (id) { return write('blobs', id, null, true); },
    putWithId: function (id, blob) { return write('blobs', id, blob); }
  };

  /* ---- little UI: banner + passcode box ---- */
  function banner(msg) {
    var b = document.getElementById('shimBanner');
    if (!b) { b = document.createElement('div'); b.id = 'shimBanner'; b.setAttribute('role', 'status'); b.style.cssText = 'position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:9999;background:#1F1A26;color:#FFF8EE;border-radius:14px;padding:12px 14px;font:600 14px/1.35 Figtree,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3)'; document.body.appendChild(b); }
    b.textContent = msg; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { b.hidden = true; }, 5000);
  }
  function askPass() {
    return new Promise(function (res) {
      var w = document.createElement('div');
      w.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(10,6,16,.55);display:grid;place-items:center;padding:16px';
      w.innerHTML = '<form style="background:var(--surface,#fff);color:var(--ink,#1F1A26);border-radius:20px;padding:20px;width:100%;max-width:360px;font-family:Figtree,system-ui,sans-serif;display:flex;flex-direction:column;gap:12px">' +
        '<b style="font-size:18px">Your app passcode</b><span style="font-size:14px;opacity:.75">Type the passcode you saved as APP_PASS in Cloudflare. You only do this once on this phone.</span>' +
        '<input type="password" autocomplete="current-password" required style="font:inherit;font-size:16px;padding:12px;border-radius:12px;border:1px solid var(--line,#ddd);background:var(--surface-2,#f5f5f5);color:inherit">' +
        '<div style="display:flex;gap:8px"><button type="button" style="flex:1;padding:12px;border-radius:999px;border:1px solid var(--line,#ddd);background:transparent;color:inherit;font:inherit;font-weight:600">Cancel</button><button type="submit" style="flex:1;padding:12px;border-radius:999px;border:0;background:var(--sun,#E0A93A);color:var(--sun-ink,#1F1A26);font:inherit;font-weight:700">Save</button></div></form>';
      document.body.appendChild(w);
      var f = w.querySelector('form'), i = w.querySelector('input'); setTimeout(function () { i.focus(); }, 50);
      w.querySelector('button[type=button]').onclick = function () { w.remove(); res(null); };
      f.onsubmit = function (e) { e.preventDefault(); var v = i.value.trim(); w.remove(); if (v) { try { localStorage.setItem('lb.pass', v); } catch (x) {} } res(v || null); };
    });
  }
  function fail(code, msg) { var e = new Error(msg || code); e.code = code; return e; }

  /* ---- images to small JPEG base64 ---- */
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

  /* ---- AI through the private helper ---- */
  function usage() { var mk = new Date().toISOString().slice(0, 7), u = {}; try { u = JSON.parse(localStorage.getItem('lb.aiuse') || '{}'); } catch (e) {} if (u.m !== mk) u = { m: mk, n: 0 }; return u; }
  async function ask(prompt, opts) {
    opts = opts || {};
    var pass = null; try { pass = localStorage.getItem('lb.pass'); } catch (e) {}
    if (!pass) { pass = await askPass(); if (!pass) throw fail('not_granted', 'No passcode'); }
    var u = usage(); if (u.n >= MONTHLY_CAP) { banner('You reached this month\'s ' + MONTHLY_CAP + ' AI uses. It resets on the 1st.'); throw fail('rate_limited'); }
    if (navigator.onLine === false) { banner('You\'re offline. Scanning and Say it need internet.'); throw fail('unavailable'); }
    var imgs = await Promise.all((opts.images || []).slice(0, 3).map(toB64));
    var tier = (opts.modelTier === 'default' || opts.modelTier === 'complex') ? 'default' : 'quick';
    var r;
    try { r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-app-pass': pass }, body: JSON.stringify({ prompt: String(prompt), tier: tier, url: opts.peekUrl || undefined, images: imgs.map(function (d) { return { type: 'image/jpeg', data: d }; }), max_tokens: opts.maxTokens || 1500 }) }); }
    catch (e) { banner('Couldn\'t reach your AI helper. Check your internet.'); throw fail('unavailable'); }
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 401) { try { localStorage.removeItem('lb.pass'); } catch (e) {} banner('That passcode didn\'t match. Try again and you\'ll be asked for it.'); throw fail('not_granted'); }
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

  /* ---- downloads ---- */
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

  /* ---- offline + photo links (/_blob/...) via service worker ---- */
  if ('serviceWorker' in navigator) {
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/sw.js').catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!had) { had = true; location.reload(); } });
  }
})();
