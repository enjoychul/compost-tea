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

  /* 24h charts: 냉장(과일·채소) / 냉동(육류·어류), each with light target bands */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, at, par){ var e = document.createElementNS(NS, tag); for (var a in at) e.setAttribute(a, at[a]); if (par) par.appendChild(e); return e; }
  function chart(id, keys, Y0, Y1, ticks, bands){
    var svg = $(id); if (!svg) return;
    var W = Math.max(260, svg.parentNode.clientWidth - 48), H = W < 420 ? 220 : 250, L = 40, R = 12, T = 10, B = 30;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var pw = W - L - R, ph = H - T - B;
    function x(i){ return L + i / (N - 1) * pw; }
    function y(v){ return T + ph - (clamp(v, Y0, Y1) - Y0) / (Y1 - Y0) * ph; }
    keys.forEach(function(k, i){ var bd = bands[i]; el('rect', {x: L, width: pw, y: y(bd[1]), height: Math.max(2, y(bd[0]) - y(bd[1])), fill: S[k].color, 'fill-opacity': .1}, svg); });
    var g = el('g', {'class': 'grid'}, svg);
    ticks.forEach(function(t){ el('line', {x1: L, x2: W - R, y1: y(t), y2: y(t)}, g); el('text', {x: L - 8, y: y(t) + 4, 'text-anchor': 'end'}, svg).textContent = num(t, 0) + '°'; });
    var xl = W < 520 ? [[0, '24시간 전'], [24, '12시간 전'], [47, '지금']] : [[0, '24시간 전'], [12, '18시간 전'], [24, '12시간 전'], [36, '6시간 전'], [47, '지금']];
    xl.forEach(function(p){ el('text', {x: x(p[0]), y: H - 8, 'text-anchor': p[0] === 0 ? 'start' : p[0] === 47 ? 'end' : 'middle'}, svg).textContent = p[1]; });
    el('line', {x1: L, x2: W - R, y1: T + ph, y2: T + ph, 'class': 'axis'}, svg);
    keys.forEach(function(k){
      var s = S[k];
      el('path', {d: 'M' + s.h.map(function(v, i){ return x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join('L'), fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round'}, svg);
      el('circle', {cx: x(N - 1), cy: y(s.h[N - 1]), r: 3.5, fill: s.color}, svg);
    });
  }
  function drawChart(){
    chart('#trend-cold', ['fruit', 'veg'], -4, 8, [-4, 0, 4, 8], [[0, 2], [0, 5]]);
    chart('#trend-frz', ['meat', 'fish'], -34, -14, [-34, -30, -26, -22, -18, -14], [[-25, -18], [-34, -25]]);
  }

  /* ---- board LCD (FREEZER #1): one state object, values swapped in ---- */
  var C = '#4fd6f0', G = '#3ddc97', Y = '#f2c23a', O = '#f39a3a', R = '#ff5470', PK = '#f59ab0', WH = '#f2f5ff', GR = '#7c809a';
  var LCD = {
    normal: {name: '정상', desc: '설정 범위 안에서 운전 중입니다. AI가 평소 운전 패턴을 기준으로 삼고 있습니다.',
      big: '-22.3', bigC: WH, pill: ['NORMAL', C], main: null, maxC: '#f2b23a', red: false,
      t1: ['', 'SHUT'], s1: ['Closed  ·  7 today', null], c1: null,
      amp: ['3.1A', C], s2: ['Run 46%  ·  1h', null], bar: [46, C], c2: null,
      ail: ['NORMAL', G], ais: 'Base 3/12 mo', ring: [96, G], ain: ['96', ''], c3: null,
      t4: ['', 'OFF'], s4: ['No alarm', null], c4: null, chip: G, bell: GR,
      aria: '내부 −22.3°C, 문 닫힘, 압축기 3.1A, AI Health 96, 경보 없음'},
    long: {name: '장기 운전', desc: '설정 온도에 닿지 못한 채 12분 넘게 운전 중입니다. AI가 응축기 점검을 미리 권합니다.',
      big: '-18.3', bigC: WH, pill: ['OVER 12M', Y], main: Y, maxC: R, red: true,
      t1: ['', 'SHUT'], s1: ['Closed  ·  7 today', null], c1: null,
      amp: ['3.1A', C], s2: ['Run 92%  ·  1h', null], bar: [92, C], c2: null,
      ail: ['CHECK SOON', O], ais: 'Condenser? 49%', ring: [62, O], ain: ['62', ''], c3: O,
      t4: ['', 'OFF'], s4: ['AI notice only', null], c4: null, chip: O, bell: GR,
      aria: '내부 −18.3°C, 12분 넘게 장기 운전, 압축기 가동률 92%, AI Health 62 점검 권장'},
    high: {name: '고온 경보', desc: '압축기가 25분째 멈췄고 온도가 오르고 있습니다. 경보를 보내고 담당자 확인(ACK)을 기다립니다.',
      big: '-15.2', bigC: PK, pill: ['HIGH TEMP', R], main: R, maxC: R, red: true,
      t1: ['', 'SHUT'], s1: ['Closed  ·  7 today', null], c1: null,
      amp: ['0.0A', R], s2: ['STOPPED 25 min', R], bar: [46, R], c2: R,
      ail: ['FAULT', R], ais: 'Comp. stop', ring: [31, R], ain: ['31', ''], c3: R,
      t4: ['y', 'ACK'], s4: ['High temp+comp', Y], c4: Y, chip: R, bell: Y,
      aria: '내부 −15.2°C 고온 경보, 압축기 25분째 정지, AI Health 31 고장, 경보 확인 대기'},
    sensor: {name: '센서 오류', desc: '온도 센서 신호가 끊겼습니다. 잘못된 값으로 판단하지 않도록 표시를 멈추고 알립니다.',
      big: null, bigC: PK, pill: ['SENSOR ERR', R], main: R, maxC: R, red: true,
      t1: ['', 'SHUT'], s1: ['Closed  ·  7 today', null], c1: null,
      amp: ['3.1A', C], s2: ['Run 46%  ·  1h', null], bar: [46, C], c2: null,
      ail: ['WATCH', Y], ais: 'Sensor fault', ring: [65, Y], ain: ['65', ''], c3: null,
      t4: ['r', 'ON'], s4: ['Sensor fail', R], c4: R, chip: Y, bell: R,
      aria: '온도 센서 오류로 온도 표시 중지, 경보 켜짐, AI Health 65 주의'},
    door: {name: '문 열림', desc: '문이 1분 넘게 열려 있습니다. 설치 초기에는 AI가 평소 패턴을 학습하는 중입니다.',
      big: '-22.3', bigC: WH, pill: ['NORMAL', C], main: null, maxC: '#f2b23a', red: false,
      t1: ['y', 'OPEN'], s1: ['Open 01:15', Y], c1: null,
      amp: ['3.1A', C], s2: ['Run 46%  ·  1h', null], bar: [46, C], c2: null,
      ail: ['LEARNING', C], ais: 'Prelim. check', ring: [23, C], ain: ['D-23', '23%'], c3: null,
      t4: ['', 'OFF'], s4: ['No alarm', null], c4: null, chip: C, bell: GR,
      aria: '내부 −22.3°C, 문 열림, AI 학습 중 D-23, 경보 없음'}
  };
  function lcdInit(){
    var box = $('#lcd-box'); if (!box) return;
    var q = function(k){ return box.querySelector('[data-l="' + k + '"]'); };
    var lcd = q('lcd'), scr = q('s'), cur = 'normal', base = -22.3, temp = base, doorSec = 75;
    function fit(){ var w = lcd.clientWidth; if (w) scr.style.transform = 'scale(' + (w / 640) + ')'; }
    fit(); if ('ResizeObserver' in window) new ResizeObserver(fit).observe(lcd); else window.addEventListener('resize', fit);
    function sp(t){ return t.replace(/  /g, '  '); }
    function border(e, c){ e.style.borderColor = c || ''; e.style.borderWidth = c ? '1.5px' : ''; }
    function tg(e, cls, txt){ e.className = 'tg' + (cls ? ' ' + cls : ''); e.firstChild.textContent = txt; }
    function mmss(n){ return pad2(Math.floor(n / 60)) + ':' + pad2(n % 60); }
    function apply(st){
      var d = LCD[st], big = q('big');
      big.style.display = d.big === null ? 'none' : ''; q('err').style.display = d.big === null ? 'block' : 'none';
      if (d.big !== null) big.textContent = st === 'normal' ? temp.toFixed(1) : d.big;
      big.style.color = d.bigC; big.style.textShadow = d.bigC === PK ? '0 0 18px rgba(245,120,150,.55),0 0 2px rgba(255,200,210,.9)' : '';
      var pl = q('pill'); pl.textContent = d.pill[0]; pl.style.color = d.pill[1]; pl.style.borderColor = d.pill[1];
      pl.style.background = d.pill[1] === C ? 'rgba(79,214,240,.12)' : d.pill[1] === Y ? 'rgba(242,194,58,.12)' : 'rgba(255,84,112,.12)';
      border(q('main'), d.main);
      q('max').style.color = d.maxC;
      q('tarea').setAttribute('fill', d.red ? 'rgba(255,84,112,.2)' : 'rgba(79,214,240,.22)');
      q('tdot').setAttribute('fill', d.red ? R : '#6be6ff');
      tg(q('t1'), d.t1[0], d.t1[1]); q('s1').textContent = sp(st === 'door' ? 'Open ' + mmss(doorSec) : d.s1[0]); q('s1').style.color = d.s1[1] || ''; border(q('c1'), d.c1);
      q('amp').textContent = d.amp[0]; q('amp').style.color = d.amp[1];
      q('s2').textContent = sp(d.s2[0]); q('s2').style.color = d.s2[1] || '';
      q('cbar').style.width = d.bar[0] + '%'; q('cbar').style.background = d.bar[1]; border(q('c2'), d.c2);
      q('ail').textContent = d.ail[0]; q('ail').style.color = d.ail[1]; q('ais').textContent = d.ais;
      var ring = q('ring'); ring.setAttribute('stroke', d.ring[1]); ring.setAttribute('stroke-dasharray', (175.9 * d.ring[0] / 100).toFixed(1) + ' 175.9');
      ring.style.filter = 'drop-shadow(0 0 3px ' + d.ring[1] + ')';
      q('ain').textContent = d.ain[0]; q('ain').setAttribute('font-size', d.ain[1] ? 15 : 24); q('ain').setAttribute('y', d.ain[1] ? 34 : 41);
      q('ain2').textContent = d.ain[1]; border(q('c3'), d.c3);
      tg(q('t4'), d.t4[0], d.t4[1]); q('s4').textContent = d.s4[0]; q('s4').style.color = d.s4[1] || ''; border(q('c4'), d.c4);
      var chip = q('chip'), cr = chip.querySelector('rect'); chip.querySelector('g').setAttribute('stroke', d.chip); cr.setAttribute('fill', d.chip); cr.style.filter = 'drop-shadow(0 0 4px ' + d.chip + ')';
      q('bell').setAttribute('fill', d.bell);
      lcd.setAttribute('aria-label', 'FREEZER #1 LCD 화면, ' + d.name + ': ' + d.aria);
      q('name').textContent = d.name; q('desc').textContent = d.desc;
    }
    function show(st){
      if (st === cur) return;
      cur = st; doorSec = 75; temp = base;
      box.querySelectorAll('.sbtn').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.st === st)); });
      if (RM){ apply(st); return; }
      scr.classList.add('fade'); setTimeout(function(){ apply(st); scr.classList.remove('fade'); }, 150);
    }
    box.querySelectorAll('.sbtn').forEach(function(b){ b.addEventListener('click', function(){ show(b.dataset.st); }); });
    function clock(){ var d = new Date(); q('time').textContent = pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
    clock(); apply('normal');
    setInterval(function(){ clock(); if (cur === 'door'){ doorSec++; q('s1').textContent = 'Open ' + mmss(doorSec); } }, 1000);
    if (!RM) setInterval(function(){
      if (cur !== 'normal' || document.hidden) return;
      temp = clamp(temp + rnd(.12) + (base - temp) * .3, base - .2, base + .2); q('big').textContent = temp.toFixed(1);
    }, TICK);
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
  tick(true); drawDef(); lcdInit();
  setInterval(function(){ if (!document.hidden) tick(false); }, TICK);
  setInterval(function(){ P.def = P.def > 0 ? P.def - 1 : 6 * 3600; drawDef(); }, 1000);
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(drawChart, 150); });
})();
