/* JC ADS: app instalable (aviso "App JC ADS" abajo). */
(function(){
 if("serviceWorker" in navigator) window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
 var st=window.matchMedia&&matchMedia("(display-mode: standalone)").matches||navigator.standalone;
 if(st) return;
 var K="jcads_pwa_no"; function no(){try{return +localStorage.getItem(K)||0}catch(e){return 0}}
 if(Date.now()-no()<7*864e5) return;
 var T={es:["App JC ADS","Radio y herramientas en tu celular","Instalar","Ahora no","Tocá Compartir y después “Agregar a inicio”"],
  en:["JC ADS App","Radio and tools on your phone","Install","Not now","Tap Share, then “Add to Home Screen”"],
  pt:["App JC ADS","Rádio e ferramentas no seu celular","Instalar","Agora não","Toque em Compartilhar e depois “Adicionar à Tela de Início”"],
  de:["JC ADS App","Radio und Tools auf deinem Handy","Installieren","Nicht jetzt","Tippe auf Teilen und dann „Zum Home-Bildschirm“"]};
 function lang(){var m=/[?&]lang=(es|en|pt|de)\b/.exec(location.search);if(m)return m[1];try{var s=localStorage.getItem("jcads_lang");if(T[s])return s}catch(e){}var h=(document.documentElement.lang||"es").slice(0,2);return T[h]?h:"es";}
 var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream, mob=/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent), ev=null;
 function show(){
  if(document.getElementById("jcpwa")||!mob) return;
  var t=T[lang()], d=document.createElement("div"); d.id="jcpwa"; d.setAttribute("translate","no");
  d.innerHTML='<style>#jcpwa{position:fixed;left:10px;right:10px;bottom:10px;z-index:99999;max-width:460px;margin:0 auto;background:#0a1c44;border:2px solid #22d3ee;border-radius:18px;padding:12px;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.5);font-family:inherit;color:#fff;animation:jcpu .4s ease}@keyframes jcpu{from{transform:translateY(120%)}to{transform:none}}#jcpwa img{width:52px;height:52px;border-radius:12px;flex:0 0 52px}#jcpwa b{display:block;font-size:1.05rem}#jcpwa small{display:block;color:#a5b4fc;font-size:.82rem;margin:2px 0 8px}#jcpwa .r{display:flex;gap:14px;align-items:center}#jcpwa button{border:0;font:inherit;cursor:pointer}#jcpwa .i{background:#22d3ee;color:#04122b;font-weight:800;border-radius:999px;padding:7px 22px}#jcpwa .n{background:none;color:#94a3b8}</style>'+
   '<img src="/icon-192.png" alt=""><div><b>'+t[0]+'</b><small>'+(ios?t[4]:t[1])+'</small><div class="r">'+(ios?'':'<button class="i" type="button">'+t[2]+'</button>')+'<button class="n" type="button">'+t[3]+'</button></div></div>';
  document.body.appendChild(d);
  var bi=d.querySelector(".i"); if(bi) bi.onclick=function(){if(!ev)return; ev.prompt(); ev.userChoice.then(function(){ev=null;d.remove();});};
  d.querySelector(".n").onclick=function(){try{localStorage.setItem(K,Date.now())}catch(e){} d.remove();};
 }
 window.addEventListener("beforeinstallprompt",function(e){e.preventDefault(); ev=e; setTimeout(show,2500);});
 window.addEventListener("appinstalled",function(){var d=document.getElementById("jcpwa"); if(d) d.remove();});
 if(ios) window.addEventListener("load",function(){setTimeout(show,2500)});
})();
