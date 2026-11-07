// Renders an Obsidian .canvas (JSON Canvas) into the same DOM the cmds share export
// produces, then wires up the export's pan / zoom / fit / fullscreen behaviour.
(function() {
	var SVGNS = 'http://www.w3.org/2000/svg';
	var PAD = 48; // world padding around the node bounds (snapshot: data-w = bounds + 2*48)

	function esc(s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	// Simple markdown, mirroring the snapshot's card markup: consecutive plain lines form a
	// <p dir="auto"> joined by <br>, "- " lines form a <ul> of <li dir="auto">.
	function renderMarkdown(text) {
		var out = [], para = [], items = [];
		function flushPara() { if (para.length) out.push('<p dir="auto">' + para.join('<br>\n') + '</p>'); para = []; }
		function flushList() { if (items.length) out.push('<ul>\n' + items.map(function(t) { return '<li dir="auto">' + t + '</li>'; }).join('\n') + '\n</ul>'); items = []; }
		String(text || '').split('\n').forEach(function(line) {
			var m = /^\s*[-*+]\s+(.*)$/.exec(line);
			if (m) { flushPara(); items.push(esc(m[1])); }
			else if (!line.trim()) { flushPara(); flushList(); }
			else { flushList(); para.push(esc(line)); }
		});
		flushPara(); flushList();
		return out.join('\n');
	}

	function color(c) {
		if (!c) return null;
		return /^[1-6]$/.test(c) ? 'var(--cv-c' + c + ')' : c;
	}

	// anchor point on a node side, plus the outward normal
	function anchor(n, side) {
		switch (side) {
			case 'top': return [n.x + n.width / 2, n.y, 0, -1];
			case 'bottom': return [n.x + n.width / 2, n.y + n.height, 0, 1];
			case 'left': return [n.x, n.y + n.height / 2, -1, 0];
			default: return [n.x + n.width, n.y + n.height / 2, 1, 0];
		}
	}

	// arrowhead: 11px long, ±π/7 around the incoming direction (matches the snapshot polygons)
	function arrow(tip, from) {
		var a = Math.atan2(from[1] - tip[1], from[0] - tip[0]), L = 11, w = Math.PI / 7;
		return [tip, [tip[0] + L * Math.cos(a - w), tip[1] + L * Math.sin(a - w)],
			[tip[0] + L * Math.cos(a + w), tip[1] + L * Math.sin(a + w)]]
			.map(function(p) { return p[0] + ',' + p[1]; }).join(' ');
	}

	function render(root, data) {
		var nodes = data.nodes || [], edges = data.edges || [];
		if (!nodes.length) { root.innerHTML = '<div class="cmds-canvas-empty">Empty canvas</div>'; return false; }
		var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		nodes.forEach(function(n) {
			minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
			maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
		});
		var ox = PAD - minX, oy = PAD - minY;
		var W = maxX - minX + 2 * PAD, H = maxY - minY + 2 * PAD;
		root.setAttribute('data-w', W); root.setAttribute('data-h', H);

		var byId = {};
		nodes.forEach(function(n) { byId[n.id] = { x: n.x + ox, y: n.y + oy, width: n.width, height: n.height }; });

		var world = document.createElement('div');
		world.className = 'cmds-canvas-world';
		world.style.width = W + 'px'; world.style.height = H + 'px';

		var svg = document.createElementNS(SVGNS, 'svg');
		svg.setAttribute('class', 'cv-edges');
		svg.setAttribute('width', W); svg.setAttribute('height', H);
		svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
		world.appendChild(svg);

		var labels = [];
		edges.forEach(function(e) {
			var a = byId[e.fromNode], b = byId[e.toNode];
			if (!a || !b) return;
			var p = anchor(a, e.fromSide), q = anchor(b, e.toSide);
			// control points pushed out along each side's normal by 0.45 × distance, clamped to 40..240
			var off = Math.min(240, Math.max(40, Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.45));
			var c1 = [p[0] + p[2] * off, p[1] + p[3] * off], c2 = [q[0] + q[2] * off, q[1] + q[3] * off];
			var g = document.createElementNS(SVGNS, 'g');
			g.setAttribute('class', 'cv-edge');
			var ec = color(e.color);
			if (ec) g.style.setProperty('--edge-color', ec);
			var path = document.createElementNS(SVGNS, 'path');
			path.setAttribute('d', 'M' + p[0] + ',' + p[1] + ' C' + c1[0] + ',' + c1[1] + ' ' + c2[0] + ',' + c2[1] + ' ' + q[0] + ',' + q[1]);
			g.appendChild(path);
			if (e.toEnd !== 'none') {
				var poly = document.createElementNS(SVGNS, 'polygon');
				poly.setAttribute('points', arrow([q[0], q[1]], c2));
				g.appendChild(poly);
			}
			if (e.fromEnd === 'arrow') {
				var poly2 = document.createElementNS(SVGNS, 'polygon');
				poly2.setAttribute('points', arrow([p[0], p[1]], c1));
				g.appendChild(poly2);
			}
			svg.appendChild(g);
			if (e.label) {
				// label sits on the bezier midpoint (t = 0.5)
				var lab = document.createElement('div');
				lab.className = 'cv-edge-label';
				lab.style.left = (p[0] + 3 * c1[0] + 3 * c2[0] + q[0]) / 8 + 'px';
				lab.style.top = (p[1] + 3 * c1[1] + 3 * c2[1] + q[1]) / 8 + 'px';
				if (ec) lab.style.setProperty('--edge-color', ec);
				lab.textContent = e.label;
				labels.push(lab);
			}
		});

		nodes.forEach(function(n) {
			var r = byId[n.id];
			var div = document.createElement('div');
			div.className = 'cv-node cv-' + (n.type || 'text');
			div.style.left = r.x + 'px'; div.style.top = r.y + 'px';
			div.style.width = r.width + 'px'; div.style.height = r.height + 'px';
			var nc = color(n.color);
			if (nc) div.style.setProperty('--node-color', nc);
			var body = document.createElement('div');
			body.className = 'cv-body markdown-rendered';
			body.innerHTML = renderMarkdown(n.text);
			div.appendChild(body);
			world.appendChild(div);
		});
		labels.forEach(function(l) { world.appendChild(l); });

		root.innerHTML = '';
		root.appendChild(world);
		return true;
	}

	// ---- behaviour: ported from the cmds export's canvas script ----
	var ICONS = {
		minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
		plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
		fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/></svg>',
		full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
	};

	function setup(root) {
		var world = root.querySelector('.cmds-canvas-world');
		if (!world) return;
		var W = +root.getAttribute('data-w') || 1, H = +root.getAttribute('data-h') || 1;
		var s = 1, tx = 0, ty = 0;

		function apply() { world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')'; }
		function fit() {
			var r = root.getBoundingClientRect();
			s = Math.min(r.width / W, r.height / H, 1.2);
			tx = (r.width - W * s) / 2; ty = (r.height - H * s) / 2;
			apply();
		}
		function zoomAt(factor, cx, cy) {
			var ns = Math.min(4, Math.max(0.08, s * factor));
			tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns;
			apply();
		}
		function center() { var r = root.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }

		// (the export sizes the viewport to the board's aspect ratio; here the CSS gives a fixed 80vh breakout)

		var ui = document.createElement('div');
		ui.className = 'cmds-canvas-ui';
		[['minus', 'Zoom out', function() { var c = center(); zoomAt(1 / 1.25, c[0], c[1]); }],
		 ['plus', 'Zoom in', function() { var c = center(); zoomAt(1.25, c[0], c[1]); }],
		 ['fit', 'Fit to view', fit],
		 ['full', 'Fullscreen', function() {
			if (document.fullscreenElement) document.exitFullscreen();
			else if (root.requestFullscreen) root.requestFullscreen();
		 }]].forEach(function(b) {
			var btn = document.createElement('button');
			btn.type = 'button'; btn.innerHTML = ICONS[b[0]]; btn.title = b[1]; btn.setAttribute('aria-label', b[1]);
			btn.addEventListener('click', function(e) { e.stopPropagation(); b[2](); });
			btn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
			ui.appendChild(btn);
		});
		root.appendChild(ui);
		var hint = document.createElement('div');
		hint.className = 'cmds-canvas-hint';
		hint.textContent = 'Drag to pan · Ctrl/⌘ + scroll to zoom';
		root.appendChild(hint);

		root.addEventListener('wheel', function(e) {
			var r = root.getBoundingClientRect();
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
			} else if (document.fullscreenElement === root) {
				e.preventDefault();
				tx -= e.deltaX; ty -= e.deltaY; apply();
			}
		}, { passive: false });

		var pointers = {}, last = null, pinch = null;
		root.addEventListener('pointerdown', function(e) {
			// let text selection, links, and scrolling work inside cards
			if (e.target.closest('.cv-body, a')) return;
			pointers[e.pointerId] = [e.clientX, e.clientY];
			root.setPointerCapture(e.pointerId);
			root.classList.add('dragging');
			last = [e.clientX, e.clientY];
			hint.style.display = 'none';
		});
		root.addEventListener('pointermove', function(e) {
			if (!pointers[e.pointerId]) return;
			pointers[e.pointerId] = [e.clientX, e.clientY];
			var ids = Object.keys(pointers);
			if (ids.length === 2) {
				var a = pointers[ids[0]], b = pointers[ids[1]];
				var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
				var r = root.getBoundingClientRect();
				if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
				pinch = d;
				return;
			}
			if (last) { tx += e.clientX - last[0]; ty += e.clientY - last[1]; apply(); }
			last = [e.clientX, e.clientY];
		});
		function up(e) {
			delete pointers[e.pointerId];
			pinch = null;
			var ids = Object.keys(pointers);
			last = ids.length ? pointers[ids[0]] : null;
			if (!ids.length) root.classList.remove('dragging');
		}
		root.addEventListener('pointerup', up);
		root.addEventListener('pointercancel', up);
		document.addEventListener('fullscreenchange', function() { requestAnimationFrame(fit); });
		window.addEventListener('resize', function() { requestAnimationFrame(fit); });
		fit();
	}

	function init() {
		document.querySelectorAll('.cmds-canvas[data-src]').forEach(function(root) {
			fetch(root.getAttribute('data-src'))
				.then(function(r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
				.then(function(data) { if (render(root, data)) setup(root); })
				.catch(function(err) {
					root.innerHTML = '<div class="cmds-canvas-empty">Could not load canvas: ' + esc(String(err.message || err)) + '</div>';
				});
		});
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
