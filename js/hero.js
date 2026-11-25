(function(){
  var root=document.querySelector('.hx'); if(!root) return;
  var tabs=[].slice.call(root.querySelectorAll('[role="tab"]'));
  var panels=[].slice.call(root.querySelectorAll('.hx-panel'));
  var imgs=[].slice.call(root.querySelectorAll('.hx-main img'));
  var bar=root.querySelector('.hx-bar');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR=9000, cur=0, timer=null, paused=false;
  function moveBar(){
    var t=tabs[cur], w=Math.round(t.offsetWidth*0.7);
    bar.style.width=w+'px';
    bar.style.transform='translateX('+(t.offsetLeft-tabs[0].offsetLeft+(t.offsetWidth-w)/2)+'px)';
  }
  function go(i,focus){
    cur=(i+tabs.length)%tabs.length;
    tabs.forEach(function(t,k){var on=k===cur;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;});
    panels.forEach(function(p,k){var on=k===cur;p.classList.toggle('is-on',on);p.setAttribute('aria-hidden',on?'false':'true');p.inert=!on;});
    imgs.forEach(function(m,k){m.classList.toggle('is-on',k===cur);});
    if(focus)tabs[cur].focus();
    moveBar();schedule();
  }
  function schedule(){clearTimeout(timer);if(reduce||paused)return;timer=setTimeout(function(){go(cur+1);},DUR);}
  tabs.forEach(function(t,k){
    t.addEventListener('click',function(){go(k);});
    t.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'){e.preventDefault();go(cur+1,true);}
      else if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1,true);}
    });
  });
  [].forEach.call(root.querySelectorAll('.hx-arrow'),function(b){b.addEventListener('click',function(){go(cur+(+b.dataset.dir));});});
  root.addEventListener('mouseenter',function(){paused=true;clearTimeout(timer);});
  root.addEventListener('mouseleave',function(){paused=false;schedule();});
  window.addEventListener('resize',moveBar);
  go(0);
})();
