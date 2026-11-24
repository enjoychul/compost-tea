/* AI 스마트팜 데모 — 예시 데이터(랜덤 워크). 실제 장비 연결 전 화면입니다. */
(function(){
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TICK = 3000, N = 48; /* 24h, 30-min points */
  function $(s, r){ return (r || document).querySelector(s); }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function walk(v, lo, hi, step, mid){ return clamp(v + (Math.random() - .5) * 2 * step + (mid - v) * .05, lo, hi); }
  function hourNow(){ var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function sunAt(h){ return (h < 6 || h > 19) ? 0 : Math.sin((h - 6) / 13 * Math.PI) * 760; }
  var LBL = ['정상', '주의', '경고'];

  /* ---- metrics ---- */
  var M = {
    temp: {v: 24.6, lo: 18, hi: 28.8, step: .22, dec: 1, mid: function(h){ return 22 + 3.5 * Math.sin((h - 9) / 24 * 2 * Math.PI); },
           st: function(v){ return (v > 30 || v < 15) ? 2 : (v > 27 || v < 18) ? 1 : 0; }},
    hum:  {v: 72, lo: 55, hi: 86, step: 1.1, dec: 0, mid: function(h){ return 72 - 10 * Math.sin((h - 9) / 24 * 2 * Math.PI); },
           st: function(v){ return v > 90 ? 2 : (v > 80 || v < 55) ? 1 : 0; }},
    co2:  {v: 620, lo: 400, hi: 900, step: 16, dec: 0, mid: function(h){ return 640 - 110 * Math.sin((h - 7) / 24 * 2 * Math.PI); },
           st: function(v){ return v < 450 ? 1 : 0; }},
    soil: {v: 31, lo: 20, hi: 45, step: .35, dec: 0, mid: function(h){ return 31 - 3 * Math.sin((h - 8) / 24 * 2 * Math.PI); },
           st: function(v){ return v < 22 ? 2 : (v < 25 || v > 40) ? 1 : 0; }},
    ec:   {v: 1.42, lo: .8, hi: 2.0, step: .02, dec: 2, mid: function(h){ return 1.4 + .12 * Math.sin((h - 10) / 24 * 2 * Math.PI); },
           st: function(v){ return (v < .8 || v > 2.0 || M.ec.p < 6.0 || M.ec.p > 7.2) ? 1 : 0; }, p: 6.6},
    sun:  {v: 0, lo: 0, hi: 800, step: 20, dec: 0, mid: function(h){ return sunAt(h); },
           st: function(){ return 0; }}
  };
  /* seed 24h history from a daily curve + noise */
  var h0 = hourNow();
  Object.keys(M).forEach(function(k){
    var m = M[k], hist = [], v = m.mid((h0 + 0.5) % 24);
    for (var i = 0; i < N; i++){
      var h = (h0 - (N - 1 - i) / 2 + 24) % 24;
      v = clamp(v + (m.mid(h) - v) * .3 + (Math.random() - .5) * m.step * 1.6, m.lo, m.hi);
      hist.push(v);
    }
    m.h = hist; m.v = hist[N - 1];
  });

  function fmt(v, d){ return v.toFixed(d); }
  function tween(el, from, to, d){
    if (RM || Math.abs(to - from) < Math.pow(10, -d)){ el.textContent = fmt(to, d); return; }
    var t0 = null;
    function step(t){ if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e, d); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function setSt(el, s){ if (!el) return; el.className = 'st s' + s; el.textContent = LBL[s]; }
  function spark(svg, arr, lo, hi){
    var w = 200, hgt = 44, pad = 4, pts = arr.map(function(v, i){
      var x = i / (arr.length - 1) * w, y = hgt - pad - (v - lo) / ((hi - lo) || 1) * (hgt - pad * 2);
      return x.toFixed(1) + ' ' + y.toFixed(1); });
    svg.querySelector('.l').setAttribute('d', 'M' + pts.join('L'));
    svg.querySelector('.a').setAttribute('d', 'M0 ' + hgt + 'L' + pts.join('L') + 'L' + w + ' ' + hgt + 'Z');
  }
  function drawMetric(k){
    var m = M[k], card = $('[data-k="' + k + '"]'); if (!card) return;
    var el = $('[data-v]', card), old = parseFloat(el.textContent) || m.v;
    tween(el, old, m.v, m.dec);
    if (k === 'ec'){ $('[data-v2]', card).textContent = fmt(m.p, 1); }
    setSt($('[data-st]', card), m.st(m.v));
    var lo = Math.min.apply(null, m.h), hi = Math.max.apply(null, m.h), c = (lo + hi) / 2,
        half = Math.max(hi - lo, {temp: 5, hum: 16, co2: 260, soil: 8, ec: .4, sun: 500}[k]) / 2 * 1.15;
    spark($('.spark', card), m.h, c - half, c + half);
  }

  /* ---- zones ---- */
  var Z = {A: {v: 33, mid: 33}, B: {v: 22.5, mid: 23}, C: {v: 36, mid: 36}};
  function drawZones(){
    Object.keys(Z).forEach(function(k){
      var z = Z[k], box = $('[data-z="' + k + '"]'), s = z.v < 22 ? 2 : (z.v < 25 || z.v > 42) ? 1 : 0;
      $('[data-v]', box).textContent = Math.round(z.v);
      setSt($('[data-st]', box), s);
      $('svg > circle', box).setAttribute('fill', ['#1F3A2B', '#C98A1B', '#C2412D'][s]);
    });
  }

  /* ---- relays (rule-based demo) ---- */
  var R = {valve: {on: false, s: 38 * 60}, fan: {on: false, s: 130 * 60}, shade: {on: false, s: 85 * 60}, curtain: {on: false, s: 460 * 60}};
  function dur(sec){ var m = Math.floor(sec / 60), h = Math.floor(m / 60); return h ? h + '시간 ' + (m % 60) + '분' : m + '분'; }
  function rules(){
    var h = hourNow();
    R.fan.on = M.temp.v > 27 || M.hum.v > 85;
    R.valve.on = Z.B.v < 23;
    R.shade.on = M.sun.v > 600;
    R.curtain.on = M.temp.v < 18 || h < 6 || h >= 19;
  }
  function drawRelays(add){
    Object.keys(R).forEach(function(k){
      var r = R[k], card = $('[data-r="' + k + '"]');
      if (add && r.on) r.s += add;
      card.classList.toggle('on', r.on);
      $('[data-s]', card).textContent = r.on ? 'ON' : 'OFF';
      $('[data-t]', card).textContent = dur(r.s);
    });
  }

  /* ---- compost-tea tank ---- */
  var T = {total: 24 * 3600, left: 3 * 3600 - 1, wt: 21.4, lv: 92};
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function drawTank(){
    var box = $('#tank'), left = Math.max(0, T.left), done = left === 0;
    $('[data-remain]', box).textContent = pad2(Math.floor(left / 3600)) + ':' + pad2(Math.floor(left % 3600 / 60)) + ':' + pad2(left % 60);
    var el = (T.total - left) / T.total;
    $('[data-bar]', box).style.width = (el * 100).toFixed(1) + '%';
    $('[data-prog]', box).textContent = '24시간 중 ' + Math.floor((T.total - left) / 3600) + '시간 경과';
    $('[data-led]', box).textContent = done ? '완료되었습니다' : '가동중입니다';
    $('.led', box).classList.toggle('done', done);
    $('[data-blower]', box).textContent = done ? 'OFF' : 'ON';
    $('[data-wt]', box).textContent = T.wt.toFixed(1);
    $('[data-lv]', box).textContent = Math.round(T.lv);
    setSt($('[data-tst]', box), T.wt > 28 || T.wt < 12 ? 1 : 0);
  }

  /* ---- 24h chart (temp + humidity), drawn at container pixel width ---- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent){ var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.appendChild(e); return e; }
  function drawChart(){
    var svg = $('#trend'); if (!svg) return;
    var W = Math.max(280, svg.parentNode.clientWidth - 48), H = W < 520 ? 220 : 280, L = 40, Rr = 44, Tp = 12, B = 30;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var pw = W - L - Rr, ph = H - Tp - B;
    function x(i){ return L + i / (N - 1) * pw; }
    function yT(v){ return Tp + ph - (v - 10) / 25 * ph; }  /* 10~35°C */
    function yH(v){ return Tp + ph - (v - 40) / 60 * ph; }  /* 40~100% */
    var g = el('g', {'class': 'grid'}, svg);
    [10, 15, 20, 25, 30, 35].forEach(function(t){
      var y = yT(t); el('line', {x1: L, x2: W - Rr, y1: y, y2: y}, g);
      el('text', {x: L - 8, y: y + 4, 'text-anchor': 'end'}, svg).textContent = t + '°';
    });
    [40, 60, 80, 100].forEach(function(t){ el('text', {x: W - Rr + 8, y: yH(t) + 4}, svg).textContent = t + '%'; });
    var xl = W < 520 ? [[0, '24시간 전'], [24, '12시간 전'], [47, '지금']] : [[0, '24시간 전'], [12, '18시간 전'], [24, '12시간 전'], [36, '6시간 전'], [47, '지금']];
    xl.forEach(function(p){
      el('line', {x1: x(p[0]), x2: x(p[0]), y1: Tp + ph, y2: Tp + ph + 5, 'class': 'axis'}, svg);
      el('text', {x: x(p[0]), y: H - 8, 'text-anchor': p[0] === 0 ? 'start' : p[0] === 47 ? 'end' : 'middle'}, svg).textContent = p[1];
    });
    el('line', {x1: L, x2: W - Rr, y1: Tp + ph, y2: Tp + ph, 'class': 'axis'}, svg);
    function line(arr, fy, color){
      el('path', {d: 'M' + arr.map(function(v, i){ return x(i).toFixed(1) + ' ' + fy(v).toFixed(1); }).join('L'), fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, svg);
      el('circle', {cx: x(N - 1), cy: fy(arr[N - 1]), r: 4, fill: color}, svg);
    }
    line(M.hum.h, yH, '#4F7FA3');
    line(M.temp.h, yT, '#1F3A2B');
  }


  /* ---- board LCD (GREENHOUSE #1): one state object, values swapped in ---- */
  function lcdInit(){
    var box = $('#lcd-box'); if (!box) return;
    var C = '#4fd6f0', G = '#3ddc97', Y = '#f2c23a', O = '#f39a3a', WH = '#f2f5ff', GR = '#7c809a', TEA = '#c9de7a';
    var LCD = {
      normal: {name: '정상', desc: '기온·습도·토양수분 모두 적정 범위입니다. 퇴비차 탱크는 완성까지 3시간 남았습니다.',
        big: '23.1', bigC: WH, pill: ['NORMAL', C], out: 'SOIL 29%', main: null,
        t1: ['on', 'ON'], s1: ['Valve  ·  38 min today', null],
        amp: '1.2A', s2: 'Run 32%  ·  1h', bar: 32,
        ail: ['NORMAL', G], ais: 'Disease risk low', ring: [94, G], c3: null,
        s4: 'brew', chip: G, bell: GR,
        aria: '기온 23.1°C, 토양수분 29%, 관수 켜짐, 환기팬 1.2A, AI Health 94, 퇴비차 탱크 가동중'},
      humid: {name: '고온다습', desc: '습도 85% 넘게 6시간째입니다. 환기팬을 최대로 돌리고 곰팡이병 위험을 미리 알립니다.',
        big: '28.6', bigC: O, pill: ['HUMID 6H', Y], out: 'RH 88%', main: Y,
        t1: ['', 'OFF'], s1: ['Valve  ·  38 min today', null],
        amp: '2.4A', s2: 'Run 100%  ·  1h', bar: 100,
        ail: ['CHECK SOON', O], ais: 'Mold risk high', ring: [58, O], c3: O,
        s4: 'brew', chip: O, bell: Y,
        aria: '기온 28.6°C 고온다습, 습도 88% 6시간 지속, 환기팬 최대 가동, AI Health 58 곰팡이병 위험'},
      dry: {name: '건조', desc: '토양수분이 22%로 내려가 자동 관수를 시작했습니다. 퇴비차는 내일 오전 살포를 권합니다.',
        big: '24.0', bigC: WH, pill: ['DRY SOIL', Y], out: 'SOIL 22%', main: Y,
        t1: ['y', 'ON'], s1: ['Auto watering 4 min', Y],
        amp: '1.2A', s2: 'Run 32%  ·  1h', bar: 32,
        ail: ['WATCH', Y], ais: 'Soil 22%', ring: [81, Y], c3: null,
        s4: 'Ready  ·  Spray tomorrow AM', chip: Y, bell: GR,
        aria: '기온 24.0°C, 토양수분 22% 건조, 자동 관수 중, AI Health 81 주의, 퇴비차 준비 완료'}
    };
    var q = function(k){ return box.querySelector('[data-l="' + k + '"]'); };
    var lcd = q('lcd'), scr = q('s'), cur = 'normal', base = 23.1, temp = base;
    function fit(){ var w = lcd.clientWidth; if (w) scr.style.transform = 'scale(' + (w / 640) + ')'; }
    fit(); if ('ResizeObserver' in window) new ResizeObserver(fit).observe(lcd); else window.addEventListener('resize', fit);
    function sp(t){ return t.replace(/  /g, '  '); }
    function border(e, c){ e.style.borderColor = c || ''; e.style.borderWidth = c ? '1.5px' : ''; }
    function tg(e, cls, txt){ e.className = 'tg' + (cls ? ' ' + cls : ''); e.firstChild.textContent = txt; }
    /* tea tank: same remaining time as the tank card below (hh:mm) */
    function teaLeft(){ var l = Math.max(0, T.left); return pad2(Math.floor(l / 3600)) + ':' + pad2(Math.floor(l % 3600 / 60)); }
    function tea(){ var d = LCD[cur]; q('s4').style.top = d.s4 === 'brew' ? '54px' : '62px'; q('s4').textContent = sp(d.s4 === 'brew' ? (T.left > 0 ? 'Brewing  ·  ' + teaLeft() + ' left' : 'Done  ·  Ready') : d.s4); }
    function apply(st){
      var d = LCD[st], big = q('big');
      big.textContent = st === 'normal' ? temp.toFixed(1) : d.big; big.style.color = d.bigC;
      big.style.textShadow = d.bigC === O ? '0 0 18px rgba(243,154,58,.5),0 0 2px rgba(255,220,190,.9)' : '';
      var pl = q('pill'); pl.textContent = d.pill[0]; pl.style.color = d.pill[1]; pl.style.borderColor = d.pill[1];
      pl.style.background = d.pill[1] === C ? 'rgba(79,214,240,.12)' : 'rgba(242,194,58,.12)';
      q('out').textContent = d.out; border(q('main'), d.main);
      tg(q('t1'), d.t1[0], d.t1[1]); q('s1').textContent = sp(d.s1[0]); q('s1').style.color = d.s1[1] || '';
      q('amp').textContent = d.amp; q('s2').textContent = sp(d.s2); q('cbar').style.width = d.bar + '%';
      q('ail').textContent = d.ail[0]; q('ail').style.color = d.ail[1]; q('ais').textContent = d.ais;
      var ring = q('ring'); ring.setAttribute('stroke', d.ring[1]); ring.setAttribute('stroke-dasharray', (175.9 * d.ring[0] / 100).toFixed(1) + ' 175.9');
      ring.style.filter = 'drop-shadow(0 0 3px ' + d.ring[1] + ')'; q('ain').textContent = d.ring[0]; border(q('c3'), d.c3);
      tea();
      var chip = q('chip'), cr = chip.querySelector('rect'); chip.querySelector('g').setAttribute('stroke', d.chip); cr.setAttribute('fill', d.chip); cr.style.filter = 'drop-shadow(0 0 4px ' + d.chip + ')';
      q('bell').setAttribute('fill', d.bell);
      lcd.setAttribute('aria-label', 'GREENHOUSE #1 LCD 화면, ' + d.name + ': ' + d.aria);
      q('name').textContent = d.name; q('desc').textContent = d.desc;
    }
    function show(st){
      if (st === cur) return;
      cur = st; temp = base;
      box.querySelectorAll('.sbtn').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.st === st)); });
      if (RM){ apply(st); return; }
      scr.classList.add('fade'); setTimeout(function(){ apply(st); scr.classList.remove('fade'); }, 150);
    }
    box.querySelectorAll('.sbtn').forEach(function(b){ b.addEventListener('click', function(){ show(b.dataset.st); }); });
    function clock(){ var d = new Date(); q('time').textContent = pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
    clock(); apply('normal');
    setInterval(function(){ clock(); tea(); }, 1000);
    if (!RM) setInterval(function(){
      if (cur !== 'normal' || document.hidden) return;
      temp = clamp(temp + (Math.random() - .5) * .24 + (base - temp) * .3, base - .2, base + .2); q('big').textContent = temp.toFixed(1);
    }, TICK);
  }

  /* ---- loop ---- */
  var n = 0;
  function tick(first){
    var h = hourNow();
    if (!first){
      Object.keys(M).forEach(function(k){
        var m = M[k]; m.v = walk(m.v, m.lo, m.hi, m.step, m.mid(h));
        if (k === 'ec') m.p = walk(m.p, 6.0, 7.2, .03, 6.6);
        if (k === 'sun') m.v = clamp(sunAt(h) + (Math.random() - .5) * 60, 0, 800);
        m.h[N - 1] = m.v;
      });
      if (++n % 20 === 0) Object.keys(M).forEach(function(k){ M[k].h.shift(); M[k].h.push(M[k].v); });
      Object.keys(Z).forEach(function(k){ var z = Z[k]; z.v = walk(z.v, 18, 44, .3, R.valve.on && k === 'B' ? 27 : z.mid); });
      T.wt = walk(T.wt, 18, 24, .08, 21.5); T.lv = walk(T.lv, 88, 95, .15, 92);
    }
    Object.keys(M).forEach(drawMetric);
    drawZones(); rules(); drawRelays(first ? 0 : TICK / 1000); drawTank(); drawChart();
    var live = $('#live'); if (live) live.textContent = '업데이트 ' + new Date().toLocaleTimeString('ko-KR', {hour12: false});
  }
  tick(true); lcdInit();
  setInterval(function(){ if (!document.hidden) tick(false); }, TICK);
  setInterval(function(){ if (T.left > 0){ T.left--; drawTank(); } }, 1000);
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(drawChart, 150); });
})();
