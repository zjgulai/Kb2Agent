---
title: G6-A8 Exact 88d4 to 438e Edge Switch
status: authorized-execution-gate
evidence_boundary: L4-authorized-live-edge-switch-plus-L3-readback
---

# G6-A8 Exact 88d4 → 438e Edge Switch

## Decision boundary

G6-A8 may change one thing in shared live state: the exact `distill.lute-tlz-dddd.top` server block in `/opt/ai-video/deploy/lighthouse/nginx.conf`, from the frozen 88d4 block to the frozen 438e block. It permits one same-inode write and one graceful reload after a complete-file preflight and temporary syntax test. It does not permit an edge/container restart, removal or mutation of the retained 88d4 runtime, certificate/timer changes, full public P9, provider calls, production/live Agent activation, local Docker, canonical writes, commit, or push.

## Source locks

- successful G6-A7-R2 receipt: `d3e36072…bd09`;
- G6-A7-R2 wrapper and materialized attempt-3: `25cf6108…83a` / `c060909b…27c2`;
- exact live baseline: `bd3293c1…490a2`, inode `901063`, owner `ubuntu:ubuntu`, mode `644`, bytes `51,384`;
- exact 88d4 block: `2d42a084…70d8`;
- exact 438e block: `ae118a22…f00c`;
- target release and private upstream: `mkd-m1c-438e6ae583fc952d` / `172.20.0.1:18922`.

## Transaction

1. Run default-local source-lock, renderer, transaction-script and forbidden-capability contracts without local Docker or network access.
2. Collect a fresh strong snapshot: complete edge identity, exact old/new block counts, shared edge health, exact 88d4 and 438e containers/networks, both private upstreams, TLS/certificate/timer state, current 88d4 public identity, negative routes and old-site identity.
3. Render locally by replacing exactly one byte-identical 88d4 block. Prefix and suffix must remain byte-identical.
4. Upload only the rendered candidate and two checksum-bound transaction scripts to a run-ID staging directory.
5. Validate the full candidate via `nginx -t` inside the edge container, re-check the complete live source, create a precise rollback backup, write with `cat >` to preserve inode, execute live `nginx -t`, and perform one graceful reload.
6. Run immediate public/protected-state smoke and a second independent readback. Both must prove the 438e public identity while all four 88d4/438e containers and networks remain exact.
7. Retain the rollback backup and 88d4 runtime; delete only run-ID staging after successful terminal readback.

## Failure behavior

Any mismatch before the live write blocks without switching. An error inside the transaction automatically restores the exact backup and permits one recovery reload. A failure during immediate or independent smoke invokes the independent restore script once. Restoration must be proven against the original complete edge identity, public 88d4 identity and all protected runtime/TLS/timer checks. No failed attempt may be retried without a separate G6-A8-R1 authorization.

## Evidence interpretation

A successful G6-A8 receipt proves an authorized static public edge switch and independent readback. It does not prove the full browser P9, accessibility, Web Vitals, Lighthouse stability, a production/live Agent, or provider integration. Those remain behind an unapproved G6-A9 evidence gate.
