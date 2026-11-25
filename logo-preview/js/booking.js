/* ClearLine booking calendar + Liquid Glass optics (homepage). Needs GSAP for the lens; works without it. */
(function(){
  'use strict';
  var hasGsap = typeof window.gsap !== 'undefined';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ================= BOOKING CALENDAR (transitions.dev text swap soft + CSS states) ================= */
  var ms = function(name){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0; };
  function softSwap(el, next){
    var prev = el.dataset.text != null ? el.dataset.text : el.textContent;
    if(prev === next) return;
    el.dataset.text = next;
    clearTimeout(el._softTimer);
    var out = document.createElement('span'); out.className='t-text-soft-old'; out.setAttribute('aria-hidden','true'); out.textContent=prev;
    var inn = document.createElement('span'); inn.className='t-text-soft-new'; inn.textContent=next;
    var w0 = el.getBoundingClientRect().width;
    el.classList.remove('is-swapping');
    el.replaceChildren(out, inn);
    var w1 = inn.getBoundingClientRect().width;
    el.style.width = w0+'px';
    void el.offsetWidth;
    el.classList.add('is-swapping');
    el.style.width = w1+'px';
    el._softTimer = setTimeout(function(){
      el.classList.remove('is-swapping'); el.style.removeProperty('width'); el.textContent = next;
    }, Math.max(ms('--text-soft-dur'), ms('--text-soft-resize-dur')) + 40);
  }

  var today = new Date(); today.setHours(0,0,0,0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var minView = new Date(view), maxView = new Date(view.getFullYear(), view.getMonth()+2, 1);
  var selDate = null, selTime = null;
  var daysEl = document.getElementById('days'), chipsEl = document.getElementById('chips');
  var titleEl = document.getElementById('calTitle'), sumEl = document.getElementById('summary');
  var confirmBtn = document.getElementById('confirm');
  var prevBtn = document.getElementById('prevM'), nextBtn = document.getElementById('nextM');
  var TIMES = ['9:00 AM','9:30 AM','10:30 AM','11:00 AM','1:00 PM','2:30 PM','3:30 PM','4:00 PM'];
  var fmtMonth = function(d){ return d.toLocaleDateString('en-US',{month:'long',year:'numeric'}); };
  var fmtDay = function(d){ return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); };

  // deterministic "booked" slots per date so the demo feels real
  function taken(d, i){ return ((d.getDate()*7 + i*3) % 9) === 0 || ((d.getDate()+i) % 11) === 0; }

  // The 42 day cells and 8 time chips are created ONCE and then updated in place (text, state, aria):
  // replacing nodes inside the refracting glass makes Safari re-rasterize the filtered layers (a visible flash).
  var dayCells = [], chipCells = [];
  function setAttr(el, k, v){ if(v == null){ if(el.hasAttribute(k)) el.removeAttribute(k); } else if(el.getAttribute(k) !== v) el.setAttribute(k, v); }
  function setClass(el, v){ if(el.className !== v) el.className = v; }
  function setText(el, v){ if(el.textContent !== v) el.textContent = v; }
  function renderDays(){
    titleEl.dataset.text != null ? softSwap(titleEl, fmtMonth(view)) : (titleEl.textContent = fmtMonth(view), titleEl.dataset.text = fmtMonth(view));
    prevBtn.disabled = view <= minView; nextBtn.disabled = view >= maxView;
    if(!dayCells.length){
      var frag = document.createDocumentFragment();
      for(var c=0;c<42;c++){ var bt = document.createElement('button'); bt.type = 'button'; frag.appendChild(bt); dayCells.push(bt); }
      daysEl.replaceChildren(frag);                                      // always 6 rows: the glass never changes size
    }
    var first = view.getDay(), len = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    for(var i=0;i<42;i++){
      var btn = dayCells[i], d = i - first + 1, lit = btn.classList.contains('lit');
      if(d < 1 || d > len){                                              // blank cell: invisible, inert
        setClass(btn, 'day blank'); setText(btn, ''); btn.disabled = true; btn._date = null;
        setAttr(btn, 'aria-hidden', 'true'); setAttr(btn, 'tabindex', '-1'); setAttr(btn, 'aria-label', null); setAttr(btn, 'aria-pressed', null);
        continue;
      }
      var date = new Date(view.getFullYear(), view.getMonth(), d), wk = date.getDay(), past = date <= today, closed = wk===0 || wk===6;
      var cls = 'day' + (date.getTime()===today.getTime() ? ' today' : '') + (past || closed ? '' : ' open') + (lit ? ' lit' : '');
      setClass(btn, cls); setText(btn, String(d)); btn.disabled = past || closed; btn._date = date;
      setAttr(btn, 'aria-hidden', null); setAttr(btn, 'tabindex', null);
      setAttr(btn, 'aria-label', fmtDay(date) + (past || closed ? ', unavailable' : ''));
      setAttr(btn, 'aria-pressed', selDate && selDate.getTime()===date.getTime() ? 'true' : 'false');
    }
  }
  function renderChips(){
    if(!chipCells.length){
      var frag = document.createDocumentFragment();
      TIMES.forEach(function(){ var c = document.createElement('button'); c.type = 'button'; frag.appendChild(c); chipCells.push(c); });
      chipsEl.replaceChildren(frag);
    }
    TIMES.forEach(function(t,i){
      var c = chipCells[i], booked = !!(selDate && taken(selDate,i)), off = !selDate || booked;
      setClass(c, 'slot' + (booked ? ' booked' : '')); setText(c, t); c.disabled = off;
      setAttr(c, 'aria-label', booked ? t + ', booked' : null);
      setAttr(c, 'aria-pressed', selTime===t && !off ? 'true' : 'false');
    });
  }  function update(){
    var msg;
    if(!selDate) msg = 'Pick a day, then a time.';
    else if(!selTime) msg = fmtDay(selDate) + '. Now pick a time.';
    else msg = fmtDay(selDate) + ' at ' + selTime + ' ET';
    softSwap(sumEl, msg);
    confirmBtn.disabled = !(selDate && selTime);
    confirmBtn.textContent = 'Confirm time';
  }
  function selectedDayBtn(){
    if(!selDate) return null;
    var list = daysEl.querySelectorAll('.day');
    for(var i=0;i<list.length;i++){ if(list[i]._date && list[i]._date.getTime()===selDate.getTime()) return list[i]; }
    return null;
  }

  /* ================= LIQUID GLASS OPTICS =================
     One stage image (drawn here) is shown behind the glass AND copied inside every glass surface.
     Each copy is aligned to the stage and refracted by an element SVG filter:
       neutral flood  <-  baked displacement map (composited over it)  ->  feDisplacementMap  ->  small blur
     Maps are baked once per size on a canvas and cached. Nothing redraws per frame except the lens
     transform (GSAP) and the lens copy's counter-transform. */
  var SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
  var root = document.documentElement;
  var defs = document.querySelector('#optics defs');
  var stageWrap = document.querySelector('.glass-stage'), stageBg = document.getElementById('stageBg');
  var sched = document.getElementById('sched'), panelOptic = document.getElementById('panelOptic');
  var stage = { url:'', w:0, h:0, key:'' };
  var mapCache = {};
  var PANEL_M = 44;
  if(!hasGsap) root.classList.add('no-lens');

  // Displacement map: R/G = 128 is "no bend". Inside a bezel band along a rounded-rect edge,
  // samples are pulled from OUTSIDE the edge (like the rim of a real lens), strongest at the rim.
  function bakeMap(w, h, radius, bezel){
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    var key = w+'x'+h+'r'+radius.toFixed(1)+'b'+bezel.toFixed(1);
    if(mapCache[key]) return mapCache[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var cx = c.getContext('2d'), img = cx.createImageData(w,h), D = img.data;
    var R = Math.min(radius, w/2, h/2), hw = w/2, hh = h/2;
    for(var y=0; y<h; y++){
      for(var x=0; x<w; x++){
        var px = x+.5-hw, py = y+.5-hh, qx = Math.abs(px)-(hw-R), qy = Math.abs(py)-(hh-R), sd, nx, ny;
        if(qx>0 && qy>0){ var len = Math.sqrt(qx*qx+qy*qy); sd = len-R; nx = qx/len; ny = qy/len; }
        else if(qx>qy){ sd = qx-R; nx = 1; ny = 0; } else { sd = qy-R; nx = 0; ny = 1; }
        if(px<0) nx = -nx; if(py<0) ny = -ny;
        var t = 1 - Math.min(1, Math.max(0, -sd)/bezel);    // 1 at the rim, 0 past the bezel
        var m = t*t*(3-2*t);                                // smooth lens profile
        var i = (y*w+x)*4;
        D[i] = 128 + nx*m*127; D[i+1] = 128 + ny*m*127; D[i+2] = 128; D[i+3] = 255;
      }
    }
    cx.putImageData(img,0,0);
    return (mapCache[key] = c.toDataURL('image/png'));
  }
  function setAttrs(el, o){ for(var k in o) el.setAttribute(k, o[k]); return el; }
  function opticFilter(id, tw, th, mx, my, mw, mh, url, scale, blur){
    var f = document.getElementById(id);
    if(!f){
      f = document.createElementNS(SVGNS,'filter'); f.id = id;
      setAttrs(f,{ filterUnits:'userSpaceOnUse', primitiveUnits:'userSpaceOnUse', 'color-interpolation-filters':'sRGB' });
      f.appendChild(setAttrs(document.createElementNS(SVGNS,'feFlood'),{ 'flood-color':'rgb(128,128,128)', 'flood-opacity':'1', result:'neutral' }));
      f.appendChild(setAttrs(document.createElementNS(SVGNS,'feImage'),{ preserveAspectRatio:'none', result:'mapimg' }));
      f.appendChild(setAttrs(document.createElementNS(SVGNS,'feComposite'),{ in:'mapimg', in2:'neutral', operator:'over', result:'map' }));
      f.appendChild(setAttrs(document.createElementNS(SVGNS,'feDisplacementMap'),{ in:'SourceGraphic', in2:'map', xChannelSelector:'R', yChannelSelector:'G', result:'bent' }));
      f.appendChild(setAttrs(document.createElementNS(SVGNS,'feGaussianBlur'),{ in:'bent' }));
      defs.appendChild(f);
    }
    setAttrs(f,{ x:0, y:0, width:Math.round(tw), height:Math.round(th) });
    var im = f.querySelector('feImage');
    setAttrs(im,{ x:mx, y:my, width:Math.round(mw), height:Math.round(mh) });
    if(im.getAttribute('href') !== url){ im.setAttribute('href', url); im.setAttributeNS(XLINK,'xlink:href', url); }
    f.querySelector('feDisplacementMap').setAttribute('scale', scale);
    f.querySelector('feGaussianBlur').setAttribute('stdDeviation', blur);
    return 'url(#'+id+')';
  }

  /* ---- the stage: the backdrop image behind the calendar ----
     Swap the artwork here (one line). The image is placed "cover" in stage coordinates; the visible stage
     and every refraction copy use the SAME placement, so the glass bends exactly what is behind it.
     No canvas re-encode: it works from a double-clicked file too. */
  var BACKDROP = { small:'assets/new/cal-backdrop-silk-1200.webp', large:'assets/new/cal-backdrop-silk-2400.webp',
                   portraitSmall:'assets/new/cal-backdrop-silk-portrait-768.webp', portraitLarge:'assets/new/cal-backdrop-silk-portrait-1536.webp' };
  var imgCache = {};
  function loadImg(src, cb){
    var e = imgCache[src];
    if(e && e.ok) return cb(e.img);
    if(!e){ e = imgCache[src] = { img:new Image(), ok:false, q:[] }; e.img.decoding = 'async';
      e.img.onload = function(){ e.ok = true; e.q.splice(0).forEach(function(f){ f(e.img); }); };
      e.img.src = src; }
    e.q.push(cb);
  }
  function drawStage(cb){
    var sr = stageBg.getBoundingClientRect();
    var W = Math.round(sr.width), H = Math.round(sr.height);
    if(!W || !H) return false;
    // tall stages (phones) use the portrait artwork, so 'cover' never upscales a 16:9 image 2x+ (that looked soft)
    var dpr = window.devicePixelRatio || 1;
    var src = H/W > 1 ? (W*dpr > 700 ? BACKDROP.portraitLarge : BACKDROP.portraitSmall) : (W*dpr > 1300 ? BACKDROP.large : BACKDROP.small);
    var key = W+'x'+H+'|'+src;
    if(key === stage.key) return false;
    stage.key = key;
    loadImg(src, function(img){
      if(stage.key !== key) return;
      var sc = Math.max(W/img.naturalWidth, H/img.naturalHeight);
      var bw = img.naturalWidth*sc, bh = img.naturalHeight*sc;
      stage.url = src; stage.w = W; stage.h = H;
      stage.bg = { w:bw, h:bh, x:(W - bw)/2, y:(H - bh)/2 };
      cb(true);
    });
    return true;
  }
  function bgSize(){ return stage.bg.w.toFixed(2)+'px '+stage.bg.h.toFixed(2)+'px'; }

  /* ---- panel optic ---- */
  var geo = { px:0, py:0 };
  function layoutPanel(){
    var sr = stageBg.getBoundingClientRect(), pr = sched.getBoundingClientRect();
    geo.px = pr.left - sr.left; geo.py = pr.top - sr.top; geo.sx = sr.left; geo.sy = sr.top;
    var M = PANEL_M, pw = pr.width, ph = pr.height;
    var bezel = parseFloat(getComputedStyle(stageWrap).getPropertyValue('--bezel')) || 22;
    var radius = parseFloat(getComputedStyle(sched).borderTopLeftRadius) || 30;
    var s = panelOptic.style;
    s.left = -M+'px'; s.top = -M+'px'; s.width = (pw + 2*M)+'px'; s.height = (ph + 2*M)+'px';
    s.backgroundImage = 'url("'+stage.url+'")'; s.backgroundSize = bgSize();
    s.backgroundPosition = (stage.bg.x - (geo.px - M)).toFixed(2)+'px '+(stage.bg.y - (geo.py - M)).toFixed(2)+'px';
    s.filter = opticFilter('fPanel', pw + 2*M, ph + 2*M, M, M, pw, ph, bakeMap(pw, ph, radius, bezel + 8), pw < 500 ? 46 : 64, 1.6);
    var b = stageBg.style;
    b.backgroundImage = 'url("'+stage.url+'")'; b.backgroundSize = bgSize(); b.backgroundPosition = stage.bg.x.toFixed(2)+'px '+stage.bg.y.toFixed(2)+'px';
  }
  /* ---- selection lenses ---- */
  function Lens(el, grid, kind){
    this.el = el; this.grid = grid; this.kind = kind; this.wrap = el.parentNode;
    this.optic = el.querySelector('.lens-optic'); this.copy = el.querySelector('.lens-copy');
    this.st = { x:0, y:0, sx:1, sy:1, rot:0 }; this.tw = null; this.M = 14; this.w = 0; this.h = 0; this.cell = null; this.shown = false;
    this.wx = 0; this.wy = 0; this.lastSize = '';
  }
  Lens.prototype.measure = function(cell){
    var wr = this.wrap.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    this.wx = wr.left - geo.sx; this.wy = wr.top - geo.sy;
    var w = Math.round(cr.width), h = Math.round(cr.height);
    var size = w+'x'+h+'|'+stage.key;
    if(size !== this.lastSize){
      this.lastSize = size; this.w = w; this.h = h;
      var M = this.M, es = this.el.style, os = this.optic.style, cs = this.copy.style;
      es.width = w+'px'; es.height = h+'px';
      os.left = -M+'px'; os.top = -M+'px'; os.width = (w+2*M)+'px'; os.height = (h+2*M)+'px';
      cs.width = stage.w+'px'; cs.height = stage.h+'px';
      if(stage.url){ cs.backgroundImage = 'url("'+stage.url+'")'; cs.backgroundSize = bgSize(); cs.backgroundPosition = stage.bg.x.toFixed(2)+'px '+stage.bg.y.toFixed(2)+'px'; }
      var r = this.kind === 'day' ? w/2 : h/2, bez = this.kind === 'day' ? w*.34 : h*.42;
      os.filter = opticFilter('fLens'+this.kind, w+2*M, h+2*M, M, M, w, h, bakeMap(w, h, r, bez), this.kind==='day' ? 22 : 26, .5);
    }
    return { x: cr.left - wr.left, y: cr.top - wr.top };
  };
  // The lens is placed by its center and stretched into a capsule ALONG the travel direction
  // (rotate, scale, rotate back: the shape follows the angle but the specular highlight never spins).
  // Its stage copy gets the exact inverse transform, so the refraction stays locked to the stage.
  Lens.prototype.render = function(){
    var s = this.st, w = this.w, h = this.h, M = this.M, th = s.rot || 0;
    var cx = s.x + w/2, cy = s.y + h/2, f = function(v){ return v.toFixed(3); };
    var orient = th ? function(sx, sy){ return 'rotate('+f(th)+'rad) scale('+f(sx)+','+f(sy)+') rotate('+f(-th)+'rad)'; }
                    : function(sx, sy){ return 'scale('+f(sx)+','+f(sy)+')'; };
    this.el.style.transform = 'translate3d('+f(cx)+'px,'+f(cy)+'px,0) '+orient(s.sx, s.sy)+' translate('+f(-w/2)+'px,'+f(-h/2)+'px)';
    this.copy.style.transform = 'translate('+f(M + w/2)+'px,'+f(M + h/2)+'px) '+orient(1/s.sx, 1/s.sy)+' translate3d('+f(-(cx + this.wx))+'px,'+f(-(cy + this.wy))+'px,0)';
  };
  Lens.prototype.light = function(cell){
    var prev = this.grid.querySelector('.lit'); if(prev && prev !== cell) prev.classList.remove('lit');
    if(cell) cell.classList.add('lit');
  };
  Lens.prototype.stop = function(){ if(this.tw){ this.tw.kill(); this.tw = null; } if(hasGsap) gsap.killTweensOf(this.st); };
  Lens.prototype.hide = function(){
    this.shown = false; this.cell = null; this.light(null);
    if(hasGsap){ this.stop(); gsap.to(this.el,{ opacity:0, duration:.2, ease:'power1.out' }); }
    else this.el.style.opacity = 0;
  };
  // Jump without motion (month change, resize, reduced motion)
  Lens.prototype.place = function(cell){
    if(!cell){ this.hide(); return; }
    var p = this.measure(cell);
    if(hasGsap){ this.stop(); gsap.killTweensOf(this.el); }
    var st = this.st; st.x = p.x; st.y = p.y; st.sx = st.sy = 1; st.rot = 0; this.render();
    this.el.style.opacity = 1; this.shown = true; this.cell = cell; this.light(cell);
  };
  // Liquid morph: the leading edge leaves first while the trailing edge holds (a capsule bridging old and
  // new spots, thinning a little at the neck), then the tail catches up and the lens squashes and settles.
  Lens.prototype.moveTo = function(cell){
    var self = this, st = this.st;
    if(!hasGsap || reduceMQ.matches){ this.place(cell); return; }
    var p = this.measure(cell);
    this.stop();
    if(!this.shown){
      // first selection: the drop lands and swells into place
      this.shown = true; this.cell = cell;
      st.x = p.x; st.y = p.y; st.sx = st.sy = .55; st.rot = 0; this.render();
      gsap.to(this.el,{ opacity:1, duration:.22, ease:'power1.out', overwrite:true });
      gsap.to(st,{ sx:1, sy:1, duration:.7, ease:'elastic.out(1,0.5)', onUpdate:function(){ self.render(); } });
      setTimeout(function(){ if(self.cell === cell) self.light(cell); }, 90);
      return;
    }
    this.cell = cell;
    var prevLit = this.grid.querySelector('.lit'), left = false, lit = false;
    var x0 = st.x, y0 = st.y, dx = p.x - x0, dy = p.y - y0, dist = Math.sqrt(dx*dx + dy*dy);
    if(dist < 1){ st.x = p.x; st.y = p.y; st.sx = st.sy = 1; st.rot = 0; this.render(); this.light(cell); return; }
    var day = this.kind === 'day', ux = dx/dist, uy = dy/dist, ax = Math.abs(ux), ay = Math.abs(uy);
    // distance in cells travelled (diagonals count by their true length)
    var unit = day ? this.w + 4 : ax*(this.w + 8) + ay*(this.h + 8), n = dist / unit;
    // duration grows gently with distance: 1 cell 0.30s, 2 cells 0.335s, 3 cells 0.385s, 4 cells 0.45s, cap 0.47s
    var dur = n <= 1 ? .30 : n <= 2 ? .30 + (n-1)*.035 : n <= 3 ? .335 + (n-2)*.05 : n <= 4 ? .385 + (n-3)*.065 : Math.min(.47, .45 + (n-4)*.01);
    // ONE easing curve for both edges, so a move looks the same in either direction (an exact mirror):
    // a gentle start and a long, soft deceleration that gets softer the further it travels
    var pw = Math.min(3.2, 2.4 + .2*Math.max(0, n - 1));
    function E(x){ x = Math.max(0, Math.min(1, x)); var sx2 = x*x*(3 - 2*x)*.35 + x*.65; return 1 - Math.pow(1 - sx2, pw); }
    var delay = .16;                                                   // the tail follows the lead on the same curve
    var base = day ? this.w : ax*this.w + ay*this.h;
    var maxSep = base*1.1, horiz = ax >= ay;
    // chips: an almost rigid capsule; small stretch along the main travel axis only, less on short moves
    var cStretch = .12*Math.min(1, n/2.5), cOther = .04*Math.min(1, n/2.5);
    st.rot = day ? Math.atan2(dy, dx) : 0;
    var T = { t:0 };
    this.tw = gsap.to(T,{ t:1, duration:dur, ease:'none',
      onUpdate:function(){
        var t = T.t, dL, dT;
        if(day){
          dL = E(t/(1 - delay))*dist; dT = E((t - delay)/(1 - delay))*dist;
          if(dL - dT > maxSep) dT = dL - maxSep;
          var sep = dL - dT, mid = (dL + dT)/2, k = Math.min(1, sep/maxSep);
          st.x = x0 + ux*mid; st.y = y0 + uy*mid;
          st.sx = (sep + base)/base; st.sy = 1 - .14*k;                // oval stretch along the travel, thinner at full stretch
        } else {
          var pos = E(t)*dist, bell = Math.sin(Math.PI*Math.min(1, t)); // rigid: one point moves; the stretch swells mid-move
          dL = dT = pos;
          st.x = x0 + ux*pos; st.y = y0 + uy*pos;
          var along = 1 + cStretch*bell, other = 1 + cOther*bell;
          st.sx = horiz ? along : other; st.sy = horiz ? other : along;
        }
        self.render();
        // white text follows the glass: the old item darkens once the tail has left it,
        // the new one turns white once the tail is mostly in (never white text on the pale rim)
        if(!left && prevLit && prevLit !== cell && dT > base*.45){ left = true; prevLit.classList.remove('lit'); }
        if(!lit && dL >= dist - .5 && dist - dT < base*.3){ lit = true; self.light(cell); }
      },
      onComplete:function(){
        self.tw = null;
        if(!lit) self.light(cell);
        st.x = p.x; st.y = p.y;
        // the landing bounce (kept): a soft squash along the travel axis, then an elastic settle
        var sq = day ? { sx:.9, sy:1.08 } : (horiz ? { sx:.95, sy:1.035 } : { sx:1.035, sy:.95 });
        gsap.fromTo(st, sq, { sx:1, sy:1, duration:.62, ease:'elastic.out(1,0.42)',
          onUpdate:function(){ self.render(); }, onComplete:function(){ st.rot = 0; self.render(); } });
      }
    });
  };
  Lens.prototype.press = function(on){
    if(!hasGsap || reduceMQ.matches || !this.shown) return;
    var self = this;
    gsap.to(this.st, on ? { sx:1.12, sy:1.12, duration:.2, ease:'power2.out', overwrite:'auto', onUpdate:function(){ self.render(); } }
                        : { sx:1, sy:1, duration:.6, ease:'elastic.out(1,0.45)', overwrite:'auto', onUpdate:function(){ self.render(); } });
  };

  var lensDay = new Lens(document.getElementById('lensDay'), daysEl, 'day');
  var lensChip = new Lens(document.getElementById('lensChip'), chipsEl, 'chip');
  function bindPress(lens, sel){
    lens.grid.addEventListener('pointerdown', function(e){ var t = e.target.closest(sel); if(t && !t.disabled && t === lens.cell) lens.press(true); });
    ['pointerup','pointercancel','pointerleave'].forEach(function(ev){ lens.grid.addEventListener(ev, function(){ lens.press(false); }); });
  }
  bindPress(lensDay, '.day'); bindPress(lensChip, '.slot');

  function applyOptics(){
    if(!stage.url) return;
    layoutPanel();
    lensDay.lastSize = lensChip.lastSize = '';
    // pre-bake both lenses now, so the first click does no image or map work
    var dRef = daysEl.querySelector('.day'), cRef = chipsEl.querySelector('.slot');
    if(dRef) lensDay.measure(dRef);
    if(cRef) lensChip.measure(cRef);
    if(lensDay.shown && lensDay.cell) lensDay.place(lensDay.cell);
    if(lensChip.shown && lensChip.cell) lensChip.place(lensChip.cell);
    root.classList.add('lg-ready');
  }
  function refreshOptics(force){
    if(force) stage.key = '';
    if(!drawStage(applyOptics)) applyOptics();   // same size: just re-align (positions may have moved)
  }

  /* ---- calendar events ---- */
  daysEl.addEventListener('click', function(e){
    var b = e.target.closest('.day'); if(!b || b.disabled) return;
    selDate = b._date; selTime = null;
    dayCells.forEach(function(x){ if(x._date) setAttr(x, 'aria-pressed', x===b?'true':'false'); });
    lensDay.moveTo(b);
    lensChip.hide();
    renderChips(); update();
  });
  chipsEl.addEventListener('click', function(e){
    var c = e.target.closest('.slot'); if(!c || c.disabled) return;
    selTime = c.textContent;
    chipsEl.querySelectorAll('.slot').forEach(function(x){ x.setAttribute('aria-pressed', x===c?'true':'false'); });
    lensChip.moveTo(c);
    update();
  });
  /* Keyboard: arrows move focus between available days (by day / by week) and times (grid of 2);
     Home/End jump to the first/last; Enter/Space select (native buttons). Focus never scrolls anything. */
  function arrowNav(grid, sel, cols){
    grid.addEventListener('keydown', function(e){
      var keys = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-cols, ArrowDown:cols };
      if(!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
      var all = Array.prototype.slice.call(grid.children), cur = e.target.closest(sel);
      if(!cur) return;
      e.preventDefault();
      var i = all.indexOf(cur), step = keys[e.key], target = null;
      var ok = function(el){ return el && el.matches && el.matches(sel) && !el.disabled; };
      if(e.key === 'Home'){ for(var a=0;a<all.length && !target;a++) if(ok(all[a])) target = all[a]; }
      else if(e.key === 'End'){ for(var z=all.length-1;z>=0 && !target;z--) if(ok(all[z])) target = all[z]; }
      else { for(var j=i+step; j>=0 && j<all.length; j+=step){ if(ok(all[j])){ target = all[j]; break; } } }
      if(target) target.focus({ preventScroll:true });
    });
  }
  arrowNav(daysEl, '.day', 7);
  arrowNav(chipsEl, '.slot', 2);

  function changeMonth(step){
    view = new Date(view.getFullYear(), view.getMonth()+step, 1); renderDays();
    var b = selectedDayBtn(); if(b) lensDay.place(b); else if(lensDay.shown) lensDay.hide();
    // if the arrow just used is now disabled (first/last month), keep keyboard focus on the other arrow
    var used = step > 0 ? nextBtn : prevBtn, other = step > 0 ? prevBtn : nextBtn;
    var ae = document.activeElement;
    if(used.disabled && (ae === used || ae === document.body || !ae)) other.focus({ preventScroll:true });
  }
  prevBtn.addEventListener('click', function(){ if(view>minView) changeMonth(-1); });
  nextBtn.addEventListener('click', function(){ if(view<maxView) changeMonth(1); });
  confirmBtn.addEventListener('click', function(){
    if(confirmBtn.disabled) return;
    softSwap(sumEl, 'Demo only: nothing was booked. ' + fmtDay(selDate) + ' at ' + selTime + ' ET is highlighted.');
  });
  renderDays(); renderChips();

  // Bake after fonts settle (layout is final), then only when the glass changes size.
  var optT;
  function queueOptics(){ clearTimeout(optT); optT = setTimeout(function(){ refreshOptics(false); }, 140); }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ refreshOptics(false); }); else refreshOptics(false);
  if('ResizeObserver' in window) new ResizeObserver(queueOptics).observe(stageWrap);
  else window.addEventListener('resize', queueOptics);

})();
