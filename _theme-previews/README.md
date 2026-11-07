# Theme previews

Five candidate replacements for the current `no-style-please` look. All keep the
same minimal layout and markup, support light/dark via `prefers-color-scheme`,
and add a small `auto / light / dark` toggle for testing.

| variant | light | dark | type |
|---|---|---|---|
| `ink` | white | near-black | monospace, inverted code (closest to today) |
| `paper` | warm off-white | warm black | serif body, mono labels |
| `mocha` | Catppuccin Latte | Catppuccin Mocha | monospace |
| `frappe` | Catppuccin Latte | Catppuccin Frappé | system sans |
| `macchiato` | Catppuccin Latte | Catppuccin Macchiato | monospace, shell-prompt flourishes |

Build all variants into static copies (links made relative, so each can be
hosted under any sub-path):

    git clone --depth 1 https://github.com/riggraz/no-style-please /tmp/nsp
    _theme-previews/build.sh /tmp/nsp /tmp/previews

To adopt one: copy `_base.scss` to `_sass/base.scss`, the variant to
`_sass/variant.scss`, add `assets/css/main.scss` importing it, include
`theme_toggle.html` (optional), and drop the inline `body`/`blockquote` colors in
`_layouts/post-with-tags.html`.
