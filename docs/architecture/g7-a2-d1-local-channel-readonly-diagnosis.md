---
title: G7-A2-D1 Local Channel Read-only Diagnosis
status: authorized-readonly-diagnosis
gate: G7-A2-D1
evidence_grade: L1-local-runtime-readonly
---

# G7-A2-D1 Local Channel Read-only Diagnosis

## Purpose

G7-A2-D1 diagnoses why the exact Anthropic-compatible endpoint configured for G7-A2 is not accepting connections. It is an observation gate, not a repair or provider-call gate. It source-locks the immutable G7-A2-R1 attempt and closeout, performs a single bounded local inspection, and writes one append-only receipt.

The diagnosis may distinguish configuration presence, listener state, service registration and process state. It must not claim that a credential, requested model or upstream provider is invalid when none of them is reached.

## Allowed observations

- run the exact `lsof` listener query for `127.0.0.1:15721`;
- confirm only whether the `ANTHROPIC_API_KEY` variable name exists and is non-empty, without recording its value, length, prefix, suffix or hash;
- confirm whether `ANTHROPIC_BASE_URL` exactly equals the approved loopback origin, without copying unrelated environment values;
- inspect `/Users/pray/.codex/config.toml` for the relevant section and key names, while never emitting credential values;
- inspect loaded launchd labels, LaunchAgent/LaunchDaemon plist files, Homebrew service rows and process/listener metadata for an exact endpoint or narrowly named channel candidate;
- record hashes, byte counts and bounded non-secret metadata needed to make the receipt reproducible.

## Forbidden actions

The executor cannot start, stop, bootstrap, kickstart, reload, install or edit a service. It cannot modify launchd, Homebrew, shell configuration, Codex configuration, environment state or firewall state. It cannot open a TCP connection, call `/v1/messages`, access a model-list endpoint, read Docker, access a remote host, perform an external write, or commit/push.

Credential inspection is presence-only. The receipt must not contain the credential value, a derivative fingerprint, its size, or any arbitrary environment entry.

## Decision semantics

If the endpoint and credential injection exist but no exact listener or service definition is observed, the supported classification is:

`configured-endpoint-without-observed-runtime-or-startup-definition`

That classification means only that this bounded scan found a configuration/runtime gap. It does not prove why the expected runtime is absent. In particular, it does not prove a crash, an invalid credential, an invalid model ID, a protocol mismatch, an upstream outage or a billing problem.

The smallest useful next gate is a separately authorized local runtime ownership decision: identify the intended proxy implementation and its trusted start mechanism, or explicitly approve preparation of a new isolated runtime plan. No provider attempt should be retried until a later exact listener check passes.
