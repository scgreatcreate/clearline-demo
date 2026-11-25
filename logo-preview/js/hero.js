/* ClearLine homepage hero: the flow-field canvas, finding chips and the intro timeline. Needs GSAP and site.js. */
(function(){
  'use strict';
  var hasGsap = typeof window.gsap !== 'undefined';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  var navBrand = window.ClearLine.navBrand, applyClip = window.ClearLine.applyClip;

  /* ================= HERO FLOW FIELD (canvas) ================= */
  var hero = document.querySelector('.hero');
  var cv = document.getElementById('flow');
  var ctx = cv.getContext('2d');
  var tagEls = Array.prototype.slice.call(document.querySelectorAll('.tag'));
  var W=0,H=0,DPR=1,mobile=false,N=0,S=0,pts=null;
  var state = { time:0, reveal:0, scanX:-9999, scanA:0 };
  var nodes = [];   // {t,u,el,status,on,ping,x,y}
  var parts = [];
  var running = true, lastT = 0;

  var NODE_DEF = {
    desk:  { op1:{t:.62,side:'up'}, op3:{t:.71,side:'down'}, ster:{t:.81,side:'up'}, sds:{t:.91,side:'down'} },
    // phone: four points spread along the whole sweep; chips go above the line early on, below it later
    mob:   { op1:{t:.24,side:'up'}, ster:{t:.44,side:'up'}, op3:{t:.62,side:'down'}, sds:{t:.84,side:'down'} }
  };
  var labelEl = document.querySelector('.tags-label');
  var band = { y0:0, y1:0, R:0 };     // phone: the free band below the CTAs that the line sweeps through

  function ease3(t){ return t*t*(3-2*t); }
  // Wave sizes. A drives the strand ripple (the vein's expand/contract and part of the float); B is the slow
  // whole-bundle float. Desktop: both from the hero height. Phone: the ripple scales with the band (~1.85x the
  // old phone value), and B tops the bright line's float up to ~9px each way on every phone size.
  var PHONE_FLOAT = 9;
  function waveA(){ return mobile ? band.R*1.15 : H; }
  function waveB(){ return mobile ? Math.max(2, PHONE_FLOAT - band.R*1.15*0.013*0.83) : H*0.008; }
  function curve(t,u,time,out,still){
    var x, y, cy, sp, A = waveA(), B = waveB();
    if(!mobile){
      x = -0.06*W + t*1.12*W;
      cy = H*(0.97 - 0.64*ease3(t));
      sp = H*(0.62*(1-t)*(1-t) + 0.055 + 0.11*t*t*t);
    } else {
      // the same rising sweep as desktop, "zoomed out" into the band under the CTAs:
      // enters below the bottom-left corner and rises to the top-right of the band
      var R = band.R;
      x = -0.10*W + t*1.20*W;
      cy = band.y0 + R*(1.02 - 0.90*ease3(t));
      sp = R*(0.34*(1-t)*(1-t) + 0.045 + 0.09*t*t*t);
    }
    var wave = still ? 0 : Math.sin(t*6.5 - time*0.32 + u*2.4) * A*0.013 * (0.35+u) + Math.sin(t*2.2 + time*0.18)*B;
    y = cy + sp*(u-0.5) + wave;
    out[0]=x; out[1]=y;
  }
  // vertical extent of the bundle (all strands, all wave phases) across an x range
  function bandAt(xa, xb, pad){
    // the still bundle (no wave), plus the largest the float can ever reach either way
    var tmp=[0,0], top=1e9, bot=-1e9, slack = waveA()*0.013*1.35 + waveB() + (pad||0);
    if(!mobile) slack *= 2;                   // desktop: unchanged from before
    for(var k=0;k<=8;k++){
      var x = xa + (xb-xa)*k/8, t = mobile ? (x + 0.10*W)/(1.20*W) : (x + 0.06*W)/(1.12*W);
      t = Math.max(0, Math.min(1, t));
      curve(t, 0, 0, tmp, mobile); var a = tmp[1]; curve(t, 1, 0, tmp, mobile); var b = tmp[1];
      top = Math.min(top, Math.min(a,b) - slack); bot = Math.max(bot, Math.max(a,b) + slack);
    }
    return { top:top, bot:bot };
  }
  function overlaps(a, b, m){ return a.l < b.l + b.w + m && b.l < a.l + a.w + m && a.t < b.t + b.h + m && b.t < a.t + a.h + m; }

  // Phones: the hero's trust line sits under the CTAs and the line band starts below it. It is kept only when it costs
  // no finding chip (and the band keeps its 190px minimum); otherwise the copy at the top of "What we check" stands in.
  function layout(){
    layoutOnce(true);
    if(mobile && hero.classList.contains('trust-on')){
      var withTrust = nodes.length;
      layoutOnce(false);
      if(withTrust >= nodes.length) layoutOnce(true);
    }
  }
  function layoutOnce(allowTrust){
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    mobile = W < 760;
    if(mobile){
      // the band starts just under the CTAs (offset-based: unaffected by the intro transforms)
      var copy = document.querySelector('.hero-copy'), ctas = document.querySelector('.hero-ctas');
      var ctaBottom = copy.offsetTop + ctas.offsetTop + ctas.offsetHeight;
      var trust = copy.querySelector('.hero-trust');
      hero.classList.toggle('trust-on', !!(allowTrust && trust));
      var trustBottom = trust ? copy.offsetTop + trust.offsetTop + trust.offsetHeight : 0;
      if(allowTrust && trust && H - (trustBottom + 12) >= 190) ctaBottom = trustBottom;
      else hero.classList.remove('trust-on');
      band.y0 = Math.min(ctaBottom + 12, H - 190); band.y1 = H - 8; band.R = band.y1 - band.y0;
      hero.style.setProperty('--scrim-end', ((ctaBottom + 6)/H*100).toFixed(2)+'%');
    } else { hero.style.removeProperty('--scrim-end'); hero.classList.remove('trust-on'); }
    DPR = Math.min(window.devicePixelRatio||1, mobile?2:1.75);   // phones: 2 (was 1.5): finer sub-pixel motion on 3x screens
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    N = mobile ? 26 : 44;
    S = mobile ? 56 : 96;
    pts = new Float32Array(N*(S+1)*2);
    // particles: keep the existing ones when the count is unchanged (no visible re-shuffle on re-layout)
    var P = mobile ? 40 : 110;
    if(parts.length !== P){ parts = []; for(var i=0;i<P;i++) parts.push({ i:Math.floor(Math.random()*N), t:Math.random(), v:0.018+Math.random()*0.03, s:Math.random() }); }
    // nodes + tag placement
    var defs = mobile ? NODE_DEF.mob : NODE_DEF.desk;
    var old = {}; nodes.forEach(function(n){ old[n.key]=n; });
    nodes = [];
    var tmp=[0,0], placed = [];
    tagEls.forEach(function(el){
      var key = el.dataset.key, d = defs[key];
      if(!d){ el.style.display='none'; return; }
      el.style.display='';
      var n = old[key] || { on:0, ping:0, shown:false };
      n.key=key; n.el=el; n.t=d.t; n.u=0.5; n.side=d.side; n.fix = el.classList.contains('fix');
      curve(n.t, n.u, 0, tmp); n.x=tmp[0]; n.y=tmp[1];
      var tw = el.offsetWidth, th = el.offsetHeight, left, top;
      if(!mobile){
        left = Math.max(W*0.565, Math.min(n.x - tw*0.5, W - tw - 28));
        top = d.side==='up' ? n.y - th - 79 : n.y + 73;                  // 15px more air from the line (the star)
        top = Math.max(96, Math.min(top, H - th - 70));
        n.ty = d.side==='up' ? top + th : top;
      } else {
        // try positions around the node, on its preferred side first; never on the line, never on another chip
        var best = null, gap, sides = d.side==='up' ? ['up','down'] : ['down','up'];
        var xs = [n.x - tw*0.5, n.x - tw + 22, n.x - 22];
        for(var sx = 14; sx <= W - tw - 14; sx += 12) xs.push(sx);          // sweep the width: closest clean spot wins
        // 14px of air from the floating line; small screens fall back to 12 rather than lose the card
        for(var gi=0, gaps=[14,12]; gi<gaps.length && !best; gi++){ gap = gaps[gi];
        for(var si=0; si<sides.length && !best; si++){
          for(var xi=0; xi<xs.length; xi++){
            var L = Math.max(14, Math.min(xs[xi], W - tw - 14)), b = bandAt(L, L + tw, 0);
            var T = sides[si]==='up' ? b.top - th - gap : b.bot + gap;
            if(T < band.y0 + 4 || T + th > H - 10) continue;                   // clear air under the CTAs
            var cand = { l:L, t:T, w:tw, h:th, side:sides[si] };
            // its leader (a vertical drop from the chip edge to the point) must not run through another chip,
            // and the chip must not sit on an earlier leader
            var lx = Math.max(L + 14, Math.min(n.x, L + tw - 14)), ly0 = sides[si]==='up' ? T + th : n.y, ly1 = sides[si]==='up' ? n.y : T;
            var lead = { l:lx - 3, t:Math.min(ly0, ly1), w:6, h:Math.abs(ly1 - ly0) };
            if(placed.some(function(p){ return overlaps(p, cand, 8) || (!p.lead && overlaps(p, lead, 2)) || (p.lead && overlaps(p, cand, 4)); })) continue;
            cand.leadRect = lead;
            var score = Math.abs((L + tw/2) - n.x) + Math.abs((T + th/2) - n.y)*1.5 + (si ? 400 : 0);   // stay close to its point
            if(!best || score < best.score){ best = cand; best.score = score; }
          }
        }
        }
        if(!best){ el.style.display='none'; return; }     // no clean spot on this screen: leave it out
        placed.push(best); placed.push({ l:best.leadRect.l, t:best.leadRect.t, w:best.leadRect.w, h:best.leadRect.h, lead:true });
        left = best.l; top = best.t; n.side = best.side;
        n.ty = best.side==='up' ? top + th : top;
      }
      el.style.left = left+'px'; el.style.top = top+'px';
      n.tx = mobile ? Math.max(left + 14, Math.min(n.x, left + tw - 14)) : left + tw*0.5;
      n.rect = {l:left,t:top,w:tw,h:th};
      nodes.push(n);
    });
    placeLabel();
    if(!running || reduceMQ.matches) draw(0);
  }
  // The caption sits with the cards (never on the line): under the lowest card that is below the line,
  // else above the highest card that is above it.
  function placeLabel(){
    if(!labelEl) return;
    var lw = labelEl.offsetWidth, lh = labelEl.offsetHeight, cand = [];
    nodes.forEach(function(n){
      var r = n.rect;
      if(n.side === 'down'){ cand.push({ l: mobile ? r.l + r.w - lw : r.l + 2, t: r.t + r.h + 8, w:lw, h:lh, pri: -r.t }); }
      else { cand.push({ l: r.l + 2, t: r.t - lh - 7, w:lw, h:lh, pri: 1e5 + r.t }); }
    });
    cand.sort(function(a,b){ return a.pri - b.pri; });
    var others = nodes.map(function(n){ return n.rect; }).map(function(r){ return { l:r.l, t:r.t, w:r.w, h:r.h }; });
    for(var i=0;i<cand.length;i++){
      var c = cand[i]; c.l = Math.max(14, Math.min(c.l, W - lw - 14));
      if(c.t < (mobile ? band.y0 - 4 : 90) || c.t + lh > H - 8) continue;
      var b = bandAt(c.l, c.l + lw, 6);
      if(!(c.t + lh < b.top || c.t > b.bot)) continue;
      if(others.some(function(o){ return overlaps(o, c, 4); })) continue;
      labelEl.style.left = c.l + 'px'; labelEl.style.top = c.t + 'px'; labelEl.style.display = '';
      return;
    }
    // fallback: bottom-right corner, which the rising line never reaches on desktop
    labelEl.style.left = (W - lw - (mobile ? 14 : 48)) + 'px'; labelEl.style.top = (H - lh - (mobile ? 10 : 34)) + 'px';
  }

  function computePoints(){
    var tmp=[0,0], k=0, rv = state.reveal;
    for(var i=0;i<N;i++){
      var u = i/(N-1);
      for(var s=0;s<=S;s++){
        var t = (s/S)*rv;
        curve(t,u,state.time,tmp);
        pts[k++]=tmp[0]; pts[k++]=tmp[1];
      }
    }
  }
  function strokeLines(alphaFn){
    var k=0;
    for(var i=0;i<N;i++){
      var u=i/(N-1);
      ctx.globalAlpha = alphaFn(u);
      ctx.beginPath();
      ctx.moveTo(pts[k],pts[k+1]); k+=2;
      for(var s=1;s<=S;s++){ ctx.lineTo(pts[k],pts[k+1]); k+=2; }
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  function lineAlpha(u){ var c = 1-Math.abs(u-0.5)*2; return 0.14 + 0.52*Math.pow(c,1.4); }

  function draw(dt){
    state.time += dt;
    ctx.clearRect(0,0,W,H);
    if(state.reveal<=0.001) return;
    computePoints();

    // 1) base lines
    var g = ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'rgba(0,128,212,0.30)');
    g.addColorStop(0.45,'rgba(0,140,232,0.85)');
    g.addColorStop(0.8,'rgba(1,148,253,1)');
    g.addColorStop(1,'rgba(184,230,249,0.8)');
    ctx.strokeStyle = g; ctx.lineWidth = mobile?0.9:1;
    strokeLines(lineAlpha);

    // 1b) the clear line: one brighter, continuous stroke through the bundle (brand swoosh)
    var mid = Math.floor((N-1)/2), k0 = mid*(S+1)*2;
    var cg = ctx.createLinearGradient(0,0,W,0);
    cg.addColorStop(0,'rgba(184,230,249,0)'); cg.addColorStop(0.3,'rgba(184,230,249,0.55)');
    cg.addColorStop(0.75,'rgba(230,247,255,0.95)'); cg.addColorStop(1,'rgba(184,230,249,0.6)');
    // Glow drawn as layered wide, faint strokes (no shadowBlur: canvas shadows are very slow in Safari and
    // were the main per-frame cost on iPhone). Coordinates stay floats: no snapping, so slow motion stays smooth.
    ctx.beginPath(); ctx.moveTo(pts[k0],pts[k0+1]);
    for(var s1=1;s1<=S;s1++){ ctx.lineTo(pts[k0+s1*2],pts[k0+s1*2+1]); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(1,148,253,0.10)'; ctx.lineWidth = mobile?9:12; ctx.stroke();
    ctx.strokeStyle = 'rgba(1,148,253,0.18)'; ctx.lineWidth = mobile?5:6.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(92,192,255,0.30)'; ctx.lineWidth = mobile?2.6:3.2; ctx.stroke();
    ctx.strokeStyle = cg; ctx.lineWidth = mobile?1.3:1.6; ctx.stroke();

    // 2) scan plane: brighten what it reads
    var sx = state.scanX, sa = state.scanA;
    if(sa>0.01){
      var R = mobile?70:130;
      ctx.save();
      ctx.beginPath(); ctx.rect(sx-R,0,R*2,H); ctx.clip();
      var hg = ctx.createLinearGradient(sx-R,0,sx+R,0);
      hg.addColorStop(0,'rgba(184,230,249,0)');
      hg.addColorStop(0.5,'rgba(220,244,255,1)');
      hg.addColorStop(1,'rgba(184,230,249,0)');
      ctx.strokeStyle = hg; ctx.lineWidth = mobile?1:1.15;
      strokeLines(function(u){ return sa*(0.25+0.75*lineAlpha(u)); });
      ctx.restore();
      // glow band + hairline
      var bg = ctx.createLinearGradient(sx-90,0,sx+90,0);
      bg.addColorStop(0,'rgba(1,148,253,0)'); bg.addColorStop(0.5,'rgba(1,148,253,'+(0.09*sa)+')'); bg.addColorStop(1,'rgba(1,148,253,0)');
      ctx.fillStyle = bg; ctx.fillRect(sx-90,0,180,H);
      var vg = ctx.createLinearGradient(0,0,0,H);
      vg.addColorStop(0,'rgba(184,230,249,0)'); vg.addColorStop(0.35,'rgba(184,230,249,'+(0.55*sa)+')');
      vg.addColorStop(0.75,'rgba(184,230,249,'+(0.7*sa)+')'); vg.addColorStop(1,'rgba(184,230,249,0)');
      ctx.fillStyle = vg; ctx.fillRect(sx-0.5,0,1,H);
    }

    // 3) particles (water moving through the lines)
    var tmp=[0,0];
    for(var p=0;p<parts.length;p++){
      var q = parts[p];
      q.t += q.v*dt*(0.6+state.reveal*0.4);
      if(q.t>1) q.t -= 1;
      if(q.t > state.reveal) continue;
      var u = q.i/(N-1);
      curve(q.t,u,state.time,tmp);
      var d = Math.abs(tmp[0]-sx), near = sa>0 ? Math.max(0,1-d/120)*sa : 0;
      ctx.globalAlpha = (0.18 + 0.5*lineAlpha(u)) * (0.5+0.5*q.t) + near*0.8;
      ctx.fillStyle = near>0.2 ? '#E6F7FF' : '#7FD0FF';
      ctx.beginPath(); ctx.arc(tmp[0],tmp[1], 0.9 + q.s*0.9 + near*1.4, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha=1;

    // 4) sample nodes + leaders
    for(var n=0;n<nodes.length;n++){
      var nd = nodes[n];
      if(nd.t > state.reveal) continue;
      curve(nd.t,nd.u,state.time,tmp); nd.x=tmp[0]; nd.y=tmp[1];
      var col = nd.fix ? '242,184,75' : '92,192,255';
      var on = nd.on;
      // leader
      if(on>0.01){
        ctx.strokeStyle='rgba(184,230,249,'+(0.32*on)+')'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(nd.x, nd.y + (nd.ty>nd.y?7:-7));
        var ex = nd.tx, ey = nd.ty;
        var midY = nd.y + (ey-nd.y)*0.55;
        ctx.lineTo(nd.x, midY); ctx.lineTo(ex, midY + (ey-midY)*0.0); ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      // ring + core
      var pulse = nd.fix && on>0.5 ? (0.5+0.5*Math.sin(state.time*2.2)) : 0;
      ctx.strokeStyle='rgba('+(on>0.01?col:'184,230,249')+','+(0.35+0.4*on)+')'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(nd.x,nd.y,6+pulse*2,0,6.2832); ctx.stroke();
      ctx.fillStyle='rgba('+(on>0.01?col:'184,230,249')+',1)';
      ctx.beginPath(); ctx.arc(nd.x,nd.y,2.4,0,6.2832); ctx.fill();
      if(nd.ping>0 && nd.ping<1){
        ctx.strokeStyle='rgba('+col+','+(0.6*(1-nd.ping))+')';
        ctx.beginPath(); ctx.arc(nd.x,nd.y,6+nd.ping*26,0,6.2832); ctx.stroke();
      }
    }
  }

  /* ?debug=1 : a small overlay with real FPS, worst frame over the last 2s, draw cost, canvas size and DPR */
  var DEBUG = /[?&]debug=1(&|$)/.test(location.search), dbgEl = null, dbgFrames = [], dbgShown = 0;
  if(DEBUG){
    dbgEl = document.createElement('div');
    dbgEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;font:11px/1.4 ui-monospace,Menlo,monospace;color:#9fffb0;background:rgba(0,0,0,.78);padding:6px 9px;border-radius:7px;pointer-events:none;white-space:pre';
    document.body.appendChild(dbgEl);
  }
  function debugTick(ts, frameMs, drawMs){
    dbgFrames.push([ts, frameMs, drawMs]);
    while(dbgFrames.length && ts - dbgFrames[0][0] > 2000) dbgFrames.shift();
    if(ts - dbgShown < 500) return; dbgShown = ts;
    var n1 = 0, worst = 0, dsum = 0, dmax = 0;
    dbgFrames.forEach(function(f){ if(ts - f[0] <= 1000) n1++; worst = Math.max(worst, f[1]); dsum += f[2]; dmax = Math.max(dmax, f[2]); });
    dbgEl.textContent = 'fps ' + n1 + '   worst frame (2s) ' + worst.toFixed(1) + 'ms\n' +
      'draw avg ' + (dsum/dbgFrames.length).toFixed(2) + 'ms  max ' + dmax.toFixed(1) + 'ms\n' +
      'canvas ' + cv.width + 'x' + cv.height + '  DPR ' + DPR + ' (device ' + (window.devicePixelRatio||1) + ')\n' +
      'hero ' + Math.round(W) + 'x' + Math.round(H) + (mobile ? '  phone' : '  desktop');
  }
  function loop(ts){
    if(!running){ lastT=0; return; }
    var dt = lastT ? Math.min((ts-lastT)/1000, 0.05) : 0.016, frameMs = lastT ? ts - lastT : 16.7;
    lastT = ts;
    if(DEBUG){ var t0 = performance.now(); draw(dt); debugTick(ts, frameMs, performance.now() - t0); }
    else draw(dt);
    requestAnimationFrame(loop);
  }
  function start(){ if(!running){ running=true; requestAnimationFrame(loop);} }
  function stop(){ running=false; }

  /* Tag reveal (GSAP) */
  function revealTag(n){
    if(n.shown) return; n.shown = true;
    if(!hasGsap){ n.on=1; n.el.style.opacity=1; return; }
    gsap.fromTo(n.el,{autoAlpha:0,y:n.side==='up'?8:-8},{autoAlpha:1,y:0,duration:.8,ease:'power3.out'});
    gsap.to(n,{on:1,duration:.6,ease:'power2.out'});
    gsap.fromTo(n,{ping:0},{ping:1,duration:1.1,ease:'power2.out'});
    var num = n.el.querySelector('.n'), target = parseFloat(n.el.dataset.value);
    if(num && target){
      var o={v:0};
      gsap.to(o,{v:target,duration:.9,ease:'power2.out',onUpdate:function(){ num.textContent=Math.round(o.v); }});
    }
  }
  function onScan(prevX){
    var x = state.scanX;
    nodes.forEach(function(n){
      if(x >= n.x && prevX < n.x){
        if(!n.shown) revealTag(n);
        else gsap.fromTo(n,{ping:0},{ping:1,duration:1.1,ease:'power2.out'});
      }
    });
  }

  /* ================= INIT (hero part) ================= */
  layout();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ layout(); });
  // iOS fires 'resize' whenever the toolbar collapses or expands while scrolling. The hero is 100svh, so its
  // height doesn't change: on touch devices only a WIDTH change (or rotation) re-lays out the hero.
  var rto, lastW = window.innerWidth, touchUI = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  function relayout(){ lastW = window.innerWidth; layout(); }
  window.addEventListener('resize', function(){
    if(touchUI && Math.abs(window.innerWidth - lastW) < 1) return;
    clearTimeout(rto); rto = setTimeout(relayout, 120);
  });
  window.addEventListener('orientationchange', function(){ clearTimeout(rto); rto = setTimeout(relayout, 250); });
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){ if(reduceMQ.matches) return; e.isIntersecting?start():stop(); }); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function(){ if(reduceMQ.matches) return; document.hidden?stop():start(); });

  // split headline into words for a calm word-by-word rise
  var h1 = document.getElementById('headline');
  h1.innerHTML = h1.textContent.trim().split(/\s+/).map(function(w){ return '<span class="w">'+w+'</span>'; }).join(' ');

  function stillHero(){
    // Reduced motion: a composed still frame, everything legible, scan resting mid-read.
    running = false;
    state.reveal = 1; state.time = 2.0; state.scanA = 0.85;
    nodes.forEach(function(n){ n.on=1; n.shown=true; n.ping=0; n.el.style.opacity=1; n.el.style.visibility='visible'; n.el.style.transform='none'; });
    var nd = nodes[Math.min(1,nodes.length-1)];
    state.scanX = nd ? nd.x + (mobile?24:90) : W*0.7;
    document.documentElement.classList.remove('pre');
    draw(0);
  }

  if(!hasGsap){
    document.documentElement.classList.remove('pre');
    state.reveal=1;
    nodes.forEach(function(n){ n.on=1; n.shown=true; });
    state.scanX = W*0.72; state.scanA=.7;
    if(reduceMQ.matches) draw(0); else requestAnimationFrame(loop);
  } else {
    var mm = gsap.matchMedia();
    mm.add({ motion:'(prefers-reduced-motion: no-preference)', reduce:'(prefers-reduced-motion: reduce)' }, function(c){
      if(c.conditions.reduce){
        stillHero();
        window.addEventListener('resize', function(){ setTimeout(stillHero,160); });
        return;
      }
      running = true; requestAnimationFrame(loop);
      gsap.set(tagEls,{autoAlpha:0});
      gsap.set('.tags-label',{autoAlpha:0});
      document.documentElement.classList.remove('pre');

      var tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
      tl.to(state,{ reveal:1, duration:2.4, ease:'power2.inOut' }, 0)
        .from('.topbar',{ autoAlpha:0, y:-10, duration:.9 }, .2)
        .from('.kicker',{ autoAlpha:0, y:12, duration:.8 }, .35)
        .from('#headline .w',{ autoAlpha:0, y:'0.45em', duration:1, stagger:.035 }, .45)
        .from('.hero-sub',{ autoAlpha:0, y:14, duration:.9 }, .9)
        .from('.hero-ctas > *',{ autoAlpha:0, y:12, duration:.8, stagger:.08 }, 1.05)
        .from('.hero-trust',{ autoAlpha:0, duration:.8 }, 1.25)
        .from('.cue',{ autoAlpha:0, duration:.8 }, 2.2)
        .add(scanLoop, 1.5);

      // Navbar rule draws itself in once, from under the "r" outward, then stays.
      navBrand._rule = { p:0 }; applyClip(navBrand);
      gsap.to(navBrand._rule, { p:1, duration:1.2, ease:'power2.inOut', delay:1.0, onUpdate:function(){ applyClip(navBrand); } });

      function scanLoop(){
        var x0 = mobile ? -20 : W*0.44, x1 = W+40;
        var prev = x0;
        state.scanX = x0;
        var s = gsap.timeline({ repeat:-1, repeatDelay:2.6 });
        s.to(state,{ scanA:1, duration:.6, ease:'power1.out' }, 0)
         .fromTo(state,{ scanX:x0 },{ scanX:x1, duration: mobile?5.2:6.4, ease:'sine.inOut',
            onUpdate:function(){ onScan(prev); prev = state.scanX; },
            onRepeat:function(){ prev = x0; } }, 0)
         .to(state,{ scanA:0, duration:.9, ease:'power1.in' }, '-=1.0');
        s.eventCallback('onRepeat', function(){ prev = x0; });
        gsap.to('.tags-label',{ autoAlpha:1, duration:1, delay:4 });
        return s;
      }
      return function(){ stop(); };
    });
  }

})();
