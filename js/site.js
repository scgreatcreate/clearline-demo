/* ClearLine: shared page script (brand rule, the water depth system, FAQ accordion). Runs on every page.
   Moved out of index.html unchanged; the hero (hero.js) uses navBrand/applyClip through window.ClearLine. */
(function(){
  'use strict';
  // iOS Safari only applies :active (the press-sink) when a touch listener exists on the page
  document.addEventListener('touchstart', function(){}, { passive:true });
  /* ================= BRAND RULE =================
     A tapered line from the center of the "l" in Clear to the center of the last "e" in Line (symmetric
     about the r/L join). Equal optical gaps: the line sits exactly halfway between the baseline of
     "ClearLine" (no descenders) and the cap tops of "DENTAL COMPLIANCE", measured from real font metrics. */
  // Rendered as a tapered SVG path: compared against an elliptical radial-gradient element at 1x/2x/3x, the path was crisper.
  var brands = Array.prototype.slice.call(document.querySelectorAll('.brand'));
  var navBrand = document.getElementById('navBrand');
  var mctx = document.createElement('canvas').getContext('2d');
  function glyphBox(node, i){ var r = document.createRange(); r.setStart(node,i); r.setEnd(node,i+1); return r.getBoundingClientRect(); }
  function applyClip(b){
    if(!b._g) return;
    var g = b._g, p = b._rule ? b._rule.p : 1;
    g.rect.setAttribute('x', (g.xc - (g.xc-g.x0)*p).toFixed(2)); g.rect.setAttribute('width', ((g.x1-g.x0)*p).toFixed(2));
  }
  // Real baseline of a text element: a zero-size inline-block sits exactly on it.
  function baselineOf(el){
    var p = el.querySelector('i.bl');
    if(!p){ p = document.createElement('i'); p.className = 'bl'; p.setAttribute('aria-hidden','true');
      p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;overflow:hidden'; el.appendChild(p); }
    return p.getBoundingClientRect().top;
  }
  function inkMetrics(el, sample){
    var cs = getComputedStyle(el);
    mctx.font = cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    var m = mctx.measureText(sample);
    return { asc: m.actualBoundingBoxAscent || parseFloat(cs.fontSize)*.72, desc: m.actualBoundingBoxDescent || 0 };
  }
  function fitRule(b, idx){
    var rule = b.querySelector('.brand-rule'); if(!rule) return;
    var nameEl = b.querySelector('.brand-name'), tagEl = b.querySelector('.brand-tag');
    var c = b.querySelector('.brand-name .c').firstChild, l = b.querySelector('.brand-name .l').firstChild;
    var fs = parseFloat(getComputedStyle(nameEl).fontSize);
    var dpr = window.devicePixelRatio || 1;
    // thinner rule: peak ~1.2px on the phone lockup, ~1.5px on desktop, a whole number of device pixels
    // phone (approved, unchanged): whole device pixels. Desktop: no hard minimum, a thin anti-aliased lens ~1.4px at peak
    var phoneLockup = window.innerWidth < 760;
    var Td = phoneLockup ? Math.max(2, Math.round(fs * .06 * dpr)) : fs * .056 * dpr, T = Td/dpr;
    // equal optical gaps, measured ink to ink: bottom of "ClearLine" -> rule -> cap tops of DENTAL COMPLIANCE
    var g = Math.max(2.5, fs * .15);
    var nInk = inkMetrics(nameEl, 'ClearLine'), tInk = inkMetrics(tagEl, 'DENTAL COMPLIANCE');
    rule.style.height = ''; rule.style.marginTop = rule.style.marginBottom = '0px'; b.querySelector('.brand-type').style.transform = '';
    var inkBottom = baselineOf(nameEl) + nInk.desc, inkTop = baselineOf(tagEl) - tInk.asc;
    var h0 = rule.getBoundingClientRect().height;
    rule.style.height = Math.max(0, h0 + (2*g + T) - (inkTop - inkBottom)).toFixed(2) + 'px';
    inkBottom = baselineOf(nameEl) + nInk.desc; inkTop = baselineOf(tagEl) - tInk.asc;
    // crisp AND equal: the midpoint between the inks is where the rule goes; nudge the whole text block by
    // under half a device pixel so that midpoint sits on the pixel grid (gaps stay exactly equal)
    var ideal = (inkBottom + inkTop)/2 * dpr, snapped = phoneLockup ? ((Td % 2) ? Math.floor(ideal) + .5 : Math.round(ideal)) : ideal;
    var typeEl = b.querySelector('.brand-type');
    typeEl.style.transform = Math.abs(snapped - ideal) > .01 ? 'translateY(' + ((snapped - ideal)/dpr).toFixed(3) + 'px)' : '';
    var sr = rule.getBoundingClientRect(); if(!sr.width) return;
    var cy = snapped/dpr - sr.top;
    // span: left edge of the "l" in Clear to the right edge of the last "e" in Line
    var gl = glyphBox(c,1), ge = glyphBox(l,3);
    var x0 = gl.left - sr.left, x1 = ge.right - sr.left;
    // desktop: both ends on whole device pixels, so the two tips anti-alias identically (mirror images)
    if(!phoneLockup){ x0 = Math.round(gl.left*dpr)/dpr - sr.left; x1 = Math.round(ge.right*dpr)/dpr - sr.left; }
    var xc = (x0 + x1)/2, hw = (x1 - x0)/2;
    // one smooth lens profile (gaussian-like): thickest at the center, thinning continuously to the tips
    // Desktop: the geometry never gets thinner than ~0.7 device px (sub-pixel-thin tips anti-alias unevenly in
    // Chrome: a flat 6px "second tip" at 1x). Below that, the gradient's alpha carries the thinning instead
    // (alpha x thickness = the same ink per column, so the look is unchanged).
    var hMin = phoneLockup ? 0 : .35/dpr;
    var lens = function(s){ return (T/2) * Math.pow(Math.max(0, 1 - s*s), 1.6); };
    var K = 48, topPts = [], botPts = [], f = function(v){ return v.toFixed(2); };
    for(var k=0;k<=K;k++){
      var s = -1 + 2*k/K, half = Math.max(hMin, lens(s)), x = xc + s*hw;
      topPts.push(f(x)+' '+f(cy - half)); botPts.unshift(f(x)+' '+f(cy + half));
    }
    var d = 'M' + topPts.join(' L') + ' L' + botPts.join(' L') + ' Z';
    var light = b.classList.contains('brand-light');
    var end = light ? '#0070C0' : '#5CC0FF', mid = light ? '#1E9BFF' : '#E2F5FF', id = 'br' + idx;
    var stops;
    if(phoneLockup){
      stops = '<stop offset="0" stop-color="'+end+'" stop-opacity="0"/><stop offset=".2" stop-color="'+end+'" stop-opacity=".85"/>'+
        '<stop offset=".5" stop-color="'+mid+'" stop-opacity="1"/><stop offset=".8" stop-color="'+end+'" stop-opacity=".85"/>'+
        '<stop offset="1" stop-color="'+end+'" stop-opacity="0"/>';
    } else {
      // desktop: 21 stops on eased curves: a continuous tip fade (no bands), color easing from the end tone
      // into the mid tone, and a subtle bright core at the center
      var core = light ? '#4FB4FF' : '#F6FCFF', hx = function(h){ var n = parseInt(h.slice(1),16); return [n>>16&255, n>>8&255, n&255]; };
      var cE = hx(end), cM = hx(mid), cC = hx(core), mixc = function(a,b2,t){ return 'rgb('+[0,1,2].map(function(i){ return Math.round(a[i]+(b2[i]-a[i])*t); }).join(',')+')'; };
      stops = '';
      for(var si=0; si<=60; si++){
        var o = si/60, dd = Math.abs(o - .5)*2;                                     // 0 at the center, 1 at the tips
        var alpha = Math.pow(Math.max(0, 1 - Math.pow(dd, 2.2)), 1.35);             // smooth, continuous fade to the tips
        alpha *= lens(dd) / Math.max(hMin, lens(dd));                               // the thinning the geometry no longer does
        var tm = Math.min(1, Math.max(0, (dd - .06)/.7)); tm = tm*tm*(3 - 2*tm);    // mid tone near the center, end tone outward
        var col = dd < .14 ? mixc(cC, cM, dd/.14) : mixc(cM, cE, tm);
        stops += '<stop offset="'+o.toFixed(3)+'" stop-color="'+col+'" stop-opacity="'+alpha.toFixed(3)+'"/>';
      }
    }
    rule.innerHTML = '<svg aria-hidden="true"><defs><linearGradient id="'+id+'g" gradientUnits="userSpaceOnUse" x1="'+f(x0)+'" y1="0" x2="'+f(x1)+'" y2="0">'+
        stops + '</linearGradient>'+
      '<clipPath id="'+id+'c"><rect y="-8" height="'+f(sr.height+16)+'" x="0" width="0"/></clipPath></defs>'+
      '<path clip-path="url(#'+id+'c)" fill="url(#'+id+'g)" d="'+d+'"/></svg>';
    b._g = { x0:x0-1, x1:x1+1, xc:xc, rect: rule.querySelector('rect') };
    applyClip(b);
  }
  function fitRules(){ brands.forEach(fitRule); }

  /* ================= THE WATER: one continuous gradient through every zone =================
     Anchors come from the depth map (each zone's --from / --land at --settle / --land at --sink / --to).
     A monotone cubic (Fritsch-Carlson) runs through all anchors in oklab, so the slope is continuous
     across section edges (no Mach bands). Sampled every 12px into ONE gradient, plus a static dither. */
  var waterEl = document.getElementById('water');
  function hex2rgb(s){ s = s.trim(); var m = s.match(/^#([0-9a-f]{6})$/i); if(m){ var n = parseInt(m[1],16); return [n>>16&255,n>>8&255,n&255]; }
    m = s.match(/rgba?\(([^)]+)\)/); if(m){ var p = m[1].split(/[ ,/]+/).map(parseFloat); return [p[0],p[1],p[2]]; } return null; }
  function lin(c){ c/=255; return c <= .04045 ? c/12.92 : Math.pow((c+.055)/1.055, 2.4); }
  function delin(c){ c = c <= .0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4) - .055; return Math.max(0, Math.min(255, c*255)); }
  function toLab(rgb){ var r=lin(rgb[0]), g=lin(rgb[1]), b=lin(rgb[2]);
    var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s]; }
  function fromLab(L){ var l=Math.pow(L[0]+.3963377774*L[1]+.2158037573*L[2],3), m=Math.pow(L[0]-.1055613458*L[1]-.0638541728*L[2],3), s=Math.pow(L[0]-.0894841775*L[1]-1.2914855480*L[2],3);
    return [delin(4.0767416621*l-3.3077115913*m+.2309699292*s), delin(-1.2684380046*l+2.6097574011*m-.3413193965*s), delin(-.0041960863*l-.7034186147*m+1.7076147010*s)]; }
  // lengths from the depth map: "120px", "50%", or a simple calc() of those (e.g. calc(100% - 120px))
  function lenPx(v, total){
    v = (v||'').trim(); if(!v) return 0;
    if(/^calc\(/.test(v)){
      var expr = v.replace(/^calc\(|\)$/g,'').replace(/(-?[\d.]+)%/g, function(m,n){ return '('+(n*total/100)+')'; }).replace(/px/g,'');
      if(/^[\d.\s+\-*/()]+$/.test(expr)){ try { return Function('"use strict";return ('+expr+')')() || 0; } catch(e){ return 0; } }
      return 0;
    }
    return /%$/.test(v) ? parseFloat(v)/100*total : (parseFloat(v)||0);
  }
  // monotone cubic slopes (Fritsch-Carlson); flat ends so the run eases in and out
  function fcSlopes(x, y){
    var n = x.length, d = [], m = new Array(n).fill(0), i;
    for(i=0;i<n-1;i++) d.push((y[i+1]-y[i])/(x[i+1]-x[i]));
    for(i=1;i<n-1;i++){ if(d[i-1]*d[i] <= 0) m[i] = 0; else { var w1 = 2*(x[i+1]-x[i]) + (x[i]-x[i-1]), w2 = (x[i+1]-x[i]) + 2*(x[i]-x[i-1]); m[i] = (w1+w2)/(w1/d[i-1] + w2/d[i]); } }
    return m;
  }
  function hermite(x, y, m, i, t){ var h = x[i+1]-x[i], s = (t - x[i])/h, s2 = s*s, s3 = s2*s;
    return (2*s3-3*s2+1)*y[i] + (s3-2*s2+s)*h*m[i] + (-2*s3+3*s2)*y[i+1] + (s3-s2)*h*m[i+1]; }
  function ditherTile(){
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), id = x.createImageData(128,128), D = id.data;
    for(var i=0;i<D.length;i+=4){ var r = Math.random(), a = 1 + Math.random()*3.5;        // about 0.4-1.8% per pixel, half lighter, half darker: enough to break 8-bit bands, too faint to read as grain
      var v = r < .5 ? 0 : 255; D[i]=D[i+1]=D[i+2]=v; D[i+3]=a|0; }
    x.putImageData(id,0,0); return c.toDataURL('image/png');
  }
  // A zone with [data-own-water] paints its own eased gradient + dither, anchored to its own top, so it moves
  // with the zone (e.g. when the FAQ above it opens) instead of waiting for the shared water layer to rebuild.
  var ditherURL = '';
  function smoothStops(xs, cols, step){
    var labs = cols.map(toLab), ch = [0,1,2].map(function(k){ return labs.map(function(l){ return l[k]; }); });
    var ms = ch.map(function(c){ return fcSlopes(xs, c); }), total = xs[xs.length-1], out = [], seg = 0;
    for(var y = 0; y <= total + .01; y += step){
      var yy = Math.min(y, total);
      while(seg < xs.length - 2 && yy > xs[seg+1]) seg++;
      var rgb = fromLab([0,1,2].map(function(k){ return hermite(xs, ch[k], ms[k], seg, yy); }));
      out.push('rgb('+rgb[0].toFixed(1)+','+rgb[1].toFixed(1)+','+rgb[2].toFixed(1)+') '+yy.toFixed(1)+'px');
      if(yy === total) break;
    }
    return out;
  }
  var ownKey = '';
  function paintOwnWater(){
    if(!ditherURL) ditherURL = ditherTile();
    Array.prototype.forEach.call(document.querySelectorAll('.zone[data-own-water]'), function(z){
      var cs = getComputedStyle(z), from = hex2rgb(cs.getPropertyValue('--from')), land = hex2rgb(cs.getPropertyValue('--land')), to = hex2rgb(cs.getPropertyValue('--to'));
      var settle = lenPx(cs.getPropertyValue('--settle'), z.offsetHeight);
      if(!from || !land || !to || settle < 1) return;
      var key = settle + '|' + from + land;
      if(z._ownKey === key) return; z._ownKey = key;
      var stops = smoothStops([0, settle], [from, land], 10);
      z.style.backgroundImage = 'url("'+ditherURL+'"), linear-gradient(180deg,'+stops.join(',')+',rgb('+to.join(',')+') '+settle.toFixed(1)+'px)';
      z.style.backgroundSize = '128px 128px, 100% 100%'; z.style.backgroundRepeat = 'repeat, no-repeat';
    });
  }
  var waterKey = '';
  function buildWater(){
    // zones that own their water (the footer: its sink is anchored to its own top) are painted separately
    var zones = Array.prototype.slice.call(document.querySelectorAll('.zone:not([data-own-water])'));
    if(!zones.length) return;
    paintOwnWater();
    var sy = window.scrollY || window.pageYOffset || 0;
    var top0 = zones[0].getBoundingClientRect().top + sy, xs = [], cols = [];
    function add(y, col){
      var rgb = hex2rgb(col); if(!rgb) return;
      var n = xs.length;
      if(n && Math.abs(y - xs[n-1]) < .5){ cols[n-1] = rgb; return; }        // same spot: last word wins
      if(n && y < xs[n-1]) y = xs[n-1] + .5;
      xs.push(y); cols.push(rgb);
    }
    zones.forEach(function(z){
      var r = z.getBoundingClientRect(), y0 = r.top + sy - top0, h = r.height, cs = getComputedStyle(z);
      var from = cs.getPropertyValue('--from'), to = cs.getPropertyValue('--to'), land = cs.getPropertyValue('--land') || from;
      var settle = lenPx(cs.getPropertyValue('--settle'), h), sink = lenPx(cs.getPropertyValue('--sink'), h);
      add(y0, from);
      if(settle > .5) add(y0 + settle, land);
      if(sink < h - .5) add(y0 + h - sink, land);
      add(y0 + h, to);
    });
    var total = xs[xs.length-1];
    var key = Math.round(top0)+'|'+xs.map(Math.round).join(',')+'|'+window.innerWidth;
    if(key === waterKey) return; waterKey = key;
    var labs = cols.map(toLab), ch = [0,1,2].map(function(k){ return labs.map(function(l){ return l[k]; }); });
    var ms = ch.map(function(c){ return fcSlopes(xs, c); });
    var stops = [], seg = 0, STEP = 12;
    for(var y = 0; y <= total + .01; y += STEP){
      var yy = Math.min(y, total);
      while(seg < xs.length - 2 && yy > xs[seg+1]) seg++;
      var L = [0,1,2].map(function(k){ return hermite(xs, ch[k], ms[k], seg, yy); });
      var rgb = fromLab(L);
      stops.push('rgb('+rgb[0].toFixed(1)+','+rgb[1].toFixed(1)+','+rgb[2].toFixed(1)+') '+yy.toFixed(1)+'px');
      if(yy === total) break;
    }
    waterEl.style.top = top0+'px'; waterEl.style.height = total+'px';
    waterEl.style.backgroundImage = 'linear-gradient(180deg,'+stops.join(',')+')';
    if(!waterEl.style.getPropertyValue('--dither')){ if(!ditherURL) ditherURL = ditherTile(); waterEl.style.setProperty('--dither', 'url("'+ditherURL+'")'); }
    document.documentElement.classList.add('water-on');
  }
  var waterT;
  function queueWater(){ clearTimeout(waterT); waterT = setTimeout(buildWater, 120); }

  /* ================= INIT (shared part) ================= */
  fitRules();
  buildWater();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ fitRules(); buildWater(); });
  // keep the water in line with the sections whenever anything changes height (new sections, fonts, rotation)
  if('ResizeObserver' in window){ var waterRO = new ResizeObserver(queueWater); waterRO.observe(document.body); document.querySelectorAll('.zone').forEach(function(z){ waterRO.observe(z); }); }
  window.addEventListener('orientationchange', queueWater);
  window.addEventListener('load', queueWater);
  // iOS fires 'resize' whenever the toolbar collapses or expands while scrolling. The hero is 100svh, so its
  // height doesn't change: on touch devices only a WIDTH change (or rotation) re-lays out the hero.
  var rto, lastW = window.innerWidth, touchUI = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  function relayout(){ lastW = window.innerWidth; fitRules(); }
  window.addEventListener('resize', function(){
    if(touchUI && Math.abs(window.innerWidth - lastW) < 1) return;
    clearTimeout(rto); rto = setTimeout(relayout, 120);
  });
  window.addEventListener('orientationchange', function(){ clearTimeout(rto); rto = setTimeout(relayout, 250); });

  /* ================= FAQ: accessible accordion (several can be open; height via grid rows) ================= */
  Array.prototype.forEach.call(document.querySelectorAll('.qa-q'), function(btn){
    btn.addEventListener('click', function(){
      var qa = btn.closest('.qa'), open = !qa.classList.contains('open');
      qa.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  // a link to a question (e.g. "#qa2-q", the Georgia line) opens that answer, then the browser scrolls to it
  function openQA(id){
    var b = id && document.getElementById(id);
    if(!b || !b.classList.contains('qa-q')) return;
    var qa = b.closest('.qa');
    if(!qa.classList.contains('open')){ qa.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href*="#qa"]');
    if(a && a.pathname === location.pathname) openQA(a.hash.slice(1));
  });
  if(location.hash) openQA(location.hash.slice(1));
  window.addEventListener('hashchange', function(){ openQA(location.hash.slice(1)); });

  /* ================= PHONE MENU: dialog with focus trap, Esc to close, focus back to the button ================= */
  var menuBtn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  if(menuBtn && menu){
    // out of the hero's stacking context, so the fixed panel covers every section (on the homepage the bar sits in the hero)
    document.body.appendChild(menu);
    var menuClose = menu.querySelector('.menu-close'), wideMQ = window.matchMedia('(min-width:760px)');
    var focusables = function(){ return Array.prototype.slice.call(menu.querySelectorAll('a[href],button:not([disabled])')); };
    var setMenu = function(open, returnFocus){
      if(open === menu.classList.contains('open')) return;
      menu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('menu-open', open);
      if(open){ var f = focusables(); (f[1] || f[0]).focus({ preventScroll:true }); }      // first link (f[0] is Close)
      else if(returnFocus) menuBtn.focus({ preventScroll:true });
    };
    menuBtn.addEventListener('click', function(){ setMenu(!menu.classList.contains('open'), true); });
    menuClose.addEventListener('click', function(){ setMenu(false, true); });
    // a link closes the panel first (unlocks scrolling), then the browser follows it
    menu.addEventListener('click', function(e){ if(e.target.closest('a[href]')) setMenu(false, false); });
    // Tab is moved by hand inside the panel: Safari skips links on Tab by default, which would let focus escape
    document.addEventListener('keydown', function(e){
      if(!menu.classList.contains('open')) return;
      if(e.key === 'Escape'){ e.preventDefault(); setMenu(false, true); return; }
      if(e.key !== 'Tab') return;
      e.preventDefault();
      var f = focusables(), i = f.indexOf(document.activeElement);
      var next = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
      f[next].focus();
    });
    var onWide = function(){ if(wideMQ.matches) setMenu(false, false); };
    if(wideMQ.addEventListener) wideMQ.addEventListener('change', onWide); else wideMQ.addListener(onWide);
  }

  /* ================= OPENED FROM DISK (file://): folder links -> folder/index.html =================
     Online the site uses clean folder URLs (services/waterline-testing/). When index.html is double-clicked, the
     browser would show a directory listing for those, so every internal link whose path ends in "/" (or is "." / "..")
     gets "index.html" added, keeping any ?query and #hash. Pure "#hash" links are left alone. http/https: nothing changes. */
  if(location.protocol === 'file:'){
    var fileHref = function(h){
      if(!h || h.charAt(0) === '#' || /^[a-z][a-z0-9+.-]*:/i.test(h) || h.charAt(0) === '/') return null;   // same-page hash, other schemes, root paths
      var cut = h.search(/[?#]/), path = cut < 0 ? h : h.slice(0, cut), rest = cut < 0 ? '' : h.slice(cut);
      if(path === '') return null;                                   // "?q" only
      if(path === '.' || path === '..') path += '/';
      return /\/$/.test(path) ? path + 'index.html' + rest : null;
    };
    var fixLink = function(a){ var n = fileHref(a.getAttribute('href')); if(n) a.setAttribute('href', n); };
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), fixLink);
    // links added or changed later (any script): fix them at click time, before the browser follows them
    document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a[href]'); if(a) fixLink(a); }, true);
  }

  window.ClearLine = { navBrand: navBrand, applyClip: applyClip, fitRules: fitRules, buildWater: buildWater, queueWater: queueWater };
})();
