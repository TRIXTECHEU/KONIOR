/*! PayloadWindow.js — Konior persona v2.6 (no-bleed) | (c) 2025 TrixTech s.r.o. */
(function (window, document) {
  var UX = {
    dwellMs: 3500,
    longStayMs: 45000,
    minScrollPct: 10,
    showDelayMs: 400,
    bootWindowMs: 900,
    closeCooldownMs: 15000,
    enforceEveryMs: 250
  };

  // Přidal jsem nový klíč do objektu SS
  var SS = {
    SUPPRESS: 'vf_payload_suppressed_session',
    CHAT_OPEN: 'vf_chat_is_open',
    USER_OPENED_CHAT: 'vf_user_opened_chat' // flag, když uživatel otevřel chat
  };
  var LS = { LAST_CLOSE: 'vf_last_close_at' };

  var MSG = {
    default:  '👋🏻 Ahoj! Jsem Tomáš Konior. S čím ti můžu pomoct?',
    bio:      'Zajímá tě něco o mně nebo mojí práci?',
    nabidka:  'Provedu tě aktuální nabídkou a ušetřím ti čas.',
    blog:     'Chceš shrnutí článku nebo tip, čím začít?',
    odhad:    'Spočítám orientační odhad ceny na pár otázek.',
    reference:'Pomůžu vybrat nejrelevantnější reference.',
    kontakt:  'Pošlu ti hned kontakt nebo zprávu.',
    deep:     'Dává smysl to probrat rychle<br>v chatu? Zkrátím ti cestu.',
    linger:   'Jsi tu delší dobu. Chceš s tím rychle pomoct v chatu?'
  };

  /* === tvoje původní vzhledovka (NEŠAHÁM) === */
  var CSS = `
:root{ --vf-brand:#eeb710; --vf-accent:#eeb710; --vf-text:#111; --vf-bg:#fff; --vf-card-w:200px; --vf-launcher-size:120px; }
.vf-cta{ position:fixed; right:18px; bottom:100px; z-index:900000; opacity:0; transform:translateY(8px) scale(.98); visibility:hidden; pointer-events:none; transition:opacity .2s ease, transform .2s ease, visibility 0s linear .2s; }
.vf-cta.is-in{ opacity:1; transform:translateY(0) scale(1); visibility:visible; pointer-events:auto; }
.vf-cta.is-out{ opacity:0; transform:translateY(8px) scale(.98); visibility:hidden; pointer-events:none; transition:opacity .16s ease, transform .16s ease, visibility 0s linear .16s; }
.vf-card{ position:relative; width:var(--vf-card-w); background:#fff; color:var(--vf-text); border:1px solid #111; border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:10px; }
.vf-header{ display:flex; align-items:center; gap:8px; }
.vf-avatar{ width:32px; height:32px; flex:0 0 32px; border-radius:999px; object-fit:cover; background:#eeb710; user-select:none; -webkit-user-drag:none; }
.vf-title{ font-size:15px; font-weight:800; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.vf-title-accent{ color:#eeb710; margin-right:6px; }
.vf-title-rest{ color:#111 }
.vf-desc{ margin:2px 0 4px; font-size:14px; line-height:1.35; color:#111; }
.vf-btn{ padding:10px 18px; border:0; border-radius:14px; background:#eeb710; color:#fff; font-weight:900; letter-spacing:.3px; font-size:14px; cursor:pointer; display:inline-block; }
.vf-btn:active{ transform:translateY(1px); }
.vf-close{ position:absolute; top:-10px; right:-10px; width:24px; height:24px; border-radius:999px; border:1px solid #111; background:#fff; color:#111; cursor:pointer; font-size:14px; line-height:1; display:grid; place-items:center; }
.vf-avatar, .vf-btn, .vf-close, .vf-card, .vf-cta, img{ -webkit-user-drag:none; user-select:none; }
@media (max-width:520px){ .vf-cta{ right:12px; bottom:calc(var(--vf-launcher-size) + 22px) } .vf-card{ width:86vw } }
  `.trim();

  var now = function(){ return Date.now(); };
  var getSS = function(k){ return sessionStorage.getItem(k); };
  var setSS = function(k,v){ sessionStorage.setItem(k, String(v)); };
  var rmSS = function(k){ sessionStorage.removeItem(k); };
  var getLS = function(k){ return localStorage.getItem(k); };
  var setLS = function(k,v){ localStorage.setItem(k, String(v)); };
  var within = function(ts, ms){ return ts && (now() - Number(ts) < ms); };

  var ctaEl, btnOpenEl, btnCloseEl, descEl, visible = false;
  var metDwell = false, metScroll = false, deepScroll = false, longStay = false;
  var dwellTimer = null, longTimer = null, enforceTimer = null, boot = true, vfReady = false;
  var chatOpen = false;

  function injectCSS(){
    if (document.querySelector('style[data-payloadwindow-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-payloadwindow-style','1');
    s.appendChild(document.createTextNode(CSS));
    document.head.appendChild(s);
  }
  function injectCTA(){
    if (document.getElementById('vfCta')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="vf-cta" id="vfCta" aria-live="polite" aria-hidden="true" style="display:none">',
      '  <div class="vf-card">',
      '    <button class="vf-close" id="vfCtaClose" aria-label="Skrýt">×</button>',
      '    <div class="vf-header">',
      '      <img class="vf-avatar" src="https://i.imgur.com/qCFve64.png" alt="Tomáš Konior" draggable="false" ondragstart="return false;">',
      '      <strong class="vf-title"><span class="vf-title-accent">AI asistent</span><span class="vf-title-rest">Tomáš</span></strong>',
      '    </div>',
      '    <p class="vf-desc" id="vfCtaDesc">👋🏻 Ahoj! Jsem Tomáš Konior. S čím ti můžu pomoct?</p>',
      '    <button id="vfOpenChat" class="vf-btn" aria-label="Otevřít chatbota"><span class="vf-label">PORAĎ MI</span></button>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(wrap.firstChild);
  }

  function sectionFromHash(h){
    if (!h) return 'default';
    var x = h.replace('#','').toLowerCase();
    if (x.includes('bio')) return 'bio';
    if (x.includes('nabidka') || x.includes('nabídka')) return 'nabidka';
    if (x.includes('blog')) return 'blog';
    if (x.includes('odhad')) return 'odhad';
    if (x.includes('reference')) return 'reference';
    if (x.includes('kontakt') || x.includes('contact')) return 'kontakt';
    return 'default';
  }
  function pickMessage(ctx){
    if (ctx.deepScroll) return MSG.deep;
    if (ctx.longStay)  return MSG.linger;
    var sec = sectionFromHash(ctx.hash);
    return MSG[sec] || MSG.default;
  }
  function updateMessage(){
    if (!descEl) return;
    descEl.innerHTML = pickMessage({ hash: location.hash, deepScroll: deepScroll, longStay: longStay });
  }

  function detectChatVisible(){
    if (window.voiceflow?.chat && typeof window.voiceflow.chat.isOpen === 'function') {
      try { return !!window.voiceflow.chat.isOpen(); } catch(_) {}
    }
    var el = document.querySelector('.vfrc-widget, .vfrc-chat--overlay, #voiceflow-chat-widget, [data-voiceflow-chat]');
    if (!el) return false;
    var cs = window.getComputedStyle(el);
    return cs && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  }

  function canShow(){
    if (!vfReady) return false;
    // Kontrola, jestli je chat viditelný
    if (detectChatVisible()) return false;
    // Kontrola, jestli je chat otevřený (nové)
    if (getSS(SS.CHAT_OPEN) === '1') return false; // *** přidané ***
    // Kontrola, jestli uživatel chat otevřel
    if (getSS(SS.USER_OPENED_CHAT) === '1') return false;
    // Kontrola, jestli je suppress flag nastaven
    if (getSS(SS.SUPPRESS) === '1') return false;
    if (!metDwell || !metScroll) return false;
    if (within(getLS(LS.LAST_CLOSE), UX.closeCooldownMs)) return false;
    return true;
  }

  function showCTA(){
    if (!ctaEl || visible) return;
    if (!canShow()) return;
    visible = true;
    ctaEl.style.display = '';
    ctaEl.classList.remove('is-out');
    ctaEl.classList.add('is-in');
    ctaEl.removeAttribute('aria-hidden');
  }
  function hideCTA(){
    if (!ctaEl || !visible) return;
    visible = false;
    ctaEl.classList.add('is-out');
    var done = function(){ ctaEl.style.display='none'; ctaEl.setAttribute('aria-hidden','true'); ctaEl.removeEventListener('transitionend', done); };
    ctaEl.addEventListener('transitionend', done);
    setTimeout(done, 160);
  }

  function scheduleDwell(){ clearTimeout(dwellTimer); dwellTimer = setTimeout(function(){ metDwell = true; maybeShow(); }, UX.dwellMs); }
  function scheduleLongStay(){ clearTimeout(longTimer); longTimer = setTimeout(function(){ longStay = true; updateMessage(); maybeShow(); }, UX.longStayMs); }
  function watchScroll(){
    var onScroll = function(){
      var sc = (scrollY + innerHeight) / Math.max(1, document.documentElement.scrollHeight) * 100;
      if (sc >= UX.minScrollPct) metScroll = true;
      if (sc >= 65) deepScroll = true;
      if (metScroll){ removeEventListener('scroll', onScroll); maybeShow(); }
    };
    addEventListener('scroll', onScroll, { passive:true }); onScroll();
  }

  function maybeShow(){ if (!canShow()) return; updateMessage(); setTimeout(showCTA, UX.showDelayMs); }

  function startEnforcer(){
    clearInterval(enforceTimer);
    enforceTimer = setInterval(function(){
      var openNow = detectChatVisible();
      if (openNow && !chatOpen){ 
        chatOpen = true; 
        setSS(SS.CHAT_OPEN,'1'); 
        hideCTA(); 
      }
      if (!openNow && chatOpen){ 
        chatOpen = false; 
        // při zavření chatbota reset flagu
        setSS(SS.CHAT_OPEN, '0'); 
        setLS(LS.LAST_CLOSE, String(now())); 
      }
      if (!openNow && !visible && canShow()){ updateMessage(); showCTA(); }
    }, UX.enforceEveryMs);
  }

  function observeVF(){
    var target = document.body;
    var mo = new MutationObserver(function(){
      if (detectChatVisible()){
        chatOpen = true; 
        setSS(SS.CHAT_OPEN,'1'); 
        hideCTA();
      }
    });
    mo.observe(target, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
  }

  // Funkce, která zaznamená otevření chatbota a zakáže CTA
  function markChatOpened(){
    setSS(SS.CHAT_OPEN, '1');
    setSS(SS.USER_OPENED_CHAT, '1');
    setSS(SS.SUPPRESS, '1'); // přidání flagu, že uživatel otevřel chat nebo klikl na "PORAĎ MI"
    chatOpen = true;
    hideCTA();
  }

  // Příklad: pokud máš tlačítko nebo jinou událost, která spouští otevření
  // Uprav si podle svého
  function bindOpenChatButton(){
    var btn = document.getElementById('vfOpenChat');
    if (btn){
      btn.addEventListener('click', function(){
        try { window.voiceflow.chat.open(); } catch(_) {}
        markChatOpened(); // zaznamenat otevření a zakázat CTA
      });
    }
  }

  // Pokud máš jiný způsob otevření, přidej do něj volání markChatOpened()

  setTimeout(function(){ boot = false; }, UX.bootWindowMs);
  addEventListener('hashchange', updateMessage);

  addEventListener('message', function(evt){
    var data = evt.data;
    if (typeof data === 'string'){ try { data = JSON.parse(data); } catch{} }
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'voiceflow:open'){
      setSS(SS.CHAT_OPEN,'1');
      setSS(SS.USER_OPENED_CHAT,'1');
      setSS(SS.SUPPRESS, '1'); // při otevření chatu zakázat CTA
      chatOpen = true;
      hideCTA();
    }
    if (data.type === 'voiceflow:close'){
      rmSS(SS.CHAT_OPEN);
      chatOpen = false;
      rmSS(SS.USER_OPENED_CHAT);
      setLS(LS.LAST_CLOSE, String(now()));
      if (canShow()){ updateMessage(); showCTA(); }
    }
  });

  window.PayloadWindowOnReady = function(api){
    vfReady = true;

    try{
      if (api?.proactive?.push){
        var _orig = api.proactive.push.bind(api.proactive);
        api.proactive.push = function(){ if (detectChatVisible() || chatOpen) return; return _orig.apply(api.proactive, arguments); };
      }
    }catch(_){}

    if (detectChatVisible() || getSS(SS.CHAT_OPEN)==='1'){ 
      chatOpen = true; 
      setSS(SS.CHAT_OPEN,'1'); 
      hideCTA(); 
    }

    observeVF();
    startEnforcer();
    maybeShow();
  };

  function bindCTA(){
    ctaEl      = document.getElementById('vfCta');
    btnOpenEl  = document.getElementById('vfOpenChat');
    btnCloseEl = document.getElementById('vfCtaClose');
    descEl     = document.getElementById('vfCtaDesc');

    // Otevření chatbota tlačítkem
    btnOpenEl?.addEventListener('click', function(){
      try { window.voiceflow.chat.open(); } catch(_) {}
      setSS(SS.SUPPRESS, '1'); // zakázat znovu zobrazení CTA po kliknutí
      markChatOpened(); // zaznamenat otevření
    });

    // Zavření CTA
    btnCloseEl?.addEventListener('click', function(){ setSS(SS.SUPPRESS,'1'); hideCTA(); });
  }

  // Inicializace
  function init(){
    injectCSS();
    injectCTA();
    bindCTA();
    // Přidat také bind na tlačítko nebo událost, která otevře chat
    bindOpenChatButton();

    scheduleDwell();
    scheduleLongStay();
    watchScroll();
    startEnforcer();
    observeVF();
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState==='visible' && !metDwell) scheduleDwell(); });

    // Pokud je chat otevřen nebo flag, nezobrazuj zprávu
    if (detectChatVisible() || getSS(SS.CHAT_OPEN)==='1' || getSS(SS.USER_OPENED_CHAT)==='1'){
      chatOpen = true;
      setSS(SS.CHAT_OPEN,'1');
      hideCTA();
    } else {
      maybeShow();
    }
  }

  window.PayloadWindow = { show: showCTA, hide: hideCTA };
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }

})(window, document);
