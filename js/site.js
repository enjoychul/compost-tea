/* naturewide — shared header menu + scroll reveal (all pages) */
(function(){
  /* mobile hamburger */
  var btn=document.querySelector('.nav-toggle'), nav=document.getElementById('site-nav');
  function setMenu(o){btn.setAttribute('aria-expanded',String(o));btn.querySelector('.sr').textContent=o?'메뉴 닫기':'메뉴 열기';nav.classList.toggle('open',o);}
  btn.addEventListener('click',function(){setMenu(btn.getAttribute('aria-expanded')!=='true');});
  nav.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false);});
  window.addEventListener('resize',function(){if(innerWidth>960)setMenu(false);});

  /* desktop dropdown: hover (with close delay) or keyboard focus; Esc closes */
  var desk=matchMedia('(min-width: 961px)');
  document.querySelectorAll('.dd').forEach(function(dd){
    var top=dd.querySelector('.dd-top'), t=null, hush=false, ptr='mouse', wasClosed=false;
    function set(o){clearTimeout(t);if(!desk.matches)return;dd.classList.toggle('open',o);top.setAttribute('aria-expanded',String(o));}
    dd.addEventListener('pointerdown',function(e){ptr=e.pointerType;if(e.target.closest('.dd-top'))wasClosed=!dd.classList.contains('open');});
    dd.addEventListener('mouseenter',function(){hush=false;if(desk.matches&&ptr!=='touch')set(true);});
    dd.addEventListener('mouseleave',function(){if(ptr!=='touch')t=setTimeout(function(){set(false);},220);});
    dd.addEventListener('focusin',function(){if(desk.matches&&!hush)set(true);});
    dd.addEventListener('focusout',function(e){if(!dd.contains(e.relatedTarget)){hush=false;set(false);}});
    dd.addEventListener('click',function(e){
      if(e.target.closest('.dd-panel a')){hush=true;set(false);return;}
      /* touch on a wide screen: first tap opens the panel instead of navigating */
      if(e.target.closest('.dd-top')&&desk.matches&&ptr==='touch'&&wasClosed){e.preventDefault();wasClosed=false;set(true);}
    });
    document.addEventListener('click',function(e){if(!dd.contains(e.target)&&dd.classList.contains('open'))set(false);});
    /* phone layout: sub-menu is always shown inside the hamburger menu */
    function sync(){if(!desk.matches){clearTimeout(t);dd.classList.remove('open');top.setAttribute('aria-expanded','true');}else top.setAttribute('aria-expanded',String(dd.classList.contains('open')));}
    sync(); if(desk.addEventListener)desk.addEventListener('change',sync);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&dd.classList.contains('open')){hush=true;set(false);top.focus();}});
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&btn.getAttribute('aria-expanded')==='true'){setMenu(false);btn.focus();}});

  /* scroll reveal */
  var rv=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){rv.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -4% 0px'});
  rv.forEach(function(e){io.observe(e);});
})();
