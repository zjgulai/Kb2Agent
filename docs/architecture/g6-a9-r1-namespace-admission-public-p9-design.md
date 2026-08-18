---
title: G6-A9-R1 Namespace Admission Correction and Exact 438e Public P9
status: complete-read-only-public-p9-and-short-delayed-stability
date: 2026-08-12
---

# G6-A9-R1 Namespace Admission Correction and Exact 438e Public P9

## Decision

G6-A9-R1 is an append-only attempt-2. It source-locks the G6-A9 wrapper, materialized executor, blocked receipt, and the sole skipped-only Playwright enumeration artifact. The old `output/playwright/mkd-distill-g6a9` namespace is admissible only when its complete shape is exactly one `results.json` with the frozen SHA, byte count, and 0 expected / 10 skipped / 0 unexpected / 0 flaky / 10-spec semantics.

Attempt-1 evidence remains in place and byte-identical. Attempt-2 writes only to `output/playwright/mkd-distill-g6a9-r1` and `reference/receipts/g6-a9-r1-public-p9-delayed-stability-receipt.json`. The correction changes output routing and lineage only; the exact 438e identity, ten browser cases, five viewports, critical interactions, Axe, Web Vitals, home/Lab three-run Lighthouse thresholds, TLS identity, remote read-only checks, 60-second delay, and hard failure behavior remain unchanged.

## Frozen lineage

- G6-A9 wrapper SHA: `c18d67af41f93a82e1d72b34e585becc218df5219ed84d7c704406aabd0b91a3`.
- G6-A9 materialized executor SHA: `f5459fe187f472d74a30eecbb775b8f82d5720076bc1a6e223c10e6d4a66fb79`.
- Attempt-1 blocked receipt SHA: `4430ed1a4a52ec0034cde4f57902c57a854ba51ddcca0c1b3d8743b3782cce90`.
- Attempt-1 enumeration SHA/bytes: `ecf40ef19d5829d0322e04f06ecc0a42c27f5dccf683b7e6abd0698e2634f02c` / 8,443.
- Attempt-2 materialized executor SHA: `0bfef55e30f1001e0ecb79e1eaa0c11944c5ec23f280d6da184738c37b35141f`.
- Candidate identity remains release `mkd-m1c-438e6ae583fc952d`, private listener 18922, and exact G6-A8-R1 edge/TLS lineage.

## Execution and failure boundary

Local contracts must verify source locks, exact attempt-1 namespace shape, deterministic materialization, new namespace absence, unchanged browser/Lighthouse thresholds, strict SSH, and the absence of upload or mutation capabilities. Local validation must not run Playwright `--list` against the attempt-2 reporter.

After those gates, one authorized attempt may perform the inherited public preflight, CLI browser snapshot, formal ten-case Chromium suite, six Lighthouse runs, 60-second wait, and HTTPS/SSH read-only terminal readback. Only the old protected-site request retains the inherited bounded sequential retry.

Any failure freezes the attempt-2 evidence and a distinct blocked receipt. It does not permit deletion, overwrite, automatic retry, live runtime mutation, edge/container change or restart, certificate/timer action, rollback, provider call, production/live Agent action, canonical write, local Docker access, commit, or push.

## Evidence classification

A successful result supports `L3-production-read-only-public-browser-and-short-delayed-stability` for exact 438e. It does not prove long-term availability, four-role acceptance, production/live Agent enablement, or provider behavior. G6-A10 remains a separate, unauthorized four-role evidence-acceptance gate.

## Verified outcome

Run `20260812T034451Z` completed the exact inherited evidence sequence. Formal Playwright passed 10/10 with no failed, flaky, or skipped cases. Home Lighthouse medians were 98/100/100 and Agent Lab medians were 98/100/100 for performance/accessibility/best practices. The 60-second delay completed before the independent terminal readback.

Both preflight and delayed postflight observed the exact 438e public identity, TLS fingerprint, relative redirect, security headers, prior hydration route, and unchanged protected old site. The live edge remained SHA `f4bba23188178875ee8a1ae024ae1f8f2a863b6b8cf86c2ef8a3d53aaafd8cb1`, inode 901063, owner `ubuntu:ubuntu`, mode 0644, 51,385 bytes; all seven inspected containers were healthy with restart count zero, and the renewal timer remained enabled/active.

The frozen receipt is 31,562 bytes with SHA `7f0fb9eec51f18385a69046a254749ffee071aecfcd8678a96b9dd8c9c3000d3`. Its 12-file evidence inventory totals 3,718,564 bytes with manifest SHA `2f7a5bec0ff5f7fb159748f55da5b163d374341eda8c1260800fd03502df8c75`. Attempt-1 receipt and enumeration SHAs remain unchanged. No remote mutation, reload, restart, certificate/timer action, local Docker call, provider call, production/live Agent action, canonical write, commit, or push occurred.
