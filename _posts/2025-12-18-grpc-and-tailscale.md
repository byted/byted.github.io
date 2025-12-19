---
title: '30 Mystery Seconds: Fixing gRPC Timeouts Over Tailscale'
tags: temporal.io ai networking cursor.ai
---

A few days ago, I discovered I could check if I'm connected to my Tailscale Exit Node by using the Temporal CLI. While connected, all connection attempts time out:

```
level=ERROR msg="failed reaching server: context deadline exceeded"
```

Easy solution: just disable Tailscale during my CLI sessions. But the "Why" kept lingering in my head. So I took my semi-reliable friend Cursor and descended into the rabbit hole. 

> [!NOTE]
> tl;dr
> 
> My Tailscale config prevented gRPC's client-side load balancing resolution from resolving in time. Since I can't change Tailscale, the solution is to skip the resolution by using `passthrough:///` mode.

Directly tasking Cursor (with [Gemini 3 Flash](https://blog.google/products/gemini/gemini-3-flash/)) used a lot of tokens but ended in circular madness when the context window filled up to 75%. Inspecting its thought, process I followed the steps taken and they made a lot of sense in the beginning. It...
- recognized the CLI is using gRPC/HTTP2
- successfully verified DNS resolution
- tried verifying connectivity via `ping <namespace>.tmprl.cloud:7233` (tough luck without ICMP support)
- successfully validated mTLS connectivity via `openssl s_client -connect <namespace>.tmprl.cloud:7233 ...` 

With this analysis, the model came up with a few potential problems & solutions. It went down the path of verifying the MTU size of my network adapters which, didn't end well when it started to confuse my local adapter with the tunnel adapter (besides, this seems like a niche edge case anyway). Then it started adding routes to my machine to avoid sending Temporal Cloud traffic via Tailscale. This is brittle (IPs might change) and didn't succeed - still timeouts. This is when the model started to go in circles.

Knowing context is king, I started a new session with a summary of what we discovered so far. And then the model struck gold: with those red herrings out of the way, it suggested simply increasing the timeout to a minute - and boom - that actually works. A consistent 30-second delay is added to all CLI calls. Since we already know SSL connectivity is fast, the reason has to be gRPC. And indeed: by default gRPC uses DNS (`dns://...`) to resolve client side load balancing targets. With Tailscale enabled, this lookup timed out. Luckily, there's also passthrough mode (`passthrough:///`), which skips this lookup and directly feeds the hostname into the OS, avoiding the timeout delay entirely.

In the end, using Cursor significantly cut down the time I spent googling. I still had to steer Cursor around red herrings and make judgment calls on whether its actions made any sense. So, my verdict: a great search tool!



