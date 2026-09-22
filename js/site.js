/* Paarth Patodia — portfolio
   Progressive enhancement. Without this file every page is complete and static:
   the menu is a plain list of links, figures are fully drawn, the ECM demo
   shows its precomputed fallback.
   1. mobile menu: disclosure button with focus management
   2. current-section marking in the top bar (homepage only)
   3. one hero moment: the segmentation trace draws itself once, if motion is allowed
   4. educational ECM pulse simulator (battery case study only)
*/
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduce.matches;
  if (motion) html.classList.add('motion');

  /* ---------- 1. mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    var mq = window.matchMedia('(max-width: 799px)');
    var open = false;

    function setOpen(next, focusFirst) {
      open = next;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.menu-toggle-label').textContent = open ? 'Close' : 'Menu';
      menu.classList.toggle('is-open', open);
      html.classList.toggle('menu-open', open);
      if (open && focusFirst) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      }
    }
    function sync() {
      if (mq.matches) {
        toggle.hidden = false;
        menu.setAttribute('data-collapsible', 'true');
      } else {
        toggle.hidden = true;
        menu.removeAttribute('data-collapsible');
        if (open) setOpen(false, false);
      }
    }
    toggle.addEventListener('click', function () { setOpen(!open, !open); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false, false); toggle.focus(); }
    });
    // close when a link inside is chosen, or focus leaves the header
    menu.addEventListener('click', function (e) { if (e.target.closest('a') && open) setOpen(false, false); });
    document.addEventListener('focusin', function (e) {
      if (open && !e.target.closest('.topbar')) setOpen(false, false);
    });
    document.addEventListener('click', function (e) {
      if (open && !e.target.closest('.topbar')) setOpen(false, false);
    });
    if (mq.addEventListener) mq.addEventListener('change', sync); else mq.addListener(sync);
    sync();
  }

  /* ---------- 2. current section (homepage) ---------- */
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('.menu-list a[href^="#"]'));
  var sections = sectionLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var current = null;
    function mark(id) {
      if (id === current) return;
      current = id;
      sectionLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) { if (visible[s.id] > bestRatio) { bestRatio = visible[s.id]; best = s.id; } });
      if (best) mark(best);
      else if (window.scrollY < 200) { current = null; sectionLinks.forEach(function (a) { a.removeAttribute('aria-current'); }); }
    }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- 3. hero trace: draws once ---------- */
  if (motion) {
    var trace = document.querySelector('.hero-fig .trace');
    if (trace) {
      var fig = trace.closest('.hero-fig');
      fig.classList.add('will-draw');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fig.classList.add('is-drawn'); });
      });
    }
  }

  /* ---------- 4. ECM pulse simulator (educational) ---------- */
  var sim = document.getElementById('ecm-sim');
  if (sim) {
    var svg = sim.querySelector('.sim-svg');
    var path = sim.querySelector('.sim-trace');
    var pulseRect = sim.querySelector('.sim-pulse');
    var ocvLine = sim.querySelector('.sim-ocv');
    var readouts = {
      drop: sim.querySelector('[data-read="drop"]'),
      settle: sim.querySelector('[data-read="settle"]'),
      min: sim.querySelector('[data-read="min"]'),
      tau1: sim.querySelector('[data-read="tau1"]'),
      tau2: sim.querySelector('[data-read="tau2"]')
    };
    var inputs = {};
    ['i', 'r0', 'r1', 'c1', 'r2', 'c2'].forEach(function (k) {
      inputs[k] = sim.querySelector('[data-param="' + k + '"]');
    });
    var VB_W = 720, VB_H = 300, L = 60, T = 16, R = 16, B = 40;
    var OCV = 3.700;             // fixed open-circuit voltage for the demo, V
    var T_PULSE = 10, T_END = 60; // seconds: 10 s discharge pulse then 50 s rest
    var DT = 0.05;

    function fmt(v, nd) { return Number(v).toFixed(nd); }
    function readParams() {
      return {
        I: parseFloat(inputs.i.value),          // A, discharge positive
        R0: parseFloat(inputs.r0.value) / 1000, // mΩ → Ω
        R1: parseFloat(inputs.r1.value) / 1000,
        C1: parseFloat(inputs.c1.value),        // F
        R2: parseFloat(inputs.r2.value) / 1000,
        C2: parseFloat(inputs.c2.value)
      };
    }
    /* Thevenin 2RC, zero-order hold. Branch voltage v_i follows
       v_i[k+1] = a_i v_i[k] + R_i (1 - a_i) I[k],  a_i = exp(-dt/tau_i).
       Terminal voltage V = OCV - I R0 - v1 - v2 (discharge current positive). */
    function simulate(p) {
      var a1 = Math.exp(-DT / (p.R1 * p.C1)), a2 = Math.exp(-DT / (p.R2 * p.C2));
      var v1 = 0, v2 = 0, out = [], vmin = Infinity, vEndPulse = 0, vEnd = 0;
      for (var t = 0; t <= T_END + 1e-9; t += DT) {
        var I = t < T_PULSE ? p.I : 0;
        var V = OCV - I * p.R0 - v1 - v2;
        out.push([t, V]);
        if (V < vmin) vmin = V;
        if (Math.abs(t - T_PULSE) < DT / 2) vEndPulse = V;
        vEnd = V;
        v1 = a1 * v1 + p.R1 * (1 - a1) * I;
        v2 = a2 * v2 + p.R2 * (1 - a2) * I;
      }
      return { pts: out, vmin: vmin, vEndPulse: vEndPulse, vEnd: vEnd };
    }
    function draw() {
      var p = readParams();
      var r = simulate(p);
      var y0 = Math.min(r.vmin - 0.01, OCV - 0.05), y1 = OCV + 0.01;
      var X = function (t) { return L + t / T_END * (VB_W - L - R); };
      var Y = function (v) { return T + (y1 - v) / (y1 - y0) * (VB_H - T - B); };
      path.setAttribute('d', r.pts.map(function (q, i) { return (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join(' '));
      pulseRect.setAttribute('x', X(0)); pulseRect.setAttribute('width', X(T_PULSE) - X(0));
      pulseRect.setAttribute('y', T); pulseRect.setAttribute('height', VB_H - T - B);
      ocvLine.setAttribute('y1', Y(OCV)); ocvLine.setAttribute('y2', Y(OCV));
      // y ticks: 5 evenly spaced
      var ticks = sim.querySelectorAll('.sim-ytick');
      for (var i = 0; i < ticks.length; i++) {
        var v = y0 + (y1 - y0) * i / (ticks.length - 1);
        ticks[i].setAttribute('y', Y(v) + 4);
        ticks[i].textContent = v.toFixed(3);
      }
      var grid = sim.querySelectorAll('.sim-ygrid');
      for (var g = 0; g < grid.length; g++) {
        var gv = y0 + (y1 - y0) * g / (grid.length - 1);
        grid[g].setAttribute('y1', Y(gv)); grid[g].setAttribute('y2', Y(gv));
      }
      var instant = p.I * p.R0 * 1000;
      readouts.drop.textContent = fmt(instant, 1) + ' mV';
      readouts.min.textContent = fmt(r.vmin, 3) + ' V';
      readouts.settle.textContent = fmt((OCV - r.vEnd) * 1000, 1) + ' mV';
      readouts.tau1.textContent = fmt(p.R1 * p.C1, 1) + ' s';
      readouts.tau2.textContent = fmt(p.R2 * p.C2, 0) + ' s';
      // live labels next to sliders
      Object.keys(inputs).forEach(function (k) {
        var out = sim.querySelector('output[for="' + inputs[k].id + '"]');
        if (out) out.textContent = inputs[k].value + ' ' + inputs[k].getAttribute('data-unit');
      });
      svg.setAttribute('aria-label', 'Simulated terminal voltage: ' + fmt(instant, 1) + ' millivolt instantaneous drop at the start of a ' + p.I + ' amp, 10 second pulse, minimum ' + fmt(r.vmin, 3) + ' volts, ' + fmt((OCV - r.vEnd) * 1000, 1) + ' millivolts still to relax at 60 seconds.');
    }
    Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener('input', draw); });
    sim.classList.add('is-live');
    draw();
  }
})();
