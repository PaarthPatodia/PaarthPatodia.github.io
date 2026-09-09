/* Paarth Patodia — portfolio
   Progressive enhancement only. Without this file the page is complete and static.
   1. hero: the pen draws the segmentation trace; the name settles on its width axis (CSS)
   2. figures and line work draw once when they enter the viewport
   3. desktop margin strip: the same trace, rotated, with a marker and a t/V readout driven by scroll
*/
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduceQuery.matches;
  if (motion) html.classList.add('motion');
  var onReduceChange = function (e) { if (e.matches) html.classList.remove('motion'); };
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange); else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);

  /* ---------- cubic-bezier solver (for the pen playback) ---------- */
  function bezier(x1, y1, x2, y2) {
    function A(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function B(a1, a2) { return 3 * a2 - 6 * a1; }
    function C(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; }
    function slope(t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); }
    function solveX(x) {
      var t = x, i;
      for (i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (s === 0) return t;
        var dx = calc(t, x1, x2) - x;
        t -= dx / s;
      }
      return t;
    }
    return function (x) { if (x <= 0) return 0; if (x >= 1) return 1; return calc(solveX(x), y1, y2); };
  }
  var easePaper = bezier(0.42, 0, 0.2, 1);

  /* ---------- 1. hero playback ---------- */
  function playHero() {
    var figs = Array.prototype.slice.call(document.querySelectorAll('.hero-fig'));
    if (!figs.length) return;
    figs.forEach(function (fig) { fig.classList.add('will-draw'); });
    var DUR = 1600, DELAY = 120;
    var start = null;
    function frame(now) {
      if (start === null) start = now + DELAY;
      var t = Math.min(1, Math.max(0, (now - start) / DUR));
      var p = easePaper(t);
      figs.forEach(function (fig) {
        var trace = fig.querySelector('.trace');
        if (trace) trace.style.strokeDashoffset = (1 - p).toFixed(4);
        var gated = fig.querySelectorAll('[data-a]');
        for (var i = 0; i < gated.length; i++) {
          if (p >= parseFloat(gated[i].getAttribute('data-a'))) gated[i].classList.add('on');
        }
      });
      if (t < 1) requestAnimationFrame(frame);
      else figs.forEach(function (fig) { fig.classList.add('is-drawn'); });
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 2. draw-on-entry for section figures and line work ---------- */
  function observeDrawing() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('.figure .fig, .sidenote .fig, .linework, .divider-line'));
    if (!targets.length || !('IntersectionObserver' in window)) return;
    targets.forEach(function (el) { el.classList.add('will-draw'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. margin strip ---------- */
  function setupStrip() {
    var strip = document.querySelector('.strip');
    var dataEl = document.getElementById('strip-data');
    if (!strip || !dataEl) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var svg = strip.querySelector('.strip-trace');
    var navLinks = Array.prototype.slice.call(strip.querySelectorAll('.strip-nav a'));
    var readT = strip.querySelector('.strip-readout .t');
    var readV = strip.querySelector('.strip-readout .v');
    var heroRead = document.querySelector('.scroll-hint .readout');
    var NS = 'http://www.w3.org/2000/svg';
    var W = 104, X0 = 22, XW = 44, TOP = 72, BOTTOM = 124;
    var H = 0, y0 = 0, y1 = 0, marker = null, sections = [];
    var pts = data.points; // [t_norm, v_norm], t ascending

    function el(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    function Y(f) { return y0 + f * (y1 - y0); }
    function X(g) { return X0 + g * XW; }
    function vAt(f) { // interpolate normalised voltage at normalised time f
      if (f <= pts[0][0]) return pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        if (pts[i][0] >= f) {
          var a = pts[i - 1], b = pts[i];
          var u = (f - a[0]) / (b[0] - a[0] || 1);
          return a[1] + u * (b[1] - a[1]);
        }
      }
      return pts[pts.length - 1][1];
    }
    function build() {
      H = window.innerHeight;
      y0 = TOP; y1 = H - BOTTOM;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      data.segments.forEach(function (s) {
        var attrs = { class: 'seg seg-' + s.kind, x: 12, width: 66, y: Y(s.a).toFixed(1), height: (Y(s.b) - Y(s.a)).toFixed(1) };
        if (s.kind === 'positive') attrs.fill = 'url(#hatch)';
        svg.appendChild(el('rect', attrs));
      });
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[1]).toFixed(1) + ' ' + Y(p[0]).toFixed(1); }).join(' ');
      svg.appendChild(el('path', { class: 'trace', d: d }));
      data.rests.forEach(function (r) {
        svg.appendChild(el('circle', { class: 'ocv', cx: X(r[1]).toFixed(1), cy: Y(r[0]).toFixed(1), r: 3.5 }));
      });
      marker = el('circle', { class: 'marker', r: 5, cx: X(pts[0][1]).toFixed(1), cy: Y(0).toFixed(1) });
      svg.appendChild(marker);
      placeNav();
      update();
    }
    function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    function placeNav() {
      var max = maxScroll();
      sections = navLinks.map(function (a) {
        var id = a.getAttribute('href').slice(1);
        var sec = document.getElementById(id);
        var top = sec ? sec.getBoundingClientRect().top + window.scrollY : 0;
        var f = Math.min(1, top / max);
        return { a: a, top: top, y: Y(f), h: a.getBoundingClientRect().height || 60 };
      });
      // labels are centred on their y; push overlapping ones apart, then pull the tail back inside the path extent
      var GAP = 10, i;
      for (i = 1; i < sections.length; i++) {
        var prev = sections[i - 1], cur = sections[i];
        var minY = prev.y + prev.h / 2 + GAP + cur.h / 2;
        if (cur.y < minY) cur.y = minY;
      }
      var last = sections[sections.length - 1];
      if (last && last.y + last.h / 2 > y1) {
        var shift = last.y + last.h / 2 - y1;
        for (i = sections.length - 1; i >= 0; i--) {
          sections[i].y -= shift;
          if (i > 0) {
            var need = sections[i - 1].y + sections[i - 1].h / 2 + GAP + sections[i].h / 2;
            shift = Math.max(0, need - sections[i].y);
          }
        }
      }
      sections.forEach(function (s) { s.a.style.top = (s.y - s.h / 2).toFixed(1) + 'px'; });
    }
    var ticking = false;
    function update() {
      ticking = false;
      var f = Math.min(1, Math.max(0, window.scrollY / maxScroll()));
      var v = vAt(f);
      if (marker) { marker.setAttribute('cx', X(v).toFixed(1)); marker.setAttribute('cy', Y(f).toFixed(1)); }
      var t = data.t_range[0] + f * (data.t_range[1] - data.t_range[0]);
      var volts = data.v_range[0] + v * (data.v_range[1] - data.v_range[0]);
      var tText = 't ' + t.toFixed(1) + ' s', vText = volts.toFixed(3) + ' V';
      if (readT) readT.textContent = tText;
      if (readV) readV.textContent = vText;
      if (heroRead) heroRead.textContent = tText + '  ' + vText;
      // current section: the last one whose top is above 35% of the viewport
      var y = window.scrollY + window.innerHeight * 0.35, current = null;
      sections.forEach(function (s) { if (s.top <= y) current = s; });
      sections.forEach(function (s) {
        if (s === current) s.a.setAttribute('aria-current', 'true'); else s.a.removeAttribute('aria-current');
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    var resizeTimer = null;
    function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 120); }

    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // fonts and images can change section offsets after first layout
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeNav(); update(); });
    window.addEventListener('load', function () { placeNav(); update(); });
  }

  /* ---------- go ---------- */
  if (motion) { playHero(); observeDrawing(); }
  if (window.matchMedia('(min-width: 1100px)').matches) setupStrip();
  else {
    var mq = window.matchMedia('(min-width: 1100px)');
    var handler = function (e) { if (e.matches) { setupStrip(); mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler); } };
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
  }
})();
