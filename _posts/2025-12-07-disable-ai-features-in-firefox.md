---
title: Configure AI Features in Firefox
tags: browser ai 
---

Firefox has integrated quite a few AI features recently. And Firefox has put a lot of design energy into making the AI integration points ubiquitous, so that all users are ~~forced~~ enabled to use AI.

Since I don't use their stuff[^1], I combed through `about:config`[^2] to find all the places to disable the integrations. So far, I found the following list of properties:

- `browser.ml.*`
- `browser.tabs.groups.smart.*`
- `extension.ml`
- `sidebar.notification.badge.aichat`

Since setting __all__ boolean (child)properties to `false`, I haven't encountered any AI integrations.

---

[^1]: I use [Kagi.com](https://kagi.com/) for most of my non-work AI needs.
[^2]: Type `about:config` into your browser's address bar.
