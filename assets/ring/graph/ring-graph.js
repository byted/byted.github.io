// Ring-series character graph: Cytoscape.js, rendered client-side from JSON.
(function () {
  'use strict';

  var BOOKS = {
    Ring:     { accent: '#40a02b', fill: '#cce1cd' },
    Spiral:   { accent: '#8839ef', fill: '#daccf4' },
    Loop:     { accent: '#df8e1d', fill: '#ecddca' },
    Birthday: { accent: '#9ca0b0', fill: '#dee1e7' },
    Tide:     { accent: '#d20f39', fill: '#e9c4cf' },
    S:        { accent: '#209fb5', fill: '#c6e1e8' }
  };
  var EDGES = {
    family:  { color: '#1e66f5', text: '#1e66f5', name: 'family' },
    romance: { color: '#ea76cb', text: '#ea76cb', name: 'romance' },
    rebirth: { color: '#8839ef', text: '#8839ef', name: 'rebirth' },
    generic: { color: '#8c8fa1', text: '#6c6f85', name: 'other' }
  };
  var REAL_WORLD = ['kaoru_futami', 'reiko_sugiura', 'hideyuki_futami', 'machiko_futami',
    'cristoph_eliot', 'ryoji_sugiura', 'toru_amano', 'kaoru_son'];
  var MULTI_IDENTITY = ['ryuji_takayama', 'seiji_kashiwada', 'shizuko_yamamura',
    'sadako_yamamura', 'masako_maruyama'];
  var TEXT = '#4c4f69', MUTED = '#6c6f85', BG = '#eff1f5';

  var root = document.getElementById('ring-graph');
  var $ = function (sel) { return root.querySelector(sel); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };

  // fcose has no seed option. Its spectral start looked stable in testing, but pinning Math.random
  // while it runs guarantees readers see the same picture on every load.
  function seeded(seed, fn) {
    var orig = Math.random;
    Math.random = function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    try { fn(); } finally { Math.random = orig; }
  }

  function toElements(data) {
    var els = [];
    data.nodes.forEach(function (n) {
      var kind = REAL_WORLD.indexOf(n.id) >= 0 ? 'real' : MULTI_IDENTITY.indexOf(n.id) >= 0 ? 'multi' : 'sim';
      els.push({ group: 'nodes', classes: 'character ' + kind, data: {
        id: n.id, label: n.name, book: n.book, notes: n.notes || [], kind: kind,
        accent: BOOKS[n.book].accent, fill: BOOKS[n.book].fill
      } });
    });
    data.edges.forEach(function (e, i) {
      els.push({ group: 'edges', classes: e.category + (e.directed ? ' directed' : ''), data: {
        id: 'e' + i, source: e.from, target: e.to, label: e.label || '', category: e.category,
        directed: e.directed, lmx: 0, lmy: 0, color: EDGES[e.category].color, textColor: EDGES[e.category].text
      } });
    });
    return els;
  }

  var style = [
    { selector: 'node.character', style: {
      shape: 'round-rectangle', width: 170, height: 54, label: 'data(label)',
      'background-color': 'data(fill)', 'border-color': 'data(accent)', 'border-width': 1.5,
      color: TEXT, 'font-family': 'system-ui, -apple-system, sans-serif', 'font-size': 14, 'font-weight': 'bold',
      'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'wrap', 'text-max-width': 156
    } },
    { selector: 'node.real', style: { 'border-style': 'dashed', 'border-width': 2 } },
    { selector: 'node.multi', style: { 'border-width': 4 } },
    { selector: 'edge', style: {
      width: 1.5, 'curve-style': 'bezier', 'line-color': 'data(color)',
      'target-arrow-shape': 'none', 'target-arrow-color': 'data(color)', 'arrow-scale': 0.9,
      label: '', color: 'data(textColor)', 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': 120,
      'font-family': 'system-ui, -apple-system, sans-serif',
      'text-background-color': BG, 'text-background-opacity': 0.85, 'text-background-padding': 1,
      'min-zoomed-font-size': 7, 'text-margin-x': 'data(lmx)', 'text-margin-y': 'data(lmy)'
    } },
    // Edge labels are off by default and appear for the selected/hovered character or when zoomed in.
    { selector: 'edge.lbl, edge.lbl-zoom, edge.lbl-hover', style: { label: 'data(label)' } },
    { selector: 'edge.faded', style: { label: '' } },
    { selector: 'edge.lbl-all', style: { label: 'data(label)', 'min-zoomed-font-size': 0 } },
    { selector: 'edge.directed', style: { 'target-arrow-shape': 'triangle' } },
    { selector: 'edge.rebirth', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 4] } },
    { selector: '.faded', style: { opacity: 0.15 } },
    { selector: 'node.focus', style: {
      'border-width': function (n) { return n.data('kind') === 'multi' ? 5 : 3; } } },
    { selector: 'node.match', style: { 'underlay-color': '#fe640b', 'underlay-opacity': 0.35, 'underlay-padding': 6 } },
    { selector: '.hidden', style: { display: 'none' } },
    { selector: 'node:active, edge:active', style: { 'overlay-opacity': 0 } }
  ];

  var cy;

  // Force-directed fcose without compound clusters (clusters made fcose squeeze the dense
  // Spiral/S/Tide core). Spacing is deliberately generous: pan/zoom make a big canvas fine, and
  // measured in headless Chrome this gives no card overlaps and no label pile-ups.
  function runLayout() {
    seeded(42, function () {
      cy.layout({
        name: 'fcose', quality: 'proof', randomize: true, animate: false, fit: false,
        idealEdgeLength: 350, nodeRepulsion: 400000, nodeSeparation: 200, gravity: 0.05,
        edgeElasticity: 0.35, numIter: 5000, packComponents: true
      }).run();
    });
    // Squash vertically a little so the overview suits the wide container (bigger initial zoom).
    cy.nodes().positions(function (n) { var p = n.position(); return { x: p.x, y: p.y * 0.8 }; });
    clearEdgePaths();
    cy.fit(undefined, 30);
  }

  // Approximate size of an edge label (10px font, wrapped at 120px) for the declutter pass.
  var measureCtx = document.createElement('canvas').getContext('2d');
  function labelSize(text) {
    measureCtx.font = '10px system-ui, -apple-system, sans-serif';
    var lines = 1, w = 0, line = '';
    text.split(/\s+/).forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (measureCtx.measureText(next).width > 120 && line) { lines++; line = word; } else line = next;
      w = Math.max(w, measureCtx.measureText(line).width);
    });
    return { hw: w / 2 + 2, hh: lines * 6.5 + 2 };
  }

  // Straight lines from fcose can still graze cards they don't connect to. Push each such card
  // sideways off the line (plus a margin), push cards off edge labels, and keep cards apart;
  // repeat until nothing moves. Pure arithmetic on the layout, so the result stays deterministic.
  function clearEdgePaths() {
    var MARGIN = 18, GAP = 24, LABEL_GAP = 6;
    var nodes = cy.nodes().toArray(), edges = cy.edges().toArray();
    edges.forEach(function (e) { e.scratch('lblSize', e.data('label') ? labelSize(e.data('label')) : null); });
    var box = function (n, m) { var p = n.position(); return { x: p.x, y: p.y, hw: n.outerWidth() / 2 + m, hh: n.outerHeight() / 2 + m }; };
    var separate = function (p, q, moveP, moveQ) { // axis-aligned push apart; returns true if they overlapped
      var ox = p.hw + q.hw - Math.abs(p.x - q.x), oy = p.hh + q.hh - Math.abs(p.y - q.y);
      if (ox <= 0 || oy <= 0) return false;
      var share = moveP && moveQ ? 0.5 : 1;
      var d = ox < oy ? { x: (p.x < q.x ? -1 : 1) * (ox * share + 1), y: 0 } : { x: 0, y: (p.y < q.y ? -1 : 1) * (oy * share + 1) };
      if (moveP) moveP.shift(d);
      if (moveQ) moveQ.shift({ x: -d.x, y: -d.y });
      return true;
    };
    for (var iter = 0; iter < 300; iter++) {
      var moved = false;
      edges.forEach(function (e) {
        var a = e.source().position(), b = e.target().position();
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        nodes.forEach(function (n) {
          if (n === e.source() || n === e.target()) return;
          var r = box(n, MARGIN);
          var t = ((r.x - a.x) * dx + (r.y - a.y) * dy) / (len * len);
          if (t < 0 || t > 1) return; // beyond the segment ends: endpoint cards keep it clear
          var d = (r.x - a.x) * nx + (r.y - a.y) * ny; // signed distance from the line
          var reach = Math.abs(nx) * r.hw + Math.abs(ny) * r.hh; // card half-extent across the line
          if (Math.abs(d) >= reach) return;
          var dir = d >= 0 ? 1 : -1, push = reach - Math.abs(d) + 1;
          n.position({ x: r.x + dir * nx * push, y: r.y + dir * ny * push });
          moved = true;
        });
      });
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        if (separate(box(nodes[i], GAP / 2), box(nodes[j], GAP / 2), nodes[i], nodes[j])) moved = true;
      }
      if (!moved) break;
    }
    cy.scratch('declutterIterations', iter);

    // Labels sit at edge midpoints; where one still touches a card or an earlier label,
    // slide it out sideways with a text margin (cards stay where the pass above put them).
    var placed = [];
    edges.forEach(function (e) {
      var ls = e.scratch('lblSize');
      if (!ls) return;
      var a = e.source().position(), b = e.target().position();
      var lb = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, hw: ls.hw + LABEL_GAP, hh: ls.hh + LABEL_GAP };
      var mx = 0, my = 0;
      for (var k = 0; k < 20; k++) {
        var cur = { x: lb.x + mx, y: lb.y + my, hw: lb.hw, hh: lb.hh }, before = mx + ',' + my;
        nodes.concat(placed).forEach(function (o) {
          var q = o.hw === undefined ? box(o, 0) : o;
          var ox = cur.hw + q.hw - Math.abs(cur.x - q.x), oy = cur.hh + q.hh - Math.abs(cur.y - q.y);
          if (ox <= 0 || oy <= 0) return;
          if (oy <= ox) my += (cur.y < q.y ? -1 : 1) * (oy + 1); else mx += (cur.x < q.x ? -1 : 1) * (ox + 1);
          cur = { x: lb.x + mx, y: lb.y + my, hw: lb.hw, hh: lb.hh };
        });
        if (before === mx + ',' + my) break;
      }
      e.data({ lmx: mx, lmy: my });
      placed.push({ x: lb.x + mx, y: lb.y + my, hw: lb.hw, hh: lb.hh });
    });
  }

  var LABEL_ZOOM = 0.9; // edge labels render at >= 9px from here on
  function updateZoomLabels() {
    var on = cy.zoom() >= LABEL_ZOOM;
    if (on !== updateZoomLabels.on) { updateZoomLabels.on = on; cy.edges().toggleClass('lbl-zoom', on); }
  }

  function characters() { return cy.nodes('.character'); }
  function fitVisible() { cy.stop(true).animate({ fit: { eles: cy.elements(':visible'), padding: 30 }, duration: 300 }); }

  function clearFocus() {
    cy.elements().removeClass('faded focus match lbl');
    $('.rg-panel').hidden = true;
    root.classList.remove('rg-panel-open');
  }

  // Like cy.fit(), but keeps the elements clear of the details panel on the right (on wide screens).
  function fitBesidePanel(eles) {
    var panel = $('.rg-panel');
    var wide = window.innerWidth > 640, open = !panel.hidden;
    var side = wide && open ? panel.offsetWidth + 24 : 0;   // panel on the right
    var below = !wide && open ? panel.offsetHeight + 24 : 0; // panel at the bottom on phones
    var w = cy.width() - side, h = cy.height() - below, pad = wide ? 50 : 20, bb = eles.boundingBox();
    var zoom = Math.min(1.4, (w - 2 * pad) / bb.w, (h - 2 * pad) / bb.h);
    cy.stop(true).animate({ zoom: zoom, pan: { x: (w - bb.w * zoom) / 2 - bb.x1 * zoom, y: (h - bb.h * zoom) / 2 - bb.y1 * zoom } }, { duration: 350 });
  }

  function focusNode(node) {
    clearFocus();
    var hood = node.closedNeighborhood().filter(':visible');
    cy.elements().not(hood).addClass('faded');
    node.addClass('focus');
    hood.edges().addClass('lbl');
    showPanel(node);
    fitBesidePanel(hood);
  }

  function showPanel(node) {
    var d = node.data();
    var rels = node.connectedEdges(':visible').map(function (e) {
      var out = e.source().same(node);
      var other = out ? e.target() : e.source();
      var arrow = !e.data('directed') ? '—' : out ? '→' : '←';
      var c = EDGES[e.data('category')];
      return '<li><span class="rg-dot" style="background:' + c.color + '" title="' + c.name + '"></span>' + arrow +
        ' <a href="#" data-id="' + other.id() + '">' + esc(other.data('label')) + '</a>' +
        (e.data('label') ? ' <span class="rg-muted">' + esc(e.data('label')) + '</span>' : '') + '</li>';
    }).join('');
    var kind = { real: 'real world', sim: 'simulation', multi: 'multiple identities' }[d.kind];
    $('.rg-panel-body').innerHTML =
      '<h3>' + esc(d.label) + '</h3>' +
      '<p class="rg-muted"><span class="rg-dot" style="background:' + d.accent + '"></span>first appears in <b>' + esc(d.book) + '</b> · ' + kind + '</p>' +
      (d.notes.length ? '<ul class="rg-notes">' + d.notes.map(function (n) { return '<li>' + esc(n.trim()) + '</li>'; }).join('') + '</ul>' : '') +
      '<h4>Relations</h4><ul class="rg-rels">' + (rels || '<li class="rg-muted">none visible</li>') + '</ul>';
    $('.rg-panel').hidden = false;
    root.classList.add('rg-panel-open');
  }

  function applyFilters() {
    var books = {}, cats = {};
    root.querySelectorAll('[data-book]').forEach(function (b) { books[b.dataset.book] = b.checked; });
    root.querySelectorAll('[data-cat]').forEach(function (b) { cats[b.dataset.cat] = b.checked; });
    cy.batch(function () {
      characters().forEach(function (n) { n.toggleClass('hidden', !books[n.data('book')]); });
      cy.edges().forEach(function (e) { e.toggleClass('hidden', !cats[e.data('category')]); });
    });
    clearFocus();
    fitVisible();
  }

  function search(q, jump) {
    cy.elements().removeClass('match');
    q = q.trim().toLowerCase();
    if (!q) return;
    var hits = characters().filter(function (n) { return n.visible() && n.data('label').toLowerCase().indexOf(q) >= 0; });
    if (hits.empty()) return;
    if (jump) { focusNode(hits[0]); return; }
    hits.addClass('match');
    cy.stop(true).animate({ fit: { eles: hits, padding: 120 }, duration: 300 });
  }

  function reset() {
    root.querySelectorAll('[data-book], [data-cat]').forEach(function (b) { b.checked = true; });
    $('.rg-search').value = '';
    applyFilters();
  }

  function buildControls() {
    $('.rg-books').insertAdjacentHTML('beforeend', Object.keys(BOOKS).map(function (b) {
      return '<label><input type="checkbox" checked data-book="' + b + '"><span class="rg-swatch" style="background:' +
        BOOKS[b].fill + ';border-color:' + BOOKS[b].accent + '"></span>' + b + '</label>';
    }).join(''));
    $('.rg-cats').insertAdjacentHTML('beforeend', Object.keys(EDGES).map(function (c) {
      var e = EDGES[c];
      return '<label><input type="checkbox" checked data-cat="' + c + '"><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="' +
        e.color + '" stroke-width="2"' + (c === 'rebirth' ? ' stroke-dasharray="5 3"' : '') + '/></svg>' + e.name + '</label>';
    }).join(''));
    root.addEventListener('change', function (ev) { if (ev.target.matches('[data-book], [data-cat]')) applyFilters(); });
    $('.rg-search').addEventListener('input', function (ev) { search(ev.target.value, false); });
    $('.rg-search').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') search(ev.target.value, true); });
    $('.rg-fit').addEventListener('click', fitVisible);
    $('.rg-labels').addEventListener('click', function (ev) {
      var on = ev.currentTarget.getAttribute('aria-pressed') !== 'true';
      ev.currentTarget.setAttribute('aria-pressed', String(on));
      cy.edges().toggleClass('lbl-all', on);
    });
    $('.rg-reset').addEventListener('click', reset);
    $('.rg-max').addEventListener('click', close);
    $('.rg-close').addEventListener('click', clearFocus);
    $('.rg-panel').addEventListener('click', function (ev) {
      var a = ev.target.closest('a[data-id]');
      if (!a) return;
      ev.preventDefault();
      focusNode(cy.getElementById(a.dataset.id));
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { clearFocus(); $('.rg-search').value = ''; }
    });
  }

  // The graph only ever shows maximized: real fullscreen where supported, otherwise a fixed
  // overlay (e.g. iPhone Safari). Leaving it hides the block again.
  function open() {
    root.hidden = false;
    if (root.requestFullscreen) root.requestFullscreen().catch(function () { root.classList.add('rg-maxed'); });
    else root.classList.add('rg-maxed');
    if (!cy) init(); else maxChanged();
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen();
    root.classList.remove('rg-maxed');
    maxChanged();
  }

  function maxChanged() {
    var on = document.fullscreenElement === root || root.classList.contains('rg-maxed');
    root.hidden = !on;
    if (on && cy) { cy.resize(); fitVisible(); }
  }

  document.querySelector('.ring-graph-open').addEventListener('click', open);
  document.addEventListener('fullscreenchange', maxChanged);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && root.classList.contains('rg-maxed')) close();
  });

  function init() { fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (data) {
    cy = cytoscape({
      container: $('.rg-canvas'), elements: toElements(data), style: style,
      minZoom: 0.05, maxZoom: 3, wheelSensitivity: 0.3, boxSelectionEnabled: false, autoungrabify: false
    });
    runLayout();
    updateZoomLabels();
    cy.on('zoom', updateZoomLabels);
    buildControls();
    cy.on('tap', 'node.character', function (ev) { focusNode(ev.target); });
    cy.on('tap', function (ev) { if (ev.target === cy) clearFocus(); });
    cy.on('mouseover', 'node.character', function (ev) {
      $('.rg-canvas').style.cursor = 'pointer';
      ev.target.connectedEdges().addClass('lbl-hover');
    });
    cy.on('mouseout', 'node.character', function (ev) {
      $('.rg-canvas').style.cursor = '';
      ev.target.connectedEdges().removeClass('lbl-hover');
    });
    window.ringGraph = cy; // handy for poking around in the console
    maxChanged();
  }).catch(function (err) {
    $('.rg-canvas').textContent = 'Could not load the graph: ' + err;
  }); }
})();
