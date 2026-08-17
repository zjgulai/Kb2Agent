---
title: G7-A2-D1-R1 Credential Derivative Correction
status: local-append-only-correction
gate: G7-A2-D1-R1
evidence_grade: L1-local-runtime-readonly
---

# G7-A2-D1-R1 Credential Derivative Correction

## Finding

The immutable G7-A2-D1 diagnosis receipt contains no raw credential value, but it records the whole-file SHA-256 of a configuration file that contains a credential assignment. The receipt simultaneously says `credentialDerivativeRecorded=false`. Under the gate's strict privacy definition, those two facts are inconsistent.

## Correction

The original receipt remains immutable history and retains the successful runtime diagnosis facts. Its privacy metadata is corrected append-only as follows:

- raw credential value recorded: false;
- credential-derived whole-file fingerprint recorded: true;
- original receipt handling: `internal-restricted-history`;
- public/package projection: prohibited from carrying the configuration file SHA, credential value, length, prefix, suffix, or any derivative fingerprint;
- diagnosis classification and zero-call/zero-mutation ledgers: unchanged.

This correction does not perform another OS observation and does not change the evidence grade. It binds the original materializer and receipt so the corrected interpretation cannot float independently of the exact historical artifact.
