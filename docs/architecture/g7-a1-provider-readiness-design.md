---
title: G7-A1 provider-readiness contracts and zero-call preparation
status: authorized-local-preparation
gate: G7-A1
parent_gate: G6-A11
evidence_grade: L2-fixture-or-dry-run
---

# G7-A1 provider-readiness contracts and zero-call preparation

## Decision

G7-A1 creates a local, typed provider boundary that can prepare and inspect synthetic shadow requests but cannot send them. A successfully prepared envelope means only that local schemas, redaction, fixture-only routing, budgets, retries and receipts are coherent. It is not provider validation or permission to enter G7-A2.

## Frozen parent

- G6 closeout: `release/m1c/g6-public-static-closeout.json`
- G6-A11 receipt: `reference/receipts/g6-a11-public-static-closeout-receipt.json`
- G7 roadmap: `reference/roadmaps/g7-roadmap-decision.json`
- Exact public static release: `mkd-m1c-438e6ae583fc952d`
- Current product class: `publicly-accepted-static-replay-first-agent-experience`

The G6-A11 historical field `g7Authorized=false` remains immutable evidence of that earlier point in time. The current user authorization opens G7-A1 only and is recorded in a new namespace.

## Product boundary

G7-A1 implements five local capabilities:

1. A schema-backed adapter contract with explicit request, receipt and policy types.
2. Deterministic redaction before any prepared envelope is emitted.
3. A deny-by-default egress boundary that accepts only the in-process fixture transport.
4. Separate preparation and live-call budgets; the latter fixes `maxCalls=0`, `maxCostUsdMicros=0` and `maxRetries=0`.
5. An engaged kill switch that cannot be released by runtime input.

It does not implement a provider SDK, HTTP client, secret loader, provider credential, remote runtime, public live mode or external tool.

## State model

| State | Meaning | Provider call |
| --- | --- | --- |
| `prepared-no-call` | Synthetic request passed local redaction, fixture target and preparation-budget checks | Forbidden |
| `blocked` | Input, target or budget did not pass readiness policy | Forbidden |
| `refused` | Request asks for an external/canonical/platform side effect | Forbidden |

Every state emits a local preparation receipt with zero calls and zero writes.

## Policy

### Data

- Only `synthetic` inputs are admitted.
- Arbitrary file paths, URLs and secret sources are not accepted.
- Sensitive structured keys and synthetic sensitive markers are replaced before the prepared request hash is computed.
- The receipt stores hashes and redaction categories, never the original sensitive value.

### Egress

- `fixture://PROVIDER-FIXTURE-ONLY/MODEL-FIXTURE-DETERMINISTIC` is the only preparation target.
- HTTPS hosts, provider IDs and model IDs have no live allowlist in G7-A1.
- The implementation imports no HTTP/HTTPS/net/TLS modules and does not call `fetch` or a provider SDK.

### Budget

- Preparation estimate: input ≤ 1,200 tokens; output ≤ 500 tokens; total ≤ 1,700 tokens; timeout ≤ 10,000 ms.
- Live call budget: calls = 0; retries = 0; cost = 0 micros.
- A later G7-A2 budget must be a new, explicitly approved and source-locked artifact; it cannot mutate this policy.

### Kill switch

- State is `engaged`.
- Runtime input cannot disengage it.
- A request that otherwise passes is still `prepared-no-call`, with `callAdmission=false`.

## Five synthetic canaries

| Canary | Expected | Purpose |
| --- | --- | --- |
| `G7-CANARY-01-CLEAN` | prepared-no-call | clean synthetic request |
| `G7-CANARY-02-REDACTION` | prepared-no-call | structured credential and synthetic email/account markers are removed |
| `G7-CANARY-03-EGRESS-DENY` | blocked | HTTPS/unapproved provider/model cannot enter the fixture allowlist |
| `G7-CANARY-04-BUDGET-DENY` | blocked | estimated input/total tokens exceed preparation budgets |
| `G7-CANARY-05-EFFECT-REFUSAL` | refused | external platform write tool is rejected |

The canaries contain placeholders only; they do not contain a real credential, customer identifier or account payload.

## Source-lock and append-only outputs

The builder must verify the exact G6-A11 receipt, closeout and roadmap SHA/bytes and their authorization semantics before writing. It then binds the design, policy, schemas, typed adapter, runtime and fixtures into:

- `reference/build/g7/provider-readiness-manifest.json`
- `reference/build/g7/canary-evaluation.json`
- five receipts under `reference/build/g7/canary-receipts/`
- `reference/reviews/g7-a1-provider-readiness-packet.json`
- `reference/receipts/g7-a1-provider-readiness-preparation-receipt.json`

All outputs are created with exclusive-write semantics. A second run must fail without changing a byte.

## Evidence gate

- Maximum grade: `L2-fixture-or-dry-run`.
- Supported: five local canaries deterministically enforce the zero-call provider boundary.
- Forbidden: provider selected, provider reachable, credential valid, model quality validated, real provider canary complete, authenticated runtime ready, production/live Agent ready.

## Exit criteria

1. Three strict schemas and the canary dataset validate.
2. Typed adapter and deterministic runtime have no network/child-process/provider SDK capability.
3. Canary outcomes are exactly 2 prepared / 2 blocked / 1 refused.
4. Redaction output contains no synthetic sensitive markers or structured credential value.
5. Every receipt records provider calls, egress attempts, external writes and production Agent actions as zero.
6. Focused contracts and all content tests pass.

## Next gate

G7-A2 remains `recommended-not-authorized`. If later considered, it must name the exact provider/model owner, approved synthetic/redacted inputs, call/token/cost/time ceilings and receipt path. The G7-A1 policy cannot itself grant that authority.
