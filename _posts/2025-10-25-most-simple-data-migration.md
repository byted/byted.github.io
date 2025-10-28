---
title: It Just Worked! Moving my Home-Lab ZFS RAID in 15 Minutes
tags: zsf homelab linux
---

Sometimes tech just works. And it’s worth calling out when it does. I recently set up a two-drive software RAID 1 on a really old machine. After some testing and playing around with random projects, I decided to upgrade to a machine that hadn't been sitting in my tech stash for over 10 years.

Besides setting up the OS, I reserved some time to move the data. Even though I could physically move the drives, I expected to wrestle with migrating the RAID setup. Little did I know I'd be done in less than 15 minutes. Luckily, I had implemented the software RAID as a ZFS pool, and after some quick research I realized it was as easy as:

1. Shutdown the pool: `sudo zpool export store-all-the-things`
2. Move the hard drives to the new machine
3. List pools to verify they're available on the new machine: `sudo zpool import`
4. Hook up the pool: `sudo zpool import store-all-the-things`

Done. _That's it._ It just works™

This made me so happy.
