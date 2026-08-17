---
title: G6 public-static closeout and G7 roadmap decision
status: authorized-local-closeout
gate: G6-A11
release_id: mkd-m1c-438e6ae583fc952d
evidence_profile: mixed-L2-L3-L4-with-user-confirmed-review
---

# G6 public-static closeout and G7 roadmap decision

## Executive decision

G6 closes as a **publicly accepted static Replay-first Agent experience**. It is a complete product slice for teaching, inspecting, and replaying a deterministic Agent workflow; it is not a production/live Agent service.

The recommended G7 direction is **Option A: evidence-first provider shadow**, with Option B retained as the knowledge-depth alternative. This document recommends a route but does not authorize its execution.

## Exact subject

- Public static release: `mkd-m1c-438e6ae583fc952d`
- Site digest: `sha256:438e6ae583fc952d813908b53a6c886ef127dad56d1a73eb017151f1f38bfadf`
- Static files: 263 / 12,978,696 bytes
- Public P9 evidence: 10/10 Playwright; Axe and Web Vitals passed
- Lighthouse medians: home 98/100/100; Lab 98/100/100
- Delayed readback: 60 seconds, public and remote read-only checks passed
- Public evidence manifest: 12 files / 3,718,564 bytes / `2f7a5bec0ff5f7fb159748f55da5b163d374341eda8c1260800fd03502df8c75`
- Four-role public evidence review: 4/4 accepted

The public and remote state above is historical frozen evidence from G6-A8-R1 and G6-A9-R1. G6-A11 does not refresh it.

## Capability closeout

| Capability | G6 closeout | Evidence | Boundary |
| --- | --- | --- | --- |
| Knowledge content | Implemented for one Amazon Ads synthetic vertical slice | Eight schemas, eight deterministic tools, 20/20 fixtures | Not a broad production knowledge base; no de-identified real corpus |
| Agent reasoning | Deterministic Replay-first plan/tool/decision/receipt spine | Same-input parity, schema and terminal-state contracts | No real model/provider inference |
| Agent Lab | Public static interactive replay and evidence inspection | Five viewports, key interactions, accessibility and Web Vitals | Browser does not invoke a live Agent service |
| Static delivery | Deployed as isolated hardened 438e static runtime and public edge route | Authorized runtime/switch receipts plus independent readback | This is a static web deployment, not a production Agent deployment |
| Public quality | Accepted | P9 10/10, six Lighthouse runs, delayed stability, four-role review | Short delayed evidence is not a long-term SLO |
| Provider integration | Not implemented or validated | Provider call count remains zero | Requires separately authorized canary |
| External platform actions | Not implemented or authorized | External/canonical/platform write counts remain zero | Approval, idempotency and rollback contracts are absent |
| Real business evidence | Not established | All domain cases are synthetic | No real-account effectiveness or customer proof |

## Supported claims

1. The exact 438e public static release was switched, independently read back, fully browser-tested, short-delay checked, and accepted by four named roles.
2. The release includes a deterministic Replay-first single-Agent vertical slice, 20 synthetic golden cases, and an inspectable Agent Lab.
3. The G6 Agent path made zero provider calls and performed zero external-system or canonical knowledge writes.
4. G6 provides a strong evidence and governance spine for the next provider-bound stage.

## Forbidden claims

1. A production/live Agent is running on the public site.
2. A real AI provider, Amazon Ads account, or business platform has been called.
3. Synthetic cases establish customer effectiveness, production accuracy, or real-domain completeness.
4. The public static deployment proves long-term availability, multi-user service readiness, or operational SLO compliance.
5. G7, provider access, remote mutation, or public runtime publication has been authorized.

## Missing product capabilities

The gaps that now materially limit product certainty are:

1. **Provider boundary:** no typed provider adapter, request budget, egress allowlist, redaction gate, kill switch, retry taxonomy, or provider receipt.
2. **Runtime boundary:** no authenticated Agent API, queue/concurrency policy, idempotency key, tenant isolation, durable trace store, or rate limit.
3. **Knowledge boundary:** no approved de-identified real cases, active-version knowledge promotion, freshness policy, or real-case regression set.
4. **Action boundary:** no purpose-bound approval receipt, dry-run/apply separation, write idempotency, compensation, or external action audit.
5. **Operations boundary:** no live Agent SLO, alerting, cost telemetry, retention/deletion policy, incident drill, or provider degradation plan.
6. **Product boundary:** the public Lab demonstrates an execution spine but does not yet let an authorized user submit a bounded live request.

## Option A — Evidence-first provider shadow (recommended)

### Product outcome

Move from deterministic Replay to a bounded, non-production provider shadow without adding business-platform writes or immediately exposing a public live Agent.

### Why recommended

- It addresses the largest remaining uncertainty: whether the current schemas, tool plan, refusal states and evidence receipts survive real model variability.
- It preserves the architecture already accepted in G6 instead of widening knowledge breadth before validating the actual Agent inference boundary.
- It creates provider/cost/privacy evidence before any authenticated runtime or external action surface is considered.

### Gates and executable TODO

| Gate | Scope | Exit criteria | Live authority |
| --- | --- | --- | --- |
| G7-A1 | Local provider-readiness contracts | typed adapter, redaction, allowlist, token/cost budget, timeout/retry taxonomy, kill switch, provider receipt schema, five canary inputs | None; provider calls remain 0 |
| G7-A2 | Bounded shadow canary | separately approved provider/model, at most five calls, fixed budget, synthetic/redacted inputs, no tools with side effects, immutable receipts | Explicit bounded provider calls only |
| G7-A3 | Replay vs provider evaluation | deterministic evaluator, claim/evidence comparison, refusal and fault review, four-role decision | Local evaluation only |
| G7-A4 | Authenticated internal Agent candidate | isolated API, auth, rate limit, idempotency, durable trace, tenant and retention contracts | Separate isolated runtime authorization |
| G7-A5 | Public product candidate | explicit live/replay mode UX, new evidence labels, candidate build, review, deploy, full P9 | Separate public publication/deployment authorization |

### Stop conditions

- secrets appear in repository artifacts or logs;
- input redaction, allowlist or budget cannot be proven before the call;
- provider output cannot be mapped to the accepted evidence/terminal-state schemas;
- a tool requests an external write;
- any canary exceeds fixed call, token, cost or time limits.

## Option B — Knowledge-depth first

### Product outcome

Keep provider calls at zero and expand the knowledge product: two additional domain cases, de-identified real-case intake contracts, concept graph links, evaluation packs, and richer Agent Lab comparisons.

### Advantages

- Lower operational and privacy risk.
- Improves the knowledge-base architecture and real-case teaching value.
- Can surface ontology, freshness and acceptance issues before model variability is introduced.

### Trade-off

It delays proof of the core transition from Replay to provider-backed Agent behavior. The product remains an increasingly rich static demonstrator.

### Executable TODO

1. Define de-identification and owner-approval schemas for real cases.
2. Add two domain slices with at least 15 positive/negative/fault cases each.
3. Implement active-version and freshness contracts without canonical writes.
4. Add cross-case comparison and concept graph views to Agent Lab.
5. Run local review, build a new candidate and repeat the existing deployment/P9 gates.

## Roadmap decision

- Recommendation: Option A
- Confidence: high for sequencing, not evidence of provider readiness
- G7-A1 state: `recommended-not-authorized`
- G7-A1 must remain local-only and zero-provider-call
- Option B remains the fallback if provider ownership, model, budget, or data policy cannot be explicitly approved

## Simplified authorization language

If proceeding with the recommendation, the narrow next authorization can be:

> 授权 G7-A1：仅本地创建 provider-readiness contracts、typed adapter、redaction/allowlist/budget/kill-switch 规则、五个 synthetic canary inputs、schemas、测试和准备回执；不授权真实 provider call、secret 写入、远端/Docker、公开 live Agent、外部系统写入、commit 或 push。

## G6-A11 effect boundary

This gate creates local closeout and roadmap artifacts only. Public network, SSH, upload, Docker, remote mutation, edge action, provider call, production Agent action, external write, commit, and push counts are all zero.
