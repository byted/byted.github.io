#!/usr/bin/env bash
# Build one static copy of the blog per theme variant, for previewing.
#
#   _theme-previews/build.sh <theme-checkout> <out-dir>
#
# <theme-checkout> is a clone of https://github.com/riggraz/no-style-please
# (vendored locally instead of `remote_theme`). Each variant ends up in
# <out-dir>/<variant>/ with all site-absolute links rewritten to relative
# ones, so it can be hosted under any sub-path.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
THEME="$(cd "$1" && pwd)"
OUT="$(mkdir -p "$2" && cd "$2" && pwd)"
SRC="$OUT/.src"
export LANG=C.UTF-8 LC_ALL=C.UTF-8

rm -rf "$SRC" && mkdir -p "$SRC"
(cd "$REPO" && git ls-files | grep -v -e '^\.github/' -e '^_theme-previews/' | tar -cf - -T - | tar -xf - -C "$SRC")
for d in _layouts _includes _sass assets; do cp -r --update=none "$THEME/$d" "$SRC/"; done

# local theme instead of remote_theme; seo/feed tags are used by the theme's head
sed -i 's/^remote_theme:.*//; s/^plugins:/plugins:\n  - jekyll-seo-tag\n  - jekyll-feed/' "$SRC/_config.yml"

# variant styles + toggle
cp "$REPO/_theme-previews/_base.scss" "$SRC/_sass/base.scss"
cp "$REPO/_theme-previews/theme_toggle.html" "$SRC/_includes/theme_toggle.html"
# apply a saved light/dark choice before first paint
sed -i 's|<link rel="stylesheet" href="{{ "/assets/css/main.css"|<script>try{var t=localStorage.getItem("theme");if(t==="light"\|\|t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>\n  &|' "$SRC/_includes/head.html"
sed -i 's|</body>|{%- include theme_toggle.html -%}\n  </body>|' "$SRC/_layouts/default.html"
# mermaid: follow the effective color scheme
sed -i "s|mermaid.initialize({ startOnLoad: true });|var _d = document.documentElement.dataset.theme; var dark = _d ? _d === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;\n  mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'neutral' });|" "$SRC/_layouts/post-with-tags.html"

for f in "$REPO"/_theme-previews/variants/*.scss; do
  name="$(basename "$f" .scss)"
  cp "$f" "$SRC/_sass/variant.scss"
  printf -- '---\n---\n@import "variant";\n' > "$SRC/assets/css/main.scss"
  rm -rf "$OUT/$name"
  (cd "$REPO" && bundle exec ruby -e 'load Gem.bin_path("jekyll","jekyll")' build -q -s "$SRC" -d "$OUT/$name")
  rm -f "$OUT/$name/Makefile" "$OUT/$name/assets/css/style.css"
  python3 "$REPO/_theme-previews/relativize.py" "$OUT/$name"
  echo "built $name"
done
