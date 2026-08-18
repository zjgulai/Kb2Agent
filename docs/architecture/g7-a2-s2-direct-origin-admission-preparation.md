---
title: G7-A2-S2 Direct-origin Admission Preparation
status: local-preparation-awaiting-independent-review
gate: G7-A2-S2
evidence_grade: L2-local-preparation-with-user-confirmed-credential-authority
---

# G7-A2-S2 Direct-origin Admission Preparation

## Decision

G7-A2-S2 prepares, but does not activate, a new append-only admission candidate for DeepSeek's official native Anthropic-compatible endpoint:

- provider identity: `deepseek-official-api`
- origin: `https://api.deepseek.com/anthropic`
- messages path: `/v1/messages`
- requested model: `deepseek-v4-flash`
- owner: `pray`
- credential environment variable: `ANTHROPIC_API_KEY`

The user confirmed in this Codex task that the credential injected under that variable is issued by DeepSeek. This is an authority statement from the credential owner, not a credential validity or entitlement test. The value, length, prefix, suffix and derivative fingerprint remain unread and unrecorded.

## Preserved controls

The candidate preserves the original G7-A2 approved inputs and budgets byte-for-byte by source identity:

- `G7-CANARY-01-CLEAN` and the already-redacted `G7-CANARY-02-REDACTION` only;
- maximum two calls;
- zero retries;
- 10-second timeout per call;
- maximum 1,200 input tokens and 500 output tokens per call;
- total authorization ceiling USD 0.25;
- no tools, arbitrary discovery, external writes, remote/Docker actions or production/live Agent behavior.

Unlike the historical loopback admission, this candidate identifies the intended backend as DeepSeek based on the user's credential-authority confirmation and the official-source assessment frozen by G7-A2-S1. It still authorizes zero calls and zero credential reads.

## Append-only lineage

The historical loopback admission remains unchanged and continues to explain the original bounded attempt, listener gate and diagnosis. G7-A2-S2 does not edit it or reinterpret the failed connection as a DeepSeek failure.

The new admission candidate has status `prepared-awaiting-independent-review-not-call-authorized`. It is not a replacement current admission until a later append-only review-decision gate accepts the exact candidate identity.

## Independent review

Reviewer `ll` is assigned one exact subject and three checks:

1. provider identity, HTTPS origin, messages path and exact model match the G7-A2-S1 decision and official-source assessment;
2. the two canaries, owner, secret variable name, call/retry/timeout/token/cost budgets and forbidden effects are unchanged from the historical admission;
3. the candidate and preparation receipt contain no credential value/derivative and grant no connectivity, credential-read or provider-call permission.

G7-A2-S2 records the review as `assigned / pending`, with no independence attestation, findings, decision or signed time fabricated. The old review acceptance for a different loopback subject is not inherited.

## Evidence boundary

### Supported

- The user stated that the configured credential is issued by DeepSeek.
- DeepSeek's official documentation publishes the selected Anthropic-compatible endpoint and exact model.
- The local candidate deterministically preserves the two inputs and every bounded-run limit.
- The preparation executor has no environment, network, listener, service-management, remote or Docker capability.

### Not supported

- The credential is valid, active or entitled to `deepseek-v4-flash`.
- DNS, TLS, authentication, billing, model response, token accounting, latency or cost has been observed.
- `ll` has accepted the new direct-origin admission.
- A provider call, production/live Agent or external write is authorized.

## Next gate

`G7-A2-S2-R1` may only materialize `ll`'s decision for this exact packet. It requires three check results, findings, `independenceAttestation`, decision and either a reviewer-supplied `signedAt` or an explicitly requested system-recorded confirmation time. It remains local-only and cannot perform connectivity or provider calls.
