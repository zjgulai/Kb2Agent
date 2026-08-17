---
title: G6-A10-R1 system-recorded four-role acceptance
status: implementation-local-only
gate: G6-A10-R1
evidence_grade: L3-production-read-only-public-browser-and-short-delayed-stability-plus-user-confirmed-human-review
release_id: mkd-m1c-438e6ae583fc952d
---

# G6-A10-R1 system-recorded four-role acceptance

## Decision

Materialize the user-confirmed four-role review of the exact G6-A10 subject. The user confirmed that pray, ll, zy, and ly each passed all three assigned checks, had no findings, independently attested, and accepted the review.

## Timestamp policy

The user delegated timestamp entry to the system because manual UTC conversion was inconvenient. This gate therefore uses one system-recorded confirmation timestamp:

- mode: `system-recorded-on-user-confirmation`
- recordedAt: `2026-08-12T05:32:43Z`
- local display: `2026-08-12 13:32:43 +08:00`
- meaning: time when the system processed the user's complete four-reviewer confirmation
- non-claim: this is not represented as four separately handwritten timestamps

Every accepted record carries this provenance next to `signedAt`. The acceptance receipt preserves the original user-provided review facts separately from the system-assigned timestamp.

## Frozen input

- preparation receipt: `33644e9307bedadf0be0d63dcb2c5c3411c44ac17425aee2683f0a2b77347406`
- evidence pack: `947ffceac8e07f3e55d01c05a3104950b503ee0aaaccd3d4f8da504a548def08`
- assigned packet: `1bf0124f4ea4fd21560dcecd5392c6403db29a4b4c64d2354ec324b5c98cd8b9`
- public receipt: `7f0fb9eec51f18385a69046a254749ffee071aecfcd8678a96b9dd8c9c3000d3`
- artifact manifest: `2f7a5bec0ff5f7fb159748f55da5b163d374341eda8c1260800fd03502df8c75`

## Append-only outputs

- one explicit confirmation artifact
- four completed current records using a dedicated provenance-aware schema
- one accepted packet using a dedicated G6-A10-R1 schema
- one acceptance receipt binding every input and output

Assigned history remains byte-identical. The executor uses exclusive creation and refuses overwrite.

## Authorization boundary

This gate authorizes only local review-decision materialization. It does not authorize public or SSH reads, Docker, remote mutation, edge/container/certificate/timer changes, production/live Agent, provider calls, external-system writes, commit, or push.

## Simplified future interaction

For later review gates with the same policy, the user may say: `四人三项检查均通过、findings 无、独立性 true、accepted，使用系统记账时间。` The system must still show the exact subject and role mapping, record the generated UTC time and its provenance, and preserve all capability boundaries.
