---
title: ADR-002 Git-native 权威源与 SQLite 运行投影
---

# ADR-002：Git-native 权威源与 SQLite 运行投影

- 状态：`accepted-design`
- 日期：2026-08-09

## 决策

JSON/YAML/Markdown、稳定 ID、typed relations 和 immutable snapshot 是权威合同。SQLite FTS5、edge table 和预计算向量是可重建运行投影，不是 canonical source。

## 理由

V1 的主要风险是语义、来源、版本与审批，而不是图查询吞吐。Git diff 与 snapshot hash 更适合审查和复放；SQLite 足以支持有界闭包。

## 重新评估触发器

只有出现经测量的对象规模、并发、复杂图算法或恢复时间瓶颈，才评估专用图/向量存储。
