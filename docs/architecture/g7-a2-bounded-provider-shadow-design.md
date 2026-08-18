---
title: G7-A2 Bounded Provider Shadow Design
status: authorized-pending-execution
gate: G7-A2
evidence_grade: L4-authorized-live-provider-shadow-only
---

# G7-A2 Bounded Provider Shadow Design

## Decision

G7-A2 admits exactly two non-production shadow requests through the user-approved local Anthropic-compatible channel. It does not enable an authenticated Agent runtime, tools, public Live mode, remote deployment, Docker, external writes, retries, discovery calls, commit, or push.

The project decision is frozen as:

- provider protocol: Anthropic Messages-compatible over loopback HTTP only;
- endpoint origin: `http://127.0.0.1:15721`;
- provider owner: `pray`;
- exact requested model ID: `deepseek-v4-flash`;
- approved inputs: the already materialized `G7-CANARY-01-CLEAN` request and the already redacted `G7-CANARY-02-REDACTION` request;
- call count: exactly 2, sequential, one per approved canary;
- retries: 0;
- timeout: at most 10,000 ms per call;
- input budget: at most 1,200 tokens per call;
- output budget: at most 500 tokens per call;
- total authorized cost ceiling: USD 0.25 (`250000` micros);
- secret injection: `ANTHROPIC_API_KEY` from the process environment only;
- independent reviewer: `ll`, decision `accepted`, independence attestation `true`, system-recorded confirmation time; no human-authored signature time is claimed.

## Capability boundary

The executor is default no-execute. A live attempt requires explicit `--execute`, exact admission and source locks, an already listening loopback target, a non-empty environment credential, and absent output paths. It never prints or serializes the credential and records only its SHA-256 fingerprint prefix and byte length.

Only `POST /v1/messages` is permitted. The executor must not call a model-list endpoint, follow redirects, retry, use tools, accept arbitrary files or URLs, or contact a non-loopback host. A response is successful only when HTTP status is 2xx, JSON parses, returned `model` exactly equals `deepseek-v4-flash`, text content is present, and reported input/output usage does not exceed the frozen limits.

Because an Anthropic-compatible response normally reports tokens but not authoritative billed USD, the receipt distinguishes:

- `authorizedCostCeilingUsdMicros=250000`, a user-granted maximum;
- `providerReportedCostUsdMicros`, which remains `null` unless the provider explicitly reports an amount;
- `costVerified`, which must remain `false` when no authoritative amount is returned.

Unknown billing telemetry does not become a fabricated zero-cost claim. It is acceptable for this two-call shadow only because the authorization separately caps the attempt count and output tokens; G7-A3 must treat cost as an unresolved variance.

## Transaction and failure semantics

1. Complete all local source-lock, schema, input, budget, endpoint, secret-presence and listener checks before the first egress attempt.
2. Send canaries sequentially in their frozen order.
3. Never retry a failed or timed-out call.
4. After each attempted call, write one append-only per-call receipt. Do not store raw response headers, secrets, or the full prompt; store hashes, bounded response text, usage and error taxonomy.
5. Stop immediately after the first failed call. Do not spend the remaining call authorization.
6. Write a single append-only attempt receipt only after the per-call evidence has been assembled. Its state may be `passed-authorized-provider-shadow`, `blocked-before-provider-call`, or `failed-after-bounded-provider-attempt`.

Network activity is not roll-backable. Failure containment therefore means no retry, no next call after failure, exact accounting, kill-switch-by-default, and no downstream state mutation.

## Evidence claims

If both requests pass, the maximum supported claim is: the exact requested model returned schema-compatible responses for two approved synthetic/redacted inputs through the approved loopback compatibility channel within the recorded token and time bounds.

Even on success, the following remain forbidden:

- Anthropic itself, rather than a compatibility proxy, was the backend;
- provider billing cost was verified when the response did not report it;
- production/live Agent, tools, authentication, tenant isolation, SLO, remote runtime, public Live mode or business outcome is ready;
- G7-A3 or any further provider call is authorized.

