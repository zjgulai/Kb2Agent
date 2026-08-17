---
title: G7-A2-S3 Direct-origin Shadow Preparation
status: prepared-local-only
gate: G7-A2-S3
updated: 2026-08-13
---

# G7-A2-S3 Direct-origin Shadow Preparation

## Outcome and boundary

G7-A2-S3 prepares a new, append-only DeepSeek direct-origin shadow implementation against the independently accepted G7-A2-S2 admission. It does not activate the candidate, read `ANTHROPIC_API_KEY`, resolve DNS, negotiate TLS, call a provider, change configuration or services, touch Docker or a remote host, run a production/live Agent, or perform Git writes.

The executor defaults to local preparation. Passing `--execute` is deliberately rejected before any credential read or network-capable module load. The network client is a reviewable local source artifact only; this gate never imports or invokes it.

## Frozen subject

- provider: `deepseek-official-api`;
- protocol: Anthropic Messages compatible;
- configured origin: `https://api.deepseek.com/anthropic`;
- effective request path: `/anthropic/v1/messages`;
- exact model: `deepseek-v4-flash`;
- owner: `pray`;
- inputs: exactly `G7-CANARY-01-CLEAN` and redacted `G7-CANARY-02-REDACTION`;
- calls: at most 2, retries 0;
- timeout: 10 seconds per call;
- input/output limits: 1200/500 tokens per call;
- aggregate cost ceiling: USD 0.25 (`250000` micros).

The accepted S2-R1 receipt, accepted review packet, admission candidate and both canary receipts are checksum and byte-count locked by the S3 executor.

## Transport and TLS contract

The prepared client uses native `node:https` with all request fields fixed: protocol `https:`, hostname and SNI `api.deepseek.com`, port `443`, path `/anthropic/v1/messages`, method `POST`, certificate verification enabled, no redirect following, no proxy discovery, no connection reuse and a 10-second timeout. The request sends the Anthropic version header and `x-api-key`, but the client accepts the key only as an explicit function argument and never reads environment state itself.

No statement in this document proves DNS resolution, certificate identity, TLS negotiation, endpoint reachability or authentication. Those remain unobserved.

## Deterministic request and response contracts

Two request artifacts are derived only from the frozen, already-redacted canary receipts. The request schema fixes the exact model, `max_tokens=500`, `temperature=0`, bounded messages and absence of tools. The response contract requires:

1. JSON response content type and valid JSON;
2. 2xx status without redirects;
3. exact returned model ID;
4. non-empty text plus integer input/output usage;
5. duration and tokens within the admission bounds;
6. verified cost within the remaining aggregate budget.

The offline fixture matrix covers accepted provider-reported cost, accepted source-locked cost calculation, timeout, DNS, TLS, generic network failure, response duration/size, redirects, content type, invalid JSON, authentication, rate limiting, other HTTP errors, response shape, model mismatch, input/output token overflow, missing cost evidence and cost overflow.

## Cost fail-closed rule

The admitted USD 0.25 value is a ceiling, not a price formula. S3 has no locally frozen official pricing snapshot. A conformant provider response is accepted for cost only if it contains a non-negative integer `usage.cost_usd_micros`, or a later gate supplies an independently reviewed, source-locked price calculation. If neither exists, classification is `COST_UNVERIFIED` and fails closed.

Consequently, `sourceLockedPricingPolicyMaterialized=false` and `liveExecutionReady=false` are intentional S3 results. This avoids silently treating an unknown price as zero.

## Default-no-execute proof

The preparation executor contains no `process.env` access and imports no HTTP, HTTPS, DNS, TLS, net, child-process or Docker/remote capability. Its `--execute` branch terminates before source reads, output writes or dynamic imports. The default branch performs only local source reads, JSON/schema validation, deterministic fixture evaluation and exclusive append-only local writes.

The executable network client is tested only through source inspection and pure response/transport contracts. It is not loaded by the S3 executor.

## Evidence grade and claims

Passing S3 establishes only L2 local contract/fixture evidence: exact source lineage, deterministic request construction, failure classification and zero-effect execution posture. It does not establish credential validity, network reachability, provider identity at runtime, model entitlement, real token/cost/latency behavior or production/live Agent capability.

## Next gate

The smallest next gate is `G7-A2-S3-R1`, local-only independent review of the exact executor, client, schemas, fixture report, default-zero-effect proof and unresolved pricing-policy blocker. It must not read the credential or make a provider call. Any later live attempt needs a separate explicit authorization and a source-locked cost-accounting decision.
