---
title: "Revisiting the Ring universe"
tags: ring koji-suzuki books
---
After hearing about the death of Koji Suzuki, I revisited the Ring book universe. 20 years ago I read Ring, Spiral, Loop and Birthday and I was hooked. Now I read them again with a slightly different viewpoint and more life experience. It still holds up and works for me.

Suzuki added two books, S and Tide, in the meantime so I got a little extra this time. Tide was never translated into English but thanks to the magic of modern AI (next blog entry) I managed to read it anyways.

If you're just used to the Ring movies: the books explore a completely different direction than the movies. And it gets _weird_. So weird, that after reading all 5 books I mapped out the characters and their relationships...

<link rel="stylesheet" href="{{ '/assets/ring/canvas/ring-canvas.css' | relative_url }}">

<div class="cmds-canvas" data-src="{{ '/assets/ring/canvas/ring-character-universe.canvas.json' | relative_url }}"></div>

<script src="{{ '/assets/ring/canvas/ring-canvas.js' | relative_url }}"></script>

<link rel="stylesheet" href="{{ '/assets/ring/graph/ring-graph.css' | relative_url }}">

<button type="button" class="ring-graph-open">Explore the interactive graph</button>

<div id="ring-graph" hidden data-src="{{ '/assets/ring/graph/ring-characters.json' | relative_url }}">
  <div class="rg-toolbar">
    <input class="rg-search" type="search" placeholder="Search a character…" aria-label="Search characters">
    <fieldset class="rg-books" title="by first appearance" aria-label="Books, by first appearance"></fieldset>
    <fieldset class="rg-cats"><legend>Lines:</legend></fieldset>
    <span><button type="button" class="rg-labels" aria-pressed="false">Labels</button> <button type="button" class="rg-fit">Fit</button> <button type="button" class="rg-reset">Reset</button> <button type="button" class="rg-max">Close</button></span>
  </div>
  <div class="rg-stage">
    <div class="rg-canvas"></div>
    <div class="rg-legend">
      <b>Border</b>
      <div><span class="box" style="border-style:dashed;border-width:2px"></span>real world</div>
      <div><span class="box"></span>simulation</div>
      <div><span class="box" style="border-width:3.5px"></span>multiple identities</div>
      <b>Fill = book of first appearance</b>
    </div>
    <div class="rg-hint">click a character · Esc to reset</div>
    <aside class="rg-panel" hidden><button type="button" class="rg-close" aria-label="Close">×</button><div class="rg-panel-body"></div></aside>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.34.3/dist/cytoscape.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cytoscape-fcose@2.2.0/cytoscape-fcose.js"></script>
<script src="{{ '/assets/ring/graph/ring-graph.js' | relative_url }}"></script>
