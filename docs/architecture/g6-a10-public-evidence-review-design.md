---
title: G6-A10 exact public evidence independent review preparation
status: implementation-local-only
gate: G6-A10
evidence_grade: L3-production-read-only-public-browser-and-short-delayed-stability-plus-local-review-preparation
release_id: mkd-m1c-438e6ae583fc952d
---

# G6-A10 exact public evidence independent review preparation

## Goal

Prepare an append-only, source-locked review round for four independent human reviewers. The subject is the exact G6-A9-R1 receipt and its exact 12-file evidence manifest. Preparation must not infer, copy, or fabricate a human decision.

## Frozen subject

- Release: `mkd-m1c-438e6ae583fc952d`
- Site digest: `sha256:438e6ae583fc952d813908b53a6c886ef127dad56d1a73eb017151f1f38bfadf`
- G6-A9-R1 receipt SHA-256: `7f0fb9eec51f18385a69046a254749ffee071aecfcd8678a96b9dd8c9c3000d3`
- Evidence root: `output/playwright/mkd-distill-g6a9-r1`
- Evidence manifest: 12 files, 3,718,564 bytes, `2f7a5bec0ff5f7fb159748f55da5b163d374341eda8c1260800fd03502df8c75`

Changing any identity value requires a new review round.

## Review roles

| Reviewer | Role | Independent concern |
| --- | --- | --- |
| pray | `ROLE-PRODUCT-CONTENT` | Product narrative, responsive reading flow, visible evidence boundaries |
| ll | `ROLE-AMAZON-ADS-DOMAIN` | Domain fidelity, Replay traceability, synthetic/real boundary |
| zy | `ROLE-ENGINEERING-TEST` | Browser, accessibility, Web Vitals, Lighthouse, manifest and delayed stability |
| ly | `ROLE-SECURITY-RELEASE` | TLS, headers, redirects, isolation, legacy preservation and authorization boundary |

Each reviewer receives exactly three checks. A valid acceptance requires all three to pass, `independenceAttestation: true`, a UTC-second `signedAt`, and the reviewer’s own explicit decision.

## Fail-closed rules

1. Recompute the SHA and byte count of the frozen G6-A9-R1 receipt and G6-A4 candidate receipt.
2. Re-read all 12 evidence files, reject path traversal or duplicates, and recompute the path/content manifest.
3. Revalidate the recorded Playwright, Lighthouse, pre/post public and remote readback, delay, release identity, and no-mutation claims.
4. Emit only `assigned` / `pending` records with null signatures and null attestations.
5. Refuse to overwrite any review artifact; remove only files created by the current failed local attempt.
6. Do not perform network, SSH, Docker, provider, Agent, production, commit, or push actions.

## Evidence boundary

G6-A9-R1 already supports L3 read-only public browser and short delayed-stability facts. G6-A10 preparation adds only local review-control evidence. It does not prove four-role acceptance, production deployment, live Agent execution, provider behavior, or business effectiveness.

## Required next input

The next decision-materialization gate remains blocked until pray, ll, zy, and ly each return three check results, findings, an independence attestation, a decision, and a UTC-second signature for this exact subject.
