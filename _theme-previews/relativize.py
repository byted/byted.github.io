"""Rewrite site-absolute URLs (href="/...", src="/...", data-src="/...") in every
HTML file under a built site to relative ones, and point directory links at
their index.html, so the site works when served from any sub-path."""
import os
import re
import sys

root = os.path.abspath(sys.argv[1])
attr = re.compile(r'(\s(?:href|src|data-src)=)(["\'])/(?!/)([^"\']*)\2')


def fix(path):
    here = os.path.dirname(path)

    def repl(m):
        target = m.group(3)
        frag = ""
        for sep in ("#", "?"):
            if sep in target:
                target, rest = target.split(sep, 1)
                frag = sep + rest + frag
                break
        full = os.path.join(root, target)
        if target == "" or target.endswith("/") or os.path.isdir(full):
            full = os.path.join(full, "index.html")
        rel = os.path.relpath(full, here)
        return f"{m.group(1)}{m.group(2)}{rel}{frag}{m.group(2)}"

    with open(path, encoding="utf-8") as f:
        html = f.read()
    new = attr.sub(repl, html)
    if new != html:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)


for dirpath, _, files in os.walk(root):
    for name in files:
        if name.endswith(".html"):
            fix(os.path.join(dirpath, name))
