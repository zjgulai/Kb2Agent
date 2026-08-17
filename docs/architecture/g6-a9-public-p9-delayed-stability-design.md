---
title: G6-A9 Exact 438e Public P9 and Short-delayed Stability
status: blocked-before-public-or-remote-read
date: 2026-08-12
---

# G6-A9 Exact 438e Public P9 and Short-delayed Stability

## Decision

G6-A9 is a read-only production evidence gate for the exact public static release `mkd-m1c-438e6ae583fc952d`. It source-locks the successful G6-A8-R1 edge-switch receipt, its independent final readback, and the mature G4-R5 browser-acceptance engine. It writes only a new local evidence namespace and an append-only receipt.

The gate runs one formal ten-case Chromium suite across five viewport contracts, critical Replay/reference/search/copy/Mermaid interactions, Axe, and Web Vitals. It then runs Lighthouse three times for both home and Agent Lab, using medians of performance 0.90, accessibility 0.95, and best practices 0.95 as hard thresholds. A 60-second bounded wait separates the formal evidence from a fresh HTTPS and SSH read-only terminal readback. This is short-delay stability evidence, not proof of long-term availability.

## Frozen inputs

- G4-R5 base executor SHA: `e8956349b06cf510a619d3ea49a947725d318597f3cc83c0be66ecabef74cc31`.
- G6-A8-R1 main receipt SHA: `f5700b168219d657aa9bf2ad51277bd4dfa703bce070c34a675d85635ddf8318`.
- G6-A8-R1 final readback SHA: `67092ab85128cb3e2ac013a8ecde87e74e77e182f0731b2d0eb1234ffd95569e`.
- Public identity: release `mkd-m1c-438e6ae583fc952d`, private listener port `18922`, home SHA `414bbad5064d626bf4ffb3571d580cd4ad4e44c204e423749902e11c382baa18`.
- Live edge identity: SHA `f4bba23188178875ee8a1ae024ae1f8f2a863b6b8cf86c2ef8a3d53aaafd8cb1`, inode 901063, owner `ubuntu:ubuntu`, mode 0644, 51,385 bytes.
- TLS fingerprint: `AE:08:80:12:FE:85:6C:F3:EC:69:48:FD:66:F5:8F:75:60:EC:03:97:1C:FE:E1:41:15:49:FA:37:76:88:26:5E`.
- Evidence root: `output/playwright/mkd-distill-g6a9`; receipt: `reference/receipts/g6-a9-public-p9-delayed-stability-receipt.json`.

## Execution boundary

The preflight and delayed postflight require exact public redirect, release/header/body/TLS identity, the unchanged protected old site, exact live-edge file identity, seven healthy retained/current containers, and the unchanged renewal timer. Only the old protected-site HTTPS read may retry sequentially up to three times; all identity checks remain hard blockers.

The SSH operation is read-only: exact file checksum/stat, `docker inspect`, and timer status. It performs no upload, live write, reload, restart, lifecycle action, certificate/timer action, provider call, production/live Agent action, canonical write, local Docker call, commit, or push. A failure freezes its partial evidence and one blocked receipt without remediation or rollback.

## Outcome classification

A passing receipt proves automated public browser P9 and one short-delayed read-only stability observation for exact 438e. It does not prove four-role acceptance, long-term stability, production/live Agent enablement, or provider behavior. The next possible gate is the separately unauthorized G6-A10 four-role independent acceptance of this exact receipt and evidence manifest.

## Attempt-1 outcome

The authorized attempt stopped before key validation, public preflight, browser launch, Lighthouse, SSH, or any remote read. The zero-network `playwright test --list` gate had invoked the configured JSON reporter and created `output/playwright/mkd-distill-g6a9/results.json` with 0 expected, 10 skipped, and 0 unexpected cases. The one-shot executor therefore found its evidence namespace already present and failed closed.

The enumeration artifact and blocked receipt are preserved; no path was deleted or overwritten and no automatic retry occurred. This attempt provides only L1 local pre-execution failure evidence. A possible G6-A9-R1 must be separately authorized, bind the exact blocked receipt and skipped-only enumeration artifact, and correct namespace admission without weakening append-only evidence isolation.
