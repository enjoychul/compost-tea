/* everrich 기록 동기화 — go.html, index.html 공용
 * 순서: ① 폰에만 있고 아직 안 올라간 기록을 시트로 올림 → ② 시트 전체를 읽어 이 기기 기록을 시트와 똑같이 맞춤
 * 시트가 원본: 시트에서 지운 줄은 모든 기기에서 사라진다. 올리기 실패한 기록은 기기에 남아 다음에 다시 올린다.
 */
(function () {
  'use strict';
  const LK = 'kor-debugger-logs', SENT = 'everrich-sent', PK = 'everrich-pw';
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const sget = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };

  async function decrypt(buf, pw) {
    const u = new Uint8Array(buf);
    if (u[0] !== 69 || u[1] !== 86 || u[2] !== 82 || u[3] !== 49) throw Error('형식이 다른 파일');
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u.slice(4, 20), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(20, 32) }, key, u.slice(32)));
  }
  let cfg = null;
  async function config(pw) {
    if (cfg) return cfg;
    pw = pw || get(PK, null) || sget(PK);
    if (!pw || !window.crypto || !crypto.subtle) return null;
    try {
      const r = await fetch('enc/sync.bin', { cache: 'no-cache' });
      if (!r.ok) return null;
      cfg = JSON.parse(new TextDecoder().decode(await decrypt(await r.arrayBuffer(), pw)));
      return cfg;
    } catch (e) { return null; }
  }
  function devId() { let d = get('everrich-dev', null); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 8); set('everrich-dev', d); } return d; }
  async function call(c, body) {
    const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: c.token, dev: devId() }, body)) });
    const j = await r.json();
    if (!j.ok) throw Error(j.err || '거절됨');
    return j;
  }
  function pending() { const s = new Set(get(SENT, [])); return get(LK, []).filter(l => l && l.id && !s.has(l.id)); }

  async function push(c) {
    const P = pending();
    for (let i = 0; i < P.length; i += 50) {
      const chunk = P.slice(i, i + 50);
      await call(c, { rows: chunk });
      const s = new Set(get(SENT, [])); chunk.forEach(l => s.add(l.id)); set(SENT, [...s]);
    }
    return P.length;
  }

  const CONF = { '헷갈렸음': 'confused', '대충 봤음': 'careless', '확신했음': 'sure', '찍어서 맞음': 'guess' };
  const pad = n => String(n).padStart(2, '0');
  function day(v) { // 시트가 날짜를 Date로 바꿔 UTC로 돌려주는 경우 → 이 기기 기준 yyyy-mm-dd
    v = String(v || ''); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const t = Date.parse(v); if (isNaN(t)) return v;
    const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  function fromRow(h, row) {
    const o = {}; h.forEach((k, i) => { o[k] = row[i]; });
    const t = num(o.t) || Date.parse(o['받은시각']) || 0;
    return {
      id: String(o.id || ''), t, d: day(o['날짜']), src: String(o['문제'] || ''), qid: o.qid || undefined,
      kind: o['종류'] || '수능', area: o['영역'] || '', inp: o['지문유형'] || null, ok: o['맞음'] === 'O',
      pick: num(o['고른번호']), ans: num(o['정답']),
      pol: o['발문'] === '적절하지 않은 것' ? 'X' : (o['발문'] === '적절한 것' ? 'O' : undefined),
      err: o['오류코드'] || null, bug: o['끊긴연산'] || null,
      ops: String(o['연산'] || '').split(',').map(s => s.trim()).filter(Boolean),
      conf: CONF[o['왜골랐나']] || null, sec: num(o['문항당초']), setSec: num(o['세트초']), lim: num(o['목표초']),
      via: o['경로'] || undefined, memo: String(o['메모'] || ''), r: null
    };
  }
  async function pull(c) {
    const j = await call(c, { action: 'list' });
    if (!Array.isArray(j.head) || !Array.isArray(j.rows)) throw Error('시트 스크립트가 옛 버전입니다 (새 버전 배포 필요)');  // 기기 기록을 지우지 않도록
    const recs = (j.rows || []).map(r => fromRow(j.head, r)).filter(r => r.id && r.via !== 'setup');
    const sent = new Set(get(SENT, []));
    const unsent = get(LK, []).filter(l => l && l.id && !sent.has(l.id));   // 아직 못 올린 것은 지키기
    const ids = new Set(recs.map(r => r.id));
    const merged = unsent.filter(l => !ids.has(l.id)).concat(recs).sort((a, b) => (b.t || 0) - (a.t || 0));
    set(LK, merged); set(SENT, [...ids]);
    return recs.length;
  }

  let running = null;
  async function sync(pw) {
    if (running) return running;
    running = (async () => {
      const c = await config(pw);
      if (!c) return { off: true };
      if (navigator.onLine === false) return { offline: true, pending: pending().length };
      try { const up = await push(c); const n = await pull(c); return { ok: true, up, n }; }
      catch (e) { return { fail: true, pending: pending().length, err: String(e && e.message || e) }; }
    })();
    try { return await running; } finally { running = null; }
  }
  window.EV = { sync, pending, config, devId };
})();
