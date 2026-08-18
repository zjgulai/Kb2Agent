---
title: G6-A8-R1 Bounded Legacy-site Probe Edge Switch
status: completed-authorized-live-static-edge-switch
date: 2026-08-12
---

# G6-A8-R1 Bounded Legacy-site Probe Edge Switch

## Decision

G6-A8-R1 preserves the immutable G6-A8 attempt-1 executor, failed receipt and local closeout. It creates an append-only attempt-2 wrapper and independent receipt paths. The only behavioral correction is that the old protected-site request for `https://kb.lute-tlz-dddd.top/Kb2Agent/` may run sequentially up to three times instead of once.

Each attempt continues to use the unchanged parent `requestSnapshot`: a 10-second timeout, `rejectUnauthorized: true`, no keep-alive, no TLS session cache, `Connection: close`, and the same response capture. A successful response must still satisfy the original `oldMkdExact` status, release-header, body-hash and TLS checks. Retrying never converts a failed identity check into telemetry.

## Frozen inputs

- Parent executor SHA: `cbb0f5174f96a100a2df8714ab0d64ea7fd304ceab44b7b4045d455acbe748df`.
- G6-A8 attempt-1 receipt SHA: `1eff2202e206b4f380570db6845c4f86518f31c6a2a301581a9173f2493b7079`.
- G6-A8 blocked closeout SHA: `b6adb1d39114f1292dba2411c2b4e913a46975c3c77b29f1b04c8971a1ac21a1`.
- Attempt-1 final readback must remain absent.
- The parent executor continues to lock the successful G6-A7-R2 runtime receipt, materialized attempt-3, complete edge identity, exact 88d4/438e blocks, and unchanged switch/restore scripts.

## Transaction boundary

Only a complete fresh strong preflight may enter the inherited transaction: render one byte-exact 88d4-to-438e block replacement, stage checksum-bound assets, test the candidate in edge `/tmp`, create an exact backup, write the existing live file without changing its inode, run live `nginx -t`, and issue one graceful reload. Immediate and independent public/protected-state snapshots must both pass.

If the probe still fails, any strong check drifts, or the transaction/smoke fails, the inherited fail-closed and exact restoration behavior applies. No automatic retry is allowed after attempt-2. The 88d4 runtime remains retained.

## Explicit exclusions

G6-A8-R1 does not authorize edge/container restarts, runtime lifecycle changes, certificate/timer changes, full browser P9, provider calls, production/live Agent activation, local Docker access, canonical writes, commit, or push. A successful static edge switch reaches only an unapproved G6-A9 evidence gate.

## Verified outcome

Run `20260812T030612Z` completed the inherited transaction. The bounded old-site probe passed on its first request in the preflight, immediate-smoke and independent-readback snapshots. The live edge is SHA `f4bba23188178875ee8a1ae024ae1f8f2a863b6b8cf86c2ef8a3d53aaafd8cb1`, 51,385 bytes, inode 901063, owner `ubuntu:ubuntu`, mode 0644. One primary graceful reload occurred; recovery and rollback did not.

The main receipt SHA is `f5700b168219d657aa9bf2ad51277bd4dfa703bce070c34a675d85635ddf8318`; the independent readback SHA is `67092ab85128cb3e2ac013a8ecde87e74e77e182f0731b2d0eb1234ffd95569e`. These prove the exact public 438e static identity and protected-state readback, but not full P9 or a production/live Agent.
