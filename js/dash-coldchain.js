/* AI 냉동시설 데모 — 예시 데이터. 실제 장비 연결 전 화면입니다. */
(function(){
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TICK = 3000, N = 48;
  function $(s, r){ return (r || document).querySelector(s); }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function rnd(a){ return (Math.random() - .5) * 2 * a; }
  function num(v, d){ return v.toFixed(d).replace('-', '−'); }
  var LBL = ['정상', '주의', '경고'];

  /* a: lower bound (null = none), b: upper bound; tol: margin before 경고 */
  var S = {
    fruit: {v: 1.2, set: 1.0, band: .6, a: 0, b: 2, lo: -4, hi: 8, tol: 1, hum: 92, door: 14, kw: 3.2, util: 52, pDoor: .03, color: '#1F3A2B'},
    veg:   {v: 3.1, set: 2.6, band: .8, a: 0, b: 5, lo: -4, hi: 10, tol: 1.5, hum: 93, door: 22, kw: 3.0, util: 58, pDoor: .05, color: '#6E8F3A'},
    meat:  {v: -19.4, set: -20, band: 1, a: null, b: -18, lo: -28, hi: -10, tol: 2, hum: null, door: 9, kw: 5.8, util: 64, pDoor: .02, color: '#8C5A3C'},
    fish:  {v: -26.8, set: -27.5, band: 1, a: null, b: -25, lo: -34, hi: -18, tol: 2, hum: null, door: 6, kw: 7.4, util: 78, pDoor: .015, color: '#4F7FA3'}
  };
  var KEYS = Object.keys(S);
  function status(s){
    var out = s.v > s.b ? s.v - s.b : (s.a !== null && s.v < s.a ? s.a - s.v : 0);
    return out === 0 ? 0 : out <= s.tol ? 1 : 2;
  }
  /* seed 24h: compressor cycling ripple + a few door spikes */
  KEYS.forEach(function(k){
    var s = S[k], h = [];
    for (var i = 0; i < N; i++){
      var t = s.set + Math.sin(i * 1.3) * s.band * .5 + rnd(s.band * .25);
      if (Math.random() < s.pDoor * 3) t += s.band * 1.6;
      h.push(t);
    }
    h[N - 1] = s.v; s.h = h; s.comp = true; s.spike = 0; s.on = 0; s.ticks = 0;
  });

  function setSt(el, n){ el.className = 'st s' + n; el.textContent = LBL[n]; }
  function tween(el, from, to){
    if (RM || Math.abs(to - from) < .05){ el.textContent = num(to, 1); return; }
    var t0 = null;
    function step(t){ if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
      el.textContent = num(from + (to - from) * e, 1); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function spark(svg, arr, lo, hi){
    var w = 200, hg = 44, pd = 4, pts = arr.map(function(v, i){
      return (i / (arr.length - 1) * w).toFixed(1) + ' ' + (hg - pd - (v - lo) / (hi - lo) * (hg - pd * 2)).toFixed(1); });
    svg.querySelector('.l').setAttribute('d', 'M' + pts.join('L'));
    svg.querySelector('.a').setAttribute('d', 'M0 ' + hg + 'L' + pts.join('L') + 'L' + w + ' ' + hg + 'Z');
  }
  function drawStore(k){
    var s = S[k], card = $('[data-s="' + k + '"]'), el = $('[data-v]', card);
    var old = parseFloat(el.textContent.replace('−', '-'));
    tween(el, isNaN(old) ? s.v : old, s.v);
    var st = status(s); setSt($('[data-st]', card), st);
    var dot = $('[data-dot]', card);
    dot.style.left = clamp((s.v - s.lo) / (s.hi - s.lo) * 100, 0, 100).toFixed(1) + '%';
    dot.className = 'rng-dot s' + st;
    $('[data-h]', card).textContent = s.hum === null ? '—' : Math.round(s.hum) + '%';
    $('[data-d]', card).textContent = '오늘 ' + s.door + '회';
    var c = $('[data-c]', card); c.textContent = s.comp ? '운전' : '정지'; c.className = s.comp ? 'on' : '';
    $('[data-p]', card).textContent = num(s.comp ? s.kw : .3, 1) + ' kW';
    var lo = Math.min.apply(null, s.h), hi = Math.max.apply(null, s.h), m = (lo + hi) / 2, half = Math.max(hi - lo, s.band * 7) / 2 * 1.2;
    spark($('.spark', card), s.h, m - half, m + half);
  }

  /* power + defrost */
  var P = {kwh: 186.4, def: 1 * 3600 + 42 * 60};
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function drawPower(){
    var tot = 0;
    KEYS.forEach(function(k){
      var s = S[k], row = $('[data-u="' + k + '"]'); tot += s.comp ? s.kw : .3;
      var u = Math.round(s.util); $('i', row).style.width = u + '%'; $('i', row).className = u > 75 ? 's1' : ''; $('b', row).textContent = u + '%';
    });
    $('[data-kwh]').textContent = P.kwh.toFixed(1);
    $('[data-kw]').textContent = tot.toFixed(1);
  }
  function drawDef(){ var d = P.def; $('[data-def]').textContent = pad2(Math.floor(d / 3600)) + ':' + pad2(Math.floor(d % 3600 / 60)) + ':' + pad2(d % 60); }

  /* 24h chart: 4 lines + light bands for each target range */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, at, par){ var e = document.createElementNS(NS, tag); for (var a in at) e.setAttribute(a, at[a]); if (par) par.appendChild(e); return e; }
  function drawChart(){
    var svg = $('#trend'); if (!svg) return;
    var W = Math.max(280, svg.parentNode.clientWidth - 48), H = W < 520 ? 260 : 320, L = 44, R = 12, T = 12, B = 30;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var pw = W - L - R, ph = H - T - B, Y0 = -34, Y1 = 10;
    function x(i){ return L + i / (N - 1) * pw; }
    function y(v){ return T + ph - (v - Y0) / (Y1 - Y0) * ph; }
    KEYS.forEach(function(k){
      var s = S[k], top = s.b, bot = s.a === null ? (k === 'meat' ? -25 : Y0) : s.a;
      el('rect', {x: L, width: pw, y: y(top), height: Math.max(2, y(bot) - y(top)), fill: s.color, 'fill-opacity': .09}, svg);
    });
    var g = el('g', {'class': 'grid'}, svg);
    [-30, -20, -10, 0, 10].forEach(function(t){
      el('line', {x1: L, x2: W - R, y1: y(t), y2: y(t)}, g);
      el('text', {x: L - 8, y: y(t) + 4, 'text-anchor': 'end'}, svg).textContent = num(t, 0) + '°';
    });
    var xl = W < 520 ? [[0, '24시간 전'], [24, '12시간 전'], [47, '지금']] : [[0, '24시간 전'], [12, '18시간 전'], [24, '12시간 전'], [36, '6시간 전'], [47, '지금']];
    xl.forEach(function(p){ el('text', {x: x(p[0]), y: H - 8, 'text-anchor': p[0] === 0 ? 'start' : p[0] === 47 ? 'end' : 'middle'}, svg).textContent = p[1]; });
    el('line', {x1: L, x2: W - R, y1: T + ph, y2: T + ph, 'class': 'axis'}, svg);
    KEYS.forEach(function(k){
      var s = S[k];
      el('path', {d: 'M' + s.h.map(function(v, i){ return x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join('L'), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round'}, svg);
      el('circle', {cx: x(N - 1), cy: y(s.h[N - 1]), r: 3.5, fill: s.color}, svg);
    });
  }

  var n = 0;
  function tick(first){
    if (!first){
      KEYS.forEach(function(k){
        var s = S[k];
        /* door event: count + warm spike that decays */
        if (Math.random() < s.pDoor){ s.door++; s.spike = s.band * (1.2 + Math.random()); }
        s.spike *= .82;
        /* compressor with hysteresis */
        if (s.v > s.set + s.band * .5) s.comp = true; else if (s.v < s.set - s.band * .5) s.comp = false;
        s.v += (s.comp ? -.09 : .06) * s.band + rnd(.03 * s.band) + s.spike * .18;
        s.v = clamp(s.v, s.lo + .5, s.hi - .5);
        s.ticks++; if (s.comp) s.on++;
        s.util = clamp(s.util * .995 + (s.comp ? 100 : 0) * .005, 20, 95);
        if (s.hum !== null) s.hum = clamp(s.hum + rnd(.4), 90, 95);
        s.kw = clamp(s.kw + rnd(.05), s.kw * .97, s.kw * 1.03);
        s.h[N - 1] = s.v;
      });
      if (++n % 20 === 0) KEYS.forEach(function(k){ S[k].h.shift(); S[k].h.push(S[k].v); });
      KEYS.forEach(function(k){ P.kwh += (S[k].comp ? S[k].kw : .3) * TICK / 3600000; });
    }
    KEYS.forEach(drawStore); drawPower(); drawChart();
    var live = $('#live'); if (live) live.textContent = '업데이트 ' + new Date().toLocaleTimeString('ko-KR', {hour12: false});
  }
  tick(true); drawDef();
  setInterval(function(){ if (!document.hidden) tick(false); }, TICK);
  setInterval(function(){ P.def = P.def > 0 ? P.def - 1 : 6 * 3600; drawDef(); }, 1000);
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(drawChart, 150); });
})();
