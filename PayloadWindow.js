/*! PayloadWindow.js — Konior persona v2.1 | (c) 2025 TrixTech s.r.o. */
(function (window, document) {
  var UX = { dwellMs: 4000, minScrollPct: 10, showDelayMs: 500, bootWindowMs: 900, closeCooldownMs: 90000, disableOnSmallScreens: true, minViewport: { w: 360, h: 600 }, enforceEveryMs: 350 };
  var SS = { SUPPRESS: 'vf_payload_suppressed_session' };
  var LS = { LAST_CLOSE: 'vf_last_close_at' };

  var MSG = {
    default:  '👋 Ahoj! Jsem Tomáš Konior. S čím poradit?',
    bio:      'Zajímá vás něco o mně nebo mé práci?',
    nabidka:  'Provedu vás aktuální nabídkou a ušetřím čas.',
    blog:     'Chcete shrnutí článku nebo doporučení, čím začít?',
    odhad:    'Spočítám orientační odhad ceny na pár otázek.',
    reference:'Pomůžu vybrat nejrelevantnější reference.',
    kontakt:  'Pošlu vám hned kontakt nebo zprávu.',
    deep:     'Dává smysl to probrat rychle v chatu? Zkrátím vám cestu.'
  };

  var CSS = `
:root{ --vf-brand:#eeb710; --vf-accent:#eeb710; --vf-text:#000; --vf-bg:#fff; --vf-card-w:280px; --vf-launcher-size:72px; }
.vf-cta{ position:fixed; right:24px; bottom:95px; z-index:900000; opacity:0; transform:translateY(10px) scale(.98); visibility:hidden; pointer-events:none; transition:opacity .22s ease, transform .22s ease, visibility 0s linear .22s; }
.vf-cta.is-in{ opacity:1; transform:translateY(0) scale(1); visibility:visible; pointer-events:auto; }
.vf-cta.is-out{ opacity:0; transform:translateY(8px) scale(.98); visibility:hidden; pointer-events:none; transition:opacity .18s ease, transform .18s ease, visibility 0s linear .18s; }
.vf-card{ position:relative; width:var(--vf-card-w); background:#fff; color:var(--vf-text); border:1px solid rgba(0,0,0,.08); border-radius:20px; padding:16px; box-shadow:0 8px 20px rgba(0,0,0,.14); }
.vf-header{ display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.vf-avatar{ width:28px; height:28px; flex:0 0 28px; border-radius:999px; object-fit:cover; background:#eeb710; border:2px solid #eeb710; transform:translateX(-4px); user-select:none; -webkit-user-drag:none; }
.vf-title{ font-size:16px; font-weight:800; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transform:translateX(-1px); }
.vf-title-accent{ color:#eeb710; margin-right:6px; }
.vf-title-rest{ color:#1a1e23 }
.vf-desc{ margin:14px 2px 16px; font-size:15px; line-height:1.35; color:var(--vf-text); opacity:.98; }
.vf-btn{ margin:2px 0 0; padding:12px 18px; border:0; border-radius:14px; background:#eeb710; color:#fff; font-weight:900; letter-spacing:.3px; font-size:15px; cursor:pointer; width:100%; position:relative; }
.vf-btn:active{ transform:translateY(1px); }
.vf-close{ position:absolute; top:-10px; right:-10px; width:26px; height:26px; border-radius:999px; border:1px solid rgba(0,0,0,.12); background:#fff; color:#333; cursor:pointer; font-size:14px; line-height:1; display:grid; place-items:center; box-shadow:0 4px 12px rgba(0,0,0,.14); }
.vf-avatar, .vf-btn, .vf-close, .vf-card, .vf-cta, img{ -webkit-user-drag:none; user-select:none; }
@media (max-width:520px){ .vf-cta{ right:12px; bottom:calc(var(--vf-launcher-size) + 18px) } .vf-card{ width:88vw } }
  `.trim();

  var now = function(){ return Date.now(); };
  var getSS = function(k){ return sessionStorage.getItem(k); };
  var setSS = function(k,v){ sessionStorage.setItem(k, String(v)); };
  var getLS = function(k){ return localStorage.getItem(k); };
  var setLS = function(k,v){ localStorage.setItem(k, String(v)); };
  var within = function(ts, ms){ return ts && (now() - Number(ts) < ms); };

  var ctaEl, btnOpenEl, btnCloseEl, descEl, visible = false;
  var metDwell = false, metScroll = false, dwellTimer = null, boot = true, userInitiatedOpen = false, deepScroll = false;
  var chatOpen = false, enforceTimer = null;

  function viewportTooSmall(){ if (!UX.disableOnSmallScreens) return false; var w=Math.min(window.innerWidth, window.innerHeight), h=window.innerHeight; return (w<UX.minViewport.w||h<UX.minViewport.h); }

  function injectCSS(){ if (document.querySelector('style[data-payloadwindow-style]')) return; var s=document.createElement('style'); s.setAttribute('data-payloadwindow-style','1'); s.appendChild(document.createTextNode(CSS)); document.head.appendChild(s); }

  function injectCTA(){
    if (document.getElementById('vfCta')) return;
    var wrap=document.createElement('div');
    wrap.innerHTML=[
      '<div class="vf-cta" id="vfCta" aria-live="polite" aria-hidden="true" style="display:none">',
      '  <div class="vf-card">',
      '    <button class="vf-close" id="vfCtaClose" aria-label="Skrýt">×</button>',
      '    <div class="vf-header">',
      '      <img class="vf-avatar" src="https://i.imgur.com/qCFve64.png" alt="Tomáš Konior" draggable="false" ondragstart="return false;">',
      '      <strong class="vf-title"><span class="vf-title-accent">AI asistent</span><span class="vf-title-rest">Tomáš</span></strong>',
      '    </div>',
      '    <p class="vf-desc" id="vfCtaDesc">👋🏻 Ahoj! Jsem Tomáš Konior. S čím poradit?</p>',
      '    <button id="vfOpenChat" class="vf-btn" aria-label="Otevřít chatbota"><span class="vf-label">PORAĎ MI</span></button>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(wrap.firstChild);
  }

  function sectionFromHash(h){
    if (!h) return 'default';
    var x=h.replace('#','').toLowerCase();
    if (x.includes('bio')) return 'bio';
    if (x.includes('nabidka')||x.includes('nabídka')) return 'nabidka';
    if (x.includes('blog')) return 'blog';
    if (x.includes('odhad')) return 'odhad';
    if (x.includes('reference')) return 'reference';
    if (x.includes('kontakt')||x.includes('contact')) return 'kontakt';
    return 'default';
  }

  function pickMessage(ctx){
    if (ctx.deepScroll) return MSG.deep;
    var sec = sectionFromHash(ctx.hash);
    return MSG[sec] || MSG.default;
  }

  function showCTA(){
    if (!ctaEl||visible) return;
    if (chatOpen) return;
    if (viewportTooSmall()) return;
    if (getSS(SS.SUPPRESS)==='1') return;
    if (within(getLS(LS.LAST_CLOSE), UX.closeCooldownMs)) return;
    visible=true;
    ctaEl.style.display='';
    ctaEl.classList.remove('is-out');
    ctaEl.classList.add('is-in');
    ctaEl.removeAttribute('aria-hidden');
  }

  function hideCTA(){
    if (!ctaEl||!visible) return;
    visible=false;
    ctaEl.classList.add('is-out');
    var done=function(){ ctaEl.style.display='none'; ctaEl.setAttribute('aria-hidden','true'); ctaEl.removeEventListener('transitionend', done); };
    ctaEl.addEventListener('transitionend', done);
    setTimeout(done, 220);
  }

  function scheduleDwell(){ clearTimeout(dwellTimer); dwellTimer=setTimeout(function(){ metDwell=true; maybeShow(); }, UX.dwellMs); }
  function watchScroll(){
    var onScroll=function(){
      var sc=(window.scrollY+window.innerHeight)/Math.max(1,document.documentElement.scrollHeight)*100;
      if (sc>=UX.minScrollPct) metScroll=true;
      if (sc>=65) deepScroll=true;
      if (metScroll){ window.removeEventListener('scroll', onScroll); maybeShow(); }
    };
    window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  }
  function gateOk(){ return metDwell && metScroll; }

  function maybeShow(){
    if (!gateOk()) return;
    if (descEl) descEl.textContent = pickMessage({ hash: location.hash, deepScroll: deepScroll });
    setTimeout(showCTA, UX.showDelayMs);
  }

  function detectChatVisible(){
    if (window.voiceflow && window.voiceflow.chat && typeof window.voiceflow.chat.isOpen==='function'){ try{ return !!window.voiceflow.chat.isOpen(); }catch(_){} }
    var el=document.querySelector('.vfrc-widget, .vfrc-chat--overlay, #voiceflow-chat-widget, [data-voiceflow-chat]');
    if (!el) return false;
    var cs=window.getComputedStyle(el);
    return cs && cs.visibility!=='hidden' && cs.display!=='none' && cs.opacity!=='0';
  }

  function startEnforcer(){
    clearInterval(enforceTimer);
    enforceTimer=setInterval(function(){
      var openNow=detectChatVisible();
      if (openNow && !chatOpen){ chatOpen=true; hideCTA(); try{ window.voiceflow.chat?.proactive?.clear(); }catch(_){} }
      if (!openNow && chatOpen){ chatOpen=false; }
      if (!openNow && gateOk() && getSS(SS.SUPPRESS)!=='1' && !within(getLS(LS.LAST_CLOSE), UX.closeCooldownMs) && !visible){
        if (descEl) descEl.textContent = pickMessage({ hash: location.hash, deepScroll: deepScroll });
        showCTA();
      }
    }, UX.enforceEveryMs);
  }

  setTimeout(function(){ boot=false; }, UX.bootWindowMs);

  window.addEventListener('hashchange', function(){
    if (descEl) descEl.textContent = pickMessage({ hash: location.hash, deepScroll: deepScroll });
  });

  window.addEventListener('message', function(evt){
    var data=evt.data;
    if (typeof data==='string'){ try{ data=JSON.parse(data); }catch{} }
    if (!data || typeof data.type!=='string') return;

    if (data.type==='voiceflow:open'){
      if (!userInitiatedOpen && boot){ try{ window.voiceflow.chat.close(); }catch(_){} try{ window.voiceflow.chat.proactive.clear(); }catch(_){} return; }
      chatOpen=true; hideCTA(); try{ window.voiceflow.chat.proactive.clear(); }catch(_){}
    }

    if (data.type==='voiceflow:close'){
      chatOpen=false; setLS(LS.LAST_CLOSE, String(now()));
      setTimeout(function(){
        if (gateOk() && getSS(SS.SUPPRESS)!=='1'){ if (descEl) descEl.textContent = pickMessage({ hash: location.hash, deepScroll: deepScroll }); showCTA(); }
      }, UX.closeCooldownMs + UX.showDelayMs);
    }
  }, false);

  window.PayloadWindowOnReady = function(api){
    try{
      if (api && api.proactive && typeof api.proactive.push==='function'){
        var _orig=api.proactive.push.bind(api.proactive);
        api.proactive.push=function(){ var openNow=detectChatVisible(); if (openNow||chatOpen) return; return _orig.apply(api.proactive, arguments); };
      }
    }catch(_){}
    if (window.__vfOpenAfterLoad){ try{ api.open(); }catch(_){} window.__vfOpenAfterLoad=false; }
    startEnforcer();
  };

  function bindCTA(){
    ctaEl=document.getElementById('vfCta');
    btnOpenEl=document.getElementById('vfOpenChat');
    btnCloseEl=document.getElementById('vfCtaClose');
    descEl=document.getElementById('vfCtaDesc');

    if (btnOpenEl){
      btnOpenEl.addEventListener('click', function(){
        userInitiatedOpen=true; hideCTA();
        try{ window.voiceflow.chat.open(); }catch(e){ window.__vfOpenAfterLoad=true; }
        setTimeout(function(){ userInitiatedOpen=false; }, 900);
      });
    }
    if (btnCloseEl){
      btnCloseEl.addEventListener('click', function(){ setSS(SS.SUPPRESS,'1'); hideCTA(); });
    }
  }

  function init(){ injectCSS(); injectCTA(); bindCTA(); scheduleDwell(); watchScroll(); startEnforcer(); document.addEventListener('visibilitychange', function(){ if (document.visibilityState==='visible' && !metDwell) scheduleDwell(); }); }

  window.PayloadWindow = { show: showCTA, hide: hideCTA };
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window, document);