/* 냉동시설 '저장고 현황' 관제실 효과 — 기존 dash-coldchain.js 위에 덧붙이는 보조 스크립트 (스마트팜 dash-fx.js와 같은 동작) */
(function(){
  var sec = document.querySelector('.store-fx'); if (!sec) return;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  /* LIVE 표시 */
  var hp = sec.querySelector('.dh p');
  if (hp && !hp.querySelector('.fx-live')){ var lv = document.createElement('span'); lv.className = 'fx-live'; lv.textContent = 'LIVE'; hp.insertBefore(lv, hp.firstChild); }

  [].forEach.call(sec.querySelectorAll('.store[data-s]'), function(card){
    var k = card.getAttribute('data-s'), svg = card.querySelector('.spark');

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

    /* 값이 바뀔 때: 수신 LED 깜빡임 + 숫자 빛남 */
    var vEl = card.querySelector('[data-v]'), busy = false; if (!vEl) return;
    new MutationObserver(function(){
      if (busy) return; busy = true;
      card.classList.add('rx', 'flash');
      setTimeout(function(){ card.classList.remove('rx'); }, 180);
      setTimeout(function(){ card.classList.remove('flash'); busy = false; }, 700);
    }).observe(vEl, {childList: true, characterData: true, subtree: true});
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
