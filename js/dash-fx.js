/* 스마트팜 '현재 환경' 관제실 효과 — 기존 dash-smartfarm.js 위에 덧붙이는 보조 스크립트 */
(function(){
  var sec = document.querySelector('.env-fx'); if (!sec) return;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 카드별 표시 범위(lo~hi)와 적정 범위(a~b) */
  var R = {temp:[10,35,18,27], hum:[30,100,55,80], co2:[300,1200,450,900], soil:[10,50,25,40], ec:[0,3,.8,2], sun:[0,1000,0,600]};
  var NS = 'http://www.w3.org/2000/svg';

  /* LIVE 표시 */
  var hp = sec.querySelector('.dh p');
  if (hp && !hp.querySelector('.fx-live')){ var lv = document.createElement('span'); lv.className = 'fx-live'; lv.textContent = 'LIVE'; hp.insertBefore(lv, hp.firstChild); }

  [].forEach.call(sec.querySelectorAll('.metric[data-k]'), function(card, idx){
    var k = card.getAttribute('data-k'), r = R[k]; if (!r) return;
    var svg = card.querySelector('.spark');

    /* 적정 범위 바: 상태 줄 바로 아래 */
    var rng = document.createElement('div'); rng.className = 'fx-rng'; rng.setAttribute('aria-hidden', 'true');
    rng.innerHTML = '<span class="tr"></span><span class="ok"></span><span class="pt"></span>';
    var okEl = rng.querySelector('.ok'), pt = rng.querySelector('.pt');
    okEl.style.left = ((r[2] - r[0]) / (r[1] - r[0]) * 100) + '%';
    okEl.style.width = ((r[3] - r[2]) / (r[1] - r[0]) * 100) + '%';
    var foot = card.querySelector('.m-foot'); if (foot) foot.after(rng);

    /* 스파크라인: 그라데이션 채움 + 끝점 */
    if (svg){
      var wrap = document.createElement('div'); wrap.className = 'fx-spark';
      svg.parentNode.insertBefore(wrap, svg); wrap.appendChild(svg);
      var defs = document.createElementNS(NS, 'defs'), g = document.createElementNS(NS, 'linearGradient'), id = 'fxg-' + k;
      g.setAttribute('id', id); g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
      g.innerHTML = '<stop offset="0" stop-color="#3FB68B" stop-opacity=".28"/><stop offset="1" stop-color="#3FB68B" stop-opacity="0"/>';
      defs.appendChild(g); svg.insertBefore(defs, svg.firstChild);
      svg.querySelector('path.a').style.fill = 'url(#' + id + ')';
      var dot = document.createElement('span'); dot.className = 'fx-dot'; wrap.appendChild(dot);
      var line = svg.querySelector('path.l');
      var placeDot = function(){
        var d = line.getAttribute('d'); if (!d) return;
        var m = d.match(/([\d.]+) ([\d.]+)$/); if (!m) return;
        dot.style.left = 'calc((100% - 6px) * ' + (parseFloat(m[1]) / 200) + ')';
        dot.style.top = (parseFloat(m[2]) / 44 * 100) + '%';
      };
      new MutationObserver(placeDot).observe(line, {attributes: true, attributeFilter: ['d']});
      placeDot();
    }

    /* 값이 바뀔 때: 수신 LED 깜빡임 + 숫자 빛남 + 범위 점 이동 */
    var vEl = card.querySelector('[data-v]'), stEl = card.querySelector('[data-st]'), busy = false;
    var placePt = function(){
      var v = parseFloat(vEl.textContent); if (isNaN(v)) return;
      pt.style.left = Math.max(0, Math.min(100, (v - r[0]) / (r[1] - r[0]) * 100)) + '%';
      var s = stEl ? (stEl.className.match(/s(\d)/) || [0, '0'])[1] : '0';
      pt.className = 'pt s' + s;
    };
    new MutationObserver(function(){
      placePt();
      if (busy) return; busy = true;
      card.classList.add('rx', 'flash');
      setTimeout(function(){ card.classList.remove('rx'); }, 180);
      setTimeout(function(){ card.classList.remove('flash'); busy = false; }, 700);
    }).observe(vEl, {childList: true, characterData: true, subtree: true});
    placePt();
  });

  /* 화면에 처음 들어올 때 한 번: 카드 순서대로 등장 + 그래프 선 그려짐 */
  if (RM || !('IntersectionObserver' in window)) return;
  sec.classList.add('fx-pre');
  var io = new IntersectionObserver(function(es){
    if (!es[0].isIntersecting) return; io.disconnect();
    [].forEach.call(sec.querySelectorAll('.spark path.l'), function(p){ try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch(e){} });
    sec.classList.remove('fx-pre'); sec.classList.add('fx-in');
    setTimeout(function(){ sec.classList.remove('fx-in'); }, 2400);
  }, {threshold: .2});
  io.observe(sec);
})();
